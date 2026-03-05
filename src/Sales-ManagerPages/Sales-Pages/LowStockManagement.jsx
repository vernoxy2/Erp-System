import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FiDownload } from "react-icons/fi";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

// Status logic based on currentStock vs lowLevel
const getStockStatus = (currentStock, lowLevel, reorderLevel) => {
  if (currentStock <= 0) {
    return { status: "critical", label: "Critical",  bgColor: "bg-red-50",    textColor: "text-red-700",    borderColor: "border-red-200"    };
  }
  if (currentStock < lowLevel * 0.5) {
    return { status: "critical", label: "Critical",  bgColor: "bg-red-50",    textColor: "text-red-700",    borderColor: "border-red-200"    };
  }
  if (currentStock < lowLevel) {
    return { status: "low",      label: "Low Stock", bgColor: "bg-amber-50",  textColor: "text-amber-700",  borderColor: "border-amber-200"  };
  }
  if (currentStock < reorderLevel) {
    return { status: "reorder",  label: "Reorder",   bgColor: "bg-yellow-50", textColor: "text-yellow-700", borderColor: "border-yellow-200" };
  }
  return   { status: "normal",   label: "Normal",    bgColor: "bg-green-50",  textColor: "text-green-700",  borderColor: "border-green-200"  };
};

export default function LowStockManagement() {
  const [searchParams]    = useSearchParams();
  const [categories, setCategories]         = useState([]);
  const [allProducts, setAllProducts]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [filter, setFilter]                 = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // ✅ Fetch both collections in parallel
      const [catSnapshot, stockSnapshot] = await Promise.all([
        getDocs(collection(db, "stockCategories")),
        getDocs(collection(db, "stock")),
      ]);

      const cats = catSnapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));
      setCategories(cats);

      // ✅ Build a lookup map from stock collection: description (lowercase) → available
      const stockMap = {};
      stockSnapshot.docs.forEach((d) => {
        const s = d.data();
        const key = (s.description || "").trim().toLowerCase();
        if (key) stockMap[key] = s.available ?? 0;
        // also index by productCode as fallback
        const codeKey = (s.productCode || "").trim().toLowerCase();
        if (codeKey) stockMap[codeKey] = s.available ?? 0;
      });

      // ✅ Flatten all products, match currentStock from stock collection
      const products = [];
      cats.forEach((cat) => {
        (cat.subcategories || []).forEach((sub) => {
          const nameKey = (sub.name || "").trim().toLowerCase();
          // ✅ Use live stock only if product exists in stock collection
          const liveStock = nameKey in stockMap ? stockMap[nameKey] : (sub.currentStock ?? 0);

          products.push({
            id:           `${cat.docId}_${sub.name}`,
            categoryId:   cat.docId,
            categoryName: cat.name,
            name:         sub.name,
            unit:         sub.unit        ?? "NOS",
            lowLevel:     sub.lowLevel    ?? 100,
            reorderLevel: sub.reorderLevel ?? 150,
            currentStock: liveStock,       // ✅ from stock collection
          });
        });
      });

      setAllProducts(products);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filter products — only show those below reorder level
  const filteredProducts = allProducts.filter((product) => {
    const status = getStockStatus(product.currentStock, product.lowLevel, product.reorderLevel);

    if (selectedCategory !== "all" && product.categoryId !== selectedCategory) return false;

    if (filter === "critical") return status.status === "critical";
    if (filter === "low")      return status.status === "low";
    if (filter === "reorder")  return status.status === "reorder";

    // Default: show only below-threshold (not normal)
    return status.status !== "normal";
  });

  // Group by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.categoryName]) acc[product.categoryName] = [];
    acc[product.categoryName].push(product);
    return acc;
  }, {});

  // Export CSV
  const handleExport = () => {
    const headers = ["Category", "Product Name", "Unit", "Current Stock", "Low Level", "Reorder Level", "Status"];
    const rows = filteredProducts.map((p) => {
      const s = getStockStatus(p.currentStock, p.lowLevel, p.reorderLevel);
      return [p.categoryName, p.name, p.unit, p.currentStock, p.lowLevel, p.reorderLevel, s.label];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "low_stock_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 text-sm font-semibold animate-pulse">Loading stock data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Low Stock Management</h2>
          <p className="text-sm text-slate-500 mt-1">View and manage products below threshold</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"
        >
          <FiDownload size={16} /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.docId} value={cat.docId}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Stock Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="critical">Critical Only</option>
              <option value="low">Low Stock Only</option>
              <option value="reorder">Reorder Only</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="bg-slate-50 rounded-lg px-4 py-2 w-full">
              <p className="text-xs text-slate-600">Showing Results</p>
              <p className="text-lg font-black text-slate-800">{filteredProducts.length} Products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products by Category */}
      {Object.keys(groupedProducts).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">All Stock Levels Normal</h3>
          <p className="text-sm text-slate-600">No products below threshold in selected category</p>
        </div>
      ) : (
        Object.keys(groupedProducts).map((categoryName) => (
          <div key={categoryName} className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-black text-slate-800">{categoryName}</h3>
              <p className="text-xs text-slate-500">
                {groupedProducts[categoryName].length} products below threshold
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left   text-xs font-bold text-slate-500 uppercase">Product Name</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Unit</th>
                    <th className="px-6 py-3 text-right  text-xs font-bold text-slate-500 uppercase">Current Stock</th>
                    <th className="px-6 py-3 text-right  text-xs font-bold text-slate-500 uppercase">Low Level</th>
                    <th className="px-6 py-3 text-right  text-xs font-bold text-slate-500 uppercase">Reorder Level</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupedProducts[categoryName].map((product) => {
                    const status = getStockStatus(product.currentStock, product.lowLevel, product.reorderLevel);
                    return (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{product.name}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600">{product.unit}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-800">{product.currentStock}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">{product.lowLevel}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">{product.reorderLevel}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full border ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}