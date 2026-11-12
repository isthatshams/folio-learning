#!/usr/bin/env node
/*
 * Build docs/FOLIO-Evaluation-Guide.docx from the Markdown files in docs/.
 * Usage: node docs/tools/build_docx.js   (needs npm packages `docx` and `marked@12`;
 *        set NODE_PATH to a folder where they are installed)
 */
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, LevelFormat, ExternalHyperlink, TableOfContents,
  Footer, Header, PageNumber, PageBreak, TableLayoutType,
} = require("docx");

const DOCS = path.resolve(__dirname, "..");
const OUT = path.join(DOCS, "FOLIO-Evaluation-Guide.docx");

const FILES = [
  "01-overview.md", "02-architecture.md",
  "03-modules/README.md", "03-modules/01-platform-core.md", "03-modules/02-inventory-cataloging.md",
  "03-modules/03-circulation.md", "03-modules/04-acquisitions.md", "03-modules/05-erm.md",
  "03-modules/06-data-reporting.md", "03-modules/07-resource-sharing-consortia.md",
  "03-modules/08-integrations-edge.md", "03-modules/09-platform-services.md",
  "04-extending.md", "05-performance.md", "06-considerations.md", "07-use-cases-drupal.md",
  "08-recommendation.md", "reference/glossary.md",
];

// ---- layout (A4, 0.8" margins) ----
const PAGE_W = 11906, MARGIN = 1152, CONTENT_W = PAGE_W - 2 * MARGIN;
const FONT = "Calibri", MONO = "Consolas";
const ACCENT = "1F4E79", HEAD_FILL = "D9E2F3", CODE_FILL = "F2F2F2";

// ---- inline markdown -> TextRuns ----
function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function inline(tokens, style = {}, size) {
  const out = [];
  for (const t of tokens || []) {
    const base = { font: FONT, size, ...style };
    switch (t.type) {
      case "strong": out.push(...inline(t.tokens, { ...style, bold: true }, size)); break;
      case "em": out.push(...inline(t.tokens, { ...style, italics: true }, size)); break;
      case "del": out.push(...inline(t.tokens, { ...style, strike: true }, size)); break;
      case "codespan":
        out.push(new TextRun({ ...base, text: decode(t.text), font: MONO, size: (size || 21) - 2,
          shading: { type: ShadingType.CLEAR, fill: CODE_FILL, color: "auto" } }));
        break;
      case "link": {
        const kids = inline(t.tokens, { ...style, color: "0563C1", underline: {} }, size);
        if (/^https?:/.test(t.href)) out.push(new ExternalHyperlink({ link: t.href, children: kids }));
        else out.push(...inline(t.tokens, style, size)); // internal .md links -> plain text
        break;
      }
      case "br": out.push(new TextRun({ ...base, break: 1 })); break;
      case "text":
        if (t.tokens) out.push(...inline(t.tokens, style, size));
        else out.push(new TextRun({ ...base, text: decode(t.text) }));
        break;
      case "escape": out.push(new TextRun({ ...base, text: decode(t.text) })); break;
      case "html": break;
      default: if (t.text) out.push(new TextRun({ ...base, text: decode(t.text) }));
    }
  }
  return out;
}

// ---- block markdown -> docx blocks ----
const HEADINGS = [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];

function textLen(cell) { return decode(cell.text || "").length; }

function table(t) {
  const n = t.header.length;
  // column widths proportional to content (sqrt-dampened), min 8 %
  const lens = t.header.map((h, i) => Math.max(textLen(h), ...t.rows.map(r => textLen(r[i] || { text: "" }))));
  const weights = lens.map(l => Math.sqrt(Math.max(l, 3)));
  const sum = weights.reduce((a, b) => a + b, 0);
  let widths = weights.map(w => Math.max(Math.round(CONTENT_W * w / sum), Math.round(CONTENT_W * 0.08)));
  const fix = CONTENT_W - widths.reduce((a, b) => a + b, 0);
  widths[widths.indexOf(Math.max(...widths))] += fix;
  const size = n >= 6 ? 15 : 17;
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const mkCell = (cell, i, header) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    borders,
    shading: header ? { type: ShadingType.CLEAR, fill: HEAD_FILL, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ spacing: { before: 0, after: 0 },
      children: inline(cell.tokens, header ? { bold: true } : {}, size) })],
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, children: t.header.map((c, i) => mkCell(c, i, true)) }),
      ...t.rows.map(r => new TableRow({ children: t.header.map((_, i) => mkCell(r[i] || { tokens: [] }, i, false)) })),
    ],
  });
}

function code(t) {
  const lines = t.text.split("\n");
  return lines.map((line, i) => new Paragraph({
    spacing: { before: i === 0 ? 80 : 0, after: i === lines.length - 1 ? 120 : 0, line: 240 },
    shading: { type: ShadingType.CLEAR, fill: CODE_FILL, color: "auto" },
    indent: { left: 0 },
    children: [new TextRun({ text: line.length ? line : " ", font: MONO, size: 13 })],
  }));
}

function list(t, level, out) {
  t.items.forEach((item, idx) => {
    let first = true;
    for (const b of item.tokens) {
      if (b.type === "list") { list(b, level + 1, out); continue; }
      const runs = b.type === "text" || b.type === "paragraph" ? inline(b.tokens || [{ type: "text", text: b.text }]) : [];
      if (!runs.length && b.type !== "text") { out.push(...block(b)); continue; }
      if (item.task) runs.unshift(new TextRun({ text: item.checked ? "☑ " : "☐ ", font: FONT }));
      out.push(new Paragraph({
        numbering: first ? { reference: t.ordered ? "numbers" : "bullets", level, instance: t.ordered ? numInstance : undefined } : undefined,
        indent: first ? undefined : { left: 720 * (level + 1) },
        spacing: { before: 0, after: 60 },
        children: runs,
      }));
      first = false;
    }
  });
}
let numInstance = 0;

function block(t) {
  switch (t.type) {
    case "heading": {
      // "Sources" sections stay out of the table of contents
      const lvl = t.text.trim() === "Sources" ? 3 : Math.min(t.depth, 4);
      const p = new Paragraph({ heading: HEADINGS[lvl], pageBreakBefore: lvl === 1, children: inline(t.tokens) });
      return [p];
    }
    case "paragraph": return [new Paragraph({ spacing: { after: 120 }, children: inline(t.tokens) })];
    case "list": { if (t.ordered) numInstance++; const out = []; list(t, 0, out); return out; }
    case "table": return [table(t), new Paragraph({ spacing: { after: 80 }, children: [] })];
    case "code": return code(t);
    case "blockquote": {
      const out = [];
      for (const b of t.tokens) {
        if (b.type !== "paragraph") continue;
        out.push(new Paragraph({
          spacing: { after: 120 }, indent: { left: 360 },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
          children: inline(b.tokens, { italics: true, color: "404040" }),
        }));
      }
      return out;
    }
    case "space": case "hr": case "html": return [];
    default: return t.text ? [new Paragraph({ children: [new TextRun(decode(t.text))] })] : [];
  }
}

// ---- appendix A: condensed module inventory from JSON ----
function inventoryAppendix() {
  const data = JSON.parse(fs.readFileSync(path.join(DOCS, "reference/module-inventory.json"), "utf8"));
  const apps = data.applications;
  const mods = apps.flatMap(a => a.modules);
  let md = `# Appendix A — Module inventory\n\nGenerated from the FOLIO platform descriptor \`${data.platform_version}\` by ` +
    "`docs/tools/module_inventory.py`. Full interface lists: `docs/reference/module-inventory.md`.\n\n" +
    `**${apps.length} applications · ${mods.length} backend/edge modules · ` +
    `${apps.reduce((s, a) => s + a.ui_modules.length, 0)} UI modules**\n\n` +
    "## Applications\n\n| Application | Required | Backend | UI | Depends on |\n|---|---|---|---|---|\n";
  for (const a of apps)
    md += `| ${a.name} | ${a.kind === "required" ? "yes" : "optional"} | ${a.modules.length} | ${a.ui_modules.length} | ${a.dependencies.join(", ") || "—"} |\n`;
  md += "\n## Backend modules per application\n\n";
  for (const a of apps) {
    if (!a.modules.length) continue;
    md += `### ${a.name}\n\n| Module | Description | EP | Memory | Kafka |\n|---|---|---|---|---|\n`;
    for (const m of [...a.modules].sort((x, y) => x.name.localeCompare(y.name)))
      md += `| \`${m.name}\` | ${m.description.replace(/\|/g, "/")} | ${m.endpoints} | ${m.memory_mb ? m.memory_mb + " MB" : "—"} | ${m.uses_kafka ? "✓" : ""} |\n`;
    md += "\n";
  }
  return md;
}

// ---- assemble ----
const children = [];
// title page
children.push(
  new Paragraph({ spacing: { before: 3000, after: 200 }, children: [new TextRun({ text: "FOLIO", font: FONT, size: 72, bold: true, color: ACCENT })] }),
  new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: "Evaluation & Technical Guide", font: FONT, size: 40, color: "404040" })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "The open-source Library Services Platform: overview, architecture, every module, extension, performance, and Drupal integration", font: FONT, size: 24 })] }),
  new Paragraph({ spacing: { before: 1200, after: 60 }, children: [new TextRun({ text: "Prepared by: Mohammad Shams", font: FONT, size: 22 })] }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Date: 2026-11-10 · Draft for review", font: FONT, size: 22 })] }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Basis: FOLIO R1-2027 snapshot (Eureka platform), current release Trillium (R1 2026)", font: FONT, size: 22 })] }),
  new Paragraph({ spacing: { before: 600 }, children: [
    new TextRun({ text: "Markers: ", font: FONT, size: 20, bold: true }),
    new TextRun({ text: "[tested] = verified hands-on (demo server, local install, Drupal prototype); [docs] = from FOLIO documentation or published sources.", font: FONT, size: 20 })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Contents", font: FONT, size: 36, bold: true, color: ACCENT })] }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
);

const sources = FILES.map(f => fs.readFileSync(path.join(DOCS, f), "utf8"));
sources.push(inventoryAppendix());
for (const md of sources) for (const tok of marked.lexer(md)) children.push(...block(tok));

const heading = (size, before, after, color = ACCENT) => ({
  run: { font: FONT, size, bold: true, color }, paragraph: { spacing: { before, after }, keepNext: true, keepLines: true },
});

const doc = new Document({
  creator: "Mohammad Shams",
  title: "FOLIO Evaluation & Technical Guide",
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { line: 276 } } },
      heading1: heading(36, 240, 160),
      heading2: heading(28, 280, 120),
      heading3: heading(24, 200, 80, "2E74B5"),
      heading4: heading(22, 160, 60, "404040"),
    },
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [0, 1, 2].map(level => ({
        level, format: LevelFormat.BULLET, text: ["•", "◦", "▪"][level], alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })) },
      { reference: "numbers", levels: [0, 1, 2].map(level => ({
        level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })) },
    ],
  },
  sections: [{
    properties: { titlePage: true, page: { size: { width: PAGE_W, height: 16838 }, margin: { top: 1152, bottom: 1152, left: MARGIN, right: MARGIN } } },
    headers: { first: new Header({ children: [new Paragraph({ children: [] })] }), default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "FOLIO Evaluation & Technical Guide", font: FONT, size: 16, color: "808080" })] })] }) },
    footers: { first: new Footer({ children: [new Paragraph({ children: [] })] }), default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: "808080" })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log("Wrote", OUT, (buf.length / 1024).toFixed(0) + " KB"); });
