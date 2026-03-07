// import React, { useState } from "react";
// import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
// import { FiBell, FiSearch, FiLogOut, FiX } from "react-icons/fi";

// export default function Header() {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [searchParams, setSearchParams] = useSearchParams();

//   const [showNotifications, setShowNotifications] = useState(false);
//   const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

//   const [notifications, setNotifications] = useState(() => {
//     const clearedAt = localStorage.getItem("notificationsClearedAt");
//     const defaultNotifications = [
//       { id: 1, text: "New work order #WO-1452 assigned", time: "2 min ago", unread: true },
//       { id: 2, text: "Invoice INV-9382 approved", time: "1 hr ago", unread: true },
//       { id: 3, text: "Stock alert: Item XYZ below threshold", time: "3 hrs ago", unread: false },
//       { id: 4, text: "Challan CH-5678 dispatched", time: "Yesterday", unread: false },
//     ];

//     if (clearedAt) {
//       const clearedTime = new Date(clearedAt);
//       const now = new Date();
//       const hoursDiff = (now - clearedTime) / (1000 * 60 * 60);
//       if (hoursDiff < 24) {
//         return [];
//       }
//     }

//     return defaultNotifications;
//   });

//   const unreadCount = notifications.filter((n) => n.unread).length;

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     navigate("/login", { replace: true });
//   };

//   const handleSearch = (e) => {
//     e.preventDefault();
//     const trimmed = searchQuery.trim();

//     if (!trimmed) {
//       searchParams.delete("q");
//       setSearchParams(searchParams);
//       return;
//     }

//     setSearchParams({ q: trimmed });
//   };

//   const handleInputChange = (e) => {
//     setSearchQuery(e.target.value);
//   };

//   const clearSearch = () => {
//     setSearchQuery("");
//     searchParams.delete("q");
//     setSearchParams(searchParams);
//   };

//   const markAllAsReadAndClear = () => {
//     setNotifications([]);
//     localStorage.setItem("notificationsClearedAt", new Date().toISOString());
//     setShowNotifications(false);
//     navigate("/sales/dashboard");
//   };

//   const getPageTitle = () => {
//     const titles = {
//       "/sales/dashboard": "Sales Dashboard",
//       "/sales/work-orders": "Work Orders",
//       "/sales/ready-to-dispatch": "Ready to Dispatch",
//       "/sales/dispatch-on-challan": "Dispatch on Challan",
//       "/sales/dispatch-on-invoice": "Dispatch on Invoice",
//       "/sales/unbilled-challans": "Unbilled Challans",
//       "/sales/invoice-history": "Invoice History",
//       "/sales/purchase-orders": "Purchase Orders",
//       "/sales/sales-orders/List": "Sales Orders List",
//       "/sales/upload-vendor-invoice": "Upload Vendor Invoice",
//       "/sales/debit-credit-notes": "Debit/Credit Notes",
//       "/sales/vendor-invoice-history": "Vendor Invoice History",
//       "/sales/stock-summary": "Stock Summary",
//       "/sales/items-master": "Items Master",
//       "/sales/stock-alerts": "Stock Alerts",
//       "/sales/reports": "Reports & Analytics",
//     };
//     return titles[location.pathname] || "Sales Module";
//   };

//   return (
//     <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
//       <div>
//         <h2 className="text-lg font-bold text-slate-800">{getPageTitle()}</h2>
//         <p className="text-xs text-slate-500">Sales Operations</p>
//       </div>

//       <div className="flex items-center gap-2 sm:gap-4">
//         <form onSubmit={handleSearch} className="relative w-48 sm:w-64 lg:w-72">
//           <FiSearch
//             className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
//             size={18}
//           />
//           <input
//             type="text"
//             value={searchQuery}
//             onChange={handleInputChange}
//             placeholder="Search orders, items, invoices..."
//             className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-10 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all duration-200 placeholder:text-slate-400"
//           />
//           {searchQuery && (
//             <button
//               type="button"
//               onClick={clearSearch}
//               className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
//             >
//               <FiX size={16} />
//             </button>
//           )}
//         </form>

//         <div className="relative">
//           <button
//             onClick={() => setShowNotifications(!showNotifications)}
//             className="relative p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors"
//           >
//             <FiBell size={20} />
//             {unreadCount > 0 && (
//               <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
//             )}
//           </button>

//           {showNotifications && (
//             <>
//               <div
//                 className="fixed inset-0 z-30"
//                 onClick={() => setShowNotifications(false)}
//               />
//               <div
//                 className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-40 overflow-hidden"
//                 onClick={(e) => e.stopPropagation()}
//               >
//                 <div className="p-4 border-b border-slate-100 flex items-center justify-between">
//                   <h3 className="font-semibold text-slate-800">Notifications</h3>
//                   <span className="text-xs text-slate-500">{unreadCount} new</span>
//                 </div>

//                 <div className="max-h-96 overflow-y-auto">
//                   {notifications.length === 0 ? (
//                     <div className="py-10 text-center text-slate-500">
//                       No notifications yet
//                     </div>
//                   ) : (
//                     notifications.map((notif) => (
//                       <div
//                         key={notif.id}
//                         className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
//                           notif.unread ? "bg-indigo-50/40" : ""
//                         }`}
//                       >
//                         <p className="text-sm text-slate-800">{notif.text}</p>
//                         <p className="text-xs text-slate-500 mt-1">{notif.time}</p>
//                       </div>
//                     ))
//                   )}
//                 </div>

//                 <div className="p-3 border-t border-slate-100 text-center">
//                   <button
//                     onClick={markAllAsReadAndClear}
//                     className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
//                   >
//                     View all notifications
//                   </button>
//                 </div>
//               </div>
//             </>
//           )}
//         </div>

//         <div className="relative group">
//           <button
//             className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
//             title="User menu"
//           >
//             <span className="text-sm font-bold text-indigo-700">SP</span>
//           </button>

//           <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-40">
//             <button
//               onClick={handleLogout}
//               className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-slate-50 rounded-lg"
//             >
//               <FiLogOut size={16} />
//               Logout
//             </button>
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// }

import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiSearch, FiLogOut, FiX } from "react-icons/fi";
import NotificationBell from "../../../Sales-ManagerPages/Sales-Pages/NotificationBell";
export default function StoreHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      searchParams.delete("q");
      setSearchParams(searchParams);
      return;
    }
    setSearchParams({ q: trimmed });
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    searchParams.delete("q");
    setSearchParams(searchParams);
  };

  const getPageTitle = () => {
    const titles = {
      "/store/dashboard": "Store Dashboard",
      "/store/work-orders": "Work Orders",
      "/store/ready-to-dispatch": "Ready to Dispatch",
      "/store/dispatch-on-challan": "Dispatch on Challan",
      "/store/dispatch-on-invoice": "Dispatch on Invoice",
      "/store/unbilled-challans": "Unbilled Challans",
      "/store/invoice-history": "Invoice History",
      "/store/purchase-orders": "Purchase Orders",
      "/store/sales-orders/List": "Sales Orders List",
      "/store/upload-vendor-invoice": "Upload Vendor Invoice",
      "/store/debit-credit-notes": "Debit/Credit Notes",
      "/store/vendor-invoice-history": "Vendor Invoice History",
      "/store/stock-summary": "Stock Summary",
      "/store/items-master": "Items Master",
      "/store/stock-alerts": "Stock Alerts",
      "/store/reports": "Reports & Analytics",
    };
    return titles[location.pathname] || "Store Module";
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
      {/* Left: Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">{getPageTitle()}</h2>
        <p className="text-xs text-slate-500">Store Operations</p>
      </div>

      {/* Right: Search + Bell + Avatar */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-48 sm:w-64 lg:w-72">
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
        </form>

        {/* ✅ Dynamic Notification Bell — replaces old static bell */}
        <NotificationBell />

        {/* User Avatar */}
        <div className="relative group">
          <button
            className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
            title="User menu"
          >
            <span className="text-sm font-bold text-indigo-700">SP</span>
          </button>

          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-40">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-slate-50 rounded-lg"
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