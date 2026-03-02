import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

const STATUS_COLORS = {
  dispatched: "bg-green-100 text-green-700 border-green-200",
  pending:    "bg-amber-100 text-amber-700 border-amber-200",
  cancelled:  "bg-red-100 text-red-600 border-red-200",
};

export default function DispatchOnChallanList() {
  const navigate = useNavigate();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "challans"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setChallans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = challans.filter((c) => {
    const s = search.toLowerCase();
    return (
      !s ||
      c.challanNo?.toLowerCase().includes(s) ||
      c.header?.customer?.toLowerCase().includes(s) ||
      c.soReference?.toLowerCase().includes(s) ||
      c.header?.destination?.toLowerCase().includes(s)
    );
  });

  const totalItems = (c) =>
    (c.items || []).reduce((sum, r) => sum + (Number(r.dispatchQty) || 0), 0);

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back arrow */}
          <button
            onClick={() => navigate("/sales/sales-orders")}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
            title="Back to Sales Orders"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800">Dispatch on Challan</h2>
            <p className="text-sm text-slate-500 mt-0.5">Manage all delivery challans</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/sales/dispatch-on-challan/create")}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Challan
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Challans", value: challans.length, icon: "📋", color: "bg-indigo-50 border-indigo-100" },
          { label: "Dispatched",     value: challans.filter((c) => c.status === "dispatched").length, icon: "🚚", color: "bg-green-50 border-green-100" },
          { label: "Total Items Dispatched", value: challans.reduce((s, c) => s + totalItems(c), 0), icon: "📦", color: "bg-amber-50 border-amber-100" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color} flex items-center gap-4`}>
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challan no, customer..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mr-3" />
            Loading challans...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-5xl mb-4">📋</span>
            <p className="font-semibold text-slate-500">No challans found</p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : 'Click "Create Challan" to get started'}
            </p>
            {!search && (
              <button
                onClick={() => navigate("/sales/dispatch-on-challan/create")}
                className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow transition-all"
              >
                + Create First Challan
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["#", "Challan No", "Date", "Customer", "SO Reference", "Destination", "Items / Qty", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-indigo-700 text-sm">{c.challanNo}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {c.header?.challanDate || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{c.header?.customer || "—"}</p>
                      {c.header?.companyName && (
                        <p className="text-xs text-slate-400 mt-0.5">{c.header.companyName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{c.soReference || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.header?.destination || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{(c.items || []).length} items</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-sm font-bold text-slate-800">{totalItems(c)} qty</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_COLORS[c.status] || STATUS_COLORS.pending}`}>
                        {c.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/sales/dispatch-on-challan/${c.id}`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}