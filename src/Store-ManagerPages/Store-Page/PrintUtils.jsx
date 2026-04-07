// PrintUtils.jsx — call these from Print buttons

export function printInvoiceDetails(inv) {
  const items = inv.items || [];
  const totalQty = items.reduce((s, i) => s + (i.newReceived || i.invoiceQty || 0), 0);

  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      });
    } catch { return isoStr; }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch { return isoStr; }
  };

  const issueItems = items.filter((i) => i.issue && i.issue !== "");
  const damagedItems = items.filter((i) => (i.damagedQty || 0) > 0);

  const rows = items.map((item, idx) => {
    const phys = item.physicalQty ?? item.newReceived ?? item.invoiceQty ?? 0;
    const inv2 = item.newReceived || item.invoiceQty || 0;
    const ordered = item.orderedQty || item.quantity || 0;
    const total = (item.alreadyReceived || 0) + phys;
    const status =
      total === 0 ? "Ordered"
      : total < ordered ? "Partial"
      : total === ordered ? "Complete"
      : "Excess";
    const statusColor =
      status === "Complete" ? "#16a34a"
      : status === "Partial" ? "#ea580c"
      : status === "Excess" ? "#9333ea"
      : "#2563eb";

    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 10px;color:#64748b;font-size:12px;">${idx + 1}</td>
        <td style="padding:8px 10px;font-family:monospace;font-weight:700;font-size:12px;color:#1e293b;">${item.productCode || "—"}</td>
        <td style="padding:8px 10px;font-size:12px;color:#475569;max-width:200px;">${item.description || "—"}</td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;color:#64748b;">${item.unit || "pcs"}</td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;">${ordered}</td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;">${inv2}</td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:#4f46e5;">${phys}</td>
        <td style="padding:8px 10px;text-align:center;">
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}40;">${status}</span>
        </td>
        ${item.issue
          ? `<td style="padding:8px 10px;text-align:center;font-size:11px;color:#dc2626;font-weight:700;">${item.issue.replace("_", " ")}${item.damagedQty > 0 ? ` (${item.damagedQty} dmg)` : ""}</td>`
          : `<td style="padding:8px 10px;text-align:center;font-size:11px;color:#94a3b8;">—</td>`}
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice QC Report — ${inv.invoiceNo || "—"}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#1e293b; padding:24px 32px; }
    @media print { body { padding: 12px 20px; } .no-print { display:none; } }
    h1 { font-size:20px; font-weight:900; color:#1e293b; }
    h2 { font-size:13px; font-weight:700; color:#475569; margin-top:2px; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    thead tr { background:#f8fafc; border-bottom:2px solid #e2e8f0; }
    th { padding:8px 10px; font-size:11px; font-weight:700; text-transform:uppercase; color:#64748b; text-align:left; }
    th.center { text-align:center; }
    .badge { display:inline-block; font-size:10px; font-weight:700; padding:2px 10px; border-radius:9999px; }
    .approved { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
    .label { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; margin-bottom:2px; }
    .value { font-size:13px; font-weight:700; color:#1e293b; }
    .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin:16px 0; }
    .summary-box { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 16px; margin-top:12px; }
    .issue-box { background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:12px 16px; margin-top:12px; }
    .footer { margin-top:24px; border-top:1px solid #e2e8f0; padding-top:12px; color:#94a3b8; font-size:11px; display:flex; justify-content:space-between; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
    <div>
      <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Store Quality Check — Purchase Order</div>
      <h1>Invoice: ${inv.invoiceNo || "—"}</h1>
      <h2>PO: ${inv.linkedPoNo || "—"} &nbsp;·&nbsp; ${inv.vendor || "—"}</h2>
    </div>
    <div style="text-align:right;">
      <span class="badge approved">✅ QC Approved</span>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Printed: ${formatDateTime(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="grid">
    <div><div class="label">Invoice No</div><div class="value">${inv.invoiceNo || "—"}</div></div>
    <div><div class="label">Invoice Date</div><div class="value">${formatDate(inv.invoiceDate)}</div></div>
    <div><div class="label">PO Number</div><div class="value">${inv.linkedPoNo || "—"}</div></div>
    <div><div class="label">Vendor</div><div class="value">${inv.vendor || "—"}</div></div>
    <div><div class="label">Total Items</div><div class="value">${items.length}</div></div>
    <div><div class="label">Total Units</div><div class="value">${totalQty}</div></div>
    <div><div class="label">QC Status</div><div class="value" style="color:#16a34a;">${inv.storeQcStatus?.replace(/_/g, " ") || "Approved"}</div></div>
    <div><div class="label">Approved On</div><div class="value">${formatDate(inv.storeQcApprovedAt)}</div></div>
  </div>

  <div style="font-size:13px;font-weight:700;color:#475569;margin-top:16px;margin-bottom:4px;">📦 Item-wise Receipt Details</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Part No</th><th>Description</th>
        <th class="center">Unit</th><th class="center">Ordered</th>
        <th class="center">Invoice Qty</th><th class="center">Physical</th>
        <th class="center">Status</th><th class="center">Issue</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${issueItems.length > 0 ? `
  <div class="issue-box">
    <div style="font-size:12px;font-weight:700;color:#c2410c;margin-bottom:8px;">⚠️ Items with Issues (${issueItems.length})</div>
    ${issueItems.map((i) => `
      <div style="display:flex;gap:12px;font-size:12px;color:#92400e;margin-top:4px;">
        <span style="font-family:monospace;font-weight:700;">${i.productCode}</span>
        <span style="text-transform:capitalize;">${i.issue?.replace("_", " ")}</span>
        ${i.damagedQty > 0 ? `<span style="color:#dc2626;font-weight:700;">${i.damagedQty} damaged</span>` : ""}
        ${i.issueDetail ? `<span style="color:#78350f;">— ${i.issueDetail}</span>` : ""}
      </div>`).join("")}
  </div>` : ""}

  ${inv.remarks ? `
  <div class="summary-box" style="margin-top:12px;">
    <div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:4px;">REMARKS</div>
    <div style="font-size:13px;color:#1e293b;">${inv.remarks}</div>
  </div>` : ""}

  <div class="footer">
    <span>Approved by: ${inv.storeQcApprovedBy || "Store Team"}</span>
    <span>Quality Check: ${inv.qualityCheck?.replace(/_/g, " ") || "Passed"}</span>
    <span>fib-2-fab ERP · Store Module</span>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export function printSODetails(so) {
  const header = so.excelHeader || so.invoiceHeader || {};
  const soNumber =
    header.reference || so.invoiceNo || so.woNumber ||
    `SO-${so.id?.slice(0, 8).toUpperCase()}`;
  const customer = so.customer || header.consignee || header.buyer || "—";
  const deliveryDate = so.deliveryDate || header.dated || so.eta || "";
  const items = so.items || [];
  const totalQty = items.reduce((s, i) => s + (i.quantity || i.orderedQty || 0), 0);

  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      });
    } catch { return isoStr; }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch { return isoStr; }
  };

  const rows = items.map((item, idx) => {
    const ordered = item.quantity || item.orderedQty || 0;
    const ready = item.soQcReadyQty ?? ordered;
    const shortage = Math.max(0, ordered - ready);
    const status = ready === 0 ? "Pending" : ready < ordered ? "Partial" : "Complete";
    const statusColor =
      status === "Complete" ? "#16a34a"
      : status === "Partial" ? "#ea580c"
      : "#2563eb";

    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 10px;color:#64748b;font-size:12px;">${idx + 1}</td>
        <td style="padding:8px 10px;font-family:monospace;font-weight:700;font-size:12px;color:#1e293b;">${item.productCode || "—"}</td>
        <td style="padding:8px 10px;font-size:12px;color:#475569;max-width:200px;">${item.description || "—"}</td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;color:#64748b;">${item.unit || "pcs"}</td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;">${ordered}</td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:#16a34a;">${ready}</td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:${shortage > 0 ? "#ea580c" : "#16a34a"};">${shortage > 0 ? shortage : "—"}</td>
        <td style="padding:8px 10px;text-align:center;">
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}40;">${status}</span>
        </td>
        ${item.soQcIssue
          ? `<td style="padding:8px 10px;text-align:center;font-size:11px;color:#dc2626;font-weight:700;">${item.soQcIssue.replace("_", " ")}</td>`
          : `<td style="padding:8px 10px;text-align:center;font-size:11px;color:#94a3b8;">—</td>`}
      </tr>`;
  }).join("");

  const totalReady = items.reduce(
    (s, i) => s + (i.soQcReadyQty ?? (i.quantity || i.orderedQty || 0)), 0
  );
  const totalShortage = items.reduce(
    (s, i) => s + Math.max(0, (i.quantity || i.orderedQty || 0) - (i.soQcReadyQty ?? (i.quantity || i.orderedQty || 0))), 0
  );

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>SO QC Report — ${soNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#1e293b; padding:24px 32px; }
    @media print { body { padding: 12px 20px; } .no-print { display:none; } }
    h1 { font-size:20px; font-weight:900; color:#1e293b; }
    h2 { font-size:13px; font-weight:700; color:#475569; margin-top:2px; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    thead tr { background:#f8fafc; border-bottom:2px solid #e2e8f0; }
    th { padding:8px 10px; font-size:11px; font-weight:700; text-transform:uppercase; color:#64748b; text-align:left; }
    th.center { text-align:center; }
    .badge { display:inline-block; font-size:10px; font-weight:700; padding:2px 10px; border-radius:9999px; }
    .approved { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
    .label { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; margin-bottom:2px; }
    .value { font-size:13px; font-weight:700; color:#1e293b; }
    .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin:16px 0; }
    .footer { margin-top:24px; border-top:1px solid #e2e8f0; padding-top:12px; color:#94a3b8; font-size:11px; display:flex; justify-content:space-between; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
    <div>
      <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Store Quality Check — Sales Order</div>
      <h1>SO: ${soNumber}</h1>
      <h2>${customer}</h2>
    </div>
    <div style="text-align:right;">
      <span class="badge approved">✅ Ready for Dispatch</span>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Printed: ${formatDateTime(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="grid">
    <div><div class="label">SO Number</div><div class="value">${soNumber}</div></div>
    <div><div class="label">Customer</div><div class="value">${customer}</div></div>
    <div><div class="label">Delivery Date</div><div class="value">${formatDate(deliveryDate)}</div></div>
    <div><div class="label">SO Status</div><div class="value" style="color:#16a34a;">${so.soStatus?.replace(/_/g, " ") || "Ready for Dispatch"}</div></div>
    <div><div class="label">Total Items</div><div class="value">${items.length}</div></div>
    <div><div class="label">Total Qty</div><div class="value">${totalQty}</div></div>
    <div><div class="label">Ready for Dispatch</div><div class="value" style="color:#16a34a;">${totalReady}</div></div>
    <div><div class="label">Shortage</div><div class="value" style="color:${totalShortage > 0 ? "#ea580c" : "#16a34a"};">${totalShortage > 0 ? totalShortage : "None"}</div></div>
  </div>

  <div style="font-size:13px;font-weight:700;color:#475569;margin-top:16px;margin-bottom:4px;">📋 Item-wise Dispatch Readiness</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Part No</th><th>Description</th>
        <th class="center">Unit</th><th class="center">Ordered</th>
        <th class="center">Ready</th><th class="center">Shortage</th>
        <th class="center">Status</th><th class="center">Issue</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${so.soQcRemarks ? `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-top:12px;">
    <div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:4px;">REMARKS</div>
    <div style="font-size:13px;color:#1e293b;">${so.soQcRemarks}</div>
  </div>` : ""}

  <div class="footer">
    <span>Approved by: ${so.soQcApprovedBy || "Store Team"}</span>
    <span>QC Date: ${formatDate(so.soQcApprovedAt)}</span>
    <span>fib-2-fab ERP · Store Module</span>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}