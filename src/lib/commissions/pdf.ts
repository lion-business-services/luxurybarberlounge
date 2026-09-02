import "server-only";

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function ascii(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
}

function money(cents: unknown) {
  const value = typeof cents === "number" ? cents : Number(cents ?? 0);
  return `$${(Number.isFinite(value) ? value : 0 / 100).toFixed ? (Number.isFinite(value) ? value / 100 : 0).toFixed(2) : "0.00"}`;
}

function pct(rate: unknown) {
  const value = Number(rate ?? 0);
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

function date(value: unknown) {
  const raw = text(value);
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString("en-US", { timeZone: "America/New_York" });
}

function escapePdf(value: string) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: string, width = 108) {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) current = next;
    else {
      if (current) lines.push(current);
      current = word.length <= width ? word : word.slice(0, width);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export type CommissionPdfInput = {
  statements: Row[];
  calculations: Row[];
  generatedAt?: Date;
};

export function buildCommissionPdf(input: CommissionPdfInput) {
  const generatedAt = input.generatedAt ?? new Date();
  const statementOrder = [...input.statements].sort((a, b) => text(a.barber_name).localeCompare(text(b.barber_name)));
  const lines: string[] = [
    "LUXURY BARBER LOUNGE",
    "BARBER COMMISSION & PAY STATEMENT",
    `Generated: ${generatedAt.toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
    "",
    "Policy: verified existing/barber-owned clients = 100% barber share; new/shop clients use the active commission rule.",
    "Tips are shown separately and included according to the active commission policy.",
    "",
  ];

  for (const statement of statementOrder) {
    const barberId = text(statement.barber_user_id);
    const periodId = text(statement.settlement_period_id);
    const statementLines = input.calculations
      .filter((row) => text(row.barber_user_id) === barberId && (!periodId || text(row.settlement_period_id) === periodId))
      .sort((a, b) => text(a.calculated_at).localeCompare(text(b.calculated_at)));
    const shopTotal = statementLines.reduce((sum, row) => sum + Number(row.shop_amount_cents ?? 0), 0);
    const barberTotal = statementLines.reduce((sum, row) => sum + Number(row.barber_amount_cents ?? 0), 0);

    lines.push("============================================================");
    lines.push(`Barber: ${text(statement.barber_name) || "Barber"}`);
    lines.push(`Period: ${text(statement.period_label) || "Weekly statement"}`);
    lines.push(`Statement status: ${text(statement.status) || "provisional"}`);
    if (statement.paid_at) {
      lines.push(`Payout: PAID ${date(statement.paid_at)} | ${text(statement.payout_method) || "paid"}${statement.payout_reference ? ` | Ref ${text(statement.payout_reference)}` : ""}`);
    } else {
      lines.push("Payout: UNPAID / READY FOR OWNER REVIEW");
    }
    lines.push(`Commission basis: ${money(statement.gross_basis_cents)} | Tips: ${money(statement.tips_cents)} | Adjustments: ${money(statement.adjustments_cents)}`);
    lines.push(`Barber share: ${money(barberTotal)} | Shop share: ${money(shopTotal)} | Amount due: ${money(statement.final_amount_cents)}`);
    lines.push("");
    lines.push("DATE | CLIENT | SERVICE | PAY | ATTRIBUTION | RATE | BASIS | BARBER | SHOP | RECEIPT");
    lines.push("--------------------------------------------------------------------------------------------");

    for (const row of statementLines) {
      const receipt = text(row.receipt_number) || text(row.public_reference) || "-";
      const source = text(row.attribution_source).replaceAll("_", " ");
      const attribution = text(row.attribution_type) === "BARBER" ? `EXISTING / BARBER (${source})` : `SHOP / NEW (${source})`;
      const raw = `${date(row.calculated_at)} | ${text(row.client_name) || "Client"} | ${text(row.service_name) || "Service"} | ${text(row.payment_method).toUpperCase() || "-"} | ${attribution} | ${pct(row.barber_rate)} | ${money(row.eligible_basis_cents)} | ${money(row.barber_amount_cents)} | ${money(row.shop_amount_cents)} | ${receipt}`;
      lines.push(...wrap(raw));
    }
    if (!statementLines.length) lines.push("No transaction lines are attached to this statement.");
    lines.push("");
  }

  if (!statementOrder.length) lines.push("No commission statements are available yet.");

  const pageChunks: string[][] = [];
  const perPage = 52;
  for (let index = 0; index < lines.length; index += perPage) pageChunks.push(lines.slice(index, index + perPage));
  if (!pageChunks.length) pageChunks.push(["No statement data."]);

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  let nextId = 4;
  for (let index = 0; index < pageChunks.length; index += 1) {
    pageObjectIds.push(nextId++);
    contentObjectIds.push(nextId++);
  }

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pageChunks.forEach((pageLines, index) => {
    const pageId = pageObjectIds[index];
    const contentId = contentObjectIds[index];
    const streamLines = pageLines.map((line) => `(${escapePdf(line)}) Tj T*`).join("\n");
    const stream = `BT\n/F1 8 Tf\n40 758 Td\n11 TL\n${streamLines}\nET`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  let pdf = "%PDF-1.4\n%LBL1\n";
  const offsets = new Array(objects.length).fill(0);
  for (let id = 1; id < objects.length; id += 1) {
    if (!objects[id]) continue;
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
