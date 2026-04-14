import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiSearch, FiLogOut, FiX } from "react-icons/fi";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../firebase";
import NotificationBell from "../../Sales-Pages/NotificationBell";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  // ✅ Firebase user state
  const [userData, setUserData] = useState({ name: "", email: "" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "user", user.uid));
          if (docSnap.exists()) setUserData(docSnap.data());
        } catch (err) {
          console.error("User fetch error:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ Auto initials — "Sales Manager" → "SM"
  const initials = userData.name
    ? userData.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(`/sales/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleInputChange = (e) => setSearchQuery(e.target.value);

  const clearSearch = () => {
    setSearchQuery("");
    if (location.pathname === "/sales/search") {
      navigate("/sales/search");
    }
  };

  const getPageTitle = () => {
    if (location.pathname === "/sales/search") return "Search Results";
    
    const titles = {
      "/sales/dashboard": "Sales Dashboard",
      "/sales/work-orders": "Work Orders",
      "/sales/ready-to-dispatch": "Ready to Dispatch",
      "/sales/dispatch-on-challan": "Dispatch on Challan",
      "/sales/dispatch-on-invoice": "Dispatch on Invoice",
      "/sales/unbilled-challans": "Unbilled Challans",
      "/sales/invoice-history": "Invoice History",
      "/sales/purchase-orders": "Purchase Orders",
      "/sales/purchase-orders/list": "Purchase Order List",
      "/sales/sales-orders/list": "Sales Orders List",
      "/sales/upload-vendor-invoice": "Upload Vendor Invoice",
      "/sales/debit-credit-notes": "Debit/Credit Notes",
      "/sales/vendor-invoice-history": "Vendor Invoice History",
      "/sales/stock-summary": "Stock Summary",
      "/sales/items-master": "Items Master",
      "/sales/stock-alerts": "Stock Alerts",
      "/sales/reports": "Reports & Analytics",
    };
    return titles[location.pathname] || "Sales Module";
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
      {/* Left: Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">{getPageTitle()}</h2>
        <p className="text-xs text-slate-500">Sales Operations</p>
      </div>

      {/* Right: Search + Bell + Avatar */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* Search */}
        {/* <form onSubmit={handleSearch} className="relative w-48 sm:w-64 lg:w-72">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search orders, items, invoices..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-10 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all duration-200 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX size={16} />
            </button>
          )}
        </form> */}

        {/* Notification Bell */}
        <NotificationBell />

        {/* ✅ Dynamic User Avatar */}
        <div className="relative group">
          <button
            className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
            title={userData.name}
          >
            <span className="text-sm font-bold text-indigo-700">{initials}</span>
          </button>

          <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-40">
            {/* Name + Email */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-800 truncate">{userData.name}</p>
              <p className="text-xs text-slate-400 truncate">{userData.email}</p>
            </div>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-slate-50 rounded-b-lg"
            >
              <FiLogOut size={16} />
              Logout
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}