import { useState, useMemo, useEffect } from "react";
import {
  FiSearch, FiEye, FiClock,
  FiArrowUp, FiArrowDown, FiAlertCircle, FiRefreshCw,
} from "react-icons/fi";
import { Card, CardHeader, Modal } from "../SalesComponent/ui/index";
import { db } from '../../firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';

// ✅ Same status logic as LowStockManagement & Dashboard
const getStockStatus = (available, lowLevel, reorderLevel) => {
  if (available <= 0)              return "shortage";
  if (available < lowLevel * 0.5)  return "shortage";
  if (available < lowLevel)        return "low";
  if (available < reorderLevel)    return "reorder";
  return "ok";
};

export default function SalesStock() {
  const [stockItems, setStockItems]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [filterLow, setFilterLow]           = useState(false);
  const [ledgerItem, setLedgerItem]         = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("__ALL__");
  const [categoryList, setCategoryList]     = useState([]);

  useEffect(() => {
    let unsubStock = null;

    getDocs(collection(db, "stockCategories")).then((catSnapshot) => {

      const thresholdMap = {};
      const cats = [];

      catSnapshot.docs.forEach((d) => {
        const cat = d.data();
        cats.push(cat.name);
        (cat.subcategories || []).forEach((sub) => {
          const key = (sub.name || "").trim().toLowerCase();
          if (key) thresholdMap[key] = {
            lowLevel:     sub.lowLevel     ?? 100,
            reorderLevel: sub.reorderLevel ?? 150,
            categoryName: cat.name,
          };
        });
      });

      cats.sort((a, b) => {
        const order = (n = "") => n.toUpperCase().includes("PIPE") ? 0 : n.toUpperCase().includes("FITTING") ? 1 : 2;
        return order(a) - order(b) || a.localeCompare(b);
      });
      setCategoryList(cats);

      unsubStock = onSnapshot(collection(db, "stock"), (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const item   = { id: d.id, ...d.data() };
          const key    = (item.description || "").trim().toLowerCase();
          const thresh = thresholdMap[key] || {};
          return {
            ...item,
            lowLevel:     item.lowLevel     ?? thresh.lowLevel     ?? 100,
            reorderLevel: item.reorderLevel ?? thresh.reorderLevel ?? 150,
            categoryName: thresh.categoryName ?? "Uncategorized",
          };
        });
        setStockItems(data);
        setLoading(false);
      });
    });

    return () => { if (unsubStock) unsubStock(); };
  }, []);

  const getItemStatus = (item) =>
    getStockStatus(item.available ?? 0, item.lowLevel ?? 100, item.reorderLevel ?? 150);

  // ✅ Cards now show correct counts
  const shortageCount  = stockItems.filter(s => getItemStatus(s) === "shortage").length;
  const lowCount       = stockItems.filter(s => getItemStatus(s) === "low").length;
  const reorderCount   = stockItems.filter(s => getItemStatus(s) === "reorder").length;
  const backorderCount = stockItems.filter(s => (s.backorder || 0) > 0).length;

  const filtered = useMemo(() => {
    return stockItems.filter(s => {
      const matchSearch =
        (s.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.productCode  || "").toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "__ALL__" || s.categoryName === categoryFilter;
      const matchAlert    = !filterLow || getItemStatus(s) !== "ok";
      return matchSearch && matchCategory && matchAlert;
    });
  }, [stockItems, search, filterLow, categoryFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Stock Management</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {loading ? "Loading..." : `${stockItems.length} total SKUs · Live stock levels`}
        </p>
      </div>

      {/* ✅ Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 uppercase font-bold">Total SKUs</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stockItems.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-400 uppercase font-bold">Shortage</p>
            <p className="text-2xl font-black text-red-600 mt-1">{shortageCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <p className="text-xs text-amber-500 uppercase font-bold">Low Stock</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{lowCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <p className="text-xs text-orange-400 uppercase font-bold">Reorder</p>
            <p className="text-2xl font-black text-orange-600 mt-1">{reorderCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4">
            <p className="text-xs text-emerald-500 uppercase font-bold">In Stock</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {stockItems.filter(s => getItemStatus(s) === "ok").length}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="px-5 py-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px] max-w-xs relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search description / part no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {/* ✅ Category Dropdown Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[160px]"
          >
            <option value="__ALL__">All Categories</option>
            {categoryList.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={() => setFilterLow(!filterLow)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
              filterLow
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600"
            }`}
          >
            <FiAlertCircle size={13} /> Alerts Only
          </button>
          <span className="ml-auto text-xs text-slate-400 font-medium">{filtered.length} results</span>
        </div>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader title="All Stock Items" subtitle="PO = stock increase, SO Invoice = stock decrease" />
        {loading ? (
          <div className="text-center py-16">
            <FiRefreshCw size={28} className="animate-spin mx-auto text-teal-500 mb-3" />
            <p className="text-sm text-slate-400">Fetching stock data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-5 py-3 text-left">No</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-center">Part No.</th>
                  <th className="px-4 py-3 text-center">HSN/SAC</th>
                  <th className="px-4 py-3 text-center">Available</th>
                  <th className="px-4 py-3 text-center">Reserved</th>
                  <th className="px-4 py-3 text-center">Backorder</th>
                  <th className="px-4 py-3 text-center">Unit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item, idx) => {
                  const avail        = Math.max(0, item.available ?? 0);
                  const backorder    = item.backorder || 0;
                  const status       = getItemStatus(item);
                  const hasBackorder = backorder > 0;

                  const rowBg =
                    status === "shortage" ? "bg-red-50/40"    :
                    hasBackorder          ? "bg-yellow-50/40" :
                    status === "low"      ? "bg-amber-50/30"  :
                    status === "reorder"  ? "bg-orange-50/20" : "";

                  const availColor =
                    status === "shortage" ? "text-red-500"    :
                    status === "low"      ? "text-amber-600"  :
                    status === "reorder"  ? "text-orange-500" :
                    "text-teal-600";

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${rowBg}`}>
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">{idx + 1}</td>
                      <td className="px-4 py-3.5 text-slate-800 font-medium max-w-xs truncate">{item.description || "—"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">
                          {item.productCode || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-500 font-mono">{item.hsnSac || "—"}</td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`font-black text-base ${availColor}`}>{avail}</span>
                      </td>

                      <td className="px-4 py-3.5 text-center text-amber-600 font-semibold">{item.reserved || 0}</td>

                      <td className="px-4 py-3.5 text-center">
                        {hasBackorder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
                            +{backorder}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center text-xs text-slate-400 uppercase">{item.unit || "nos"}</td>

                      <td className="px-4 py-3.5 text-center">
                        {status === "shortage" ? (
                          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">SHORTAGE</span>
                        ) : hasBackorder ? (
                          <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">BACKORDER</span>
                        ) : status === "low" ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded-full">LOW</span>
                        ) : status === "reorder" ? (
                          <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-full">REORDER</span>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">OK</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setLedgerItem(item)}
                          className="flex items-center gap-1 mx-auto text-teal-600 hover:text-teal-800 text-xs font-semibold bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <FiEye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-14 text-slate-400 text-sm">
                      {stockItems.length === 0
                        ? "No stock data yet. Upload a PO to add stock."
                        : "No items match your search"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ledger Modal */}
      {ledgerItem && (
        <Modal
          title={`Stock Ledger — ${ledgerItem.description || ledgerItem.productCode}`}
          onClose={() => setLedgerItem(null)}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Available", value: Math.max(0, ledgerItem.available ?? 0), color: (ledgerItem.available ?? 0) <= 0 ? "text-red-600" : "text-teal-600" },
                { label: "Reserved",  value: ledgerItem.reserved  || 0, color: "text-amber-600" },
                { label: "Backorder", value: ledgerItem.backorder || 0, color: (ledgerItem.backorder || 0) > 0 ? "text-yellow-600" : "text-slate-400" },
                { label: "Part No.",  value: ledgerItem.productCode || "—", color: "text-slate-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-lg p-3 text-center ${label === "Backorder" && (ledgerItem.backorder || 0) > 0 ? "bg-yellow-50 border border-yellow-200" : "bg-slate-50"}`}>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
                  <p className={`text-xl font-black mt-0.5 ${color} break-all`}>{value}</p>
                </div>
              ))}
            </div>

            {(ledgerItem.backorder || 0) > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-bold text-yellow-700">⚠️ Backorder: {ledgerItem.backorder} units</p>
                <p className="text-xs text-yellow-600 mt-0.5">Sales order exceeded available stock. {ledgerItem.backorder} units need to be procured via PO.</p>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <FiClock size={13} /> Movement History
              </p>
              {(ledgerItem.ledger || []).length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {[...(ledgerItem.ledger || [])].reverse().map((l, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${l.type === "IN" ? "bg-emerald-100" : "bg-red-100"}`}>
                        {l.type === "IN"
                          ? <FiArrowDown size={13} className="text-emerald-600" />
                          : <FiArrowUp   size={13} className="text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${l.type === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                            {l.type} {l.qty} units
                          </span>
                          <span className="text-[10px] text-slate-400">· Ref: {l.ref || "—"}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Balance: <span className="font-bold">{Math.max(0, l.balance)}</span> · By: {l.by || "—"}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        <div>{l.date ? new Date(l.date).toLocaleDateString("en-IN") : "—"}</div>
                        <div>{l.date ? new Date(l.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : ""}</div>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <FiClock size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No movement records found</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}