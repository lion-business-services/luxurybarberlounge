import "server-only";

type Row = Record<string, unknown>;
type Column = { label: string; key: string; width: number; align?: "left" | "right" };

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function ascii(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
}

function money(cents: unknown) {
  const value = typeof cents === "number" ? cents : Number(cents ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  return `$${(safe / 100).toFixed(2)}`;
}

function pct(rate: unknown) {
  const value = Number(rate ?? 0);
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

function date(value: unknown) {
  const raw = text(value);
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? raw
    : parsed.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
}

function dateKey(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function escapePdf(value: string) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function fit(value: string, width: number, fontSize = 6.5) {
  const safe = ascii(value).replace(/\s+/g, " ").trim();
  const maxChars = Math.max(3, Math.floor(width / (fontSize * 0.53)));
  if (safe.length <= maxChars) return safe;
  return `${safe.slice(0, Math.max(1, maxChars - 3))}...`;
}

function statusLabel(statement: Row) {
  if (statement.paid_at || text(statement.status) === "paid") return "PAID";
  if (["review", "provisional"].includes(text(statement.status))) return "READY TO REVIEW";
  return text(statement.status).replaceAll("_", " ").toUpperCase() || "READY TO REVIEW";
}

function addText(commands: string[], value: string, x: number, y: number, size = 8, bold = false) {
  commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapePdf(value)}) Tj ET`);
}

function addRightText(commands: string[], value: string, rightX: number, y: number, size = 8, bold = false) {
  const estimate = ascii(value).length * size * 0.5;
  addText(commands, value, Math.max(0, rightX - estimate), y, size, bold);
}

function addLine(commands: string[], x1: number, y1: number, x2: number, y2: number, gray = 0.78, width = 0.5) {
  commands.push(`q ${gray} G ${width} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S Q`);
}

function addRect(commands: string[], x: number, y: number, width: number, height: number, gray = 0.78) {
  commands.push(`q ${gray} G 0.5 w ${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re S Q`);
}

function addSummaryBox(commands: string[], x: number, y: number, width: number, label: string, value: string) {
  addRect(commands, x, y, width, 42, 0.72);
  addText(commands, label.toUpperCase(), x + 8, y + 27, 6.5, false);
  addText(commands, value, x + 8, y + 10, 12, true);
}

function addTable(commands: string[], x: number, topY: number, columns: Column[], rows: Array<Record<string, string>>, rowHeight = 17, fontSize = 6.2) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const bottom = topY - rowHeight * (rows.length + 1);
  addRect(commands, x, bottom, totalWidth, rowHeight * (rows.length + 1), 0.7);
  addLine(commands, x, topY - rowHeight, x + totalWidth, topY - rowHeight, 0.55, 0.7);

  let cursorX = x;
  columns.forEach((column, index) => {
    if (index > 0) addLine(commands, cursorX, bottom, cursorX, topY, 0.82, 0.4);
    const label = fit(column.label, column.width - 8, 6.1);
    if (column.align === "right") addRightText(commands, label, cursorX + column.width - 4, topY - 11.5, 6.1, true);
    else addText(commands, label, cursorX + 4, topY - 11.5, 6.1, true);
    cursorX += column.width;
  });

  rows.forEach((row, rowIndex) => {
    const rowTop = topY - rowHeight * (rowIndex + 1);
    const rowBottom = rowTop - rowHeight;
    addLine(commands, x, rowBottom, x + totalWidth, rowBottom, 0.88, 0.35);
    let cellX = x;
    for (const column of columns) {
      const value = fit(row[column.key] ?? "", column.width - 8, fontSize);
      if (column.align === "right") addRightText(commands, value, cellX + column.width - 4, rowBottom + 5.5, fontSize, false);
      else addText(commands, value, cellX + 4, rowBottom + 5.5, fontSize, false);
      cellX += column.width;
    }
  });

  return bottom;
}

export type CommissionPdfInput = {
  statements: Row[];
  calculations: Row[];
  generatedAt?: Date;
};

export function buildCommissionPdf(input: CommissionPdfInput) {
  const generatedAt = input.generatedAt ?? new Date();
  const statementOrder = [...input.statements].sort((a, b) => text(a.barber_name).localeCompare(text(b.barber_name)));
  const pages: string[] = [];

  const transactionColumns: Column[] = [
    { label: "Date", key: "date", width: 48 },
    { label: "Client", key: "client", width: 78 },
    { label: "Service", key: "service", width: 72 },
    { label: "Pay", key: "pay", width: 38 },
    { label: "Basis", key: "basis", width: 51, align: "right" },
    { label: "Barber %", key: "barberRate", width: 43, align: "right" },
    { label: "Barber share", key: "barber", width: 56, align: "right" },
    { label: "Shop %", key: "shopRate", width: 42, align: "right" },
    { label: "Shop share", key: "shop", width: 55, align: "right" },
    { label: "Tips", key: "tips", width: 44, align: "right" },
    { label: "Attribution", key: "attribution", width: 72 },
    { label: "Receipt", key: "receipt", width: 103 },
  ];

  const dailyColumns: Column[] = [
    { label: "Day", key: "day", width: 102 },
    { label: "Transactions", key: "count", width: 76, align: "right" },
    { label: "Basis", key: "basis", width: 105, align: "right" },
    { label: "Barber share", key: "barber", width: 105, align: "right" },
    { label: "Shop share", key: "shop", width: 105, align: "right" },
    { label: "Tips", key: "tips", width: 105, align: "right" },
  ];

  if (!statementOrder.length) {
    const commands: string[] = [];
    addText(commands, "LUXURY BARBER LOUNGE", 34, 560, 18, true);
    addText(commands, "COMMISSION STATEMENT", 34, 536, 12, true);
    addText(commands, "No commission statements are available yet.", 34, 500, 10, false);
    pages.push(commands.join("\n"));
  }

  for (const statement of statementOrder) {
    const barberId = text(statement.barber_user_id);
    const periodId = text(statement.settlement_period_id);
    const statementLines = input.calculations
      .filter((row) => text(row.barber_user_id) === barberId && (!periodId || text(row.settlement_period_id) === periodId))
      .sort((a, b) => text(a.transaction_at ?? a.calculated_at).localeCompare(text(b.transaction_at ?? b.calculated_at)));

    const barberTotal = statementLines.reduce((sum, row) => sum + Number(row.barber_amount_cents ?? 0), 0);
    const shopTotal = statementLines.reduce((sum, row) => sum + Number(row.shop_amount_cents ?? 0), 0);
    const tipsTotal = statementLines.reduce((sum, row) => sum + Number(row.tip_cents ?? 0), 0);
    const basisTotal = statementLines.reduce((sum, row) => sum + Number(row.eligible_basis_cents ?? 0), 0);

    const daily = new Map<string, { count: number; basis: number; barber: number; shop: number; tips: number }>();
    for (const row of statementLines) {
      const key = dateKey(row.transaction_at ?? row.calculated_at) || date(row.transaction_at ?? row.calculated_at);
      const current = daily.get(key) ?? { count: 0, basis: 0, barber: 0, shop: 0, tips: 0 };
      current.count += 1;
      current.basis += Number(row.eligible_basis_cents ?? 0);
      current.barber += Number(row.barber_amount_cents ?? 0);
      current.shop += Number(row.shop_amount_cents ?? 0);
      current.tips += Number(row.tip_cents ?? 0);
      daily.set(key, current);
    }

    const dailyRows = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, totals]) => ({
      day: date(`${key}T12:00:00Z`),
      count: String(totals.count),
      basis: money(totals.basis),
      barber: money(totals.barber),
      shop: money(totals.shop),
      tips: money(totals.tips),
    }));

    const transactionRows = statementLines.map((row) => ({
      date: date(row.transaction_at ?? row.calculated_at),
      client: text(row.client_name) || "Client",
      service: text(row.service_name) || "Service",
      pay: text(row.payment_method).toUpperCase() || "-",
      basis: money(row.eligible_basis_cents),
      barberRate: pct(row.barber_rate),
      barber: money(row.barber_amount_cents),
      shopRate: pct(row.shop_rate),
      shop: money(row.shop_amount_cents),
      tips: money(row.tip_cents),
      attribution: text(row.attribution_type) === "BARBER" ? "BARBER CLIENT" : "SHOP / NEW",
      receipt: text(row.receipt_number) || text(row.public_reference) || "-",
    }));

    const chunks: Array<Array<Record<string, string>>> = [];
    const perPage = 14;
    for (let index = 0; index < transactionRows.length; index += perPage) chunks.push(transactionRows.slice(index, index + perPage));
    if (!chunks.length) chunks.push([]);

    chunks.forEach((chunk, pageIndex) => {
      const commands: string[] = [];
      addText(commands, "LUXURY BARBER LOUNGE", 30, 578, 16, true);
      addText(commands, "WEEKLY COMMISSION STATEMENT", 30, 557, 10, true);
      addRightText(commands, `Generated ${generatedAt.toLocaleString("en-US", { timeZone: "America/New_York" })} ET`, 762, 578, 7, false);
      addRightText(commands, `Page ${pageIndex + 1} of ${chunks.length}`, 762, 562, 7, false);
      addLine(commands, 30, 548, 762, 548, 0.55, 0.8);

      addText(commands, text(statement.barber_name) || "Barber", 30, 525, 13, true);
      addText(commands, text(statement.period_label) || "Weekly statement", 30, 508, 8, false);
      addRightText(commands, statusLabel(statement), 762, 525, 9, true);
      if (statement.paid_at) {
        const payout = `${text(statement.payout_method) || "paid"}${statement.payout_reference ? ` · ${text(statement.payout_reference)}` : ""}`;
        addRightText(commands, `Paid ${date(statement.paid_at)} · ${payout}`, 762, 508, 7, false);
      } else {
        addRightText(commands, "Continuously updated until payout is recorded", 762, 508, 7, false);
      }

      const boxWidth = 137;
      addSummaryBox(commands, 30, 455, boxWidth, "Commission basis", money(statement.gross_basis_cents ?? basisTotal));
      addSummaryBox(commands, 177, 455, boxWidth, "Barber share", money(barberTotal));
      addSummaryBox(commands, 324, 455, boxWidth, "Shop share", money(shopTotal));
      addSummaryBox(commands, 471, 455, boxWidth, "Tips", money(statement.tips_cents ?? tipsTotal));
      addSummaryBox(commands, 618, 455, 144, "Amount due", money(statement.final_amount_cents));

      addText(commands, "DAILY SHARE BREAKDOWN", 30, 435, 7.5, true);
      const dailyBottom = addTable(commands, 30, 424, dailyColumns, dailyRows.slice(0, 7), 14, 6.2);

      const transactionTitleY = dailyBottom - 18;
      addText(commands, `TRANSACTION DETAIL${chunks.length > 1 ? ` · PAGE ${pageIndex + 1}` : ""}`, 30, transactionTitleY, 7.5, true);
      const transactionTop = transactionTitleY - 10;
      addTable(commands, 30, transactionTop, transactionColumns, chunk, 17, 6.0);

      addText(commands, `Transactions in statement: ${statementLines.length} · Barber share: ${money(barberTotal)} · Shop share: ${money(shopTotal)} · Combined allocated: ${money(barberTotal + shopTotal)}`, 30, 24, 6.8, true);
      addRightText(commands, "Luxury Barber Lounge · Northfield, NJ", 762, 24, 6.8, false);
      pages.push(commands.join("\n"));
    });
  }

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontRegularId = 3;
  const fontBoldId = 4;
  let nextId = 5;

  for (let index = 0; index < pages.length; index += 1) {
    pageObjectIds.push(nextId++);
    contentObjectIds.push(nextId++);
  }

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  objects[fontRegularId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[fontBoldId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pages.forEach((stream, index) => {
    const pageId = pageObjectIds[index];
    const contentId = contentObjectIds[index];
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  let pdf = "%PDF-1.4\n%LBL2\n";
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