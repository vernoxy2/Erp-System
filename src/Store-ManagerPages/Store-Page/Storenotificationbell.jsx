import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell, FiX, FiCheckCircle, FiAlertTriangle,
  FiShield, FiChevronRight, FiRefreshCw, FiPackage,
} from "react-icons/fi";
import { collection, getDocs, query, where } from "firebase/firestore";
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

// ─── Notification Config ───────────────────────────────────────────────────────
const NOTIF_CONFIG = {
  quality_pending: {
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: FiShield,
    label: "Quality Verify",
  },
  quality_approved: {
    color: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    icon: FiCheckCircle,
    label: "Quality Approved",
  },
  stock_shortage: {
    color: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    icon: FiAlertTriangle,
    label: "Stock Shortage",
  },
  stock_low: {
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-400",
    icon: FiPackage,
    label: "Low Stock",
  },
  stock_reorder: {
    color: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-400",
    icon: FiPackage,
    label: "Reorder",
  },
};

// ─── Stock Status Helper ───────────────────────────────────────────────────────
function getStockStatus(available, lowLevel, reorderLevel) {
  if (available <= 0) return "shortage";
  if (available < lowLevel * 0.5) return "shortage";
  if (available < lowLevel) return "low";
  if (available < reorderLevel) return "reorder";
  return "ok";
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StoreNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastFetched, setLastFetched] = useState(null);
  const [cleared, setCleared] = useState(false);
  const dropdownRef = useRef(null);

  // ─── Dismissed IDs ───────────────────────────────────────────────────────
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("storeDismissedNotifs") || "[]"); }
    catch { return []; }
  });

  // ─── Click outside close ─────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Fetch Notifications ─────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const notifs = [];
      const savedDismissed = JSON.parse(localStorage.getItem("storeDismissedNotifs") || "[]");

      // ── 1. Quality Verify — pending items from sales ──────────────────────
      // Collection: qualityVerify  |  status: "pending"
      try {
        const qvSnap = await getDocs(
          query(collection(db, "qualityVerify"), where("status", "==", "pending"))
        );
        qvSnap.docs.forEach((doc) => {
          const d = doc.data();
          const ref = d.poNumber || d.invoiceNo || d.reference || `QV-${doc.id.slice(0, 6).toUpperCase()}`;
          const vendor = d.vendor || d.supplierName || "Unknown Vendor";
          const itemCount = d.items?.length || d.itemCount || 1;

          notifs.push({
            id: `quality_pending_${doc.id}`,
            kind: "quality_pending",
            title: "Quality Verification Pending",
            message: `${ref} from ${vendor} — ${itemCount} item(s) awaiting your verification.`,
            time: d.createdAt || d.submittedAt,
            tag: ref,
            action: "/store/quality-verify",
            docId: doc.id,
          });
        });
      } catch (e) {
        // qualityVerify collection may not exist yet
        console.warn("qualityVerify collection:", e.message);
      }

      // ── 2. Stock Alerts — shortage / low / reorder ────────────────────────
      try {
        const stockSnap = await getDocs(collection(db, "stock"));
        stockSnap.docs.forEach((doc) => {
          const item = doc.data();
          const available    = item.available ?? 0;
          const lowLevel     = item.lowLevel ?? 100;
          const reorderLevel = item.reorderLevel ?? 150;
          const status       = getStockStatus(available, lowLevel, reorderLevel);

          if (status === "shortage") {
            notifs.push({
              id: `stock_shortage_${doc.id}`,
              kind: "stock_shortage",
              title: "Stock Shortage",
              message: `${item.description || "Item"} — Available: ${Math.max(0, available)} ${item.unit || "nos"}. Immediate restock needed.`,
              time: item.lastUpdated,
              tag: item.productCode || doc.id.slice(0, 8).toUpperCase(),
              action: "/store/stock-alerts",
              docId: doc.id,
            });
          } else if (status === "low") {
            notifs.push({
              id: `stock_low_${doc.id}`,
              kind: "stock_low",
              title: "Low Stock Alert",
              message: `${item.description || "Item"} — Only ${available} ${item.unit || "nos"} left. Below minimum level.`,
              time: item.lastUpdated,
              tag: item.productCode || doc.id.slice(0, 8).toUpperCase(),
              action: "/store/stock-alerts",
              docId: doc.id,
            });
          } else if (status === "reorder") {
            notifs.push({
              id: `stock_reorder_${doc.id}`,
              kind: "stock_reorder",
              title: "Reorder Required",
              message: `${item.description || "Item"} — ${available} ${item.unit || "nos"} remaining. Consider reordering.`,
              time: item.lastUpdated,
              tag: item.productCode || doc.id.slice(0, 8).toUpperCase(),
              action: "/store/stock-alerts",
              docId: doc.id,
            });
          }
        });
      } catch (e) {
        console.warn("stock collection:", e.message);
      }

      // ── Sort: quality_pending first, then shortage, low, reorder ─────────
      const PRIORITY = {
        quality_pending:  0,
        quality_approved: 1,
        stock_shortage:   2,
        stock_low:        3,
        stock_reorder:    4,
      };
      notifs.sort((a, b) => (PRIORITY[a.kind] ?? 9) - (PRIORITY[b.kind] ?? 9));

      // ── Filter dismissed ──────────────────────────────────────────────────
      const filtered = notifs.filter((n) => !savedDismissed.includes(n.id));

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

  // ─── Derived counts ──────────────────────────────────────────────────────
  const urgentCount = notifications.filter(
    (n) => n.kind === "quality_pending" || n.kind === "stock_shortage"
  ).length;

  // ─── Dismiss all ─────────────────────────────────────────────────────────
  const handleDismissAll = () => {
    const allIds = notifications.map((n) => n.id);
    const existing = JSON.parse(localStorage.getItem("storeDismissedNotifs") || "[]");
    const merged = [...new Set([...existing, ...allIds])];
    localStorage.setItem("storeDismissedNotifs", JSON.stringify(merged));
    setDismissedIds(merged);
    setNotifications([]);
    setCleared(true);
    setOpen(false);
  };

  // ─── Dismiss single ───────────────────────────────────────────────────────
  const handleDismissOne = (e, id) => {
    e.stopPropagation();
    const existing = JSON.parse(localStorage.getItem("storeDismissedNotifs") || "[]");
    const merged = [...new Set([...existing, id])];
    localStorage.setItem("storeDismissedNotifs", JSON.stringify(merged));
    setDismissedIds(merged);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell Button */}
      <button
        onClick={() => setOpen((v) => !v)}
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

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-11 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
          style={{ maxHeight: "80vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <FiBell size={16} className="text-emerald-600" />
              <span className="font-bold text-slate-800 text-sm">Notifications</span>
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

          {/* Section Labels */}
          {!loading && notifications.length > 0 && (
            <div className="flex items-center gap-3 px-5 py-2 bg-white border-b border-slate-50">
              {[
                { kind: "quality_pending", label: "Quality", color: "bg-amber-100 text-amber-700" },
                { kind: "stock_shortage",  label: "Shortage", color: "bg-red-100 text-red-600" },
                { kind: "stock_low",       label: "Low Stock", color: "bg-yellow-100 text-yellow-700" },
                { kind: "stock_reorder",   label: "Reorder", color: "bg-orange-100 text-orange-700" },
              ].map((s) => {
                const count = notifications.filter((n) => n.kind === s.kind).length;
                if (!count) return null;
                return (
                  <span key={s.kind} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.color}`}>
                    {s.label}: {count}
                  </span>
                );
              })}
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 130px)" }}>
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
                <p className="text-xs text-slate-400">No pending verifications or stock alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((n) => {
                  const cfg = NOTIF_CONFIG[n.kind] || NOTIF_CONFIG.stock_low;
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
                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                            {timeAgo(n.time)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                          {n.message}
                        </p>
                        <span className="inline-block mt-1 font-mono text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {n.tag}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDismissOne(e, n.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded-lg transition-all flex-shrink-0 mt-0.5"
                        title="Dismiss"
                      >
                        <FiX size={11} className="text-slate-400" />
                      </button>
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
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors"
                >
                  <FiX size={11} /> Dismiss all
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}