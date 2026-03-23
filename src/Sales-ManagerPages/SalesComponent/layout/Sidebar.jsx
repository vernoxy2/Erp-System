import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../firebase";
import {
  FiHome, FiFileText, FiBell, FiTruck, FiClock, FiArchive,
  FiShoppingCart, FiUpload, FiBarChart2, FiPackage, FiAlertTriangle,
  FiTrendingUp, FiLayers, FiSettings, FiClipboard, FiInbox,
  FiRefreshCw, FiMenu, FiChevronLeft,
} from "react-icons/fi";
import logo from "../../../assets/logo.svg";

export default function Sidebar({ collapsed, setCollapsed }) {
  const [userData, setUserData] = useState({ name: "Loading...", email: "" });
  const [lowStockCount,        setLowStockCount]        = useState(0);
const [readyDispatchCount,   setReadyDispatchCount]   = useState(0);
const [unbilledCount,        setUnbilledCount]         = useState(0);
const [debitNotesCount,      setDebitNotesCount]       = useState(0);
const [purchaseOrderBadge,   setPurchaseOrderBadge]   = useState(null);
const [receivedChallanCount, setReceivedChallanCount] = useState(0);
const [stockAlertsCount,     setStockAlertsCount]     = useState(0);
useEffect(() => {
  return onSnapshot(collection(db, "stock"), (snap) => {
    setLowStockCount(snap.docs.filter(d => {
      const { available, reorderQty, minStock } = d.data();
      const a = parseFloat(available) || 0, r = parseFloat(reorderQty || minStock || 0);
      return r > 0 && a <= r;
    }).length);
  });
}, []);

useEffect(() => {
  return onSnapshot(collection(db, "salesOrders"), (snap) => {
    setReadyDispatchCount(snap.docs.filter(d =>
      ["ready_for_dispatch","ready"].includes(d.data().status)
    ).length);
  });
}, []);

useEffect(() => {
  return onSnapshot(collection(db, "dispatchChallans"), (snap) => {
    setUnbilledCount(snap.docs.filter(d => {
      const data = d.data();
      return !data.invoiced && !data.invoiceCreated && data.storeQcStatus;
    }).length);
    setReceivedChallanCount(snap.docs.filter(d =>
      ["approved","passed_with_issues"].includes(d.data().storeQcStatus)
    ).length);
  });
}, []);

useEffect(() => {
  return onSnapshot(collection(db, "SalesDebitNotes"), (snap) => {
    setDebitNotesCount(snap.docs.filter(d =>
      ["waiting_store_qc","passed_with_issues"].includes(d.data().status)
    ).length);
  });
}, []);

useEffect(() => {
  return onSnapshot(collection(db, "purchaseOrders"), (snap) => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const overdue = snap.docs.filter(d => {
      const data = d.data();
      if (["completed","cancelled"].includes(data.status)) return false;
      const t = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : null;
      return t && t < twoDaysAgo;
    }).length;
    setPurchaseOrderBadge(overdue > 0 ? "2d" : null);
  });
}, []);

useEffect(() => {
  return onSnapshot(collection(db, "stock"), (snap) => {
    setStockAlertsCount(snap.docs.filter(d => {
      const { available, minStock, safetyStock } = d.data();
      const a = parseFloat(available) || 0, m = parseFloat(minStock || safetyStock || 0);
      return m > 0 && a < m;
    }).length);
  });
}, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "user", user.uid));
          if (snap.exists()) setUserData(snap.data());
        } catch (e) { console.error(e); }
      }
    });
    return () => unsubscribe();
  }, []);

  const initials = userData.name
    ? userData.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const navSections = [
    {
      title: null,
      items: [{ to: "/sales/dashboard", icon: FiHome, label: "Dashboard" }],
    },
    {
      title: "STOCK MANAGEMENT",
      items: [
        { to: "/sales/low-stock-management", icon: FiAlertTriangle, label: "Low Stock Alerts",   badge: lowStockCount || null,  badgeColor: "red" },
        { to: "/sales/category-management",  icon: FiLayers,        label: "Manage Categories" },
        { to: "/sales/product-management",   icon: FiSettings,      label: "Manage Products" },
        { to: "/sales/stock-summary",        icon: FiBarChart2,     label: "Stock Summary" },
      ],
    },
    {
      title: "OUTWARD",
      items: [
        { to: "/sales/sales-orders",          icon: FiClipboard,   label: "Sales Orders",          end: true },
        { to: "/sales/sales-orders/List",     icon: FiFileText,    label: "Sales Orders List" },
        { to: "/sales/upload-sales-invoice",  icon: FiUpload,      label: "Upload Sales Invoice" },
        { to: "/sales/ready-for-dispatch",    icon: FiBell,        label: "Ready for Dispatch",       badgeColor: "emerald" },
        { to: "/sales/dispatch-on-challan",   icon: FiTruck,       label: "Dispatch on Challan" },
        { to: "/sales/unbilled-challans",     icon: FiClock,       label: "Unbilled Challans",     badge: unbilledCount || null,    badgeColor: "red" },
        { to: "/sales/invoice-history",       icon: FiArchive,     label: "Sales Invoice History" },
        { to: "/sales/debit-credit-notes",    icon: FiRefreshCw,   label: "Debit/Credit Notes",    badge: debitNotesCount || null,    badgeColor: "amber" },
      ],
    },
    {
      title: "INWARD",
      items: [
        { to: "/sales/purchase-orders",        icon: FiShoppingCart, label: "Purchase Orders",     badge: purchaseOrderBadge, badgeColor: "orange" },
        { to: "/sales/upload-vendor-invoice",  icon: FiUpload,       label: "Upload Vendor Invoice" },
        { to: "/sales/recieved-on-challan",    icon: FiInbox,        label: "Received on Challan",  badge: receivedChallanCount || null,   badgeColor: "amber" },
        { to: "/sales/vendor-invoice-history", icon: FiArchive,      label: "Vendor Invoice History" },
      ],
    },
    {
      title: "INVENTORY",
      items: [
        { to: "/sales/items-master", icon: FiPackage,      label: "Items Master" },
        { to: "/sales/stock-alerts", icon: FiAlertTriangle, label: "Stock Alerts", badge: stockAlertsCount || null,  badgeColor: "red" },
      ],
    },
    {
      title: "REPORTS",
      items: [
        { to: "/sales/reports", icon: FiTrendingUp, label: "Reports & Analytics" },
      ],
    },
  ];

  const getBadgeClasses = (color) => ({
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    red:     "bg-red-100 text-red-700 border-red-200",
    orange:  "bg-orange-100 text-orange-700 border-orange-200",
    amber:   "bg-amber-100 text-amber-700 border-amber-200",
  }[color] || "bg-slate-100 text-slate-700 border-slate-200");

  return (
    <aside
      className={`
        relative bg-white border-r border-slate-200 flex flex-col h-screen
        transition-all duration-300 ease-in-out flex-shrink-0
        ${collapsed ? "w-[64px]" : "w-64"}
      `}
    >
      {/* ── Header: Logo + Toggle ── */}
      <div className="h-16 border-b border-slate-200 flex items-center flex-shrink-0 relative px-3">

        {/* Expanded: logo + title */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-8">
            <img src={logo} alt="Fib2Fab" className="h-9 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-black text-indigo-600 whitespace-nowrap">ERP System</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
                Sales & Distribution
              </p>
            </div>
          </div>
        )}

        {/* Collapsed: centred logo */}
        {collapsed && (
          <div className="flex-1 flex justify-center">
            <img src={logo} alt="Fib2Fab" className="h-8" />
          </div>
        )}

        {/* Toggle button — always visible, pinned to right edge */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`
            absolute right-2 top-1/2 -translate-y-1/2
            w-7 h-7 flex items-center justify-center rounded-lg
            text-slate-400 hover:bg-slate-100 hover:text-slate-700
            transition-colors flex-shrink-0
          `}
        >
          {collapsed ? <FiMenu size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden">
        {navSections.map((section, idx) => (
          <div key={idx} className={idx > 0 ? "mt-4" : ""}>
            {/* Section label */}
            {section.title && (
              collapsed
                ? <div className="border-t border-slate-100 my-2 mx-1" />
                : (
                  <div className="px-2 mb-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {section.title}
                    </p>
                  </div>
                )
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg transition-all text-sm group
                    ${collapsed ? "justify-center px-0 py-2.5" : "justify-between px-2.5 py-2"}
                    ${isActive
                      ? "bg-indigo-50 text-indigo-600 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`flex items-center gap-3 ${collapsed ? "" : "flex-1 min-w-0"}`}>
                        <item.icon
                          size={18}
                          className={`flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Badge — full when expanded */}
                      {!collapsed && item.badge && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex-shrink-0 ${getBadgeClasses(item.badgeColor)}`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Badge dot — collapsed */}
                      {collapsed && item.badge && (
                        <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${{
                          red: "bg-red-500", emerald: "bg-emerald-500",
                          orange: "bg-orange-500", amber: "bg-amber-400",
                        }[item.badgeColor] || "bg-slate-400"}`} />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User ── */}
      <div className={`p-3 border-t border-slate-200 flex-shrink-0 ${collapsed ? "flex justify-center" : ""}`}>
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-indigo-600">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{userData.name}</p>
              <p className="text-xs text-slate-400 truncate">{userData.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}