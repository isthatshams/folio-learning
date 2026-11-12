#!/usr/bin/env python3
"""Build a Markdown inventory of every FOLIO application and module.

Platform descriptor (GitHub folio-org/platform-lsp)
  -> application descriptors (FOLIO Application Registry, FAR)
    -> module descriptors (APIs, permissions, dependencies, memory/env)

Usage:
  python3 docs/tools/module_inventory.py [--ref snapshot] [--refresh]
Output:
  docs/reference/module-inventory.md
  docs/reference/module-inventory.json   (compact data, reused for diagrams/slides)
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request

LSP_URL = "https://raw.githubusercontent.com/folio-org/platform-lsp/refs/heads/{ref}/platform-descriptor.json"
FAR_URL = "https://far.ci.folio.org/applications/{name}-{version}?full=true"

HERE = pathlib.Path(__file__).resolve().parent
CACHE = HERE / ".cache"
OUT_DIR = HERE.parent / "reference"


def fetch_json(url, cache_name, refresh):
    """GET a JSON document, caching it on disk so reruns are fast and offline-friendly."""
    CACHE.mkdir(exist_ok=True)
    path = CACHE / cache_name
    if path.exists() and not refresh:
        return json.loads(path.read_text())
    try:
        with urllib.request.urlopen(url, timeout=60) as resp:
            data = json.load(resp)
    except urllib.error.URLError as exc:
        if "unknown url type" not in str(exc):
            raise
        # Some Python builds (e.g. pyenv without OpenSSL) can't do https -> use curl instead.
        out = subprocess.run(["curl", "-sSfL", "--max-time", "60", url],
                             check=True, capture_output=True, text=True).stdout
        data = json.loads(out)
    path.write_text(json.dumps(data))
    return data


def summarize_module(md):
    """Reduce a module descriptor to the facts the documentation needs."""
    provides = md.get("provides", [])
    # Interfaces starting with "_" (_tenant, _timer, ...) are system hooks, not business APIs.
    apis = [p for p in provides if not p["id"].startswith("_")]
    launch = md.get("launchDescriptor") or {}
    env = {e["name"]: e.get("value") for e in launch.get("env", [])}
    memory = launch.get("dockerArgs", {}).get("HostConfig", {}).get("Memory")
    return {
        "id": md["id"],
        "name": re.sub(r"-\d+\.\d+.*$", "", md["id"]),  # mod-users-19.7.0-SNAPSHOT.1 -> mod-users
        "description": md.get("name", ""),
        "provides": [f'{p["id"]} {p.get("version", "")}'.strip() for p in apis],
        "system_interfaces": [p["id"] for p in provides if p["id"].startswith("_")],
        "endpoints": sum(len(p.get("handlers", [])) for p in apis),
        "requires": [r["id"] for r in md.get("requires", [])],
        "optional": [r["id"] for r in md.get("optional", [])],
        "permission_sets": len(md.get("permissionSets", [])),
        "memory_mb": memory // (1024 * 1024) if memory else None,
        "uses_kafka": env.get("KAFKA_ENABLE") == "true" or "KAFKA_HOST" in env,
        "db_pool": env.get("DB_MAXPOOLSIZE"),
        "java_options": env.get("JAVA_OPTIONS"),
    }


def build(ref, refresh):
    platform = fetch_json(LSP_URL.format(ref=ref), f"platform-{ref}.json", refresh)
    apps = []
    for kind in ("required", "optional"):
        for a in platform["applications"].get(kind, []):
            try:
                d = fetch_json(FAR_URL.format(**a), f'{a["name"]}-{a["version"]}.json', refresh)
            except Exception as exc:  # keep going; report the gap in the output
                print(f'  ! {a["name"]}: {exc}', file=sys.stderr)
                apps.append({"name": a["name"], "version": a["version"], "kind": kind,
                             "error": str(exc), "modules": [], "ui_modules": [], "dependencies": []})
                continue
            apps.append({
                "name": d["name"],
                "version": d["version"],
                "kind": kind,
                "description": d.get("description", ""),
                "dependencies": [x["name"] for x in d.get("dependencies", [])],
                "modules": [summarize_module(m) for m in d.get("moduleDescriptors", [])],
                "ui_modules": [u["id"] for u in d.get("uiModules", [])],
            })
            print(f'  {d["name"]}: {len(apps[-1]["modules"])} backend, {len(apps[-1]["ui_modules"])} UI')
    return {"platform_version": platform.get("version"),
            "eureka_components": platform.get("eureka-components", []),
            "applications": apps}


def render_markdown(data):
    apps = data["applications"]
    all_mods = [m for a in apps for m in a["modules"]]
    # interface -> providing module, to show who a module depends on
    providers = {}
    for m in all_mods:
        for p in m["provides"]:
            providers.setdefault(p.split()[0], m["name"])
    used_by = {}
    for m in all_mods:
        for r in m["requires"]:
            if r in providers:
                used_by.setdefault(providers[r], set()).add(m["name"])

    L = ["# Appendix A — FOLIO module inventory (generated)", "",
         f'Platform version: `{data["platform_version"]}`. '
         "Generated by `docs/tools/module_inventory.py`; do not edit by hand.", "",
         f'**{len(apps)} applications · {len(all_mods)} backend/edge modules · '
         f'{sum(len(a["ui_modules"]) for a in apps)} UI modules**', "",
         "## Gateway / platform components (Eureka)", ""]
    L += [f'- `{c["name"]}` {c["version"]}' for c in data["eureka_components"]]
    L += ["", "## Applications overview", "",
          "| Application | Required? | Backend | UI | Depends on apps | Description |",
          "|---|---|---|---|---|---|"]
    for a in apps:
        L.append(f'| [{a["name"]}](#{a["name"]}) | {"yes" if a["kind"] == "required" else "optional"} '
                 f'| {len(a["modules"])} | {len(a["ui_modules"])} | {", ".join(a["dependencies"]) or "—"} '
                 f'| {a.get("description") or a.get("error", "")} |')

    for a in apps:
        L += ["", f'## {a["name"]}', "", f'{a.get("description", "")} (version `{a["version"]}`)', ""]
        if a.get("error"):
            L += [f'_Could not load descriptor: {a["error"]}_']
            continue
        if a["modules"]:
            L += ["| Module | Description | APIs provided | Endpoints | Requires | Used by | Memory | Kafka |",
                  "|---|---|---|---|---|---|---|---|"]
            for m in sorted(a["modules"], key=lambda x: x["name"]):
                L.append(
                    f'| `{m["name"]}` | {m["description"]} | {", ".join(m["provides"]) or "—"} '
                    f'| {m["endpoints"]} | {", ".join(m["requires"]) or "—"} '
                    f'| {", ".join(sorted(used_by.get(m["name"], []))) or "—"} '
                    f'| {str(m["memory_mb"]) + " MB" if m["memory_mb"] else "—"} '
                    f'| {"yes" if m["uses_kafka"] else ""} |')
        if a["ui_modules"]:
            L += ["", "UI modules: " + ", ".join(f'`{u}`' for u in a["ui_modules"])]
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ref", default="snapshot", help="platform-lsp branch, e.g. snapshot or R1-2026")
    ap.add_argument("--refresh", action="store_true", help="re-download instead of using the cache")
    args = ap.parse_args()

    data = build(args.ref, args.refresh)
    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "module-inventory.json").write_text(json.dumps(data, indent=1))
    (OUT_DIR / "module-inventory.md").write_text(render_markdown(data))
    print(f"Wrote {OUT_DIR / 'module-inventory.md'}")


if __name__ == "__main__":
    main()
