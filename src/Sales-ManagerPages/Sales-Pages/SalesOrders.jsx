import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPackage, FiTruck, FiFileText, FiShoppingCart, FiAlertTriangle, FiClock, FiBell } from "react-icons/fi";
import { KPICard, Card, CardHeader, Alert, StatusBadge, NotificationBadge } from "../SalesComponent/ui/index";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function parseDate(dateStr) {
  if (!dateStr) return null;
  const shortMonthMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (shortMonthMatch) {
    const [, day, month, year] = shortMonthMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(`${day} ${month} ${fullYear}`);
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

function derivePoStatus(deliveryDateRaw, poStatus) {
  // ✅ Complete POs still show as complete (not hidden)
  if (poStatus === "complete") return "complete";
  const days = getDaysFromToday(deliveryDateRaw);
  if (days === null) return "pending";
  if (days < 0) return "overdue";
  if (days <= 2) return "warning";
  return "pending";
}

function formatDate(dateStr) {
  const date = parseDate(dateStr);
  if (!date || isNaN(date)) return dateStr || "";
  return date.toISOString().split("T")[0];
}

function timeAgo(timestamp) {
  if (!timestamp) return "recently";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMins = Math.floor((Date.now() - date) / 60000);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hours ago`;
  return `${Math.floor(diffHrs / 24)} days ago`;
}

// ✅ Flexible type matchers
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

// ─────────────────────────────────────────────────────────────────────────────

export default function SalesOrder() {
  const navigate = useNavigate();
  const [showAlerts, setShowAlerts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [challans, setChallans] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersSnap, challansSnap] = await Promise.all([
          getDocs(collection(db, "excelupload")),
          getDocs(collection(db, "challans")),
        ]);

        const rawChallans = challansSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const allDocs = ordersSnap.docs.map((doc) => {
          const d = doc.data();
          const header = d.excelHeader || d.invoiceHeader || {};
          const deliveryRaw = d.deliveryDate || header.dated || d.eta || "";

          return {
            id: doc.id,
            type: d.type || "",
            soStatus: d.soStatus || "",
            poStatus: d.poStatus || "",

            // SO fields
            woNumber: header.reference || d.invoiceNo || d.woNumber || `SO-${doc.id.slice(0, 8).toUpperCase()}`,
            customer: d.customer || header.consignee || "",
            deliveryDate: formatDate(deliveryRaw),
            _deliveryDateRaw: deliveryRaw,
            totalValue: d.totalValue || d.grandTotal || 0,
            items: d.items || [],
            createdAt: d.createdAt || null,

            // PO fields
            poNumber: d.invoiceNo || header.reference || d.poNumber || d.wonumber || `PO-${doc.id.slice(0, 8).toUpperCase()}`,
            vendor: header.buyer || d.vendor || header.companyName || header.consignee || "—",
            grandTotal: d.totalValue || d.grandTotal || 0,
            eta: formatDate(deliveryRaw),
          };
        });

        const salesOrders = allDocs
          .filter((d) => isSalesOrder(d.type))
          .map((so) => ({
            ...so,
            status: so.soStatus === "complete" ? "complete" : "active",
          }));

        // ✅ ALL POs — including complete ones — are now included
        const poOrders = allDocs
          .filter((d) => isPO(d.type))
          .map((po) => ({
            ...po,
            status: derivePoStatus(po._deliveryDateRaw, po.poStatus),
            remainingDays: getDaysFromToday(po._deliveryDateRaw),
          }));

        setWorkOrders(salesOrders);
        setPurchaseOrders(poOrders);
        setChallans(rawChallans);
      } catch (err) {
        console.error("Firebase fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const recentWorkOrders = workOrders.slice(0, 3);

  // ✅ Show ALL POs in the panel (complete + active + overdue)
  const recentPOs = purchaseOrders.slice(0, 5);
  const urgentPOs = purchaseOrders.filter(
    (po) => po.status === "overdue" || po.status === "warning"
  );

  const notifications = [
    ...purchaseOrders
      .filter((po) => po.status === "overdue")
      .map((po) => ({
        id: `overdue-${po.id}`,
        type: "error",
        title: "PO Overdue",
        message: `${po.poNumber} from ${po.vendor} is overdue by ${Math.abs(po.remainingDays)} day(s).`,
        time: timeAgo(po.createdAt),
        read: false,
        action: `/sales/purchase-orders`,
      })),
    ...purchaseOrders
      .filter((po) => po.status === "warning")
      .map((po) => ({
        id: `warning-${po.id}`,
        type: "warning",
        title: "PO Material Arriving Soon",
        message: `${po.poNumber} from ${po.vendor} is due in ${po.remainingDays} day(s).`,
        time: timeAgo(po.createdAt),
        read: false,
        action: `/sales/purchase-orders`,
      })),
    ...challans
      .filter((ch) => !ch.invoiceUrl && !ch.invoiceNumber)
      .map((ch) => ({
        id: `invoice-${ch.id}`,
        type: "info",
        title: "Invoice Pending Upload",
        message: `Challan for ${ch.customer || ch.id} is missing an invoice.`,
        time: timeAgo(ch.createdAt),
        read: false,
        action: `/sales/unbilled-challans`,
      })),
  ];

  const unreadNotifications = notifications.slice(0, 4);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    activeWorkOrders: workOrders.filter((wo) => wo.soStatus !== "complete").length,
    pendingChallans: challans.filter((ch) => !ch.invoiceUrl && !ch.invoiceNumber).length,
    // ✅ Fixed: Total POs (not just non-complete)
    totalPOs: purchaseOrders.length,
    activePOs: purchaseOrders.filter((po) => po.status !== "complete").length,
    overduePOs: purchaseOrders.filter((po) => po.status === "overdue").length,
    warningPOs: purchaseOrders.filter((po) => po.status === "warning").length,
    completedPOs: purchaseOrders.filter((po) => po.status === "complete").length,
    pendingInvoices: challans.filter((ch) => !ch.invoiceUrl && !ch.invoiceNumber).length,
    unreadNotifications: notifications.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Sales Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time overview of sales operations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/sales/sales-orders/create")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FiFileText size={14} /> Create Sales Order
          </button>
          <button
            onClick={() => navigate("/sales/sales-orders/upload")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FiFileText size={14} /> Upload Sales Order
          </button>
        </div>
      </div>

      {/* Critical Alerts */}
      {showAlerts && (stats.overduePOs > 0 || stats.warningPOs > 0) && (
        <Alert type="warning" onClose={() => setShowAlerts(false)}>
          <div className="space-y-1">
            <p className="font-bold">⚠️ Urgent Attention Required:</p>
            {stats.overduePOs > 0 && <p>• {stats.overduePOs} Purchase Orders are overdue</p>}
            {stats.warningPOs > 0 && <p>• {stats.warningPOs} Purchase Orders arriving in 2 days</p>}
            {stats.pendingInvoices > 0 && <p>• {stats.pendingInvoices} Challans pending invoice upload</p>}
          </div>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Active Work Orders"
          value={stats.activeWorkOrders}
          icon={FiPackage}
          color="blue"
          onClick={() => navigate("/sales/sales-orders/list")}
        />
        <KPICard
          label="Pending Challans"
          value={stats.pendingChallans}
          icon={FiTruck}
          color="purple"
          onClick={() => navigate("/sales/unbilled-challans")}
        />
        {/* ✅ Now shows TOTAL POs, not just non-complete */}
        <KPICard
          label="Total Purchase Orders"
          value={stats.totalPOs}
          icon={FiShoppingCart}
          color="indigo"
          onClick={() => navigate("/sales/purchase-orders")}
        />
        <KPICard
          label="Overdue POs"
          value={stats.overduePOs}
          icon={FiAlertTriangle}
          color="red"
          onClick={() => navigate("/sales/purchase-orders")}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Sales Orders */}
        <Card>
          <CardHeader
            title="Recent Sales Orders"
            subtitle={`${stats.activeWorkOrders} active orders`}
            action={
              <button onClick={() => navigate("/sales/sales-orders/list")} className="text-xs text-indigo-600 font-bold hover:text-indigo-700">
                View All →
              </button>
            }
          />
          <div className="divide-y divide-slate-50">
            {recentWorkOrders.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-400">No sales orders found.</p>
              </div>
            ) : (
              recentWorkOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate("/sales/sales-orders/list")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-800">{wo.woNumber}</p>
                        <StatusBadge status={wo.status} />
                      </div>
                      <p className="text-xs text-slate-600">{wo.customer}</p>
                      <p className="text-xs text-slate-400 mt-1">Delivery: {wo.deliveryDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">₹{(wo.totalValue / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-slate-400">{wo.items.length} items</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* ✅ Purchase Orders — shows ALL POs including complete */}
        <Card>
          <CardHeader
            title="Purchase Orders"
            subtitle={`${stats.totalPOs} total · ${stats.completedPOs} completed`}
            action={
              <button onClick={() => navigate("/sales/purchase-orders")} className="text-xs text-indigo-600 font-bold hover:text-indigo-700">
                View All →
              </button>
            }
          />
          <div className="divide-y divide-slate-50">
            {recentPOs.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-400">No purchase orders found.</p>
              </div>
            ) : (
              recentPOs.map((po) => (
                <div
                  key={po.id}
                  className={`px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    po.status === "overdue"
                      ? "bg-red-50"
                      : po.status === "warning"
                      ? "bg-orange-50"
                      : po.status === "complete"
                      ? "bg-green-50"
                      : ""
                  }`}
                  onClick={() => navigate("/sales/purchase-orders")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-800">{po.poNumber}</p>
                        <StatusBadge status={po.status} />
                      </div>
                      <p className="text-xs text-slate-600">{po.vendor}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <FiClock size={10} className="text-slate-400" />
                        <p className="text-xs text-slate-400">
                          {po.status === "complete"
                            ? "Completed ✓"
                            : po.status === "overdue"
                            ? `Overdue by ${Math.abs(po.remainingDays)} days`
                            : po.remainingDays !== null
                            ? `${po.remainingDays} days remaining`
                            : "ETA not set"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">₹{(po.grandTotal / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-slate-400">ETA: {po.eta || "—"}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader
          title="Notifications"
          subtitle={`${stats.unreadNotifications} unread`}
          action={
            <div className="flex items-center gap-2">
              <FiBell size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">{stats.unreadNotifications} new</span>
            </div>
          }
        />
        <div className="p-6 space-y-3">
          {unreadNotifications.length === 0 ? (
            <p className="text-sm text-slate-400 text-center">No new notifications. All caught up! ✅</p>
          ) : (
            unreadNotifications.map((notification) => (
              <NotificationBadge
                key={notification.id}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                time={notification.time}
                onClick={() => navigate(notification.action)}
              />
            ))
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/sales/sales-orders/upload")}
            className="p-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all text-center"
          >
            <FiPackage className="mx-auto mb-2 text-indigo-600" size={24} />
            <p className="text-xs font-bold text-slate-700">Upload Sales Order</p>
          </button>
          <button
            onClick={() => navigate("/sales/dispatch-on-challan")}
            className="p-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-center"
          >
            <FiTruck className="mx-auto mb-2 text-purple-600" size={24} />
            <p className="text-xs font-bold text-slate-700">Dispatch on Challan</p>
          </button>
          <button
            onClick={() => navigate("/sales/purchase-orders/create")}
            className="p-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all text-center"
          >
            <FiShoppingCart className="mx-auto mb-2 text-emerald-600" size={24} />
            <p className="text-xs font-bold text-slate-700">Create PO</p>
          </button>
          <button
            onClick={() => navigate("/sales/upload-sales-invoice")}
            className="p-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-all text-center"
          >
            <FiFileText className="mx-auto mb-2 text-amber-600" size={24} />
            <p className="text-xs font-bold text-slate-700">Upload Invoice</p>
          </button>
        </div>
      </Card>
    </div>
  );
}