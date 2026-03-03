import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell, FiX, FiPackage, FiShoppingCart, FiTruck,
  FiFileText, FiAlertTriangle, FiCheckCircle, FiClock,
  FiChevronRight, FiRefreshCw
} from "react-icons/fi";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m) {
    const fullYear = m[3].length === 2 ? `20${m[3]}` : m[3];
    return new Date(`${m[1]} ${m[2]} ${fullYear}`);
  }
  return new Date(dateStr);
}

function getDaysFromToday(dateStr) {
  const date = parseDate(dateStr);
  if (!date || isNaN(date)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
}

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

function isPO(type) {
  if (!type) return false;
  const t = type.trim().toLowerCase().replace(/[\s_\-\.]/g, "");
  return ["po", "purchaseorder", "purchase"].includes(t);
}

function isSalesOrder(type) {
  if (!type) return false;
  const t = type.trim().toLowerCase().replace(/[\s_\-\.]/g, "");
  return ["salesorder", "so", "workorder", "wo", "sales", "sales_order"].includes(t);
}

// ─── Notification Config ───────────────────────────────────────────────────────

const NOTIF_CONFIG = {
  po_overdue:       { color: "bg-red-100 text-red-700 border-red-200",     dot: "bg-red-500",    icon: FiAlertTriangle, label: "PO Overdue"        },
  po_warning:       { color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-400", icon: FiClock,        label: "Due Soon"          },
  po_complete:      { color: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500",  icon: FiCheckCircle,  label: "PO Complete"       },
  po_created:       { color: "bg-blue-100 text-blue-700 border-blue-200",    dot: "bg-blue-400",   icon: FiShoppingCart, label: "PO Created"        },
  so_created:       { color: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-400", icon: FiPackage,    label: "SO Created"        },
  so_complete:      { color: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500",  icon: FiCheckCircle,  label: "SO Complete"       },
  challan_pending:  { color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-400", icon: FiTruck,     label: "Invoice Pending"   },
  invoice_uploaded: { color: "bg-teal-100 text-teal-700 border-teal-200",    dot: "bg-teal-500",   icon: FiFileText,     label: "Invoice Uploaded"  },
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastFetched, setLastFetched] = useState(null);
  const dropdownRef = useRef(null);

  // ─── Click outside close ─────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setShowAll(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Fetch & Build Notifications ─────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersSnap, challansSnap] = await Promise.all([
        getDocs(collection(db, "excelupload")),
        getDocs(collection(db, "challans")),
      ]);

      const notifs = [];

      // ── PO Notifications ─────────────────────────────────────────────────
      ordersSnap.docs.forEach((doc) => {
        const d = doc.data();
        if (!isPO(d.type)) return;

        const header = d.excelHeader || d.invoiceHeader || {};
        const deliveryRaw = d.deliveryDate || header.dated || d.eta || "";
        const poNumber = d.invoiceNo || header.reference || d.poNumber || `PO-${doc.id.slice(0, 6).toUpperCase()}`;
        const vendor = header.buyer || d.vendor || header.companyName || header.consignee || "Unknown Vendor";
        const days = getDaysFromToday(deliveryRaw);
        const poStatus = d.poStatus || "";

        if (poStatus === "complete") {
          notifs.push({
            id: `po_complete_${doc.id}`,
            kind: "po_complete",
            title: `PO Completed`,
            message: `${poNumber} from ${vendor} has been received & completed.`,
            time: d.createdAt,
            tag: poNumber,
            action: "/sales/purchase-orders",
            docId: doc.id,
          });
        } else if (days !== null && days < 0) {
          notifs.push({
            id: `po_overdue_${doc.id}`,
            kind: "po_overdue",
            title: `PO Overdue`,
            message: `${poNumber} from ${vendor} is overdue by ${Math.abs(days)} day(s).`,
            time: d.createdAt,
            tag: poNumber,
            action: "/sales/purchase-orders",
            docId: doc.id,
          });
        } else if (days !== null && days <= 3) {
          notifs.push({
            id: `po_warning_${doc.id}`,
            kind: "po_warning",
            title: `Material Arriving Soon`,
            message: `${poNumber} from ${vendor} is due in ${days} day(s).`,
            time: d.createdAt,
            tag: poNumber,
            action: "/sales/purchase-orders",
            docId: doc.id,
          });
        } else {
          notifs.push({
            id: `po_created_${doc.id}`,
            kind: "po_created",
            title: `Purchase Order Active`,
            message: `${poNumber} from ${vendor} is active.`,
            time: d.createdAt,
            tag: poNumber,
            action: "/sales/purchase-orders",
            docId: doc.id,
          });
        }
      });

      // ── SO Notifications ─────────────────────────────────────────────────
      ordersSnap.docs.forEach((doc) => {
        const d = doc.data();
        if (!isSalesOrder(d.type)) return;

        const header = d.excelHeader || d.invoiceHeader || {};
        const soNumber = header.reference || d.invoiceNo || d.woNumber || `SO-${doc.id.slice(0, 6).toUpperCase()}`;
        const customer = d.customer || header.consignee || "Unknown Customer";
        const soStatus = d.soStatus || "";

        if (soStatus === "complete") {
          notifs.push({
            id: `so_complete_${doc.id}`,
            kind: "so_complete",
            title: `Sales Order Completed`,
            message: `${soNumber} for ${customer} has been fulfilled.`,
            time: d.createdAt,
            tag: soNumber,
            action: "/sales/sales-orders/list",
            docId: doc.id,
          });
        } else {
          notifs.push({
            id: `so_created_${doc.id}`,
            kind: "so_created",
            title: `Sales Order Active`,
            message: `${soNumber} for ${customer} is in progress.`,
            time: d.createdAt,
            tag: soNumber,
            action: "/sales/sales-orders/list",
            docId: doc.id,
          });
        }
      });

      // ── Challan / Invoice Notifications ───────────────────────────────────
      challansSnap.docs.forEach((doc) => {
        const d = doc.data();
        const customer = d.customer || doc.id;

        if (!d.invoiceUrl && !d.invoiceNumber) {
          notifs.push({
            id: `challan_pending_${doc.id}`,
            kind: "challan_pending",
            title: `Invoice Pending`,
            message: `Challan for ${customer} is missing an invoice upload.`,
            time: d.createdAt,
            tag: customer,
            action: "/sales/unbilled-challans",
            docId: doc.id,
          });
        } else {
          notifs.push({
            id: `invoice_uploaded_${doc.id}`,
            kind: "invoice_uploaded",
            title: `Invoice Uploaded`,
            message: `Invoice for ${customer} has been uploaded successfully.`,
            time: d.createdAt,
            tag: d.invoiceNumber || customer,
            action: "/sales/unbilled-challans",
            docId: doc.id,
          });
        }
      });

      // ── Sort: urgent first, then by time ─────────────────────────────────
      const PRIORITY = { po_overdue: 0, po_warning: 1, challan_pending: 2, po_created: 3, so_created: 4, po_complete: 5, so_complete: 6, invoice_uploaded: 7 };
      notifs.sort((a, b) => (PRIORITY[a.kind] ?? 9) - (PRIORITY[b.kind] ?? 9));

      setNotifications(notifs);
      setLastFetched(new Date());
    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount + when opened
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // ─── Derived ────────────────────────────────────────────────────────────
  const urgentCount = notifications.filter(
    (n) => n.kind === "po_overdue" || n.kind === "po_warning" || n.kind === "challan_pending"
  ).length;

  const previewList = notifications.slice(0, 6);
  const displayList = showAll ? notifications : previewList;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen((v) => !v); setShowAll(false); }}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
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
        <div className="absolute right-0 top-11 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
          style={{ maxHeight: "80vh" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <FiBell size={16} className="text-indigo-600" />
              <span className="font-bold text-slate-800 text-sm">Notifications</span>
              {notifications.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
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
                onClick={() => { setOpen(false); setShowAll(false); }}
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
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Fetching updates...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2">
                <FiCheckCircle size={32} className="text-green-400" />
                <p className="text-sm font-medium text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-400">No new notifications</p>
              </div>
            ) : showAll ? (
              /* ── Full Table View ── */
              <div className="p-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-2 text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Type</th>
                      <th className="text-left py-2 px-2 text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Activity</th>
                      <th className="text-left py-2 px-2 text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Ref</th>
                      <th className="text-right py-2 px-2 text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((n) => {
                      const cfg = NOTIF_CONFIG[n.kind] || NOTIF_CONFIG.so_created;
                      const Icon = cfg.icon;
                      return (
                        <tr
                          key={n.id}
                          className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => { navigate(n.action); setOpen(false); setShowAll(false); }}
                        >
                          <td className="py-2.5 px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
                              <Icon size={9} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-700 max-w-[160px]">
                            <p className="font-semibold text-slate-800 text-[11px] leading-tight">{n.title}</p>
                            <p className="text-slate-500 text-[10px] leading-tight truncate">{n.message}</p>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {n.tag}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-400 text-[10px] whitespace-nowrap">
                            {timeAgo(n.time)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── Preview Card List ── */
              <div className="divide-y divide-slate-50">
                {displayList.map((n) => {
                  const cfg = NOTIF_CONFIG[n.kind] || NOTIF_CONFIG.so_created;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                      onClick={() => { navigate(n.action); setOpen(false); setShowAll(false); }}
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
                        <span className="inline-block mt-1 font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {n.tag}
                        </span>
                      </div>
                      <FiChevronRight size={12} className="text-slate-300 group-hover:text-slate-500 mt-1 flex-shrink-0 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && notifications.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {lastFetched ? `Updated ${timeAgo(lastFetched)}` : ""}
              </span>
              <button
                onClick={() => setShowAll((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {showAll ? (
                  <><FiX size={11} /> Show less</>
                ) : (
                  <><FiChevronRight size={11} /> See all {notifications.length} notifications</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}