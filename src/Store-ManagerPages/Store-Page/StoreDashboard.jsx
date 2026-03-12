import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle, FiPackage, FiShoppingCart, FiClock,
  FiArrowRight, FiDownload, FiRefreshCw, FiCheckCircle, FiBell,
} from "react-icons/fi";
import { db } from "../../firebase";
import { collection, onSnapshot, getDocs, query, where } from "firebase/firestore";
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

// ── Stock status logic ────────────────────────────────────────────────────────
const getStockStatus = (available, lowLevel, reorderLevel) => {
  if (available <= 0) return "shortage";
  if (available < lowLevel * 0.5) return "shortage";
  if (available < lowLevel) return "low";
  if (available < reorderLevel) return "reorder";
  return "ok";
};

// ── Priority category order ───────────────────────────────────────────────────
const PRIORITY_CATEGORIES = [
  "PPCH PIPES",
  "PPRCT PIPES",
  "PP PIPES",
  "PPH PIPE",
  "PPRCT FITTINGS",
  "PPCH FITTINGS",
  "PP FITTINGS",
];

export default function StoreDashboard() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  // ── Image map ─────────────────────────────────────────────────────────────
  const CAT_IMAGE_MAP = {
    "PP PIPES": PPPIPES, "PPCH PIPES": PPCHPIPES, "PPH PIPE": PPHPIPE,
    "PPRCT PIPES": PPRCTPIPE, "THERMAL PIPES": THERMALPIPES,
    "PP FITTINGS": PPFITTINGS, "PPCH FITTINGS": PPCHFITTINGS,
    "PPRCT FITTINGS": PPRCTFITTINGS, "PPRC VALVES": PPRCValve,
    VALVES, CHANNEL: Channel, FRP, "FRP MATERIAL": FRPMATERIAL,
    "GRIDER & CLAMP ITEM": GRIDERCLAMP, GRIDER: GRIDERCLAMP,
    "HARDWARE ITEM": HARDWARE, HDPE, INSULATION, "M.S FLANGES": MSFLANGES,
    MACHINE, "OTHER ITEMS": OTHERITEMS, "UPVC & PVC MATERIAL": UPVCPVC,
  };

  function getCatImage(name) {
    const upper = (name || "").toUpperCase();
    const key = Object.keys(CAT_IMAGE_MAP)
      .sort((a, b) => b.length - a.length)
      .find((k) => upper.includes(k.toUpperCase()));
    return CAT_IMAGE_MAP[key] || null;
  }

  // ── Firebase ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let stockLoaded = false, catLoaded = false;
    let thresholdMap = {};
    const checkDone = () => { if (stockLoaded && catLoaded) setLoading(false); };

    const unsubCat = onSnapshot(collection(db, "stockCategories"), (snap) => {
      thresholdMap = {};
      const data = snap.docs.map((d) => {
        const cat = { id: d.id, ...d.data() };
        (cat.subcategories || []).forEach((sub) => {
          const key = (sub.name || "").trim().toLowerCase();
          if (key) thresholdMap[key] = {
            categoryName: cat.name,
            lowLevel: sub.lowLevel ?? 100,
            reorderLevel: sub.reorderLevel ?? 150,
          };
        });
        return cat;
      });

      // ── Priority sort ─────────────────────────────────────────────────────
      const sortedCategories = [
        // First 7: fixed priority order
        ...PRIORITY_CATEGORIES
          .map((name) =>
            data.find((c) => c.name?.toUpperCase().trim() === name)
          )
          .filter(Boolean),
        // Rest: all categories not in priority list
        ...data.filter(
          (c) => !PRIORITY_CATEGORIES.includes(c.name?.toUpperCase().trim())
        ),
      ];

      setCategories(sortedCategories);
      catLoaded = true;
      checkDone();
    });

    const unsubStock = onSnapshot(collection(db, "stock"), (snap) => {
      const data = snap.docs.map((d) => {
        const item = { id: d.id, ...d.data() };
        const key = (item.description || "").trim().toLowerCase();
        const thresh = thresholdMap[key] || {};
        return {
          ...item,
          categoryName: item.categoryName || thresh.categoryName || "Uncategorized",
          lowLevel: item.lowLevel ?? thresh.lowLevel ?? 100,
          reorderLevel: item.reorderLevel ?? thresh.reorderLevel ?? 150,
        };
      });
      setStockItems(data);
      stockLoaded = true;
      checkDone();
    });

    getDocs(query(collection(db, "excelupload"), where("type", "==", "INVOICE"), where("approvalStatus", "==", "pending")))
      .then((s) => setPendingApprovals(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});

    return () => { unsubCat(); unsubStock(); };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getItemStatus = (item) =>
    getStockStatus(item.available ?? 0, item.lowLevel ?? 100, item.reorderLevel ?? 150);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalProducts  = stockItems.length;
  const totalAvailable = stockItems.filter((i) => getItemStatus(i) === "ok").length;
  const totalCritical  = stockItems.filter((i) => getItemStatus(i) === "shortage").length;
  const totalLowStock  = stockItems.filter((i) => getItemStatus(i) === "low").length;
  const totalReorder   = stockItems.filter((i) => getItemStatus(i) === "reorder").length;

  const criticalCats = categories.filter((cat) =>
    stockItems.some((item) =>
      (item.categoryName || "").toUpperCase() === (cat.name || "").toUpperCase() &&
      getItemStatus(item) === "shortage"
    )
  );

  const getCatStats = (catName) => {
    const items = stockItems.filter(
      (i) => (i.categoryName || "").toUpperCase() === (catName || "").toUpperCase()
    );
    return {
      shortage: items.filter((i) => getItemStatus(i) === "shortage").length,
      low:      items.filter((i) => getItemStatus(i) === "low").length,
      reorder:  items.filter((i) => getItemStatus(i) === "reorder").length,
    };
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ["Category", "Shortage", "Low Stock", "Reorder"],
      ...categories.map((c) => {
        const s = getCatStats(c.name);
        return [c.name, s.shortage, s.low, s.reorder];
      }),
      [],
      ["Total Products", totalProducts],
      ["Available SKUs", totalAvailable],
      ["Shortage SKUs", totalCritical],
      ["Low Stock SKUs", totalLowStock],
      ["Reorder SKUs", totalReorder],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "Store_Dashboard_Report.csv");
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiRefreshCw size={28} className="animate-spin mx-auto text-emerald-500 mb-3" />
          <p className="text-sm font-bold text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Store Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Overview of store operations and stock alerts</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition shadow-sm">
          <FiDownload size={16} /> Export
        </button>
      </div>

      {/* Pending Approvals Banner */}
      {pendingApprovals.length > 0 && (
        <div onClick={() => navigate("/store/invoice-approvals")}
          className="cursor-pointer bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center">
                  <FiBell size={24} className="text-amber-600" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center animate-pulse">
                  {pendingApprovals.length}
                </span>
              </div>
              <div>
                <p className="text-base font-black text-amber-900">
                  {pendingApprovals.length} Invoice{pendingApprovals.length > 1 ? "s" : ""} Pending Approval
                </p>
                <p className="text-sm text-amber-700 mt-0.5">Review and approve to update stock.</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {pendingApprovals.slice(0, 3).map((inv) => (
                    <span key={inv.id} className="px-3 py-1 bg-white border border-amber-300 text-amber-800 text-xs font-bold rounded-full">
                      {inv.linkedPoNo} — {inv.vendor}
                    </span>
                  ))}
                  {pendingApprovals.length > 3 && (
                    <span className="px-3 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">
                      +{pendingApprovals.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center ml-4">
              <FiArrowRight size={18} className="text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Total Categories", value: categories.length,  icon: <FiPackage size={20} />,       ib: "bg-indigo-50", ic: "text-indigo-500", b: "border-slate-200",  vc: "text-slate-800"  },
          { label: "Available SKUs",   value: totalAvailable,     icon: <FiCheckCircle size={20} />,   ib: "bg-green-50",  ic: "text-green-400",  b: "border-green-200",  vc: "text-green-600"  },
          { label: "Shortage Items",   value: totalCritical,      icon: <FiAlertTriangle size={20} />, ib: "bg-red-50",    ic: "text-red-500",    b: "border-red-200",    vc: "text-red-600"    },
          { label: "Low Stock Items",  value: totalLowStock,      icon: <FiClock size={20} />,         ib: "bg-yellow-50", ic: "text-yellow-500", b: "border-yellow-200", vc: "text-yellow-600" },
          { label: "Reorder Items",    value: totalReorder,       icon: <FiShoppingCart size={20} />,  ib: "bg-orange-50", ic: "text-orange-500", b: "border-orange-200", vc: "text-orange-600" },
          { label: "Total Products",   value: totalProducts,      icon: <FiPackage size={20} />,       ib: "bg-slate-50",  ic: "text-slate-500",  b: "border-slate-200",  vc: "text-slate-800"  },
        ].map((c) => (
          <div key={c.label} className={`bg-white rounded-2xl border ${c.b} p-5 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{c.label}</p>
                <p className={`text-3xl font-black mt-2 ${c.vc}`}>{c.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${c.ib} flex items-center justify-center flex-shrink-0`}>
                <span className={c.ic}>{c.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Alert Banner */}
      {totalCritical > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <button onClick={() => navigate("/store/low-stock-management")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 flex items-center gap-2 shadow-sm">
              View All <FiArrowRight />
            </button>
          </div>
          {criticalCats.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {criticalCats.slice(0, 5).map((cat) => {
                const s = getCatStats(cat.name);
                return (
                  <span key={cat.id} className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-300">
                    {cat.name} ({s.shortage} shortage)
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
              { dot: "bg-red-500",    label: "Shortage"  },
              { dot: "bg-yellow-400", label: "Low Stock" },
              { dot: "bg-orange-400", label: "Reorder"   },
              { dot: "bg-green-500",  label: "Normal"    },
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
            const stats = getCatStats(cat.name);
            return (
              <button key={cat.id}
                onClick={() => navigate(`/store/low-stock-management?category=${cat.id}`)}
                className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-md hover:border-emerald-200 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {getCatImage(cat.name) ? (
                      <img src={getCatImage(cat.name)} alt={cat.name} className="object-contain" />
                    ) : (
                      <FiPackage size={20} className="text-orange-400" />
                    )}
                  </div>
                  <h4 className="font-bold text-gray-500 text-sm leading-snug line-clamp-2">{cat.name}</h4>
                </div>

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