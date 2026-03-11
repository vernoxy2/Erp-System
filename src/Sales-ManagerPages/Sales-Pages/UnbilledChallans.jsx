import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import * as XLSX from "xlsx";

function toInputDate(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy)
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const monShort = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (monShort) {
    const months = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const m = months[monShort[2].toLowerCase()];
    const yr = monShort[3].length === 2 ? "20" + monShort[3] : monShort[3];
    if (m) return `${yr}-${m}-${monShort[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return "";
}

// ── STATUS CONFIG (excess added) ─────────────────────────────────────────────
const STATUS_CFG = {
  complete: {
    label: "Complete",
    dot: "bg-emerald-500",
    tag: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  partial: {
    label: "Partial",
    dot: "bg-amber-400",
    tag: "bg-amber-50 text-amber-700 border-amber-200",
  },
  excess: {
    label: "Excess",
    dot: "bg-blue-500",
    tag: "bg-blue-50 text-blue-700 border-blue-200",
  },
  unbilled: {
    label: "Unbilled",
    dot: "bg-slate-400",
    tag: "bg-slate-100 text-slate-500 border-slate-200",
  },
  overdue: {
    label: "Overdue",
    dot: "bg-red-500",
    tag: "bg-red-50 text-red-700 border-red-200",
  },
};

function computeStatus(data) {
  if (data.billingStatus) return data.billingStatus;
  const invoiceNos = data.header?.invoiceNos || "";
  const hasInvoice = invoiceNos.trim().length > 0;
  const dueStr =
    data.header?.approxInvoiceDate || data.header?.approximateInvoiceDate || "";
  const isOverdue = dueStr ? new Date(dueStr) < new Date() : false;
  if (!hasInvoice && isOverdue) return "overdue";
  if (!hasInvoice) return "unbilled";
  const invoiceAmt = Number(data.invoiceAmount || 0);
  const challanAmt = Number(data.totalAmount || 0);
  if (challanAmt > 0 && invoiceAmt >= challanAmt) return "complete";
  if (invoiceAmt > 0) return "partial";
  return "unbilled";
}

// ── ICONS ────────────────────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const EyeIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const BackIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const CheckIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ChevDown = () => (
  <svg
    className="w-4 h-4 text-slate-400 pointer-events-none"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const Spinner = () => (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);
const ExcelIcon = () => (
  <svg
    className="w-5 h-5 text-emerald-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
  </svg>
);

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.unbilled;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.tag}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── SUMMARY CARDS (excess added) ─────────────────────────────────────────────
function SummaryCards({ challans }) {
  const counts = challans.reduce((a, c) => {
    a[c._status] = (a[c._status] || 0) + 1;
    return a;
  }, {});
  const pending = challans
    .filter((c) => c._status !== "complete")
    .reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
  const fmt = (v) =>
    v >= 10000000
      ? `₹${(v / 10000000).toFixed(1)}Cr`
      : v >= 100000
        ? `₹${(v / 100000).toFixed(1)}L`
        : v >= 1000
          ? `₹${(v / 1000).toFixed(1)}k`
          : `₹${v}`;
  const cards = [
    {
      label: "UNBILLED",
      value: counts.unbilled || 0,
      icon: "🧾",
      grad: "from-slate-500 to-slate-700",
    },
    {
      label: "OVERDUE",
      value: counts.overdue || 0,
      icon: "⏰",
      grad: "from-rose-500 to-red-700",
    },
    {
      label: "PARTIAL",
      value: counts.partial || 0,
      icon: "🔄",
      grad: "from-amber-400 to-orange-500",
    },
    {
      label: "EXCESS",
      value: counts.excess || 0,
      icon: "🔵",
      grad: "from-blue-400 to-blue-600",
    },
    {
      label: "PENDING VALUE",
      value: fmt(pending),
      icon: "💰",
      grad: "from-violet-500 to-indigo-600",
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200"
        >
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.grad} flex items-center justify-center shadow-sm flex-shrink-0 text-2xl`}
          >
            {card.icon}
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">
              {card.value}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-1 tracking-wide">
              {card.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChallanDetailModal({ challan, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">
              {challan.challanNo || challan.id}
            </h3>
            <p className="text-xs text-slate-400">
              {challan.header?.customer || challan.header?.companyName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={challan._status} />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Challan No", challan.challanNo],
              ["Date", challan.header?.challanDate],
              [
                "Customer",
                challan.header?.customer || challan.header?.companyName,
              ],
              ["Due Date", challan.header?.approxInvoiceDate],
              ["Destination", challan.header?.destination],
              ["GSTIN", challan.header?.gstin],
              ["Address", challan.header?.address],
              ["Consignee", challan.header?.consignee],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-slate-400 mb-0.5">{k}</p>
                  <p className="font-semibold text-slate-700">{v}</p>
                </div>
              ))}
          </div>
          {challan.items?.length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-semibold uppercase">
                    <th className="px-3 py-2.5 text-left">Item</th>
                    <th className="px-3 py-2.5 text-left">Code</th>
                    <th className="px-3 py-2.5 text-left">Part No.</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="px-3 py-2.5 text-right">Rate</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {challan.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600">
                        {item.description || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-500 font-mono">
                        {item.productCode || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {item.dispatchQty || item.quantity || "—"}
                      </td>

                      <td className="px-3 py-2 text-right text-slate-600">
                        ₹{item.rate || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        ₹
                        {Number(item.total || item.amount || 0).toLocaleString(
                          "en-IN",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <div className="bg-slate-800 text-white rounded-xl px-5 py-3">
              <span className="text-xs text-slate-400 mr-3">Total Amount</span>
              <span className="text-lg font-black">
                ₹{Number(challan.totalAmount || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CHALLAN TABLE ─────────────────────────────────────────────────────────────
function ChallanTable({
  challans,
  loading,
  selectedIds,
  onToggle,
  onCreateInvoice,
  onView,
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = challans
    .filter((c) => statusFilter === "all" || c._status === statusFilter)
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (c.challanNo || "").toLowerCase().includes(q) ||
        (c.header?.customer || c.header?.companyName || "")
          .toLowerCase()
          .includes(q)
      );
    });

  const allSel =
    filtered.length > 0 &&
    filtered
      .filter((c) => c._status !== "complete")
      .every((c) => selectedIds.includes(c.id));

  const toggleAll = (checked) => {
    if (checked)
      filtered
        .filter((c) => c._status !== "complete")
        .forEach((c) => !selectedIds.includes(c.id) && onToggle(c.id));
    else filtered.forEach((c) => selectedIds.includes(c.id) && onToggle(c.id));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-base font-bold text-slate-800">All Challans</p>
          <p className="text-xs text-slate-400">{filtered.length} challans</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Challan, Customer…"
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-52"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="unbilled">Unbilled</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
              <option value="excess">Excess</option>
              <option value="complete">Complete</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevDown />
            </div>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={() => onCreateInvoice(selectedIds)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow hover:bg-indigo-700 transition-all"
            >
              <UploadIcon /> Create Invoice ({selectedIds.length})
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm">
            <Spinner /> Loading challans…
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded accent-indigo-600 cursor-pointer"
                    checked={allSel}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="px-5 py-3 text-left">Challan No.</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Part No</th>
                <th className="px-5 py-3 text-left">Customer Name</th>
                <th className="px-5 py-3 text-left">Approx Invoice Date</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ch) => {
                const sel = selectedIds.includes(ch.id);
                const isComplete = ch._status === "complete";
                return (
                  <tr
                    key={ch.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm ${sel ? "bg-indigo-50/40" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        className="rounded accent-indigo-600 cursor-pointer disabled:opacity-30"
                        checked={sel}
                        onChange={() => onToggle(ch.id)}
                        disabled={isComplete}
                      />
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {ch.challanNo || ch.id}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {ch.header?.challanDate || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {ch.partNo || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">
                      {ch.header?.customer || ch.header?.companyName || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {ch.header?.approxInvoiceDate ||
                        ch.header?.approximateInvoiceDate ||
                        "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {ch.totalAmount
                        ? `₹${Number(ch.totalAmount).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={ch._status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* Complete = no button, others = show button */}
                        {!isComplete && (
                          <button
                            onClick={() => onCreateInvoice([ch.id])}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
                          >
                            <UploadIcon /> Create Invoice
                          </button>
                        )}
                        <button
                          onClick={() => onView(ch)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                        >
                          <EyeIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-slate-400 text-sm">
                      No challans found for this filter
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── EXCEL PARSER ──────────────────────────────────────────────────────────────
function parseInvoiceExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const range = XLSX.utils.decode_range(ws["!ref"]);

        let docType = "";
        for (let col = 0; col <= range.e.c; col++) {
          const cell = ws[XLSX.utils.encode_cell({ r: 0, c: col })];
          if (cell?.v) {
            const v = String(cell.v).toUpperCase();
            if (v.includes("SALES INVOICE") || v.includes("TAX INVOICE")) {
              docType = "SALES_INVOICE";
              break;
            }
            if (v.includes("PURCHASE INVOICE")) {
              docType = "PURCHASE_INVOICE";
              break;
            }
          }
        }
        if (docType === "PURCHASE_INVOICE")
          return reject(
            new Error(
              "This is a Purchase Invoice! Please use Upload Vendor Invoice instead.",
            ),
          );

        const findVal = (keywords) => {
          for (let row = 0; row <= Math.min(40, range.e.r); row++) {
            for (let col = 0; col <= range.e.c; col++) {
              const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
              if (cell?.v) {
                const v = String(cell.v).toLowerCase();
                for (const kw of keywords) {
                  if (v.includes(kw.toLowerCase())) {
                    const r1 =
                      ws[XLSX.utils.encode_cell({ r: row, c: col + 1 })];
                    const r2 =
                      ws[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
                    const b1 =
                      ws[XLSX.utils.encode_cell({ r: row + 1, c: col })];
                    if (r1?.v) return String(r1.v);
                    if (b1?.v) return String(b1.v);
                    if (r2?.v) return String(r2.v);
                  }
                }
              }
            }
          }
          return "";
        };

        const invoiceNo = findVal([
          "Invoice No.",
          "Invoice No",
          "Bill No",
          "Voucher No",
        ]);
        const dated = findVal(["Dated", "Invoice Date", "Bill Date"]);
        const buyer = findVal(["Buyer", "Bill to"]);
        const consignee = findVal(["Consignee", "Ship to"]);
        const gstin = findVal(["GSTIN/UIN", "GSTIN"]);

        let tableStartRow = -1;
        for (let row = 0; row <= range.e.r; row++) {
          for (let col = 0; col <= range.e.c; col++) {
            const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
            if (cell?.v) {
              const v = String(cell.v).toLowerCase();
              if (
                v.includes("description of goods") ||
                v === "sl" ||
                v === "si"
              ) {
                tableStartRow = row;
                break;
              }
            }
          }
          if (tableStartRow !== -1) break;
        }
        if (tableStartRow === -1)
          return reject(new Error("Item table not found in Invoice Excel"));

        let descCol = -1,
          hsnCol = -1,
          partCol = -1,
          qtyCol = -1,
          amtCol = -1,
          rateCol = -1;
        for (let col = 0; col <= range.e.c; col++) {
          const cell = ws[XLSX.utils.encode_cell({ r: tableStartRow, c: col })];
          if (cell?.v) {
            const v = String(cell.v).toLowerCase();
            if (v.includes("description")) descCol = col;
            if (v.includes("hsn")) hsnCol = col;
            if (v.includes("part")) partCol = col;
            if (v.includes("quantity")) qtyCol = col;
            if (v.includes("rate")) rateCol = col;
            if (
              v.includes("amount") ||
              v.includes("total") ||
              v.includes("value") ||
              v.includes("net amt") ||
              v.includes("taxable")
            )
              amtCol = col;
          }
        }

        const items = [];
        let grandTotal = 0;
        for (let row = tableStartRow + 2; row <= range.e.r; row++) {
          const descCell = ws[XLSX.utils.encode_cell({ r: row, c: descCol })];
          if (!descCell?.v) break;
          const partCode =
            partCol >= 0
              ? ws[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v || ""
              : "";
          const qty =
            qtyCol >= 0
              ? parseFloat(
                  ws[XLSX.utils.encode_cell({ r: row, c: qtyCol })]?.v || 0,
                )
              : 0;
          const rate =
            rateCol >= 0
              ? parseFloat(
                  ws[XLSX.utils.encode_cell({ r: row, c: rateCol })]?.v || 0,
                )
              : 0;
          const amt =
            amtCol >= 0
              ? parseFloat(
                  ws[XLSX.utils.encode_cell({ r: row, c: amtCol })]?.v || 0,
                )
              : qty * rate;
          const hsn =
            hsnCol >= 0
              ? ws[XLSX.utils.encode_cell({ r: row, c: hsnCol })]?.v || ""
              : "";
          grandTotal += amt;
          items.push({
            description: String(descCell.v),
            productCode: String(partCode).trim(),
            invoiceQty: qty,
            rate,
            amount: amt,
            hsnSac: String(hsn),
          });
        }
        resolve({
          invoiceNo,
          dated,
          buyer,
          consignee,
          gstin,
          items,
          grandTotal,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── CREATE INVOICE PAGE ───────────────────────────────────────────────────────
function InvoiceUploadPage({ challans, challanIds, onBack, onComplete }) {
  const selected = challans.filter((c) => challanIds.includes(c.id));
  const challanTotal = selected.reduce(
    (s, c) => s + (Number(c.totalAmount) || 0),
    0,
  );

  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceAmt, setInvoiceAmt] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFile = async (f) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      alert("Only Excel (.xlsx/.xls) files allowed!");
      return;
    }
    setFile(f);
    setParsed(null);
    setParseError("");
    setResult(null);
    setParsing(true);
    try {
      const data = await parseInvoiceExcel(f);
      setParsed(data);
      if (data.invoiceNo) setInvoiceNo(data.invoiceNo);
      if (data.grandTotal) setInvoiceAmt(String(Math.round(data.grandTotal)));
      if (data.dated) {
        const d = toInputDate(data.dated);
        if (d) setInvoiceDate(d);
      }
    } catch (err) {
      setParseError(err.message || "Failed to parse Excel");
    } finally {
      setParsing(false);
    }
  };

  // ── Compute match details with QTY comparison ─────────────────────────────
  const challanItems = selected.flatMap((ch) => ch.items || []);
  const totalSoItems = challanItems.length;

  // Per-item match result: "exact" | "excess" | "partial_qty" | "unmatched"
  const itemResults = parsed
    ? challanItems.map((soItem) => {
        const invItem = parsed.items.find(
          (inv) =>
            inv.productCode &&
            soItem.productCode &&
            inv.productCode.toLowerCase().trim() ===
              soItem.productCode.toLowerCase().trim(),
        );
        if (!invItem) return "unmatched";
        const challanQty = Number(soItem.dispatchQty || soItem.quantity || 0);
        const invoiceQty = Number(invItem.invoiceQty || 0);
        if (invoiceQty > challanQty) return "excess";
        if (invoiceQty === challanQty) return "exact";
        return "partial_qty";
      })
    : [];

  const matchedCount = itemResults.filter((r) => r !== "unmatched").length;
  const excessCount = itemResults.filter((r) => r === "excess").length;
  const partialQtyCount = itemResults.filter((r) => r === "partial_qty").length;
  const unmatchedCount = itemResults.filter((r) => r === "unmatched").length;

  // ── handleVerify with full logic ──────────────────────────────────────────
  const handleVerify = () => {
    if (!invoiceAmt && !parsed) return;
    setVerifying(true);
    setResult(null);
    setTimeout(() => {
      const amt = parseFloat(invoiceAmt) || 0;
      let status = "unbilled";

      if (parsed && totalSoItems > 0) {
        if (excessCount > 0) {
          // Any item invoiced MORE than challan qty → Excess
          status = "excess";
        } else if (matchedCount === totalSoItems && partialQtyCount === 0) {
          // All items matched with exact qty
          status = "complete";
        } else if (matchedCount > 0 || amt > 0) {
          // Some matched or amount entered
          status = "partial";
        } else {
          // Nothing matched, no amount
          const anyOverdue = selected.some((c) => {
            const d =
              c.header?.approxInvoiceDate || c.header?.approximateInvoiceDate;
            return d && new Date(d) < new Date();
          });
          status = anyOverdue ? "overdue" : "unbilled";
        }
      } else if (amt > 0 && challanTotal > 0) {
        // No Excel — amount based
        if (amt > challanTotal) status = "excess";
        else if (amt >= challanTotal) status = "complete";
        else status = "partial";
      } else if (amt > 0) {
        status = "partial";
      } else {
        const anyOverdue = selected.some((c) => {
          const d =
            c.header?.approxInvoiceDate || c.header?.approximateInvoiceDate;
          return d && new Date(d) < new Date();
        });
        status = anyOverdue ? "overdue" : "unbilled";
      }

      setResult({
        status,
        amt,
        challanTotal,
        matched: matchedCount,
        total: totalSoItems,
        excess: excessCount,
        partialQty: partialQtyCount,
        unmatched: unmatchedCount,
      });
      setVerifying(false);
    }, 1000);
  };

  const handleConfirm = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await Promise.all(
        challanIds.map((id) =>
          updateDoc(doc(db, "challans", id), {
            billingStatus: result.status,
            invoiceNo: invoiceNo || null,
            invoiceDate: invoiceDate || null,
            invoiceAmount: result.amt,
            updatedAt: new Date(),
          }),
        ),
      );
      onComplete(challanIds, result.status);
    } catch (e) {
      console.error(e);
      onComplete(challanIds, result.status);
    } finally {
      setSaving(false);
    }
  };

  const resultMeta = {
    complete: {
      emoji: "✅",
      msg: "All items matched with exact quantity. Status → Complete.",
      color: "text-emerald-700 bg-emerald-50",
    },
    partial: {
      emoji: "🔄",
      msg: "Partial coverage. Some items/qty still pending.",
      color: "text-amber-700 bg-amber-50",
    },
    excess: {
      emoji: "🔵",
      msg: "Invoice quantity exceeds challan quantity for one or more items.",
      color: "text-blue-700 bg-blue-50",
    },
    overdue: {
      emoji: "⚠️",
      msg: "Due date has passed with no invoice amount.",
      color: "text-red-700 bg-red-50",
    },
    unbilled: {
      emoji: "📄",
      msg: "No amount entered. Status remains Unbilled.",
      color: "text-slate-600 bg-slate-50",
    },
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 font-semibold text-slate-400 hover:text-slate-700 transition-colors"
        >
          <BackIcon /> Back to Challans
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-bold text-slate-700">Create Invoice</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Challan Details</h3>
            <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">
              {selected.length} challan{selected.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
            {selected.map((ch, idx) => (
              <div
                key={ch.id}
                className={idx > 0 ? "pt-6 border-t border-slate-100" : ""}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-700">
                    {ch.challanNo || ch.id}
                  </span>
                  <StatusBadge status={ch._status} />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-4">
                  {[
                    ["Customer", ch.header?.customer || ch.header?.companyName],
                    ["Part No", ch.partNo],
                    ["Challan Date", ch.header?.challanDate],
                    [
                      "Due Date",
                      ch.header?.approxInvoiceDate ||
                        ch.header?.approximateInvoiceDate,
                    ],
                    ["Destination", ch.header?.destination],
                    ["GSTIN", ch.header?.gstin || "—"],
                    ["Address", ch.header?.address],
                    ["Consignee", ch.header?.consignee || "—"],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-400">{k}: </span>
                        <span className="font-semibold text-slate-700">
                          {v}
                        </span>
                      </div>
                    ))}
                </div>
                {ch.items?.length > 0 && (
                  <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="px-3 py-2.5 text-left">Item</th>
                          <th className="px-3 py-2.5 text-left">Part No</th>
                          <th className="px-3 py-2.5 text-right">Qty</th>
                          <th className="px-3 py-2.5 text-right">Rate</th>
                          <th className="px-3 py-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {ch.items.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-600">
                              {item.description ||
                                item.itemName ||
                                item.name ||
                                "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-mono">
                              {item.productCode ||
                                item.partNo ||
                                ch.partNo ||
                                "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {item.dispatchQty ||
                                item.quantity ||
                                item.qty ||
                                "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {item.rate || item.unitPrice
                                ? `₹${item.rate || item.unitPrice}`
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-700">
                              ₹
                              {Number(
                                item.total || item.amount || 0,
                              ).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end">
                  <span className="text-sm font-bold text-slate-700">
                    ₹{Number(ch.totalAmount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
            {selected.length > 1 && (
              <div className="flex items-center justify-between pt-4 border-t-2 border-slate-200">
                <span className="text-sm font-semibold text-slate-500">
                  Combined Total
                </span>
                <span className="text-xl font-black text-slate-800">
                  ₹{challanTotal.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-1">Upload Invoice</h3>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files[0];
                if (!f?.name.match(/\.(xlsx|xls)$/i)) {
                  alert("Only Excel (.xlsx/.xls) files allowed!");
                  return;
                }
                handleFile(f);
              }}
              onClick={() => document.getElementById("inv-file-input").click()}
              className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all mb-4 ${drag ? "border-indigo-400 bg-indigo-50" : file ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}
            >
              <input
                id="inv-file-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Spinner />
                  <p className="text-sm font-semibold text-slate-500">
                    Parsing Excel…
                  </p>
                </div>
              ) : file ? (
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ExcelIcon />
                    <p className="text-sm font-bold text-emerald-700">
                      {file.name}
                    </p>
                  </div>
                  <p className="text-xs text-emerald-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setParsed(null);
                      setInvoiceNo("");
                      setInvoiceAmt("");
                    }}
                    className="mt-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Drop Excel invoice here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Only Excel (.xlsx / .xls)
                  </p>
                </div>
              )}
            </div>

            {parsed && !parseError && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
                <p className="text-xs font-bold text-emerald-700 mb-3">
                  ✅ Parsed Successfully!
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {parsed.invoiceNo && (
                    <div>
                      <p className="text-slate-400 mb-0.5">Invoice No</p>
                      <p className="font-bold text-slate-800">
                        {parsed.invoiceNo}
                      </p>
                    </div>
                  )}
                  {parsed.dated && (
                    <div>
                      <p className="text-slate-400 mb-0.5">Dated</p>
                      <p className="font-bold text-slate-800">{parsed.dated}</p>
                    </div>
                  )}
                  {parsed.buyer && (
                    <div className="col-span-2">
                      <p className="text-slate-400 mb-0.5">Buyer</p>
                      <p className="font-bold text-slate-800">{parsed.buyer}</p>
                    </div>
                  )}
                  {parsed.grandTotal > 0 && (
                    <div>
                      <p className="text-slate-400 mb-0.5">Invoice Total</p>
                      <p className="font-bold text-slate-800">
                        ₹{Math.round(parsed.grandTotal).toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}
                  {parsed.items?.length > 0 && (
                    <div>
                      <p className="text-slate-400 mb-0.5">Items Found</p>
                      <p className="font-bold text-slate-800">
                        {parsed.items.length} items
                      </p>
                    </div>
                  )}
                </div>
                {totalSoItems > 0 && (
                  <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                    <p className="text-xs font-bold text-blue-700">
                      📦 {matchedCount}/{totalSoItems} challan items matched
                    </p>
                    {excessCount > 0 && (
                      <p className="text-xs text-blue-600 font-semibold">
                        🔵 {excessCount} item(s) have EXCESS qty in invoice
                      </p>
                    )}
                    {partialQtyCount > 0 && (
                      <p className="text-xs text-amber-600">
                        ⚠️ {partialQtyCount} item(s) have less qty than challan
                      </p>
                    )}
                    {unmatchedCount > 0 && (
                      <p className="text-xs text-amber-600">
                        ⚠️ {unmatchedCount} challan item(s) not found in invoice
                      </p>
                    )}
                    {parsed.items.length > matchedCount && (
                      <p className="text-xs text-slate-400">
                        📄 {parsed.items.length - matchedCount} extra items in
                        invoice (not in challan)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {parseError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                <p className="text-xs font-bold text-red-700">
                  ⚠️ {parseError}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Auto-filled from Excel"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Invoice Amount (₹)
                  <span className="ml-2 normal-case font-normal text-slate-300">
                    Challan total: ₹{challanTotal.toLocaleString("en-IN")}
                  </span>
                </label>
                <input
                  type="number"
                  value={invoiceAmt}
                  onChange={(e) => {
                    setInvoiceAmt(e.target.value);
                    setResult(null);
                  }}
                  placeholder="Auto-filled from Excel"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition"
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={verifying || !invoiceAmt}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${verifying || !invoiceAmt ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"}`}
              >
                {verifying ? (
                  <>
                    <Spinner /> Verifying…
                  </>
                ) : (
                  "Verify Invoice"
                )}
              </button>
            </div>
          </div>

          {result && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800">
                  Verification Result
                </h4>
                <StatusBadge status={result.status} />
              </div>
              <div className="space-y-2.5 text-sm mb-4">
                {[
                  [
                    "Challan Total",
                    challanTotal > 0
                      ? `₹${result.challanTotal.toLocaleString("en-IN")}`
                      : "—",
                  ],
                  ["Invoice Amount", `₹${result.amt.toLocaleString("en-IN")}`],
                  ["Items Matched", `${result.matched} / ${result.total}`],
                  [
                    "Excess Qty Items",
                    result.excess > 0 ? `🔵 ${result.excess} item(s)` : "None",
                  ],
                  [
                    "Unmatched Items",
                    result.unmatched > 0
                      ? `⚠️ ${result.unmatched} item(s)`
                      : "None",
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
              <div
                className={`rounded-xl px-4 py-3 text-xs font-medium mb-4 ${resultMeta[result.status]?.color}`}
              >
                {resultMeta[result.status]?.emoji}
                {"  "}
                {resultMeta[result.status]?.msg}
              </div>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 transition-all shadow flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Spinner /> Saving to Firebase…
                  </>
                ) : (
                  <>
                    <CheckIcon /> Confirm & Update Status
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function UnbilledChallans() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [view, setView] = useState("list");
  const [invoiceIds, setInvoiceIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [viewChallan, setViewChallan] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, "challans"), orderBy("createdAt", "desc")),
        );
        const data = snap.docs.map((d) => {
          const raw = { id: d.id, ...d.data() };
          return { ...raw, _status: computeStatus(raw) };
        });
        setChallans(data);
      } catch (e) {
        console.error("Firestore:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  const handleToggle = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const handleCreateInvoice = (ids) => {
    setInvoiceIds(ids);
    setView("invoice");
  };
  const handleComplete = (ids, status) => {
    setChallans((prev) =>
      prev.map((c) =>
        ids.includes(c.id)
          ? { ...c, billingStatus: status, _status: status }
          : c,
      ),
    );
    setSelectedIds([]);
    setView("list");
    showToast(
      `${ids.length} challan${ids.length > 1 ? "s" : ""} updated to "${status}"`,
    );
  };

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        background: "#f1f5f9",
        minHeight: "100vh",
        padding: "28px",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box}`}</style>
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-bold text-white flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
        >
          <CheckIcon /> {toast.msg}
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {view === "list" && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                Unbilled Challans
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">Sales Operations</p>
            </div>
            <SummaryCards challans={challans} />
            <ChallanTable
              challans={challans}
              loading={loading}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onCreateInvoice={handleCreateInvoice}
              onView={(ch) => setViewChallan(ch)}
            />
            {viewChallan && (
              <ChallanDetailModal
                challan={viewChallan}
                onClose={() => setViewChallan(null)}
              />
            )}
          </>
        )}
        {view === "invoice" && (
          <InvoiceUploadPage
            challans={challans}
            challanIds={invoiceIds}
            onBack={() => setView("list")}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
