import React, { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiSave, FiTrash2, FiX, FiPackage, FiSearch } from "react-icons/fi";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";

const getStockStatus = (available, lowLevel, reorderLevel) => {
  if (available <= 0)               return "shortage";
  if (available < lowLevel * 0.5)   return "shortage";
  if (available < lowLevel)         return "low";
  if (available < reorderLevel)     return "reorder";
  return "ok";
};

const StatusBadge = ({ status }) => {
  const map = {
    shortage: "bg-red-100 text-red-600",
    low:      "bg-amber-100 text-amber-600",
    reorder:  "bg-orange-100 text-orange-600",
    ok:       "bg-emerald-100 text-emerald-600",
  };
  const label = { shortage: "SHORTAGE", low: "LOW", reorder: "REORDER", ok: "OK" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || map.ok}`}>
      {label[status] || "OK"}
    </span>
  );
};

export default function StoreProductManagement() {
  const [categories, setCategories]   = useState([]);
  const [stockMap, setStockMap]       = useState({});
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("__ALL__");
  const [saving, setSaving]           = useState(false);
  const [isAddMode, setIsAddMode]     = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingCatId, setEditingCatId] = useState(null);
  const [newProduct, setNewProduct]   = useState({ name: "", unit: "NOS", lowLevel: 100, reorderLevel: 150 });

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCats(true);
      const snapshot = await getDocs(collection(db, "stockCategories"));
      const data = snapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));
      data.sort((a, b) => {
        const order = (n = "") => n.toUpperCase().includes("PIPE") ? 0 : n.toUpperCase().includes("FITTING") ? 1 : 2;
        return order(a.name) - order(b.name) || a.name.localeCompare(b.name);
      });
      setCategories(data);
      setLoadingCats(false);
    };
    fetchCategories();
  }, []);

  // ✅ Live stock from Firestore — store full item for part no / description search
  const [stockItems, setStockItems] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stock"), (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStockItems(items);

      const map = {};
      items.forEach((s) => {
        const key = (s.description || "").trim().toLowerCase();
        if (key) map[key] = s.available ?? 0;
        const codeKey = (s.productCode || "").trim().toLowerCase();
        if (codeKey) map[codeKey] = s.available ?? 0;
      });
      setStockMap(map);
    });
    return () => unsub();
  }, []);

  const getLiveStock = (productName) => {
    const key = (productName || "").trim().toLowerCase();
    return key in stockMap ? stockMap[key] : null;
  };

  // ── Search logic ──────────────────────────────────────────────────────────
  // When search is active, find matching stock items then show their category products
  const trimmed = searchQuery.trim().toLowerCase();

  const getSearchResults = () => {
    if (!trimmed) return null; // null = not in search mode

    // Find matching stock items by description or productCode
    const matchedItems = stockItems.filter((item) => {
      const desc    = (item.description  || "").toLowerCase();
      const partNo  = (item.productCode  || "").toLowerCase();
      return desc.includes(trimmed) || partNo.includes(trimmed);
    });

    // Also match subcategory product names directly
    const results = [];
    categories.forEach((cat) => {
      (cat.subcategories || []).forEach((product, idx) => {
        const name = (product.name || "").toLowerCase();
        const matchedStock = matchedItems.find(
          (s) => (s.description || "").toLowerCase() === name
        );
        const partNo = matchedStock ? (matchedStock.productCode || "").toLowerCase() : "";

        if (name.includes(trimmed) || partNo.includes(trimmed)) {
          results.push({ cat, product, idx });
        }
      });
    });

    return results;
  };

  const searchResults = getSearchResults();
  const isSearchMode  = searchResults !== null;

  // ── Which categories to show (non-search mode) ────────────────────────────
  const visibleCategories = selectedCategory === "__ALL__"
    ? categories
    : categories.filter((c) => c.docId === selectedCategory);

  const saveToFirebase = async (catId, updatedProducts) => {
    await updateDoc(doc(db, "stockCategories", catId), {
      subcategories: updatedProducts,
      productCount: updatedProducts.length,
    });
    setCategories((prev) =>
      prev.map((c) => c.docId === catId
        ? { ...c, subcategories: updatedProducts, productCount: updatedProducts.length }
        : c
      )
    );
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingCatId) return;
    setSaving(true);
    const cat = categories.find((c) => c.docId === editingCatId);
    const products = cat?.subcategories || [];
    const updatedProducts = [...products];

    if (editingIndex !== null) {
      updatedProducts[editingIndex] = {
        ...updatedProducts[editingIndex],
        name: newProduct.name.trim(),
        unit: newProduct.unit,
        lowLevel: newProduct.lowLevel,
        reorderLevel: newProduct.reorderLevel,
      };
    } else {
      const exists = products.some((p) => p.name.toUpperCase() === newProduct.name.trim().toUpperCase());
      if (exists) {
        alert(`"${newProduct.name}" already exists in this category.`);
        setSaving(false);
        return;
      }
      updatedProducts.push({
        name: newProduct.name.trim(),
        unit: newProduct.unit,
        lowLevel: newProduct.lowLevel,
        reorderLevel: newProduct.reorderLevel,
      });
    }

    await saveToFirebase(editingCatId, updatedProducts);
    setSaving(false);
    handleCancel();
  };

  const handleDelete = async (catId, idx, productName) => {
    if (!window.confirm(`Delete "${productName}"?`)) return;
    const cat = categories.find((c) => c.docId === catId);
    const updatedProducts = (cat?.subcategories || []).filter((_, i) => i !== idx);
    await saveToFirebase(catId, updatedProducts);
  };

  const handleEditClick = (catId, product, idx) => {
    setEditingCatId(catId);
    setEditingIndex(idx);
    setNewProduct({
      name: product.name || "",
      unit: product.unit || "NOS",
      lowLevel: product.lowLevel ?? 100,
      reorderLevel: product.reorderLevel ?? 150,
    });
    setIsAddMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddClick = () => {
    setEditingCatId(selectedCategory === "__ALL__" ? categories[0]?.docId : selectedCategory);
    setIsAddMode(true);
  };

  const handleCancel = () => {
    setIsAddMode(false);
    setEditingIndex(null);
    setEditingCatId(null);
    setNewProduct({ name: "", unit: "NOS", lowLevel: 100, reorderLevel: 150 });
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setSearchQuery("");
    handleCancel();
  };

  if (loadingCats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 text-sm font-semibold animate-pulse">Loading...</div>
      </div>
    );
  }

  const totalProducts = categories.reduce((sum, c) => sum + (c.subcategories?.length || 0), 0);

  // ── Reusable product row ──────────────────────────────────────────────────
  const ProductRow = ({ cat, product, idx }) => {
    const liveStock = getLiveStock(product.name);
    const available = liveStock ?? 0;
    const status    = getStockStatus(available, product.lowLevel ?? 100, product.reorderLevel ?? 150);
    const isEditing = editingCatId === cat.docId && editingIndex === idx;

    // Get part no from stock if available
    const matchedStock = stockItems.find(
      (s) => (s.description || "").toLowerCase() === (product.name || "").toLowerCase()
    );
    const partNo = matchedStock?.productCode || null;

    return (
      <div
        className={`flex items-center justify-between p-3.5 rounded-lg transition-all ${
          isEditing ? "bg-indigo-50 border border-indigo-200" : "bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800 text-sm">{product.name}</p>
            <StatusBadge status={status} />
            {partNo && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                #{partNo}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-400">Unit: <span className="font-semibold text-slate-600">{product.unit ?? "NOS"}</span></span>
            <span className="text-xs text-slate-400">Low: <span className="font-semibold text-slate-600">{product.lowLevel ?? 100}</span></span>
            <span className="text-xs text-slate-400">Reorder: <span className="font-semibold text-slate-600">{product.reorderLevel ?? 150}</span></span>
            <span className={`text-xs font-bold ${
              liveStock === null ? "text-slate-300" :
              status === "shortage" ? "text-red-500" :
              status === "low"      ? "text-amber-600" :
              status === "reorder"  ? "text-orange-500" :
              "text-teal-600"
            }`}>
              Stock: {liveStock === null ? "—" : liveStock}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <button
            onClick={() => handleEditClick(cat.docId, product, idx)}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
              isEditing ? "bg-indigo-600 text-white" : "hover:bg-indigo-100 text-slate-500 hover:text-indigo-600"
            }`}
          >
            <FiEdit2 size={13} />
            <span className="hidden sm:inline">{isEditing ? "Editing…" : "Edit"}</span>
          </button>
          <button
            onClick={() => handleDelete(cat.docId, idx, product.name)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800">Product Management</h2>
        <p className="text-sm text-slate-500 mt-1">Add products and set low stock levels</p>
      </div>

      {/* Category Selector + Search + Add Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-end gap-3 flex-wrap">

          {/* Category dropdown */}
          <div className="flex-1 md:max-w-xs">
            <label className="block text-sm font-bold text-slate-700 mb-2">Select Category</label>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              disabled={isSearchMode}
            >
              <option value="__ALL__">All Categories ({totalProducts} products)</option>
              {categories.map((cat) => (
                <option key={cat.docId} value={cat.docId}>
                  {cat.name} ({cat.subcategories?.length || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="flex-1 md:max-w-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Search by Description / Part No.
            </label>
            <div className="relative">
              <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. PP PIPE 10KG or #PART123"
                className="w-full border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap"
          >
            <FiPlus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {isAddMode && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm">
          <h3 className="font-black text-slate-800 mb-1 flex items-center gap-2">
            {editingIndex !== null
              ? <><FiEdit2 className="text-indigo-600" /> Edit Product</>
              : <><FiPlus className="text-indigo-600" /> Add New Product</>}
          </h3>
          {selectedCategory === "__ALL__" && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-2">Add to Category</label>
              <select
                value={editingCatId || ""}
                onChange={(e) => setEditingCatId(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full md:max-w-xs"
              >
                {categories.map((cat) => (
                  <option key={cat.docId} value={cat.docId}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}
          <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Product Name</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g. MS ANGLE"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Unit</label>
              <select
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {["NOS","KG","MTR","LTR","SQ.M","PCS","PKT"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Low Level</label>
              <input
                type="number"
                value={newProduct.lowLevel}
                onChange={(e) => setNewProduct({ ...newProduct, lowLevel: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Reorder Level</label>
              <input
                type="number"
                value={newProduct.reorderLevel}
                onChange={(e) => setNewProduct({ ...newProduct, reorderLevel: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                required
              />
            </div>
            <div className="md:col-span-4 flex gap-3">
              <button type="button" onClick={handleCancel}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
                <FiX size={14} /> Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
                <FiSave size={14} />
                {saving ? "Saving..." : editingIndex !== null ? "Update Product" : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SEARCH RESULTS MODE ── */}
      {isSearchMode ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <FiSearch size={15} className="text-indigo-500" />
            <h3 className="font-black text-slate-800 text-sm">
              Search Results
            </h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {searchResults.length} found
            </span>
          </div>
          <div className="p-4">
            {searchResults.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No products found for "<span className="font-semibold">{searchQuery}</span>"
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map(({ cat, product, idx }) => (
                  <div key={`${cat.docId}-${idx}`}>
                    {/* Category label */}
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 ml-1">
                      {cat.name}
                    </div>
                    <ProductRow cat={cat} product={product} idx={idx} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── NORMAL CATEGORIES LIST ── */
        <div className="space-y-5">
          {visibleCategories.map((cat) => {
            const products = cat.subcategories || [];
            return (
              <div key={cat.docId} className="bg-white rounded-xl border border-slate-200">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiPackage size={15} className="text-indigo-500" />
                    <h3 className="font-black text-slate-800 text-sm">{cat.name}</h3>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {products.length} products
                    </span>
                  </div>
                  {selectedCategory === "__ALL__" && (
                    <button
                      onClick={() => {
                        setEditingCatId(cat.docId);
                        setIsAddMode(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <FiPlus size={12} /> Add
                    </button>
                  )}
                </div>

                <div className="p-4">
                  {products.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">
                      No products in this category yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {products.map((product, idx) => (
                        <ProductRow key={idx} cat={cat} product={product} idx={idx} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}