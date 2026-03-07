import { useState, useEffect } from "react";
import { db } from "../../firebase";
// import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { collection, getDocs, query, where } from "firebase/firestore";

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
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
  reserved: {
    label: "Reserved",
    dot: "bg-slate-400",
    tag: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.reserved;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.tag}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

const Spinner = () => (
  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
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

// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
function DetailModal({ invoice, onClose }) {
  const totalOrdered = (invoice.items || []).reduce(
    (s, i) => s + (i.orderedQty || 0),
    0,
  );
  const totalInvoiced = (invoice.items || []).reduce(
    (s, i) => s + (i.newInvoiced || 0),
    0,
  );
  const totalShortage = (invoice.items || []).reduce(
    (s, i) => s + (i.shortage || 0),
    0,
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">
              Invoice: {invoice.invoiceNo || "—"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              SO: {invoice.linkedSoNo || "—"} · #{invoice.invoiceIndex} invoice
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={invoice.soStatus} />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["SO Number", invoice.linkedSoNo],
              ["Invoice No", invoice.invoiceNo],
              ["Invoice Date", invoice.invoiceDate],
              ["Customer", invoice.customer],
              ["Remarks", invoice.remarks],
              [
                "Created At",
                invoice.createdAt
                  ? new Date(invoice.createdAt).toLocaleString("en-IN")
                  : null,
              ],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-slate-400 mb-0.5">{k}</p>
                  <p className="font-semibold text-slate-700">{v}</p>
                </div>
              ))}
          </div>

          {/* Items Table */}
          {invoice.items?.length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-semibold uppercase">
                    <th className="px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Code</th>
                    <th className="px-3 py-2.5 text-left">Description</th>
                    <th className="px-3 py-2.5 text-right">Ordered</th>
                    <th className="px-3 py-2.5 text-right">This Inv</th>
                    <th className="px-3 py-2.5 text-right">Shortage</th>
                    <th className="px-3 py-2.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoice.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono">
                        {item.productCode || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {item.description || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {item.orderedQty ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-indigo-600">
                        {item.newInvoiced ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.shortage > 0 ? (
                          <span className="text-amber-600 font-bold">
                            {item.shortage}
                          </span>
                        ) : (
                          <span className="text-emerald-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={item.itemStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Footer */}
          <div className="flex justify-end gap-3">
            <div className="bg-slate-100 rounded-xl px-4 py-2 text-xs">
              <span className="text-slate-400 mr-2">Total Ordered</span>
              <span className="font-bold text-slate-700">
                {totalOrdered} units
              </span>
            </div>
            <div className="bg-indigo-600 rounded-xl px-4 py-2 text-xs">
              <span className="text-indigo-200 mr-2">This Invoice</span>
              <span className="font-bold text-white">
                {totalInvoiced} units
              </span>
            </div>
            {totalShortage > 0 && (
              <div className="bg-amber-500 rounded-xl px-4 py-2 text-xs">
                <span className="text-amber-100 mr-2">Pending</span>
                <span className="font-bold text-white">
                  {totalShortage} units
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SalesInvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "excelupload"),
          where("type", "==", "SALES_INVOICE"),
        ),
      );
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  const filtered = invoices
    .filter((inv) => statusFilter === "all" || inv.soStatus === statusFilter)
    .filter((inv) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (inv.invoiceNo || "").toLowerCase().includes(q) ||
        (inv.linkedSoNo || "").toLowerCase().includes(q) ||
        (inv.customer || "").toLowerCase().includes(q)
      );
    });

  // Summary stats
  const countByStatus = invoices.reduce((a, inv) => {
    a[inv.soStatus] = (a[inv.soStatus] || 0) + 1;
    return a;
  }, {});

  const totalUnits = (list) =>
    list.reduce(
      (s, inv) =>
        s + (inv.items || []).reduce((ss, i) => ss + (i.newInvoiced || 0), 0),
      0,
    );

  const cards = [
    {
      label: "Total Invoices",
      value: invoices.length,
      icon: "🧾",
      grad: "from-indigo-500 to-indigo-700",
    },
    {
      label: "Complete",
      value: countByStatus.complete || 0,
      icon: "✅",
      grad: "from-emerald-400 to-emerald-600",
    },
    {
      label: "Partial",
      value: countByStatus.partial || 0,
      icon: "🔄",
      grad: "from-amber-400 to-orange-500",
    },
    {
      label: "Excess",
      value: countByStatus.excess || 0,
      icon: "🔵",
      grad: "from-blue-400 to-blue-600",
    },
    {
      label: "Total Invoiced",
      value: `${totalUnits(invoices)} units`,
      icon: "📦",
      grad: "from-violet-500 to-indigo-600",
    },
  ];

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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Sales Invoice History
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            All sales invoices — complete, partial & excess
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {cards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.grad} flex items-center justify-center flex-shrink-0 text-2xl`}
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

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-base font-bold text-slate-800">
                Invoice Records
              </p>
              <p className="text-xs text-slate-400">
                {filtered.length} records
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
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
                  placeholder="Search SO, invoice, customer…"
                  className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-60"
                />
              </div>
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="complete">Complete</option>
                  <option value="partial">Partial</option>
                  <option value="excess">Excess</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevDown />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm">
                <Spinner /> Loading invoice history…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-5xl mb-3">🧾</div>
                <p className="text-slate-500 font-semibold">
                  No invoice records found
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {search || statusFilter !== "all"
                    ? "Try different filter"
                    : "Upload invoices from Sales Orders"}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left">#</th>
                    <th className="px-5 py-3 text-left">SO Number</th>
                    <th className="px-5 py-3 text-left">Invoice No</th>
                    <th className="px-5 py-3 text-left">Invoice Date</th>
                    <th className="px-5 py-3 text-left">Customer</th>
                    <th className="px-5 py-3 text-center">Ordered</th>
                    <th className="px-5 py-3 text-center">Invoiced</th>
                    <th className="px-5 py-3 text-center">Pending</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, idx) => {
                    const totalOrdered = (inv.items || []).reduce(
                      (s, i) => s + (i.orderedQty || 0),
                      0,
                    );
                    const totalInvoiced = (inv.items || []).reduce(
                      (s, i) => s + (i.newInvoiced || 0),
                      0,
                    );
                    const totalPending = (inv.items || []).reduce(
                      (s, i) => s + (i.shortage || 0),
                      0,
                    );
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm"
                      >
                        <td className="px-5 py-4 text-slate-400">{idx + 1}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800 font-mono">
                          {inv.linkedSoNo || "—"}
                        </td>
                        <td className="px-5 py-4 font-mono text-indigo-600 font-semibold">
                          {inv.invoiceNo || "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {inv.invoiceDate || "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-700 font-medium max-w-[180px] truncate">
                          {inv.customer || "—"}
                        </td>
                        <td className="px-5 py-4 text-center text-slate-600 font-semibold">
                          {totalOrdered}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-emerald-600">
                          {totalInvoiced}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {totalPending > 0 ? (
                            <span className="font-bold text-amber-600">
                              {totalPending}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={inv.soStatus} />
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setViewItem(inv)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Footer total */}
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td
                      colSpan={5}
                      className="px-5 py-3 text-xs font-bold text-slate-500 uppercase"
                    >
                      Total ({filtered.length} records)
                    </td>
                    <td className="px-5 py-3 text-center font-black text-slate-700">
                      {filtered.reduce(
                        (s, inv) =>
                          s +
                          (inv.items || []).reduce(
                            (ss, i) => ss + (i.orderedQty || 0),
                            0,
                          ),
                        0,
                      )}
                    </td>
                    <td className="px-5 py-3 text-center font-black text-emerald-600">
                      {filtered.reduce(
                        (s, inv) =>
                          s +
                          (inv.items || []).reduce(
                            (ss, i) => ss + (i.newInvoiced || 0),
                            0,
                          ),
                        0,
                      )}
                    </td>
                    <td className="px-5 py-3 text-center font-black text-amber-600">
                      {filtered.reduce(
                        (s, inv) =>
                          s +
                          (inv.items || []).reduce(
                            (ss, i) => ss + (i.shortage || 0),
                            0,
                          ),
                        0,
                      )}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {viewItem && (
        <DetailModal invoice={viewItem} onClose={() => setViewItem(null)} />
      )}
    </div>
  );
}
