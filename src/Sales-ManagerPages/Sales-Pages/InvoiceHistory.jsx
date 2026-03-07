import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  complete: { label: "Complete", dot: "bg-emerald-500", tag: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  partial:  { label: "Partial",  dot: "bg-amber-400",   tag: "bg-amber-50 text-amber-700 border-amber-200" },
  excess:   { label: "Excess",   dot: "bg-blue-500",    tag: "bg-blue-50 text-blue-700 border-blue-200" },
  overdue:  { label: "Overdue",  dot: "bg-red-500",     tag: "bg-red-50 text-red-700 border-red-200" },
  unbilled: { label: "Unbilled", dot: "bg-slate-400",   tag: "bg-slate-100 text-slate-500 border-slate-200" },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.unbilled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.tag}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

const Spinner = () => (
  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg>
);

const ChevDown = () => (
  <svg className="w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
function DetailModal({ challan, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">{challan.challanNo || challan.id}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Invoice: {challan.invoiceNo || "—"}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={challan.billingStatus || "unbilled"} />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Challan No",      challan.challanNo],
              ["Invoice No",      challan.invoiceNo],
              ["Invoice Date",    challan.invoiceDate],
              ["Invoice Amount",  challan.invoiceAmount ? `₹${Number(challan.invoiceAmount).toLocaleString("en-IN")}` : null],
              ["Customer",        challan.header?.customer || challan.header?.companyName],
              ["Challan Date",    challan.header?.challanDate],
              ["Destination",     challan.header?.destination],
              ["GSTIN",           challan.header?.gstin],
              ["Address",         challan.header?.address],
              ["Consignee",       challan.header?.consignee],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-slate-400 mb-0.5">{k}</p>
                <p className="font-semibold text-slate-700">{v}</p>
              </div>
            ))}
          </div>

          {/* Items Table */}
          {challan.items?.length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-semibold uppercase">
                    <th className="px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Item</th>
                    <th className="px-3 py-2.5 text-left">Code</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {challan.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 text-slate-700">{item.description || "—"}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono">{item.productCode || "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-700 font-semibold">{item.dispatchQty || item.quantity || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <div className="bg-slate-100 rounded-xl px-4 py-2 text-xs">
              <span className="text-slate-400 mr-2">Challan Total</span>
              <span className="font-bold text-slate-700">₹{Number(challan.totalAmount || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="bg-indigo-600 rounded-xl px-4 py-2 text-xs">
              <span className="text-indigo-200 mr-2">Invoice Amount</span>
              <span className="font-bold text-white">₹{Number(challan.invoiceAmount || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SalesInvoiceHistory() {
  const [invoices, setInvoices]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewItem, setViewItem]       = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "challans"), orderBy("createdAt", "desc")));
        // Only show challans that have been invoiced (have billingStatus set)
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => d.billingStatus && d.billingStatus !== "unbilled");
        setInvoices(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = invoices
    .filter((c) => statusFilter === "all" || c.billingStatus === statusFilter)
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (c.challanNo    || "").toLowerCase().includes(q) ||
        (c.invoiceNo    || "").toLowerCase().includes(q) ||
        (c.header?.customer || c.header?.companyName || "").toLowerCase().includes(q)
      );
    });

  // Summary stats
  const totalInvoiceAmt = filtered.reduce((s, c) => s + (Number(c.invoiceAmount) || 0), 0);
  const countByStatus   = invoices.reduce((a, c) => { a[c.billingStatus] = (a[c.billingStatus] || 0) + 1; return a; }, {});

  const fmt = (v) => v >= 10000000 ? `₹${(v/10000000).toFixed(1)}Cr` : v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(1)}k` : `₹${v}`;

  const cards = [
    { label: "Total Invoices", value: invoices.length,            icon: "🧾", grad: "from-indigo-500 to-indigo-700" },
    { label: "Complete",       value: countByStatus.complete || 0, icon: "✅", grad: "from-emerald-400 to-emerald-600" },
    { label: "Partial",        value: countByStatus.partial  || 0, icon: "🔄", grad: "from-amber-400 to-orange-500" },
    { label: "Excess",         value: countByStatus.excess   || 0, icon: "🔵", grad: "from-blue-400 to-blue-600" },
    { label: "Total Invoiced", value: fmt(invoices.reduce((s,c)=>s+(Number(c.invoiceAmount)||0),0)), icon: "💰", grad: "from-violet-500 to-indigo-600" },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#f1f5f9", minHeight: "100vh", padding: "28px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box}`}</style>

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sales Invoice History</h2>
          <p className="text-slate-400 text-sm mt-0.5">All invoiced challans — complete, partial & excess</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.grad} flex items-center justify-center flex-shrink-0 text-2xl`}>{card.icon}</div>
              <div>
                <p className="text-2xl font-black text-slate-800 leading-none">{card.value}</p>
                <p className="text-xs font-semibold text-slate-400 mt-1 tracking-wide">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-base font-bold text-slate-800">Invoice Records</p>
              <p className="text-xs text-slate-400">{filtered.length} records</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search challan, invoice, customer…"
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
                  <option value="overdue">Overdue</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"><ChevDown/></div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm">
                <Spinner/> Loading invoice history…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-5xl mb-3">🧾</div>
                <p className="text-slate-500 font-semibold">No invoice records found</p>
                <p className="text-slate-400 text-sm mt-1">
                  {search || statusFilter !== "all" ? "Try different filter" : "Upload invoices from Unbilled Challans"}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left">#</th>
                    <th className="px-5 py-3 text-left">Challan No</th>
                    <th className="px-5 py-3 text-left">Invoice No</th>
                    <th className="px-5 py-3 text-left">Invoice Date</th>
                    <th className="px-5 py-3 text-left">Customer</th>
                    <th className="px-5 py-3 text-left">Destination</th>
                    <th className="px-5 py-3 text-right">Challan Amt</th>
                    <th className="px-5 py-3 text-right">Invoice Amt</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, idx) => {
                    const challanAmt = Number(inv.totalAmount   || 0);
                    const invoiceAmt = Number(inv.invoiceAmount || 0);
                    const diff       = invoiceAmt - challanAmt;
                    return (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm">
                        <td className="px-5 py-4 text-slate-400">{idx + 1}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800 font-mono">{inv.challanNo || inv.id}</td>
                        <td className="px-5 py-4 font-mono text-indigo-600 font-semibold">{inv.invoiceNo || "—"}</td>
                        <td className="px-5 py-4 text-slate-500">{inv.invoiceDate || "—"}</td>
                        <td className="px-5 py-4 text-slate-700 font-medium">{inv.header?.customer || inv.header?.companyName || "—"}</td>
                        <td className="px-5 py-4 text-slate-500">{inv.header?.destination || "—"}</td>
                        <td className="px-5 py-4 text-right text-slate-600">
                          {challanAmt > 0 ? `₹${challanAmt.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-bold ${invoiceAmt > challanAmt && challanAmt > 0 ? "text-blue-600" : invoiceAmt < challanAmt ? "text-amber-600" : "text-emerald-600"}`}>
                              {invoiceAmt > 0 ? `₹${invoiceAmt.toLocaleString("en-IN")}` : "—"}
                            </span>
                            {challanAmt > 0 && invoiceAmt > 0 && diff !== 0 && (
                              <span className={`text-xs mt-0.5 ${diff > 0 ? "text-blue-400" : "text-amber-400"}`}>
                                {diff > 0 ? `+₹${diff.toLocaleString("en-IN")} excess` : `-₹${Math.abs(diff).toLocaleString("en-IN")} pending`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={inv.billingStatus}/>
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
                    <td colSpan={7} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Total ({filtered.length} records)</td>
                    <td className="px-5 py-3 text-right font-black text-slate-800">
                      ₹{filtered.reduce((s, c) => s + (Number(c.invoiceAmount) || 0), 0).toLocaleString("en-IN")}
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
      {viewItem && <DetailModal challan={viewItem} onClose={() => setViewItem(null)}/>}
    </div>
  );
}