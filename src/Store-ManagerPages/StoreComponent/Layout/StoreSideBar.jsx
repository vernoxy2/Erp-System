import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiAlertTriangle,
  FiLayers,
  FiSettings,
  FiBarChart2,
  FiShield,
  FiMenu,
  FiChevronLeft,
  FiInbox,
  FiFileText,
  FiActivity,
} from "react-icons/fi";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../firebase";
import logo from "../../../assets/logo.svg";

export default function StoreSidebar({ collapsed, setCollapsed }) {
  const [userData, setUserData] = useState({
    name: "Loading...",
    email: "",
    department: "",
    role: "",
  });
  const [qcPendingCount, setQcPendingCount] = useState(0);
  const [debitNotesCount, setDebitNotesCount] = useState(0); // ✅ dynamic
  const [ReceivedOnChallan, setReceivedOnChallan] = useState(0);

  // ── QC Pending count ────────────────────────────────────────────────────
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

  // ✅ Debit Notes pending count — notes with status "sent" or "pending_store_qc"
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "SalesDebitNotes"), (snap) => {
      const pending = snap.docs.filter((d) => {
        const data = d.data();
        return data.status === "sent" || data.status === "pending_store_qc";
      });
      setDebitNotesCount(pending.length);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "SalesReceivedOnChallan"),
      (snap) => {
        const pending = snap.docs.filter((d) => {
          const data = d.data();
          return data.status === "waiting_store_qc"; 
        });
        setReceivedOnChallan(pending.length);
      },
    );
    return () => unsub();
  }, []);

  // ── User data ───────────────────────────────────────────────────────────
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
    ? userData.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
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
        {
          to: "/store/debit-notes",
          icon: FiFileText,
          label: "Debit Notes",
          badge: debitNotesCount > 0 ? debitNotesCount : null,
          badgeColor: "amber",
        },
        {
          to: "/store/store-Received-On-Challan",
          icon: FiInbox,
          label: "Received On Challan",
          badge: ReceivedOnChallan > 0 ? ReceivedOnChallan : null,
          badgeColor: "amber",
        },
        {
          to: "/store/low-stock-management",
          icon: FiAlertTriangle,
          label: "Low Stock Alerts",
          badge: 45,
          badgeColor: "red",
        },
        {
          to: "/store/category-management",
          icon: FiLayers,
          label: "Manage Categories",
        },
        {
          to: "/store/product-management",
          icon: FiSettings,
          label: "Manage Products",
        },
        {
          to: "/store/stock-summary",
          icon: FiBarChart2,
          label: "Stock Summary",
        },
        { to: "/store/stock-alerts", icon: FiActivity, label: "Stock Alerts" },
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
    <aside
      className={`relative bg-white border-r border-slate-200 flex flex-col h-screen transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? "w-[64px]" : "w-64"}`}
    >
      {/* Header */}
      <div className="h-16 border-b border-slate-200 flex items-center flex-shrink-0 relative px-3">
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-8">
            <img src={logo} alt="Fib2Fab" className="h-9 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-black text-indigo-600 whitespace-nowrap">
                ERP System
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
                Sales & Distribution
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex-1 flex justify-center">
            <img src={logo} alt="Fib2Fab" className="h-8" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors flex-shrink-0"
        >
          {collapsed ? <FiMenu size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden">
        {navSections.map((section, idx) => (
          <div key={idx} className={idx > 0 ? "mt-5" : ""}>
            {section.title && !collapsed && (
              <div className="px-3 mb-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {section.title}
                </h3>
              </div>
            )}
            {section.title && collapsed && idx > 0 && (
              <div className="border-t border-slate-100 mb-3 mx-1" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all text-sm group relative
                    ${collapsed ? "justify-center" : "justify-between"}
                    ${isActive ? "bg-emerald-50 text-emerald-600 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`flex items-center gap-3 ${collapsed ? "" : "flex-1 min-w-0"}`}
                      >
                        <item.icon
                          size={18}
                          className={`flex-shrink-0 ${isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`}
                        />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>

                      {/* Badge — expanded */}
                      {!collapsed && item.badge != null && (
                        <span
                          className={`flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full border flex-shrink-0 ${getBadgeClasses(item.badgeColor)}`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Badge dot — collapsed */}
                      {collapsed && item.badge != null && (
                        <span
                          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                            item.badgeColor === "red"
                              ? "bg-red-500"
                              : item.badgeColor === "emerald"
                                ? "bg-emerald-500"
                                : item.badgeColor === "orange"
                                  ? "bg-orange-500"
                                  : "bg-amber-500"
                          }`}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div
        className={`p-3 border-t border-slate-200 flex-shrink-0 ${collapsed ? "flex justify-center" : ""}`}
      >
        <div
          className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-emerald-600">
              {initials}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {userData.name}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {userData.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
