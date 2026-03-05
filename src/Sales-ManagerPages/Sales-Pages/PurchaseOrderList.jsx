import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShoppingCart,
  FiClock,
  FiAlertTriangle,
  FiAlertCircle,
  FiEye,
  FiEdit2,
  FiSearch,
  FiPlus,
  FiRefreshCw,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";
import { Card, CardHeader, Modal } from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

function calcEtaStatus(deliveryDate) {
  if (!deliveryDate) return { status: "ordered", remainingDays: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eta = new Date(deliveryDate);
  eta.setHours(0, 0, 0, 0);
  const diff = Math.round((eta - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { status: "overdue", remainingDays: diff };
  if (diff <= 2) return { status: "warning", remainingDays: diff };
  return { status: "ordered", remainingDays: diff };
}

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

// ── Status Pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    ordered:   "bg-blue-50   text-blue-700   border-blue-200",
    partial:   "bg-orange-50 text-orange-700 border-orange-200",
    complete:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    excess:    "bg-purple-50 text-purple-700 border-purple-200",
    overdue:   "bg-red-50    text-red-700    border-red-200",
    warning:   "bg-orange-50 text-orange-700 border-orange-200",
    received:  "bg-teal-50   text-teal-700   border-teal-200",
  };
  const s = (status || "ordered").toLowerCase();
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${map[s] || map.ordered}`}>
      {s.replace("_", " ")}
    </span>
  );
}

// ── History Modal ─────────────────────────────────────────────────────────────
function HistoryModal({ po, onClose }) {
  const [linkedInvoices, setLinkedInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!po) return;
    setLoading(true);
    getDocs(
      query(collection(db, "excelupload"), where("linkedPoId", "==", po.id))
    ).then((snap) => {
      const invoices = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => d.type === "INVOICE")
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setLinkedInvoices(invoices);
      setLoading(false);
    });
  }, [po?.id]);

  if (!po) return null;

  return (
    <Modal
      title={`History — ${po.poNumber}`}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-3">

        {/* ── PO Created ── */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
          <span className="text-base mt-0.5">📄</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-slate-800">Purchase Order Created</p>
              <StatusPill status="ordered" />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              PO: {po.poNumber} · Vendor: {po.vendor} · {po.items?.length || 0} items
            </p>
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
            {formatDateTime(po.createdAt)}
          </span>
        </div>

        {/* ── Edit History ── */}
        {(po.editHistory || []).length > 0 && (
          <>
            {po.editHistory.map((edit, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50/40">
                <span className="text-base mt-0.5">✏️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-800">Quantities Edited</p>
                  <div className="mt-1 space-y-0.5">
                    {(edit.changes || []).map((c, j) =>
                      c.productCode && c.oldQty !== undefined ? (
                        <p key={j} className="text-[11px] text-amber-700 font-mono">
                          {c.productCode}: <span className="line-through text-slate-400">{c.oldQty}</span>
                          {" → "}
                          <span className="font-bold text-amber-800">{c.newQty}</span>
                        </p>
                      ) : null
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                  {formatDateTime(edit.editedAt)}
                </span>
              </div>
            ))}
          </>
        )}

        {/* ── Invoices ── */}
        {loading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading invoices...</p>
          </div>
        ) : linkedInvoices.length > 0 ? (
          linkedInvoices.map((inv, i) => {
            const thisQty = (inv.items || []).reduce((s, item) => s + (item.newReceived || 0), 0);
            return (
              <React.Fragment key={i}>
                {/* Invoice uploaded */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-indigo-100 bg-indigo-50/30">
                  <span className="text-base mt-0.5">⬆️</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-indigo-800">
                        Invoice Uploaded{inv.invoiceNo ? ` — ${inv.invoiceNo}` : ""}
                      </p>
                      <StatusPill status={inv.poStatus || "partial"} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      +{thisQty} units received
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {inv.invoiceDate && (
                        <span className="text-[10px] text-slate-400">
                          📅 {inv.invoiceDate}
                        </span>
                      )}
                      {inv.qualityCheck && (
                        <span className={`text-[10px] font-bold ${
                          inv.qualityCheck === "passed" ? "text-emerald-600"
                          : inv.qualityCheck === "failed" ? "text-red-600"
                          : "text-orange-600"
                        }`}>
                          🔍 QC: {inv.qualityCheck.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                    {formatDateTime(inv.createdAt)}
                  </span>
                </div>

                {/* Status change event */}
                {inv.poStatus && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                    <span className="text-base mt-0.5">
                      {inv.poStatus === "complete" ? "✅" : inv.poStatus === "excess" ? "⚠️" : "🔄"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-slate-700">
                          Status changed → {inv.poStatus.toUpperCase()}
                        </p>
                        <StatusPill status={inv.poStatus} />
                      </div>
                      {inv.poStatus === "partial" && (
                        <p className="text-[10px] text-orange-500 font-bold mt-1">
                          ↳ Next invoice required for remaining units
                        </p>
                      )}
                      {inv.poStatus === "complete" && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">
                          ✓ PO fully fulfilled
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                      {formatDateTime(inv.createdAt)}
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })
        ) : (
          <div className="text-center py-6 text-slate-400">
            <FiClock size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No invoices uploaded yet</p>
          </div>
        )}

        {/* Awaiting next invoice */}
        {!loading && po.poStatus === "partial" && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-100 bg-orange-50/30">
            <span className="text-base">⏳</span>
            <p className="text-xs text-orange-600 font-bold">
              Awaiting next invoice...
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [historyPO, setHistoryPO] = useState(null);

  // ── Fetch POs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const pos = all.filter((doc) => {
          if (doc.type === "INVOICE") return false;
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
            id: po.id,
            poNumber:
              po.woNumber ||
              po.excelHeader?.voucherNo ||
              po.id.slice(0, 8).toUpperCase(),
            vendor:
              po.customer ||
              po.excelHeader?.supplier ||
              po.excelHeader?.consignee ||
              "—",
            date: po.excelHeader?.dated || "—",
            eta: po.deliveryDate || "—",
            status: poStatus,
            remainingDays,
            createdAt: po.createdAt || null,
            editHistory: po.editHistory || [],
            items: (po.items || []).map((item) => ({
              ...item,
              orderedQty: item.orderedQty || item.quantity || 0,
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

  // ── Filter ────────────────────────────────────────────────────────────────
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

  // ── Summary counts ────────────────────────────────────────────────────────
  const totalCount    = purchaseOrders.length;
  const orderedCount  = purchaseOrders.filter((p) => p.status === "ordered" || p.status === "warning").length;
  const partialCount  = purchaseOrders.filter((p) => p.status === "partial").length;
  const overdueCount  = purchaseOrders.filter((p) => p.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Purchase Orders</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track vendor orders and material arrival
          </p>
        </div>
        <button
          onClick={() => navigate("/sales/purchase-orders/upload")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <FiPlus size={16} /> Upload PO
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "TOTAL PURCHASE ORDERS",
              value: totalCount,
              icon: <FiShoppingCart size={22} />,
              iconBg: "bg-indigo-600",
              border: "border-slate-200",
              valColor: "text-slate-800",
            },
            {
              label: "ORDERED",
              value: orderedCount,
              icon: <FiClock size={22} />,
              iconBg: "bg-blue-500",
              border: "border-blue-100",
              valColor: "text-slate-800",
            },
            {
              label: "PARTIAL",
              value: partialCount,
              icon: <FiAlertTriangle size={22} />,
              iconBg: "bg-orange-500",
              border: "border-orange-100",
              valColor: "text-slate-800",
            },
            {
              label: "OVERDUE",
              value: overdueCount,
              icon: <FiAlertCircle size={22} />,
              iconBg: "bg-red-500",
              border: "border-red-100",
              valColor: "text-slate-800",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`bg-white rounded-2xl border ${card.border} p-5 flex items-center gap-4 shadow-sm`}
            >
              <div className={`${card.iconBg} text-white p-3 rounded-xl flex-shrink-0`}>
                {card.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  {card.label}
                </p>
                <p className={`text-3xl font-black mt-0.5 ${card.valColor}`}>
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-black text-slate-800">All Purchase Orders</p>
            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} orders</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search PO, Vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
              />
            </div>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {["All Status", "ordered", "partial", "complete", "excess", "overdue", "warning"].map((s) => (
                <option key={s} value={s}>
                  {s === "All Status" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16">
            <FiRefreshCw size={28} className="animate-spin mx-auto text-indigo-500 mb-3" />
            <p className="text-sm text-slate-400">Loading purchase orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FiShoppingCart size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-bold text-slate-400">No purchase orders found</p>
            <p className="text-xs text-slate-300 mt-1">Upload a PO to get started</p>
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
                  {/* ── NEW: History column ── */}
                  <th className="px-4 py-3 text-center">History</th>
                  {/* ── NEW: Action column ── */}
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((po) => {
                  const totalOrdered   = po.items.reduce((s, i) => s + (i.orderedQty || 0), 0);
                  const totalReceived  = po.items.reduce((s, i) => s + (i.totalReceivedQty || 0), 0);
                  const rowBg =
                    po.status === "overdue" ? "bg-red-50/40" :
                    po.status === "warning" ? "bg-orange-50/30" :
                    po.status === "partial" ? "bg-orange-50/20" : "";

                  return (
                    <tr key={po.id} className={`hover:bg-slate-50/60 transition-colors ${rowBg}`}>
                      {/* PO Number */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">{po.poNumber}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {po.createdAt
                            ? new Date(po.createdAt).toLocaleDateString("en-IN")
                            : "—"}
                        </p>
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-700">{po.vendor}</p>
                        {po.excelHeader?.reference && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {po.excelHeader.reference}
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-center text-sm text-slate-600">
                        {po.date || "—"}
                      </td>

                      {/* ETA */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <FiClock
                              size={11}
                              className={
                                po.status === "overdue" ? "text-red-500"
                                : po.status === "warning" ? "text-orange-500"
                                : "text-slate-400"
                              }
                            />
                            <span className="text-xs text-slate-500">
                              {po.eta !== "—" ? po.eta : "—"}
                            </span>
                          </div>
                          {po.remainingDays !== null && (
                            <span
                              className={`text-[10px] font-bold ${
                                po.status === "overdue" ? "text-red-500"
                                : po.status === "warning" ? "text-orange-500"
                                : "text-slate-400"
                              }`}
                            >
                              {po.remainingDays < 0
                                ? `${Math.abs(po.remainingDays)} days overdue`
                                : `${po.remainingDays} days remaining`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-black text-slate-800">
                          {po.items.length}
                        </span>
                        {totalReceived > 0 && (
                          <p className="text-[10px] text-orange-500 font-bold mt-0.5">
                            {totalReceived}/{totalOrdered} rcvd
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <StatusPill status={po.status} />
                        {po.status === "partial" && totalOrdered - totalReceived > 0 && (
                          <p className="text-[10px] text-orange-500 font-bold mt-1">
                            {totalOrdered - totalReceived} pending
                          </p>
                        )}
                      </td>

                      {/* ── History / View ── */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setHistoryPO(po)}
                          className="flex items-center gap-1.5 mx-auto text-teal-600 hover:text-teal-800 text-xs font-semibold bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <FiEye size={12} /> View
                        </button>
                      </td>

                      {/* ── Edit Action ── */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() =>
                            navigate(
                              `/sales/purchase-orders/upload?poId=${po.id}&editMode=true`
                            )
                          }
                          className="flex items-center gap-1.5 mx-auto text-indigo-600 hover:text-indigo-800 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <FiEdit2 size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
            { color: "bg-blue-500",    label: "Ordered",  desc: "PO sent, awaiting material" },
            { color: "bg-orange-500",  label: "Partial",  desc: "Some material received" },
            { color: "bg-emerald-500", label: "Complete", desc: "All material received" },
            { color: "bg-purple-500",  label: "Excess",   desc: "Extra material received" },
            { color: "bg-orange-400",  label: "Warning",  desc: "2 days or less" },
            { color: "bg-red-500",     label: "Overdue",  desc: "ETA passed" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
              <div>
                <p className="text-xs font-bold text-slate-700">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── History Modal ── */}
      {historyPO && (
        <HistoryModal po={historyPO} onClose={() => setHistoryPO(null)} />
      )}
    </div>
  );
}