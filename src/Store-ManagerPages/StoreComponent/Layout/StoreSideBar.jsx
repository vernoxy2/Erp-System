import React from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiAlertTriangle, FiLayers, FiSettings, FiBarChart2 } from "react-icons/fi";

export default function StoreSidebar() {
  const navSections = [
    {
      title: null,
      items: [{ to: "/store/dashboard", icon: FiHome, label: "Dashboard" }],
    },
    {
      title: "STOCK MANAGEMENT",
      items: [
        { to: "/store/low-stock-management", icon: FiAlertTriangle, label: "Low Stock Alerts", badge: 45, badgeColor: "red" },
        { to: "/store/category-management", icon: FiLayers, label: "Manage Categories" },
        { to: "/store/product-management", icon: FiSettings, label: "Manage Products" },
        { to: "/store/stock-summary", icon: FiBarChart2, label: "Stock Summary" },
      ],
    },
  ];

  const getBadgeClasses = (color) => {
    const colors = {
      red: "bg-red-100 text-red-700 border-red-200",
      emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
      orange: "bg-orange-100 text-orange-700 border-orange-200",
      amber: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[color] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden">
      <div className="h-16 border-b border-slate-200 flex gap-3.5 items-center px-5 flex-shrink-0">
        <div className="mt-2.5">
          <h2 className="text-sm font-black text-emerald-600">ERP System</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Store Management</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={idx} className={idx > 0 ? "mt-6" : ""}>
            {section.title && (
              <div className="px-3 mb-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{section.title}</h3>
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
                      isActive ? "bg-emerald-50 text-emerald-600 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <item.icon size={18} className={isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${getBadgeClasses(item.badgeColor)}`}>
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
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-emerald-600">SM</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">Store Manager</p>
            <p className="text-xs text-slate-400 truncate">store@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}