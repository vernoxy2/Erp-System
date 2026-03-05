import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShoppingCart, FiClock, FiAlertTriangle,
  FiAlertCircle, FiEye, FiEdit2, FiSearch,
  FiPlus, FiRefreshCw, FiX,
} from "react-icons/fi";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcEtaStatus(deliveryDate) {
  if (!deliveryDate) return { status: "ordered", remainingDays: null };
  const today = new Date(); today.setHours(0,0,0,0);
  const eta   = new Date(deliveryDate); eta.setHours(0,0,0,0);
  const diff  = Math.round((eta - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { status: "overdue", remainingDays: diff };
  if (diff <= 2) return { status: "warning", remainingDays: diff };
  return { status: "ordered", remainingDays: diff };
}

// ── Status Pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    ordered:  "bg-blue-50   text-blue-700   border-blue-200",
    partial:  "bg-orange-50 text-orange-700 border-orange-200",
    complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    excess:   "bg-purple-50 text-purple-700 border-purple-200",
    overdue:  "bg-red-50    text-red-700    border-red-200",
    warning:  "bg-orange-50 text-orange-700 border-orange-200",
  };
  const s = (status || "ordered").toLowerCase();
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${map[s] || map.ordered}`}>
      {s.replace("_"," ")}
    </span>
  );
}

// ── Items Table Modal ─────────────────────────────────────────────────────────
function ItemsModal({ po, onClose }) {
  if (!po) return null;

  const totalOrdered  = (po.items||[]).reduce((s,i)=>s+(i.orderedQty||i.quantity||0),0);
  const totalReceived = (po.items||[]).reduce((s,i)=>s+(i.totalReceivedQty||0),0);
  const totalPending  = Math.max(0, totalOrdered - totalReceived);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-black text-slate-800">
                PO Items — {po.poNumber}
              </p>
              <StatusPill status={po.status}/>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {po.vendor} · {po.items?.length||0} items · Date: {po.date}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <FiX size={16} className="text-slate-500"/>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-4 py-3 text-left w-8">Sl</th>
                <th className="px-4 py-3 text-left">Part No.</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-center">HSN/SAC</th>
                <th className="px-4 py-3 text-center">Ordered</th>
                <th className="px-4 py-3 text-center">Received</th>
                <th className="px-4 py-3 text-center">Pending</th>
                <th className="px-4 py-3 text-center">Unit</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(po.items||[]).map((item, idx) => {
                const ordered  = item.orderedQty || item.quantity || 0;
                const received = item.totalReceivedQty || 0;
                const pending  = Math.max(0, ordered - received);
                const istatus  =
                  received === 0       ? "ordered"  :
                  received < ordered   ? "partial"  :
                  received === ordered ? "complete" : "excess";

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 font-semibold">
                      {item.slNo || idx+1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.productCode || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                      {item.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                      {item.hsnSac || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-black text-slate-800 text-sm">
                      {ordered}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">
                      {received > 0 ? received : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pending > 0
                        ? <span className="font-bold text-orange-500">{pending}</span>
                        : <span className="text-emerald-500 font-bold text-base">✓</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400 uppercase">
                      {item.unit || "nos"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={istatus}/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <div className="flex items-center gap-6 text-xs">
            <span className="text-slate-500">
              Ordered: <strong className="text-slate-800">{totalOrdered}</strong>
            </span>
            <span className="text-slate-500">
              Received: <strong className="text-blue-600">{totalReceived}</strong>
            </span>
            <span className="text-slate-500">
              Pending: <strong className={totalPending > 0 ? "text-orange-500" : "text-emerald-600"}>
                {totalPending > 0 ? totalPending : "All received ✓"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState("All Status");
  const [viewPO, setViewPO]                 = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "excelupload"), orderBy("createdAt","desc")),
      (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const pos = all.filter((doc) => {
          if (doc.type === "INVOICE")     return false;
          if (doc.type === "SALES_ORDER") return false;
          if (doc.type !== "PO") {
            const buyer = doc.excelHeader?.buyer;
            if (buyer && buyer.trim() !== "") return false;
          }
          return true;
        });

        const mapped = pos.map((po) => {
          const { status: etaStatus, remainingDays } = calcEtaStatus(po.deliveryDate);
          const poStatus = po.poStatus || etaStatus;
          return {
            id:          po.id,
            poNumber:    po.woNumber || po.excelHeader?.voucherNo || po.id.slice(0,8).toUpperCase(),
            vendor:      po.customer || po.excelHeader?.supplier || po.excelHeader?.consignee || "—",
            date:        po.excelHeader?.dated || "—",
            eta:         po.deliveryDate || "—",
            status:      poStatus,
            remainingDays,
            createdAt:   po.createdAt || null,
            excelHeader: po.excelHeader || {},
            items: (po.items||[]).map((item) => ({
              ...item,
              orderedQty:       item.orderedQty || item.quantity || 0,
              totalReceivedQty: item.totalReceivedQty || 0,
            })),
          };
        });

        setPurchaseOrders(mapped);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchSearch =
        po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        po.vendor.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "All Status" ||
        po.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, search, statusFilter]);

  const totalCount   = purchaseOrders.length;
  const orderedCount = purchaseOrders.filter((p) => p.status==="ordered"||p.status==="warning").length;
  const partialCount = purchaseOrders.filter((p) => p.status==="partial").length;
  const overdueCount = purchaseOrders.filter((p) => p.status==="overdue").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Purchase Orders</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track vendor orders and material arrival</p>
        </div>
        <button
          onClick={() => navigate("/sales/purchase-orders/upload")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <FiPlus size={16}/> Upload PO
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"TOTAL PURCHASE ORDERS", value:totalCount,   icon:<FiShoppingCart size={22}/>, bg:"bg-indigo-600", border:"border-slate-200" },
            { label:"ORDERED",               value:orderedCount, icon:<FiClock size={22}/>,        bg:"bg-blue-500",   border:"border-blue-100" },
            { label:"PARTIAL",               value:partialCount, icon:<FiAlertTriangle size={22}/>,bg:"bg-orange-500", border:"border-orange-100" },
            { label:"OVERDUE",               value:overdueCount, icon:<FiAlertCircle size={22}/>,  bg:"bg-red-500",    border:"border-red-100" },
          ].map((c) => (
            <div key={c.label} className={`bg-white rounded-2xl border ${c.border} p-5 flex items-center gap-4 shadow-sm`}>
              <div className={`${c.bg} text-white p-3 rounded-xl flex-shrink-0`}>{c.icon}</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{c.label}</p>
                <p className="text-3xl font-black mt-0.5 text-slate-800">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-black text-slate-800">All Purchase Orders</p>
            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} orders</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                placeholder="Search PO, Vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {["All Status","ordered","partial","complete","excess","overdue","warning"].map((s) => (
                <option key={s} value={s}>
                  {s==="All Status" ? "All Status" : s.charAt(0).toUpperCase()+s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <FiRefreshCw size={28} className="animate-spin mx-auto text-indigo-500 mb-3"/>
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-5 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-center">Date</th>
                  <th className="px-4 py-3 text-center">ETA</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">View</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((po) => {
                  const totalOrdered  = po.items.reduce((s,i)=>s+(i.orderedQty||0),0);
                  const totalReceived = po.items.reduce((s,i)=>s+(i.totalReceivedQty||0),0);
                  const rowBg =
                    po.status==="overdue" ? "bg-red-50/40"    :
                    po.status==="warning" ? "bg-orange-50/30" :
                    po.status==="partial" ? "bg-orange-50/20" : "";

                  return (
                    <tr key={po.id} className={`hover:bg-slate-50/60 transition-colors ${rowBg}`}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">{po.poNumber}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {po.createdAt ? new Date(po.createdAt).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-700">{po.vendor}</p>
                        {po.excelHeader?.reference && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{po.excelHeader.reference}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-slate-600">{po.date}</td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <FiClock size={11} className={
                              po.status==="overdue" ? "text-red-500" :
                              po.status==="warning" ? "text-orange-500" : "text-slate-400"
                            }/>
                            <span className="text-xs text-slate-500">{po.eta!=="—" ? po.eta : "—"}</span>
                          </div>
                          {po.remainingDays !== null && (
                            <span className={`text-[10px] font-bold ${
                              po.status==="overdue" ? "text-red-500" :
                              po.status==="warning" ? "text-orange-500" : "text-slate-400"
                            }`}>
                              {po.remainingDays < 0
                                ? `${Math.abs(po.remainingDays)} days overdue`
                                : `${po.remainingDays} days remaining`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-black text-slate-800">{po.items.length}</span>
                        {totalReceived > 0 && (
                          <p className="text-[10px] text-orange-500 font-bold mt-0.5">
                            {totalReceived}/{totalOrdered} rcvd
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusPill status={po.status}/>
                        {po.status==="partial" && totalOrdered-totalReceived > 0 && (
                          <p className="text-[10px] text-orange-500 font-bold mt-1">
                            {totalOrdered-totalReceived} pending
                          </p>
                        )}
                      </td>

                      {/* ── View → Items Table Modal ── */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setViewPO(po)}
                          className="flex items-center gap-1.5 mx-auto text-teal-600 hover:text-teal-800 text-xs font-semibold bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <FiEye size={12}/> View
                        </button>
                      </td>

                      {/* ── Edit → Edit Page ── */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => navigate(`/sales/purchase-orders/upload?poId=${po.id}&editMode=true`)}
                          className="flex items-center gap-1.5 mx-auto text-indigo-600 hover:text-indigo-800 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <FiEdit2 size={12}/> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-slate-400 text-sm">
                      No purchase orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-xs font-black text-slate-600 mb-4">📋 Status Legend:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { color:"bg-blue-500",    label:"Ordered",  desc:"PO sent, awaiting material" },
            { color:"bg-orange-500",  label:"Partial",  desc:"Some material received" },
            { color:"bg-emerald-500", label:"Complete", desc:"All material received" },
            { color:"bg-purple-500",  label:"Excess",   desc:"Extra material received" },
            { color:"bg-orange-400",  label:"Warning",  desc:"2 days or less" },
            { color:"bg-red-500",     label:"Overdue",  desc:"ETA passed" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`}/>
              <div>
                <p className="text-xs font-bold text-slate-700">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items Modal */}
      {viewPO && <ItemsModal po={viewPO} onClose={() => setViewPO(null)}/>}
    </div>
  );
}