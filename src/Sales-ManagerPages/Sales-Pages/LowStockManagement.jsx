import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiFilter, FiDownload, FiShoppingCart } from "react-icons/fi";
import { stockCategories, lowStockProducts, getStockStatus } from "../data/stockCategoriesData";

export default function LowStockManagement() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [filter, setFilter] = useState('all'); // all, critical, low

  // Filter products
  const filteredProducts = lowStockProducts.filter(product => {
    if (selectedCategory !== 'all' && product.categoryId !== parseInt(selectedCategory)) return false;
    if (filter === 'critical') {
      const status = getStockStatus(product.currentStock, product.lowLevel);
      return status.status === 'critical';
    }
    if (filter === 'low') {
      const status = getStockStatus(product.currentStock, product.lowLevel);
      return status.status === 'low';
    }
    return true;
  });

  // Group by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.categoryName]) acc[product.categoryName] = [];
    acc[product.categoryName].push(product);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Low Stock Management</h2>
          <p className="text-sm text-slate-500 mt-1">View and manage products below threshold</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
            <FiDownload size={16} />
            Export
          </button>
          {/* <button 
            onClick={() => navigate('/sales/purchase-orders/create')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
          >
            <FiShoppingCart size={16} />
            Create PO
          </button> */}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {stockCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
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
            </select>
          </div>

          {/* Results Count */}
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
        Object.keys(groupedProducts).map(categoryName => (
          <div key={categoryName} className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-black text-slate-800">{categoryName}</h3>
              <p className="text-xs text-slate-500">{groupedProducts[categoryName].length} products below threshold</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Product Code</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Unit</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Current Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Low Level</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Reorder Level</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                    {/* <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Action</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupedProducts[categoryName].map((product) => {
                    const status = getStockStatus(product.currentStock, product.lowLevel);
                    return (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{product.code}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600">{product.unit}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-800">{product.currentStock}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">{product.lowLevel}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">{product.reorderLevel}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${status.bgColor} ${status.textColor} border ${status.borderColor}`}>
                            {status.label}
                          </span>
                        </td>
                        {/* <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => navigate('/sales/purchase-orders/create', { state: { product } })}
                            className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded hover:bg-indigo-100"
                          >
                            Order
                          </button>
                        </td> */}
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
