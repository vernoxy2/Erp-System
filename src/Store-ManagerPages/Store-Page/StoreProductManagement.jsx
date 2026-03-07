import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

export default function StoreProductManagement() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isAddMode, setIsAddMode] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: "",
    unit: "NOS",
    lowLevel: 100,
    reorderLevel: 150,
  });
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingProds, setLoadingProds] = useState(false); // ← separate loader

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "stockCategories"));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setCategories(data);
        if (data.length > 0) setSelectedCategory(data[0].id);
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products when category changes
  useEffect(() => {
    if (!selectedCategory) return;
    const fetchProducts = async () => {
      setLoadingProds(true); // ← show loader while fetching
      try {
        const snapshot = await getDocs(
          collection(db, "stockCategories", selectedCategory, "products")
        );
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoadingProds(false);
      }
    };
    fetchProducts();
  }, [selectedCategory]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        code: newProduct.code,
        unit: newProduct.unit,
        lowLevel: newProduct.lowLevel,
        reorderLevel: newProduct.reorderLevel,
        currentStock: 0,
      };
      const docRef = await addDoc(
        collection(db, "stockCategories", selectedCategory, "products"),
        productData
      );
      // ✅ include all fields in local state update
      setProducts((prev) => [...prev, { id: docRef.id, ...productData }]);
      setIsAddMode(false);
      setNewProduct({ code: "", unit: "NOS", lowLevel: 100, reorderLevel: 150 });
    } catch (err) {
      console.error("Error adding product:", err);
    }
  };

  if (loadingCats) return <div className="p-6 text-gray-500">Loading categories...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
        <p className="text-sm text-gray-500 mt-1">Add products and set low stock levels</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Category</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full md:w-1/3 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {isAddMode ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Add New Product</h3>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Product Code/Name</label>
              <input
                type="text"
                value={newProduct.code}
                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
                placeholder="e.g., MS ANGLE"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Unit</label>
              <select
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option>NOS</option>
                <option>KG</option>
                <option>MTR</option>
                <option>LTR</option>
                <option>SQ.M</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Low Level</label>
              <input
                type="number"
                value={newProduct.lowLevel}
                onChange={(e) => setNewProduct({ ...newProduct, lowLevel: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Reorder Level</label>
              <input
                type="number"
                value={newProduct.reorderLevel}
                onChange={(e) => setNewProduct({ ...newProduct, reorderLevel: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="md:col-span-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsAddMode(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsAddMode(true)}
          className="w-full bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
        >
          <p className="text-sm font-semibold text-gray-600">+ Add Product to Category</p>
        </button>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">
            Products in {categories.find((c) => c.id === selectedCategory)?.name}
          </h3>
        </div>
        <div className="p-6">
          {loadingProds ? (
            <p className="text-sm text-gray-400 text-center">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">No products found for this category.</p>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{product.code}</p>
                    <p className="text-xs text-gray-600">
                      Unit: {product.unit} | Low Level: {product.lowLevel} | Reorder: {product.reorderLevel} | Current Stock: {product.currentStock ?? 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}