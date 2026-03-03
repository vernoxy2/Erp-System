import React from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiFileText,
  FiBell,
  FiTruck,
  FiDollarSign,
  FiClock,
  FiArchive,
  FiShoppingCart,
  FiUpload,
  FiFile,
  FiBarChart2,
  FiPackage,
  FiAlertTriangle,
  FiTrendingUp,
  FiLayers,
  FiSettings,
  FiClipboard,
} from "react-icons/fi";
import logo from "../../../assets/logo.svg";

export default function Sidebar() {
  const navSections = [
    {
      title: null,
      items: [{ to: "/sales/dashboard", icon: FiHome, label: "Dashboard" }],
    },
    {
      title: "STOCK MANAGEMENT",
      items: [
        {
          to: "/sales/low-stock-management",
          icon: FiAlertTriangle,
          label: "Low Stock Alerts",
          badge: 45,
          badgeColor: "red",
        },
        {
          to: "/sales/category-management",
          icon: FiLayers,
          label: "Manage Categories",
        },
        {
          to: "/sales/product-management",
          icon: FiSettings,
          label: "Manage Products",
        },
        {
          to: "/sales/stock-summary",
          icon: FiBarChart2,
          label: "Stock Summary",
        },
      ],
    },
    {
      title: "Outward",
      items: [
        {
          to: "/sales/sales-orders",
          icon: FiClipboard,
          label: "Sales Orders",
          end: true,
        },
        // { to: "/sales/sales-orders/upload", icon: FiPackage, label: "Upload Sales Orders" },
        {
          to: "/sales/sales-orders/List",
          icon: FiFileText,
          label: "Sales Orders List",
        },
        {
          to: "/sales/upload-sales-invoice",
          icon: FiUpload,
          label: "Upload Sales Invoice",
        },
        {
          to: "/sales/ready-to-dispatch",
          icon: FiBell,
          label: "Ready to Dispatch",
          badge: 2,
          badgeColor: "emerald",
        },
        {
          to: "/sales/dispatch-on-challan",
          icon: FiTruck,
          label: "Dispatch on Challan",
        },
        {
          to: "/sales/unbilled-challans",
          icon: FiClock,
          label: "Unbilled Challans",
          badge: 5,
          badgeColor: "red",
        },
        {
          to: "/sales/invoice-history",
          icon: FiArchive,
          label: "Sales Invoice History",
        },
      ],
    },
    // {
    //   title: "DISPATCH",
    //   items: [
    //     { to: "/sales/dispatch-on-invoice", icon: FiDollarSign, label: "Dispatch on Invoice" }
    //   ]
    // },
    // {
    //   title: "INVOICING",
    //   items: [
    //   ]
    // },
    {
      title: "Inward",
      items: [
        {
          to: "/sales/purchase-orders",
          icon: FiShoppingCart,
          label: "Purchase Orders",
          badge: "2d",
          badgeColor: "orange",
        },
        // {to: "/sales/purchase-orders/List", icon: FiFileText, label: "Purchase Orders List"},
        {
          to: "/sales/upload-vendor-invoice",
          icon: FiUpload,
          label: "Upload Vendor Invoice",
        },
        {
          to: "/sales/debit-credit-notes",
          icon: FiFile,
          label: "Debit/Credit Notes",
          badge: 2,
          badgeColor: "amber",
        },
        {
          to: "/sales/vendor-invoice-history",
          icon: FiArchive,
          label: "Vendor Invoice History",
        },
      ],
    },
    {
      title: "INVENTORY",
      items: [
        { to: "/sales/items-master", icon: FiPackage, label: "Items Master" },
        {
          to: "/sales/stock-alerts",
          icon: FiAlertTriangle,
          label: "Stock Alerts",
          badge: 3,
          badgeColor: "red",
        },
      ],
    },
    {
      title: "REPORTS",
      items: [
        {
          to: "/sales/reports",
          icon: FiTrendingUp,
          label: "Reports & Analytics",
        },
      ],
    },
  ];

  const getBadgeClasses = (color) => {
    const colors = {
      emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
      red: "bg-red-100 text-red-700 border-red-200",
      orange: "bg-orange-100 text-orange-700 border-orange-200",
      amber: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[color] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden">
      <div className="h-16 border-b border-slate-200 flex gap-3.5 items-center px-5 flex-shrink-0">
          <img src={logo} alt="Fib2Fab" className="h-10  " />
        <div className="mt-2.5">
          <h2 className="text-sm font-black text-indigo-600">ERP System</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Sales & Distribution
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={idx} className={idx > 0 ? "mt-6" : ""}>
            {section.title && (
              <div className="px-3 mb-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {section.title}
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <item.icon
                          size={18}
                          className={
                            isActive
                              ? "text-indigo-600"
                              : "text-slate-400 group-hover:text-slate-600"
                          }
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${getBadgeClasses(item.badgeColor)}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-indigo-600">SP</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              Sales Person
            </p>
            <p className="text-xs text-slate-400 truncate">sales@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
