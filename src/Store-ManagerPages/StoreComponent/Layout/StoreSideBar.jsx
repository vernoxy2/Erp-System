import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiAlertTriangle, FiLayers, FiSettings, FiBarChart2, FiPackage, FiShield } from "react-icons/fi";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../firebase";
import logo from "../../../assets/logo.svg";

export default function StoreSidebar() {
  const [userData, setUserData] = useState({
    name: "Loading...",
    email: "",
    department: "",
    role: "",
  });

  // ── Dynamic QC pending count ──────────────────────────────────────────────
  const [qcPendingCount, setQcPendingCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "excelupload"), (snap) => {
      const pending = snap.docs.filter((d) => {
        const data = d.data();
        return (
          data.type === "INVOICE" &&
          data.linkedPoId &&
          data.storeQcStatus !== "approved" &&
          data.storeQcStatus !== "approved_with_issues" &&
          data.storeQcStatus !== "rejected"
        );
      });

      // Deduplicate — same linkedPoId + invoiceNo = 1 count
      const seen = new Set();
      let count = 0;
      for (const d of pending) {
        const data = d.data();
        const key = `${data.linkedPoId}_${data.invoiceNo}`;
        if (!seen.has(key)) {
          seen.add(key);
          count++;
        }
      }
      setQcPendingCount(count);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "user", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setUserData(docSnap.data());
        } catch (error) {
          console.error("User data fetch error:", error);
        }
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
      items: [{ to: "/store/dashboard", icon: FiHome, label: "Dashboard" }],
    },
    {
      title: "STOCK MANAGEMENT",
      items: [
        {
          to: "/store/verify-quality",
          icon: FiShield,
          label: "Quality Verify",
          badge: qcPendingCount > 0 ? qcPendingCount : null,
          badgeColor: "emerald",
        },
        { to: "/store/low-stock-management", icon: FiAlertTriangle, label: "Low Stock Alerts", badge: 45, badgeColor: "red" },
        { to: "/store/category-management", icon: FiLayers, label: "Manage Categories" },
        { to: "/store/product-management", icon: FiSettings, label: "Manage Products" },
        { to: "/store/stock-summary", icon: FiBarChart2, label: "Stock Summary" },
        { to: "/store/stock-alerts", icon: FiBarChart2, label: "Stock Alerts" },
      ],
    },
  ];

  const getBadgeClasses = (color) => {
    const colors = {
      red:     "bg-red-100 text-red-700 border-red-200",
      emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
      orange:  "bg-orange-100 text-orange-700 border-orange-200",
      amber:   "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[color] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden">
      {/* Logo */}
      <div className="h-16 border-b border-slate-200 flex gap-3.5 items-center px-5 flex-shrink-0">
        <img src={logo} alt="Fib2Fab" className="h-10" />
        <div className="mt-2.5">
          <h2 className="text-sm font-black text-indigo-600">ERP System</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Sales & Distribution
          </p>
        </div>
      </div>

      {/* Nav */}
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
                        ? "bg-emerald-50 text-emerald-600 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <item.icon
                          size={18}
                          className={isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge != null && (
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

      {/* User Section */}
      <div className="p-4 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-emerald-600">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{userData.name}</p>
            <p className="text-xs text-slate-400 truncate">{userData.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}