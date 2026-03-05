import React, { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiSave, FiTrash2, FiX } from "react-icons/fi";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default function ProductManagement() {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    unit: "NOS",
    lowLevel: 100,
    reorderLevel: 150,
  });

  const fetchCategories = async () => {
    setLoadingCats(true);
    const snapshot = await getDocs(collection(db, "stockCategories"));
    const data = snapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));
    setCategories(data);
    if (data.length > 0) setSelectedCategory(data[0].docId);
    setLoadingCats(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const selectedCat = categories.find((c) => c.docId === selectedCategory);
  const products = selectedCat?.subcategories || [];

  const saveToFirebase = async (updatedProducts) => {
    await updateDoc(doc(db, "stockCategories", selectedCategory), {
      subcategories: updatedProducts,
      productCount: updatedProducts.length,
    });
    setCategories((prev) =>
      prev.map((c) =>
        c.docId === selectedCategory
          ? {
              ...c,
              subcategories: updatedProducts,
              productCount: updatedProducts.length,
            }
          : c,
      ),
    );
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
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
      const exists = products.some(
        (p) => p.name.toUpperCase() === newProduct.name.trim().toUpperCase(),
      );
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

    await saveToFirebase(updatedProducts);
    setSaving(false);
    handleCancel();
  };

  const handleDelete = async (idx) => {
    if (!window.confirm(`Delete "${products[idx].name}"?`)) return;
    const updatedProducts = products.filter((_, i) => i !== idx);
    await saveToFirebase(updatedProducts);
  };

  const handleEditClick = (product, idx) => {
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

  const handleCancel = () => {
    setIsAddMode(false);
    setEditingIndex(null);
    setNewProduct({ name: "", unit: "NOS", lowLevel: 100, reorderLevel: 150 });
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    handleCancel();
  };

  if (loadingCats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 text-sm font-semibold animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800">
          Product Management
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Add products and set low stock levels
        </p>
      </div>
      {/* Category Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 md:max-w-xs">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Select Category
            </label>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
            >
              {categories.map((cat) => (
                <option key={cat.docId} value={cat.docId}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsAddMode(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap"
          >
            <FiPlus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {isAddMode ? (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            {editingIndex !== null ? (
              <>
                <FiEdit2 className="text-indigo-600" />
                Edit Product
                <span className="text-indigo-600">
                  — {products[editingIndex]?.name}
                </span>
              </>
            ) : (
              <>
                <FiPlus className="text-indigo-600" />
                Add New Product
              </>
            )}
          </h3>

          <form
            onSubmit={handleSaveProduct}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Product Name
              </label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g. MS ANGLE"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Unit
              </label>
              <select
                value={newProduct.unit}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, unit: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              >
                <option>NOS</option>
                <option>KG</option>
                <option>MTR</option>
                <option>LTR</option>
                <option>SQ.M</option>
                <option>PCS</option>
                <option>PKT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Low Level
              </label>
              <input
                type="number"
                value={newProduct.lowLevel}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    lowLevel: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Reorder Level
              </label>
              <input
                type="number"
                value={newProduct.reorderLevel}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    reorderLevel: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            <div className="md:col-span-4 flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"
              >
                <FiX size={14} /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
              >
                <FiSave size={14} />
                {saving
                  ? "Saving..."
                  : editingIndex !== null
                    ? "Update Product"
                    : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Products List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">
            Products in {selectedCat?.name ?? ""}
            <span className="ml-2 text-sm font-semibold text-slate-400">
              ({products.length})
            </span>
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {products.map((product, idx) => {
              const isCurrentlyEditing = editingIndex === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    isCurrentlyEditing
                      ? "bg-indigo-50 border border-indigo-200"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      Unit: {product.unit ?? "NOS"} &nbsp;|&nbsp; Low Level:{" "}
                      {product.lowLevel ?? 100} &nbsp;|&nbsp; Reorder:{" "}
                      {product.reorderLevel ?? 150}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(product, idx)}
                      className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                        isCurrentlyEditing
                          ? "bg-indigo-600 text-white"
                          : "hover:bg-indigo-100 text-slate-600 hover:text-indigo-600"
                      }`}
                    >
                      <FiEdit2 size={14} />
                      {isCurrentlyEditing ? "Editing..." : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {products.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">
                No products in this category yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}