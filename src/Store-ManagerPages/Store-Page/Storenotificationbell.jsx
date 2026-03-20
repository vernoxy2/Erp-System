import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell, FiX, FiPackage, FiShoppingCart, FiTruck,
  FiFileText, FiAlertTriangle, FiCheckCircle, FiClock,
  FiChevronRight, FiRefreshCw, FiShield,
} from "react-icons/fi";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(timestamp) {
  if (!timestamp) return "recently";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date)) return "recently";
  const diffMins = Math.floor((Date.now() - date) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function formatDateTime(val) {
  if (!val) return "—";
  try {
    let date;
    if (typeof val?.toDate === "function") date = val.toDate();
    else if (val?.seconds) date = new Date(val.seconds * 1000);
    else date = new Date(val);
    return date.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return "—"; }
}

// ─── Notification Config ───────────────────────────────────────────────────────

const NOTIF_CONFIG = {
  pending_qc:     { color: "bg-amber-100 text-amber-700 border-amber-200",    dot: "bg-amber-500",    icon: FiPackage,       label: "QC Pending"     },
  so_qc_pending:  { color: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500",   icon: FiShield,        label: "SO QC Pending"  },
  damage:         { color: "bg-red-100 text-red-700 border-red-200",          dot: "bg-red-500",      icon: FiAlertTriangle, label: "Damage"         },
  shortage:       { color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-400",   icon: FiAlertTriangle, label: "Shortage"       },
  fulfilled:      { color: "bg-green-100 text-green-700 border-green-200",    dot: "bg-green-500",    icon: FiCheckCircle,   label: "Fulfilled"      },
  replacement:    { color: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-400",     icon: FiRefreshCw,     label: "Replacement"    },
  excess:         { color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-400",   icon: FiAlertTriangle, label: "Excess"         },
};

const PRIORITY = {
  damage:        0,
  shortage:      1,
  pending_qc:    2,
  so_qc_pending: 3,
  excess:        4,
  replacement:   5,
  fulfilled:     6,
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StoreNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastFetched, setLastFetched] = useState(null);
  const [cleared, setCleared] = useState(false);
  const dropdownRef = useRef(null);

  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("storeDismissedNotifs") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [uploadsSnap, notifsSnap] = await Promise.all([
        getDocs(query(collection(db, "excelupload"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "notifications")),
      ]);

      const notifs = [];
      const all = uploadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // ── PO Invoices pending Store QC ────────────────────────────────────────
      const pendingInvoices = all.filter(d => {
        const t = (d.type || "").trim().toUpperCase();
        return t === "INVOICE" && d.storeQcStatus === "pending" && !!d.linkedPoId;
      });

      pendingInvoices.forEach(inv => {
        const totalItems = (inv.items || []).length;
        const totalQty = (inv.items || []).reduce((s, i) => s + (i.newReceived || i.invoiceQty || 0), 0);
        notifs.push({
          id: `inv_qc_${inv.id}`,
          kind: "pending_qc",
          title: "📦 New Invoice — QC Pending",
          message: `Invoice ${inv.invoiceNo || "—"} for PO ${inv.linkedPoNo || "—"} · ${inv.vendor || "—"} · ${totalItems} items · ${totalQty} units`,
          time: inv.createdAt,
          tag: inv.linkedPoNo || inv.invoiceNo || "—",
          action: "/store/verify-quality",
          docId: inv.id,
          invoiceNo: inv.invoiceNo,
          vendor: inv.vendor,
          totalItems,
          totalQty,
        });
      });

      // ── SO pending Store QC ─────────────────────────────────────────────────
      const pendingSOs = all.filter(d => {
        const t = (d.type || "").toUpperCase().replace(/[_\s]/g, "");
        const isSO = t === "SALESORDER" || t === "SO";
        const soSt = d.soStatus || d.status || "";
        return isSO && soSt === "waiting_for_qc";
      });

      pendingSOs.forEach(so => {
        const header = so.excelHeader || so.invoiceHeader || {};
        const soNumber = header.reference || so.invoiceNo || so.woNumber || `SO-${so.id.slice(0, 6).toUpperCase()}`;
        const customer = so.customer || header.consignee || "—";
        const totalItems = (so.items || []).length;
        const totalQty = (so.items || []).reduce((s, i) => s + (i.quantity || i.orderedQty || 0), 0);
        notifs.push({
          id: `so_qc_${so.id}`,
          kind: "so_qc_pending",
          title: "🚚 Sales Order — QC Required",
          message: `${soNumber} · ${customer} · ${totalItems} items · ${totalQty} units`,
          time: so.createdAt,
          tag: soNumber,
          action: "/store/verify-quality",
          docId: so.id,
          customer,
          totalItems,
          totalQty,
        });
      });

      // ── QC / Stock notifications ─────────────────────────────────────────────
      // ✅ Store bell → store ના જ pages પર જાય
      notifsSnap.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d.isResolved) return;
        if (d.target === "sales") return; // sales-only notifications skip

        const titleMap = {
          damage:      "🔴 Damage Reported",
          shortage:    "🟠 Shortage Noted",
          fulfilled:   "✅ Order Fulfilled",
          replacement: "🔁 Replacement Received",
          excess:      "🟣 Excess Received",
        };

        notifs.push({
          id: `notif_${docSnap.id}`,
          kind: d.type || "damage",
          title: titleMap[d.type] || "Stock Alert",
          message: d.message || "",
          time: d.createdAt,
          tag: d.refNo || d.productCode || "",
          // ✅ Store bell → always store pages only
          action: "/store/verify-quality",
          docId: docSnap.id,
          invoiceNo:   d.invoiceNo   || "",
          refNo:       d.refNo       || "",
          damagedQty:  d.damagedQty  || 0,
          pendingQty:  d.pendingQty  || 0,
          productCode: d.productCode || "",
          source:      d.source      || "",
        });
      });

      // ✅ Sort by priority
      notifs.sort((a, b) => (PRIORITY[a.kind] ?? 9) - (PRIORITY[b.kind] ?? 9));

      // ✅ Filter dismissed
      const savedDismissed = JSON.parse(localStorage.getItem("storeDismissedNotifs") || "[]");
      const filtered = notifs.filter(n => !savedDismissed.includes(n.id));

      setNotifications(filtered);
      setLastFetched(new Date());
      if (filtered.length > 0) setCleared(false);
    } catch (err) {
      console.error("Store notification fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { if (open) fetchNotifications(); }, [open]);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const urgentCount = notifications.filter(n =>
    n.kind === "damage"        ||
    n.kind === "shortage"      ||
    n.kind === "pending_qc"    ||
    n.kind === "so_qc_pending"
  ).length;

  // ─── Dismiss all ────────────────────────────────────────────────────────────
  const handleDismissAll = () => {
    const allIds = notifications.map(n => n.id);
    const existing = JSON.parse(localStorage.getItem("storeDismissedNotifs") || "[]");
    const merged = [...new Set([...existing, ...allIds])];
    localStorage.setItem("storeDismissedNotifs", JSON.stringify(merged));
    setDismissedIds(merged);
    setNotifications([]);
    setCleared(true);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Store Notifications"
      >
        <FiBell size={20} className="text-slate-600" />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {urgentCount > 9 ? "9+" : urgentCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 top-11 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
          style={{ maxHeight: "80vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <FiBell size={16} className="text-emerald-600" />
              <span className="font-bold text-slate-800 text-sm">Store Notifications</span>
              {notifications.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {notifications.length} total
                </span>
              )}
              {urgentCount > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {urgentCount} urgent
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchNotifications}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                title="Refresh"
              >
                <FiRefreshCw size={13} className={`text-slate-500 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <FiX size={13} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 110px)" }}>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Fetching updates...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2">
                <FiCheckCircle size={32} className="text-green-400" />
                <p className="text-sm font-medium text-slate-500">
                  {cleared ? "Notifications cleared!" : "All caught up!"}
                </p>
                <p className="text-xs text-slate-400">No pending QC or stock alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map(n => {
                  const cfg = NOTIF_CONFIG[n.kind] || NOTIF_CONFIG.pending_qc;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                      onClick={() => { navigate(n.action); setOpen(false); }}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color} border`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">{timeAgo(n.time)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                        <span className="inline-block mt-1 font-mono text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {n.tag}
                        </span>

                        {/* PO Invoice QC pending chips */}
                        {n.kind === "pending_qc" && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              📦 {n.totalQty} units to verify
                            </span>
                            {n.vendor && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                {n.vendor}
                              </span>
                            )}
                          </div>
                        )}

                        {/* SO QC pending chips */}
                        {n.kind === "so_qc_pending" && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                              🚚 {n.totalQty} units to dispatch
                            </span>
                            {n.customer && (
                              <span className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">
                                {n.customer}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Damage / Shortage chips */}
                        {(n.damagedQty > 0 || n.pendingQty > 0) && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {n.damagedQty > 0 && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                🔴 {n.damagedQty} damaged
                              </span>
                            )}
                            {n.pendingQty > 0 && (
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                                ⏳ {n.pendingQty} pending
                              </span>
                            )}
                            {n.source && (
                              <span className="text-[10px] text-slate-400 uppercase font-bold">
                                {n.source === "po" ? "📦 PO" : "🚚 SO"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <FiChevronRight size={12} className="text-slate-300 group-hover:text-slate-500 mt-1 flex-shrink-0 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && (
            <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {lastFetched ? `Updated ${timeAgo(lastFetched)}` : ""}
              </span>
              {notifications.length > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <FiChevronRight size={11} /> See all {notifications.length} notifications
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}