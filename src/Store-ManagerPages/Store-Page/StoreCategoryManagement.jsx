import React, { useState, useEffect, useRef } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiUpload, FiX, FiCheck } from "react-icons/fi";
import { db } from "../../firebase";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import * as XLSX from "xlsx";

const isYellowCell = (cell) => {
  if (!cell || !cell.s) return false;
  const rgb = cell.s?.fgColor?.rgb || cell.s?.bgColor?.rgb || "";
  return rgb === "FFFFFF00" || rgb === "FFFF00";
};

export default function StoreCategoryManagement() {
  const [categories, setCategories]           = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData]               = useState({ name: "" });
  const [saving, setSaving]                   = useState(false);
  const fileInputRef                          = useRef(null);
  const [uploadModal, setUploadModal]         = useState(false);
  const [previewData, setPreviewData]         = useState(null);
  const [uploading, setUploading]             = useState(false);
  const [uploadResults, setUploadResults]     = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "stockCategories"));
    const data = snapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (editingCategory) {
      await updateDoc(doc(db, "stockCategories", editingCategory.docId), {
        name: formData.name.trim(),
      });
    } else {
      const exists = categories.some(
        (c) => c.name.toUpperCase() === formData.name.trim().toUpperCase()
      );
      if (exists) {
        alert(`"${formData.name}" already exists.`);
        setSaving(false);
        return;
      }
      await addDoc(collection(db, "stockCategories"), {
        name:          formData.name.trim(),
        icon:          "📦",
        productCount:  0,
        lowStockCount: 0,
        criticalCount: 0,
        subcategories: [],
      });
    }

    await fetchCategories();
    setSaving(false);
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: "" });
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    await deleteDoc(doc(db, "stockCategories", docId));
    setCategories((prev) => prev.filter((c) => c.docId !== docId));
  };

  const parseExcelFile = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb    = XLSX.read(new Uint8Array(e.target.result), { type: "array", cellStyles: true });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1:B1");
        const parsed = [];
        let currentCat = null;

        for (let R = 0; R <= range.e.r; R++) {
          const cellA = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
          const cellB = ws[XLSX.utils.encode_cell({ r: R, c: 1 })];
          if (!cellA?.v) continue;

          const name = String(cellA.v).trim();
          const unit = cellB ? String(cellB.v || "").trim() : "";
          if (!name || name === "UNIT") continue;

          if (isYellowCell(cellA)) {
            currentCat = { name, icon: "📦", subcategories: [] };
            parsed.push(currentCat);
          } else if (unit && currentCat) {
            currentCat.subcategories.push({ name, unit });
          }
        }
        resolve(parsed);
      };
      reader.readAsArrayBuffer(file);
    });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    const parsed = await parseExcelFile(file);
    if (!parsed.length) {
      alert("No yellow category cells found in the Excel file.");
      return;
    }

    const snapshot = await getDocs(collection(db, "stockCategories"));
    const existing = {};
    snapshot.docs.forEach((d) => {
      existing[d.data().name.toUpperCase()] = { docId: d.id, ...d.data() };
    });

    const preview = parsed.map((cat) => {
      const key = cat.name.toUpperCase();
      if (existing[key]) {
        const existCount = (existing[key].subcategories || []).length;
        const newCount   = cat.subcategories.length;
        return existCount === newCount
          ? { ...cat, status: "skip",   existDocId: existing[key].docId }
          : { ...cat, status: "update", existDocId: existing[key].docId, existCount, newCount };
      }
      return { ...cat, status: "add" };
    });

    setPreviewData(preview);
    setUploadModal(true);
  };

  const handleConfirmUpload = async () => {
    setUploading(true);
    const results = { added: [], updated: [], skipped: [] };

    for (const cat of previewData) {
      if (cat.status === "skip") {
        results.skipped.push(cat.name);
      } else if (cat.status === "update") {
        await updateDoc(doc(db, "stockCategories", cat.existDocId), {
          subcategories: cat.subcategories,
          // ✅ Always sync productCount with actual subcategories length
          productCount:  cat.subcategories.length,
        });
        results.updated.push(cat.name);
      } else {
        await addDoc(collection(db, "stockCategories"), {
          name:          cat.name,
          icon:          cat.icon,
          subcategories: cat.subcategories,
          // ✅ Always sync productCount with actual subcategories length
          productCount:  cat.subcategories.length,
          lowStockCount: 0,
          criticalCount: 0,
        });
        results.added.push(cat.name);
      }
    }

    await fetchCategories();
    setUploading(false);
    setUploadModal(false);
    setPreviewData(null);
    setUploadResults(results);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 text-sm font-semibold animate-pulse">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Category Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage product categories</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
          >
            <FiPlus size={14} /> Add Category
          </button>
          {/* <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-2"
          >
            <FiUpload size={14} /> Upload Excel
          </button> */}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          // ✅ Always use actual subcategories length, not stored productCount
          const actualCount = (category.subcategories || []).length;
          return (
            <div key={category.docId} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-end gap-2 mb-3">
                <button
                  onClick={() => {
                    setEditingCategory(category);
                    setFormData({ name: category.name });
                    setIsModalOpen(true);
                  }}
                  className="p-2 hover:bg-slate-100 rounded"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(category.docId)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
              <h3 className="font-black text-slate-800 text-sm mb-2">{category.name}</h3>
              <div className="text-xs text-slate-600 space-y-1">
                {/* ✅ Show actual subcategories count */}
                <div>Products: {actualCount}</div>
                <div>Low Stock: {category.lowStockCount ?? 0}</div>
                <div>Critical: {category.criticalCount ?? 0}</div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-slate-800 mb-4">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingCategory(null); setFormData({ name: "" }); }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingCategory ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {uploadModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-black text-slate-800">Excel Upload Preview</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {previewData.filter(c => c.status === "add").length} new &nbsp;·&nbsp;
                  {previewData.filter(c => c.status === "update").length} update &nbsp;·&nbsp;
                  {previewData.filter(c => c.status === "skip").length} skip
                </p>
              </div>
              <button onClick={() => { setUploadModal(false); setPreviewData(null); }}>
                <FiX size={20} className="text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex gap-5 text-xs font-semibold">
              <span className="flex items-center gap-1 text-green-700"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> New</span>
              <span className="flex items-center gap-1 text-amber-700"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Update (count changed)</span>
              <span className="flex items-center gap-1 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Skip (already same)</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {previewData.map((cat, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border text-sm
                  ${cat.status === "add"    ? "bg-green-50 border-green-200" : ""}
                  ${cat.status === "update" ? "bg-amber-50 border-amber-200" : ""}
                  ${cat.status === "skip"   ? "bg-slate-50 border-slate-200 opacity-50" : ""}
                `}>
                  <div>
                    <span className="font-bold text-slate-800">{cat.name}</span>
                    <span className="text-slate-500 ml-2 text-xs">{cat.subcategories.length} subcategories</span>
                    {cat.status === "update" && (
                      <span className="ml-2 text-xs text-amber-700">({cat.existCount} → {cat.newCount})</span>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full
                    ${cat.status === "add"    ? "bg-green-100 text-green-700" : ""}
                    ${cat.status === "update" ? "bg-amber-100 text-amber-700" : ""}
                    ${cat.status === "skip"   ? "bg-slate-200 text-slate-500" : ""}
                  `}>
                    {cat.status === "add" ? "ADD" : cat.status === "update" ? "UPDATE" : "SKIP"}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => { setUploadModal(false); setPreviewData(null); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {uploading ? <span className="animate-pulse">Uploading...</span> : <><FiCheck /> Confirm Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <FiCheck className="text-green-600" /> Upload Complete
            </h3>
            <div className="space-y-3">
              {uploadResults.added.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-bold text-green-700 mb-1">Added ({uploadResults.added.length})</p>
                  <p className="text-xs text-green-800">{uploadResults.added.join(", ")}</p>
                </div>
              )}
              {uploadResults.updated.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-bold text-amber-700 mb-1">Updated ({uploadResults.updated.length})</p>
                  <p className="text-xs text-amber-800">{uploadResults.updated.join(", ")}</p>
                </div>
              )}
              {uploadResults.skipped.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 mb-1">Skipped ({uploadResults.skipped.length})</p>
                  <p className="text-xs text-slate-600">{uploadResults.skipped.join(", ")}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setUploadResults(null)}
              className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}