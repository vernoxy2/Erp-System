// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   FiAlertTriangle,
//   FiPackage,
//   FiShoppingCart,
//   FiClock,
//   FiArrowRight,
//   FiDownload,
//   FiRefreshCw,
//   FiCheckCircle,
//   FiTrendingDown,
//   FiRepeat,
// } from "react-icons/fi";
// import { db } from "../../firebase";
// import { collection, onSnapshot } from "firebase/firestore";
// import PPPIPES from "../../assets/DashboardImgs/PPPIPES.svg";
// import PPCHPIPES from "../../assets/DashboardImgs/PPCHPIPES.svg";
// import PPHPIPE from "../../assets/DashboardImgs/PPHPIPE.svg";
// import PPRCTPIPE from "../../assets/DashboardImgs/PPRCTPIPE.svg";
// import THERMALPIPES from "../../assets/DashboardImgs/THERMALPIPES.svg";
// import PPFITTINGS from "../../assets/DashboardImgs/PPFITTINGS.svg";
// import PPCHFITTINGS from "../../assets/DashboardImgs/PPCHFITTINGS.svg";
// import PPRCTFITTINGS from "../../assets/DashboardImgs/PPRCTFITTINGS.svg";
// import PPRCValve from "../../assets/DashboardImgs/PPRCValve.svg";
// import VALVES from "../../assets/DashboardImgs/VALVES.svg";
// import Channel from "../../assets/DashboardImgs/Channel.svg";
// import FRP from "../../assets/DashboardImgs/FRP.svg";
// import FRPMATERIAL from "../../assets/DashboardImgs/FRPMATERIAL.svg";
// import GRIDERCLAMP from "../../assets/DashboardImgs/GRIDERCLAMP.svg";
// import HARDWARE from "../../assets/DashboardImgs/HARDWARE.svg";
// import HDPE from "../../assets/DashboardImgs/HDPE.svg";
// import INSULATION from "../../assets/DashboardImgs/INSULATION.svg";
// import MSFLANGES from "../../assets/DashboardImgs/MSFLANGES.svg";
// import MACHINE from "../../assets/DashboardImgs/MACHINE.svg";
// import OTHERITEMS from "../../assets/DashboardImgs/OTHERITEMS.svg";
// import UPVCPVC from "../../assets/DashboardImgs/UPVCPVC.svg";

// // ── Icon lookup ───────────────────────────────────────────────────────────────

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const CAT_IMAGE_MAP = {
//     "PP PIPES": PPPIPES,
//     "PPCH PIPES": PPCHPIPES,
//     "PPH PIPE": PPHPIPE,
//     "PPRCT PIPES": PPRCTPIPE,
//     "THERMAL PIPES": THERMALPIPES,
//     "PP FITTINGS": PPFITTINGS,
//     "PPCH FITTINGS": PPCHFITTINGS,
//     "PPRCT FITTINGS": PPRCTFITTINGS,
//     "PPRC VALVES": PPRCValve,
//     VALVES: VALVES,
//     CHANNEL: Channel,
//     FRP: FRP,
//     "FRP MATERIAL": FRPMATERIAL,
//     "GRIDER & CLAMP ITEM": GRIDERCLAMP,
//     GRIDER: GRIDERCLAMP,
//     "HARDWARE ITEM": HARDWARE,
//     HDPE: HDPE,
//     INSULATION: INSULATION,
//     "M.S FLANGES": MSFLANGES,
//     MACHINE: MACHINE,
//     "OTHER ITEMS": OTHERITEMS,
//     "UPVC & PVC MATERIAL": UPVCPVC,
//   };

//  function getCatImage(name) {
//   const upper = (name || "").toUpperCase();
//   const key = Object.keys(CAT_IMAGE_MAP)
//     .sort((a, b) => b.length - a.length)  
//     .find((k) => upper.includes(k.toUpperCase()));
//   return CAT_IMAGE_MAP[key] || null;
// }
//   useEffect(() => {
//     const unsub = onSnapshot(collection(db, "stockCategories"), (snap) => {
//       const data = snap.docs
//         .map((d) => ({ id: d.id, ...d.data() }))
//         .sort((a, b) => {
//           const getGroup = (name) => {
//             const n = (name || "").toUpperCase();
//             if (n.includes("PIPE")) return 0;
//             if (n.includes("FITTING")) return 1;
//             if (n.includes("VALVE")) return 2;
//             if (n.includes("CHANNEL")) return 3;
//             return 4;
//           };
//           const ga = getGroup(a.name),
//             gb = getGroup(b.name);
//           if (ga !== gb) return ga - gb;
//           return a.name.localeCompare(b.name); 
//         });
//       setCategories(data);
//       setLoading(false);
//     });
//     return () => unsub();
//   }, []);
//   const totalProducts = categories.reduce(
//     (s, c) => s + (c.productCount || 0),
//     0,
//   );
//   const totalCritical = categories.reduce(
//     (s, c) => s + (c.criticalCount || 0),
//     0,
//   );
//   const totalLowStock = categories.reduce(
//     (s, c) => s + (c.lowStockCount || 0),
//     0,
//   );
//   const criticalCats = categories.filter((c) => (c.criticalCount || 0) > 0);
//   const totalAvailable = categories.reduce(
//     (s, c) => s + (c.availableCount || 0),
//     0,
//   );
//   const totalReorder = categories.reduce(
//     (s, c) => s + (c.reorderCount || 0),
//     0,
//   );

//   const handleExport = () => {
//     const rows = [
//       ["Category Name", "Total Products", "Critical Items", "Low Stock Items"],
//       ...categories.map((c) => [
//         c.name,
//         c.productCount || 0,
//         c.criticalCount || 0,
//         c.lowStockCount || 0,
//       ]),
//     ];
//     const csv = rows.map((r) => r.join(",")).join("\n");
//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.setAttribute("download", "Dashboard_Stock_Report.csv");
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//   };
//   if (loading)
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <FiRefreshCw
//             size={28}
//             className="animate-spin mx-auto text-indigo-500 mb-3"
//           />
//           <p className="text-sm font-bold text-slate-500">
//             Loading dashboard...
//           </p>
//         </div>
//       </div>
//     );

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800">
//             Sales Dashboard
//           </h2>
//           <p className="text-sm text-slate-500 mt-1">
//             Overview of sales operations and stock alerts
//           </p>
//         </div>
//         <button
//           onClick={handleExport}
//           className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition shadow-sm"
//         >
//           <FiDownload size={16} /> Export
//         </button>
//       </div>

//       {/* Summary Cards */}
//       <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
//         {[
//           {
//             label: "Total Categories",
//             value: categories.length,
//             icon: <FiPackage size={20} />,
//             ib: "bg-indigo-50",
//             ic: "text-indigo-500",
//             b: "border-slate-200",
//             vc: "text-slate-800",
//           },
//           {
//             label: "Available",
//             value: totalAvailable,
//             icon: <FiCheckCircle size={20} />,
//             ib: "bg-green-50",
//             ic: "text-green-400",
//             b: "border-green-200",
//             vc: "text-green-600",
//           },
//           {
//             label: "Critical Items",
//             value: totalCritical,
//             icon: <FiAlertTriangle size={20} />,
//             ib: "bg-red-50",
//             ic: "text-red-500",
//             b: "border-red-200",
//             vc: "text-red-600",
//           },
//           {
//             label: "Low Stock Items",
//             value: totalLowStock,
//             icon: <FiClock size={20} />,
//             ib: "bg-yellow-50",
//             ic: "text-yellow-500",
//             b: "border-yellow-200",
//             vc: "text-yellow-600",
//           },
//           {
//             label: "Reorder Items",
//             value: totalReorder,
//             icon: <FiShoppingCart size={20} />,
//             ib: "bg-orange-50",
//             ic: "text-orange-500",
//             b: "border-orange-200",
//             vc: "text-orange-600",
//           },
//           {
//             label: "Total Products",
//             value: totalProducts,
//             icon: <FiPackage size={20} />,
//             ib: "bg-slate-50",
//             ic: "text-slate-500",
//             b: "border-slate-200",
//             vc: "text-slate-800",
//           },
//         ].map((c) => (
//           <div
//             key={c.label}
//             className={`bg-white rounded-2xl border ${c.b} p-5 shadow-sm`}
//           >
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
//                   {c.label}
//                 </p>
//                 <p className={`text-3xl font-black mt-2 ${c.vc}`}>{c.value}</p>
//               </div>
//               <div
//                 className={`w-11 h-11 rounded-xl ${c.ib} flex items-center justify-center flex-shrink-0`}
//               >
//                 <span className={c.ic}>{c.icon}</span>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Alert Banner */}
//       {totalCritical > 0 && (
//         <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 p-6 shadow-sm">
//           <div className="flex items-start justify-between mb-4">
//             <div>
//               <h3 className="text-lg font-black text-red-900 flex items-center gap-2">
//                 <FiAlertTriangle className="animate-pulse" /> Stock Alerts
//               </h3>
//               <p className="text-sm text-red-700 mt-1">
//                 {criticalCats.length} categories have critical stock levels
//               </p>
//             </div>
//             <button
//               onClick={() => navigate("/sales/low-stock-management")}
//               className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 flex items-center gap-2 shadow-sm"
//             >
//               View All <FiArrowRight />
//             </button>
//           </div>
//           <div className="flex gap-2 flex-wrap">
//             {criticalCats.slice(0, 5).map((cat) => (
//               <span
//                 key={cat.id}
//                 className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-300"
//               >
//                 {cat.name} ({cat.criticalCount} critical)
//               </span>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Categories Grid */}
//       <div>
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-lg font-black text-slate-800">
//             Stock Categories
//           </h3>
//           <div className="flex items-center gap-4">
//             {[
//               { dot: "bg-red-500", label: "Critical" },
//               { dot: "bg-orange-500", label: "High Alert" },
//               { dot: "bg-yellow-400", label: "Warning" },
//               { dot: "bg-green-500", label: "Normal" },
//             ].map((i) => (
//               <div key={i.label} className="flex items-center gap-1.5">
//                 <div className={`w-2.5 h-2.5 rounded-full ${i.dot}`} />
//                 <span className="text-xs font-semibold text-slate-500">
//                   {i.label}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
//           {categories.map((cat) => (
//             // <button
//             //   key={cat.id}
//             //   onClick={() =>
//             //     navigate(`/sales/low-stock-management?category=${cat.id}`)
//             //   }
//             //   className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-md hover:border-indigo-200 transition-all group"
//             // >
//             //   <img
//             //     src={cat.image}
//             //     alt={cat.name}
//             //     className="w-full aspect-square object-cover rounded-xl mb-3"
//             //   />
//             //   {/* Name */}
//             //   <h4 className="font-black text-slate-800 text-sm leading-snug mb-1 line-clamp-2">
//             //     {cat.name}
//             //   </h4>

//             //   {/* Alert counts */}
//             //   {(cat.criticalCount || 0) > 0 || (cat.lowStockCount || 0) > 0 ? (
//             //     <div className="space-y-1 mb-3">
//             //       {(cat.criticalCount || 0) > 0 && (
//             //         <div className="flex items-center gap-1.5">
//             //           <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
//             //           <span className="text-[10px] font-bold text-red-600">
//             //             {cat.criticalCount} critical
//             //           </span>
//             //         </div>
//             //       )}
//             //       {(cat.lowStockCount || 0) > 0 && (
//             //         <div className="flex items-center gap-1.5">
//             //           <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
//             //           <span className="text-[10px] font-bold text-yellow-600">
//             //             {cat.lowStockCount} low stock
//             //           </span>
//             //         </div>
//             //       )}
//             //     </div>
//             //   ) : (
//             //     <div className="mb-3" />
//             //   )}

//             //   {/* Footer */}
//             //   <div className="pt-3 border-t border-slate-100">
//             //     <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
//             //       View Details <FiArrowRight size={11} />
//             //     </span>
//             //   </div>
//             // </button>
//             <button
//               key={cat.id}
//               onClick={() =>
//                 navigate(`/sales/low-stock-management?category=${cat.id}`)
//               }
//               className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-md hover:border-indigo-200 transition-all group"
//             >
//               {/* Top: Icon + Name */}
//               <div className="flex items-center gap-3 mb-3">
//                 <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
//                   {getCatImage(cat.name) ? (
//                     <img
//                       src={getCatImage(cat.name)}
//                       alt={cat.name}
//                       className=" object-contain"
//                     />
//                   ) : (
//                     <FiPackage size={20} className="text-orange-400" />
//                   )}
//                 </div>
//                 <h4 className="font-bold text-gray-500 text-sm leading-snug line-clamp-2">
//                   {cat.name}
//                 </h4>
//               </div>

//               {/* Alert counts */}
//               {(cat.criticalCount || 0) > 0 || (cat.lowStockCount || 0) > 0 ? (
//                 <div className="space-y-1 mb-3">
//                   {(cat.criticalCount || 0) > 0 && (
//                     <div className="flex items-center gap-1.5">
//                       <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
//                       <span className="text-[10px] font-bold text-red-600">
//                         {cat.criticalCount} critical
//                       </span>
//                     </div>
//                   )}
//                   {(cat.lowStockCount || 0) > 0 && (
//                     <div className="flex items-center gap-1.5">
//                       <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
//                       <span className="text-[10px] font-bold text-yellow-600">
//                         {cat.lowStockCount} low stock
//                       </span>
//                     </div>
//                   )}
//                 </div>
//               ) : (
//                 <div className="mb-3" />
//               )}

//               {/* Footer */}
//               <div className="pt-3 border-t border-slate-100">
//                 <span className="text-xs text-black flex items-center gap-1 group-hover:gap-2 transition-all">
//                   View Details <FiArrowRight size={11} />
//                 </span>
//               </div>
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiPackage,
  FiShoppingCart,
  FiClock,
  FiArrowRight,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiTrendingDown,
  FiRepeat,
} from "react-icons/fi";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import PPPIPES from "../../assets/DashboardImgs/PPPIPES.svg";
import PPCHPIPES from "../../assets/DashboardImgs/PPCHPIPES.svg";
import PPHPIPE from "../../assets/DashboardImgs/PPHPIPE.svg";
import PPRCTPIPE from "../../assets/DashboardImgs/PPRCTPIPE.svg";
import THERMALPIPES from "../../assets/DashboardImgs/THERMALPIPES.svg";
import PPFITTINGS from "../../assets/DashboardImgs/PPFITTINGS.svg";
import PPCHFITTINGS from "../../assets/DashboardImgs/PPCHFITTINGS.svg";
import PPRCTFITTINGS from "../../assets/DashboardImgs/PPRCTFITTINGS.svg";
import PPRCValve from "../../assets/DashboardImgs/PPRCValve.svg";
import VALVES from "../../assets/DashboardImgs/VALVES.svg";
import Channel from "../../assets/DashboardImgs/Channel.svg";
import FRP from "../../assets/DashboardImgs/FRP.svg";
import FRPMATERIAL from "../../assets/DashboardImgs/FRPMATERIAL.svg";
import GRIDERCLAMP from "../../assets/DashboardImgs/GRIDERCLAMP.svg";
import HARDWARE from "../../assets/DashboardImgs/HARDWARE.svg";
import HDPE from "../../assets/DashboardImgs/HDPE.svg";
import INSULATION from "../../assets/DashboardImgs/INSULATION.svg";
import MSFLANGES from "../../assets/DashboardImgs/MSFLANGES.svg";
import MACHINE from "../../assets/DashboardImgs/MACHINE.svg";
import OTHERITEMS from "../../assets/DashboardImgs/OTHERITEMS.svg";
import UPVCPVC from "../../assets/DashboardImgs/UPVCPVC.svg";

// ── Stock status logic (same as SalesStock) ───────────────────────────────────
const getStockStatus = (available, lowLevel, reorderLevel) => {
  if (available <= 0) return "shortage";
  if (available < lowLevel * 0.5) return "shortage";
  if (available < lowLevel) return "low";
  if (available < reorderLevel) return "reorder";
  return "ok";
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Category image map ────────────────────────────────────────────────────
  const CAT_IMAGE_MAP = {
    "PP PIPES": PPPIPES,
    "PPCH PIPES": PPCHPIPES,
    "PPH PIPE": PPHPIPE,
    "PPRCT PIPES": PPRCTPIPE,
    "THERMAL PIPES": THERMALPIPES,
    "PP FITTINGS": PPFITTINGS,
    "PPCH FITTINGS": PPCHFITTINGS,
    "PPRCT FITTINGS": PPRCTFITTINGS,
    "PPRC VALVES": PPRCValve,
    VALVES: VALVES,
    CHANNEL: Channel,
    FRP: FRP,
    "FRP MATERIAL": FRPMATERIAL,
    "GRIDER & CLAMP ITEM": GRIDERCLAMP,
    GRIDER: GRIDERCLAMP,
    "HARDWARE ITEM": HARDWARE,
    HDPE: HDPE,
    INSULATION: INSULATION,
    "M.S FLANGES": MSFLANGES,
    MACHINE: MACHINE,
    "OTHER ITEMS": OTHERITEMS,
    "UPVC & PVC MATERIAL": UPVCPVC,
  };

  function getCatImage(name) {
    const upper = (name || "").toUpperCase();
    const key = Object.keys(CAT_IMAGE_MAP)
      .sort((a, b) => b.length - a.length)
      .find((k) => upper.includes(k.toUpperCase()));
    return CAT_IMAGE_MAP[key] || null;
  }

  // ── Firebase listeners ────────────────────────────────────────────────────
  useEffect(() => {
    let stockLoaded = false;
    let catLoaded = false;

    const checkLoading = () => {
      if (stockLoaded && catLoaded) setLoading(false);
    };

    // 1. stockCategories — for category grid (names + images only)
    const unsubCat = onSnapshot(collection(db, "stockCategories"), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const getGroup = (name) => {
            const n = (name || "").toUpperCase();
            if (n.includes("PIPE")) return 0;
            if (n.includes("FITTING")) return 1;
            if (n.includes("VALVE")) return 2;
            if (n.includes("CHANNEL")) return 3;
            return 4;
          };
          const ga = getGroup(a.name), gb = getGroup(b.name);
          if (ga !== gb) return ga - gb;
          return a.name.localeCompare(b.name);
        });
      setCategories(data);
      catLoaded = true;
      checkLoading();
    });

    // 2. stock collection — all real calculations ✅
    const unsubStock = onSnapshot(collection(db, "stock"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStockItems(data);
      stockLoaded = true;
      checkLoading();
    });

    return () => {
      unsubCat();
      unsubStock();
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getItemStatus = (item) =>
    getStockStatus(
      item.available ?? 0,
      item.lowLevel ?? 100,
      item.reorderLevel ?? 150,
    );

  const getDamagedQty = (item) =>
    (item.ledger || []).reduce((sum, l) => {
      if (l.type === "IN" && l.remarks?.toLowerCase().includes("damage:")) {
        const m = l.remarks.match(/Damage:\s*(\d+)/i);
        if (m) return sum + parseInt(m[1], 10);
      }
      return sum;
    }, 0);

  // ── Aggregates — directly from stock collection ✅ ─────────────────────────
  const totalProducts     = stockItems.length;
  const totalAvailable    = stockItems.filter((i) => getItemStatus(i) === "ok").length;
  const totalCritical     = stockItems.filter((i) => getItemStatus(i) === "shortage").length;
  const totalLowStock     = stockItems.filter((i) => getItemStatus(i) === "low").length;
  const totalReorder      = stockItems.filter((i) => getItemStatus(i) === "reorder").length;
  // qty aggregates removed — only SKU counts shown on dashboard

  // ── Critical categories for alert banner ─────────────────────────────────
  const criticalCats = categories.filter((cat) =>
    stockItems.some(
      (item) =>
        (item.categoryName || "").toUpperCase() === (cat.name || "").toUpperCase() &&
        getItemStatus(item) === "shortage",
    ),
  );

  // ── Per-category counts for each category card ────────────────────────────
  const getCatStats = (catName) => {
    const items = stockItems.filter(
      (item) =>
        (item.categoryName || "").toUpperCase() === (catName || "").toUpperCase(),
    );
    return {
      criticalCount: items.filter((i) => getItemStatus(i) === "shortage").length,
      lowStockCount: items.filter((i) => getItemStatus(i) === "low").length,
      reorderCount:  items.filter((i) => getItemStatus(i) === "reorder").length,
    };
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ["Category Name", "Shortage Items", "Low Stock Items", "Reorder Items"],
      ...categories.map((c) => {
        const s = getCatStats(c.name);
        return [c.name, s.criticalCount, s.lowStockCount, s.reorderCount];
      }),
      [],
      ["Summary", ""],
      ["Total Products (SKUs)", totalProducts],
      ["Available (OK) SKUs", totalAvailable],
      ["Shortage SKUs", totalCritical],
      ["Low Stock SKUs", totalLowStock],
      ["Reorder SKUs", totalReorder],
      ["Total Available Qty (units)", totalAvailableQty],
      ["Total Reserved Qty (units)", totalReservedQty],
      ["Total Damaged Qty (units)", totalDamagedQty],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "Dashboard_Stock_Report.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiRefreshCw size={28} className="animate-spin mx-auto text-indigo-500 mb-3" />
          <p className="text-sm font-bold text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Sales Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Overview of sales operations and stock alerts
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition shadow-sm"
        >
          <FiDownload size={16} /> Export
        </button>
      </div>

      {/* ── Summary Cards — SKU status counts ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: "Total Categories",
            value: categories.length,
            icon: <FiPackage size={20} />,
            ib: "bg-indigo-50", ic: "text-indigo-500",
            b: "border-slate-200", vc: "text-slate-800",
          },
          {
            label: "Available SKUs",
            value: totalAvailable,
            icon: <FiCheckCircle size={20} />,
            ib: "bg-green-50", ic: "text-green-400",
            b: "border-green-200", vc: "text-green-600",
          },
          {
            label: "Shortage Items",
            value: totalCritical,
            icon: <FiAlertTriangle size={20} />,
            ib: "bg-red-50", ic: "text-red-500",
            b: "border-red-200", vc: "text-red-600",
          },
          {
            label: "Low Stock Items",
            value: totalLowStock,
            icon: <FiClock size={20} />,
            ib: "bg-yellow-50", ic: "text-yellow-500",
            b: "border-yellow-200", vc: "text-yellow-600",
          },
          {
            label: "Reorder Items",
            value: totalReorder,
            icon: <FiShoppingCart size={20} />,
            ib: "bg-orange-50", ic: "text-orange-500",
            b: "border-orange-200", vc: "text-orange-600",
          },
          {
            label: "Total Products",
            value: totalProducts,
            icon: <FiPackage size={20} />,
            ib: "bg-slate-50", ic: "text-slate-500",
            b: "border-slate-200", vc: "text-slate-800",
          },
        ].map((c) => (
          <div key={c.label} className={`bg-white rounded-2xl border ${c.b} p-5 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                  {c.label}
                </p>
                <p className={`text-3xl font-black mt-2 ${c.vc}`}>{c.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${c.ib} flex items-center justify-center flex-shrink-0`}>
                <span className={c.ic}>{c.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Banner */}
      {totalCritical > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-red-900 flex items-center gap-2">
                <FiAlertTriangle className="animate-pulse" /> Stock Alerts
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {totalCritical} SKUs have zero / critical stock levels
              </p>
            </div>
            <button
              onClick={() => navigate("/sales/low-stock-management")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 flex items-center gap-2 shadow-sm"
            >
              View All <FiArrowRight />
            </button>
          </div>
          {criticalCats.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {criticalCats.slice(0, 5).map((cat) => {
                const stats = getCatStats(cat.name);
                return (
                  <span
                    key={cat.id}
                    className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-300"
                  >
                    {cat.name} ({stats.criticalCount} shortage)
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800">Stock Categories</h3>
          <div className="flex items-center gap-4">
            {[
              { dot: "bg-red-500", label: "Shortage" },
              { dot: "bg-yellow-400", label: "Low Stock" },
              { dot: "bg-orange-400", label: "Reorder" },
              { dot: "bg-green-500", label: "Normal" },
            ].map((i) => (
              <div key={i.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${i.dot}`} />
                <span className="text-xs font-semibold text-slate-500">{i.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {categories.map((cat) => {
            // ✅ Real-time per-category stats from stock collection
            const stats = getCatStats(cat.name);

            return (
              <button
                key={cat.id}
                onClick={() =>
                  navigate(`/sales/low-stock-management?category=${cat.id}`)
                }
                className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                {/* Top: Icon + Name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {getCatImage(cat.name) ? (
                      <img
                        src={getCatImage(cat.name)}
                        alt={cat.name}
                        className="object-contain"
                      />
                    ) : (
                      <FiPackage size={20} className="text-orange-400" />
                    )}
                  </div>
                  <h4 className="font-bold text-gray-500 text-sm leading-snug line-clamp-2">
                    {cat.name}
                  </h4>
                </div>

                {/* Alert counts — from stock collection ✅ */}
                {stats.criticalCount > 0 || stats.lowStockCount > 0 || stats.reorderCount > 0 ? (
                  <div className="space-y-1 mb-3">
                    {stats.criticalCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-red-600">
                          {stats.criticalCount} shortage
                        </span>
                      </div>
                    )}
                    {stats.lowStockCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-yellow-600">
                          {stats.lowStockCount} low stock
                        </span>
                      </div>
                    )}
                    {stats.reorderCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-orange-600">
                          {stats.reorderCount} reorder
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    {/* <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-green-600">
                        All stock normal
                      </span>
                    </div> */}
                  </div>
                )}

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs text-black flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Details <FiArrowRight size={11} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}