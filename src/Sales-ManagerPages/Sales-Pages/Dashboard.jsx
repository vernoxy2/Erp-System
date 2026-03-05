import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiPackage,
  FiShoppingCart,
  FiClock,
  FiArrowRight,
  FiDownload,
} from "react-icons/fi";
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

// Same status logic as LowStockManagement
const getStockStatus = (currentStock, lowLevel, reorderLevel) => {
  if (currentStock <= 0)                  return "critical";
  if (currentStock < lowLevel * 0.5)      return "critical";
  if (currentStock < lowLevel)            return "low";
  if (currentStock < reorderLevel)        return "reorder";
  return "normal";
};

export default function Dashboard() {
  const [stockCategories, setStockCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // ✅ Fetch both collections in parallel
      const [catSnapshot, stockSnapshot] = await Promise.all([
        getDocs(collection(db, "stockCategories")),
        getDocs(collection(db, "stock")),
      ]);

      // ✅ Build stock lookup map: name/description (lowercase) → available
      const stockMap = {};
      stockSnapshot.docs.forEach((d) => {
        const s = d.data();
        const key = (s.description || "").trim().toLowerCase();
        if (key) stockMap[key] = s.available ?? 0;
        const codeKey = (s.productCode || "").trim().toLowerCase();
        if (codeKey) stockMap[codeKey] = s.available ?? 0;
      });

      // ✅ Compute criticalCount & lowStockCount dynamically per category
      const cats = catSnapshot.docs.map((d) => {
        const cat = { docId: d.id, ...d.data() };
        const subcategories = cat.subcategories || [];

        let criticalCount = 0;
        let lowStockCount = 0;
        let reorderCount  = 0;

        subcategories.forEach((sub) => {
          const nameKey = (sub.name || "").trim().toLowerCase();
          // Same logic as LowStockManagement: fallback to sub.currentStock ?? 0
          const liveStock = nameKey in stockMap ? stockMap[nameKey] : (sub.currentStock ?? 0);
          const lowLevel = sub.lowLevel ?? 100;
          const reorderLevel = sub.reorderLevel ?? 150;
          const status = getStockStatus(liveStock, lowLevel, reorderLevel);

          if (status === "critical") criticalCount++;
          if (status === "low")      lowStockCount++;
          if (status === "reorder")  reorderCount++;
        });

        // ✅ Use actual subcategories length, not stored productCount
        const actualProductCount = subcategories.length;

        return { ...cat, criticalCount, lowStockCount, reorderCount, productCount: actualProductCount };
      });

      setStockCategories(cats);
    };

    fetchData();
  }, []);

  const totalLowStock      = stockCategories.reduce((sum, cat) => sum + (cat.lowStockCount  || 0), 0);
  const totalReorder       = stockCategories.reduce((sum, cat) => sum + (cat.reorderCount    || 0), 0);
  const totalCritical      = stockCategories.reduce((sum, cat) => sum + (cat.criticalCount   || 0), 0);
  const totalProducts      = stockCategories.reduce((sum, cat) => sum + (cat.productCount    || 0), 0);
  // const criticalCategories = stockCategories.filter((cat) => cat.criticalCount > 0);

  // ✅ Sort: Pipes first, Fittings second, others last (alphabetical within each group)
  const getCategorySortOrder = (name = "") => {
    const n = name.toUpperCase();
    if (n.includes("PIPE")) return 0;
    if (n.includes("FITTING")) return 1;
    return 2;
  };

  const sortedCategories = [...stockCategories].sort((a, b) => {
    const orderDiff = getCategorySortOrder(a.name) - getCategorySortOrder(b.name);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });

  const handleExport = () => {
    const headers = ["Category Name", "Total Products", "Critical Items", "Low Stock Items"];
    const rows = stockCategories.map((cat) => [
      cat.name,
      cat.productCount,
      cat.criticalCount,
      cat.lowStockCount,
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Dashboard_Stock_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header + Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Sales Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Overview of sales operations and stock alerts
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition"
        >
          <FiDownload size={16} />
          Export
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Categories</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{stockCategories.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
              <FiPackage size={24} className="text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-red-500 uppercase">Critical Items</p>
              <p className="text-3xl font-black text-red-700 mt-2">{totalCritical}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
              <FiAlertTriangle size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-yellow-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-yellow-600 uppercase">Low Stock Items</p>
              <p className="text-3xl font-black text-yellow-700 mt-2">{totalLowStock}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center">
              <FiClock size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-orange-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-orange-500 uppercase">Reorder Items</p>
              <p className="text-3xl font-black text-orange-600 mt-2">{totalReorder}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <FiShoppingCart size={24} className="text-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Products</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{totalProducts}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center">
              <FiShoppingCart size={24} className="text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {/* {totalCritical > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-red-900 flex items-center gap-2">
                <FiAlertTriangle className="animate-pulse" />
                Stock Alerts
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {criticalCategories.length} categories have critical stock levels
              </p>
            </div>
            <button
              onClick={() => navigate("/sales/low-stock-management")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              View All <FiArrowRight />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {criticalCategories.slice(0, 5).map((cat) => (
              <span
                key={cat.docId}
                className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-300"
              >
                {cat.name} ({cat.criticalCount} critical)
              </span>
            ))}
          </div>
        </div>
      )} */}

      {/* Stock Category Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800">Stock Categories</h3>
          {/* <div className="flex gap-2">
            <span className="text-xs font-bold text-slate-500">🔴 Critical</span>
            <span className="text-xs font-bold text-slate-500">🟠 High Alert</span>
            <span className="text-xs font-bold text-slate-500">🟡 Warning</span>
            <span className="text-xs font-bold text-slate-500">🟢 Normal</span>
          </div> */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {sortedCategories.map((category) => (
            <button
              key={category.docId}
              onClick={() =>
                navigate(`/sales/low-stock-management?category=${category.docId}`)
              }
              className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-lg transition-all hover:scale-105"
            >
              <h4 className="font-black text-slate-800 text-sm mb-2 line-clamp-2 min-h-[1.0rem]">
                {category.name}
              </h4>

              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  View Details <FiArrowRight size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}