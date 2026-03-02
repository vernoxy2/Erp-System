import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ReadyToDispatch() {
  const navigate = useNavigate();
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [challanMap, setChallanMap] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch SOs
      const q = query(
        collection(db, "excelupload"),
        where("soStatus", "in", ["complete", "ready_to_dispatch"])
      );
      const snap = await getDocs(q);
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => !d.linkedSoId && d.type !== "SALES_INVOICE");
      setOrders(data);

      // Fetch challans — build soId → true map
      const cSnap = await getDocs(collection(db, "challans"));
      const map = {};
      cSnap.docs.forEach((d) => {
        const soId = d.data().soId;
        if (soId) map[soId] = true;
      });
      setChallanMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orders.filter((o) => {
    const s = (o.soNumber || o.id || "").toLowerCase();
    const c = (o.customer || o.excelHeader?.buyer || "").toLowerCase();
    return s.includes(search.toLowerCase()) || c.includes(search.toLowerCase());
  });

  const getSONumber   = (o) => o.soNumber || o.excelHeader?.voucherNo || o.id;
  const getCustomer   = (o) => o.customer || o.excelHeader?.buyer || "—";
  const getDate       = (o) => o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString("en-IN") : o.excelHeader?.dated || "—";
  const getDelivery   = (o) => o.deliveryDate || o.excelHeader?.deliveryDate || "—";
  const getInvoiced   = (o) => `${o.totalInvoicedQty ?? "—"}/${o.orderedQty ?? "—"}`;
  const getInvoiceNos = (o) => Array.isArray(o.invoiceNos) ? o.invoiceNos : o.invoiceNo ? [o.invoiceNo] : [];
  const getItemCount  = (o) => Array.isArray(o.items) ? o.items.length : o.itemCount ?? "—";

  if (loading) {
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-black text-slate-800">Ready to Dispatch</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Fetching from Firebase...</p>
        </div>
      </div>
    );
  }

  const generatedCount = orders.filter((o) => !!challanMap[o.id]).length;
  const draftCount     = orders.filter((o) => !challanMap[o.id]).length;

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Ready to Dispatch</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""} ready • All items invoiced
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Orders",      value: orders.length,  color: "bg-green-500",   icon: "📦" },
          { label: "Challan Generated", value: generatedCount, color: "bg-emerald-600",  icon: "✅" },
          { label: "Draft / Pending",   value: draftCount,     color: "bg-amber-500",   icon: "📝" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center text-lg`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-black text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Search bar */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search SO, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50"
            />
          </div>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} results</span>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["SO Number", "Customer", "Date", "Exp. Delivery", "Items", "Invoiced", "Invoices", "Challan Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-500 font-semibold">No orders ready to dispatch</p>
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const isGenerated = !!challanMap[order.id];

                return (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/sales/dispatch-detail/${order.id}`)}
                    className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-indigo-700 text-sm">{getSONumber(order)}</span>
                      <p className="text-xs text-slate-400">{getDate(order)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">{getCustomer(order)}</p>
                      <p className="text-xs text-slate-400">{order.excelHeader?.gstin || ""}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{getDate(order)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{getDelivery(order)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{getItemCount(order)}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-green-600">{getInvoiced(order)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {getInvoiceNos(order).length > 0
                          ? getInvoiceNos(order).map((inv) => (
                              <span key={inv} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono">{inv}</span>
                            ))
                          : <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>

                    {/* STATUS + ACTION — stop row click */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isGenerated ? (
                          <>
                            {/* Generated: green badge + Edit button */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                              ✅ Generated
                            </span>
                            <button
                              onClick={() => navigate(`/sales/dispatch-on-challan?soId=${order.id}&edit=true`)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                            >
                              ✏️ Edit
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Draft: amber badge + Create Challan button */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">
                              📝 Draft
                            </span>
                            {/* <button
                              onClick={() => navigate(`/sales/dispatch-on-challan?soId=${order.id}`)}
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                            >
                              🚚 Create Challan
                            </button> */}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">{orders.length} total orders</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Ready to Dispatch
            </span>
          </div>
        )}
      </div>
    </div>
  );
}