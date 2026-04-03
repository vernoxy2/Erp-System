// import React, { useState, useEffect } from "react";
// import * as XLSX from "xlsx";
// import { db } from "../../../firebase";
// import { collection, getDocs, orderBy, query } from "firebase/firestore";

// const AdjustmentHistory = () => {
//   const [adjustments, setAdjustments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [dateFilter, setDateFilter] = useState("all");
//   const [typeFilter, setTypeFilter] = useState("all");
//   const [selectedAdj, setSelectedAdj] = useState(null);

//   useEffect(() => {
//     fetchAdjustments();
//   }, []);

//   const fetchAdjustments = async () => {
//     setLoading(true);
//     try {
//       const q = query(
//         collection(db, "stockAdjustments"),
//         orderBy("createdAt", "desc")
//       );
//       const snap = await getDocs(q);
//       const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//       setAdjustments(data);
//     } catch (err) {
//       console.error("Error fetching adjustments:", err);
//     }
//     setLoading(false);
//   };

//   // ── Helpers ──
//   const formatDate = (ts) => {
//     if (!ts) return "—";
//     const d = ts.toDate ? ts.toDate() : new Date(ts);
//     return d.toISOString().split("T")[0];
//   };

//   const getTypeLabel = (type) => {
//     if (!type) return "Single";
//     return type.toLowerCase().includes("bulk") ? "Bulk" : "Single";
//   };

//   // ── Stats ──
//   const now = new Date();
//   const thisMonthCount = adjustments.filter((adj) => {
//     const d = adj.createdAt?.toDate ? adj.createdAt.toDate() : new Date(adj.createdAt);
//     return (
//       d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
//     );
//   }).length;

//   const statusCounts = {
//     approved: adjustments.filter((a) => a.status === "approved").length,
//     pending: adjustments.filter((a) => a.status === "pending").length,
//     rejected: adjustments.filter((a) => a.status === "rejected").length,
//   };

//   // ── Filtering ──
//   const filtered = adjustments.filter((adj) => {
//     if (statusFilter !== "all" && adj.status !== statusFilter) return false;
//     if (dateFilter !== "all") {
//       const d = adj.createdAt?.toDate ? adj.createdAt.toDate() : new Date(adj.createdAt);
//       if (dateFilter === "thisMonth") {
//         if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())
//           return false;
//       } else if (dateFilter === "last7") {
//         const diff = (now - d) / (1000 * 60 * 60 * 24);
//         if (diff > 7) return false;
//       } else if (dateFilter === "last30") {
//         const diff = (now - d) / (1000 * 60 * 60 * 24);
//         if (diff > 30) return false;
//       }
//     }
//     if (typeFilter !== "all" && getTypeLabel(adj.type).toLowerCase() !== typeFilter) return false;
//     return true;
//   });

//   // ── Export ──
//   const exportToExcel = () => {
//     const rows = filtered.map((adj) => ({
//       ID: adj.docId || adj.id,
//       Date: formatDate(adj.createdAt),
//       Type: getTypeLabel(adj.type),
//       "Requested By": adj.requestedBy || "—",
//       "Requested By Role": adj.requestedByRole || "—",
//       Products: adj.totalProducts || 0,
//       Status: (adj.status || "pending").toUpperCase(),
//     }));
//     const ws = XLSX.utils.json_to_sheet(rows);
//     ws["!cols"] = [
//       { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
//       { wch: 18 }, { wch: 10 }, { wch: 12 },
//     ];
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Adjustment History");
//     XLSX.writeFile(wb, "Adjustment_History.xlsx");
//   };

//   // ── Status badge ──
//   const StatusBadge = ({ status }) => {
//     const map = {
//       approved: "bg-green-100 text-green-700",
//       pending: "bg-yellow-100 text-yellow-700",
//       rejected: "bg-red-100 text-red-700",
//     };
//     return (
//       <span
//         className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
//           map[status] || "bg-gray-100 text-gray-600"
//         }`}
//       >
//         {status || "pending"}
//       </span>
//     );
//   };

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       {/* ── Header ── */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800">Adjustment History</h2>
//           <p className="text-sm text-slate-500 mt-1">
//             All manual & bulk stock adjustment records
//           </p>
//         </div>
//         <button
//           onClick={fetchAdjustments}
//           className="text-sm text-indigo-600 hover:underline font-medium"
//         >
//           ↻ Refresh
//         </button>
//       </div>

//       {/* ── Summary Cards ── */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
//         {[
//           { label: "Total Adjustments", value: adjustments.length, color: "indigo", icon: "📋" },
//           { label: "This Month", value: thisMonthCount, color: "blue", icon: "🗓️" },
//           { label: "Approved", value: statusCounts.approved, color: "green", icon: "✅" },
//           { label: "Pending", value: statusCounts.pending, color: "yellow", icon: "⏳" },
//         ].map((card) => (
//           <div
//             key={card.label}
//             className="bg-white border border-gray-200 rounded-lg p-5"
//           >
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">{card.label}</p>
//                 <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
//               </div>
//               <span className="text-2xl">{card.icon}</span>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* ── Filters ── */}
//       <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
//         <h3 className="text-sm font-semibold text-gray-700 mb-4">Filters</h3>
//         <div className="flex flex-wrap items-center gap-6">
//           {/* Status Filter */}
//           <div>
//             <p className="text-xs text-gray-500 mb-2 font-medium">Status</p>
//             <div className="flex flex-wrap gap-2">
//               {[
//                 { key: "all", label: `All (${adjustments.length})` },
//                 { key: "approved", label: `Approved (${statusCounts.approved})` },
//                 { key: "pending", label: `Pending (${statusCounts.pending})` },
//                 { key: "rejected", label: `Rejected (${statusCounts.rejected})` },
//               ].map((btn) => (
//                 <button
//                   key={btn.key}
//                   onClick={() => setStatusFilter(btn.key)}
//                   className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
//                     statusFilter === btn.key
//                       ? "bg-indigo-600 text-white border-indigo-600"
//                       : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
//                   }`}
//                 >
//                   {btn.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Right-side dropdowns */}
//           <div className="ml-auto flex items-end gap-3 flex-wrap">
//             {/* Type Filter */}
//             <div>
//               <p className="text-xs text-gray-500 mb-2 font-medium">Type</p>
//               <select
//                 value={typeFilter}
//                 onChange={(e) => setTypeFilter(e.target.value)}
//                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[130px]"
//               >
//                 <option value="all">All Types</option>
//                 <option value="single">Single</option>
//                 <option value="bulk">Bulk</option>
//               </select>
//             </div>

//             {/* Date Range Filter */}
//             <div>
//               <p className="text-xs text-gray-500 mb-2 font-medium">Date Range</p>
//               <select
//                 value={dateFilter}
//                 onChange={(e) => setDateFilter(e.target.value)}
//                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[140px]"
//               >
//                 <option value="all">All Time</option>
//                 <option value="thisMonth">This Month</option>
//                 <option value="last7">Last 7 Days</option>
//                 <option value="last30">Last 30 Days</option>
//               </select>
//             </div>

//             {/* Reset */}
//             {(statusFilter !== "all" || typeFilter !== "all" || dateFilter !== "all") && (
//               <div>
//                 <p className="text-xs text-transparent mb-2">x</p>
//                 <button
//                   onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setDateFilter("all"); }}
//                   className="px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
//                 >
//                   ✕ Reset
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ── Table ── */}
//       <div className="bg-white border border-gray-200 rounded-lg p-6">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-lg font-semibold text-gray-800">
//             Adjustments ({filtered.length})
//           </h3>
//           <button
//             onClick={exportToExcel}
//             className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
//           >
//             Export to Excel
//           </button>
//         </div>

//         {loading ? (
//           <div className="text-center py-16">
//             <div className="text-3xl mb-3 animate-pulse">🔄</div>
//             <p className="text-gray-400 text-sm">Loading adjustments...</p>
//           </div>
//         ) : filtered.length === 0 ? (
//           <div className="text-center py-16">
//             <div className="text-4xl mb-3">📭</div>
//             <p className="text-gray-500 font-medium">No adjustments found</p>
//             <p className="text-gray-400 text-sm mt-1">
//               Try changing your filters or create a new adjustment
//             </p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-200">
//                   {["ID", "Date", "Type", "Requested By", "Products", "Status", "Action"].map(
//                     (col) => (
//                       <th
//                         key={col}
//                         className={`px-4 py-3 text-sm font-semibold text-gray-700 ${
//                           ["Products"].includes(col) ? "text-right" : 
//                           ["Status", "Action"].includes(col) ? "text-center" : "text-left"
//                         }`}
//                       >
//                         {col}
//                       </th>
//                     )
//                   )}
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.map((adj, i) => (
//                   <tr
//                     key={i}
//                     className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
//                   >
//                     {/* ID */}
//                     <td className="px-4 py-3">
//                       <button
//                         onClick={() => setSelectedAdj(adj)}
//                         className="text-indigo-600 font-medium text-sm hover:underline"
//                       >
//                         {adj.docId || adj.id?.slice(0, 12) + "..."}
//                       </button>
//                     </td>

//                     {/* Date */}
//                     <td className="px-4 py-3 text-sm text-gray-700">
//                       {formatDate(adj.createdAt)}
//                     </td>

//                     {/* Type */}
//                     <td className="px-4 py-3">
//                       <span
//                         className={`px-2 py-0.5 rounded text-xs font-semibold ${
//                           getTypeLabel(adj.type) === "Bulk"
//                             ? "bg-purple-100 text-purple-700"
//                             : "bg-blue-100 text-blue-700"
//                         }`}
//                       >
//                         {getTypeLabel(adj.type)}
//                       </span>
//                     </td>

//                     {/* Requested By */}
//                     <td className="px-4 py-3 text-sm text-gray-700">
//                       {adj.requestedBy || "—"}
//                     </td>

//                     {/* Products */}
//                     <td className="px-4 py-3 text-right text-sm text-gray-700 font-medium">
//                       {adj.totalProducts || (adj.products?.length ?? 0)}
//                     </td>

//                     {/* Status */}
//                     <td className="px-4 py-3 text-center">
//                       <StatusBadge status={adj.status} />
//                     </td>

//                     {/* Action */}
//                     <td className="px-4 py-3 text-center">
//                       <button
//                         onClick={() => setSelectedAdj(adj)}
//                         className="text-indigo-600 text-sm hover:underline font-medium"
//                       >
//                         View
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* ── Detail Modal ── */}
//       {selectedAdj && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
//             {/* Modal Header */}
//             <div className="flex items-start justify-between p-6 border-b border-gray-200">
//               <div>
//                 <h2 className="text-lg font-bold text-gray-800">
//                   {selectedAdj.docId || selectedAdj.id}
//                 </h2>
//                 <div className="flex items-center gap-3 mt-1">
//                   <span className="text-xs text-gray-400">
//                     {formatDate(selectedAdj.createdAt)}
//                   </span>
//                   <span className="text-xs text-gray-400">·</span>
//                   <span className="text-xs text-gray-500">
//                     {selectedAdj.requestedBy}
//                   </span>
//                   <span className="text-xs text-gray-400">·</span>
//                   <span
//                     className={`text-xs font-semibold px-2 py-0.5 rounded ${
//                       getTypeLabel(selectedAdj.type) === "Bulk"
//                         ? "bg-purple-100 text-purple-700"
//                         : "bg-blue-100 text-blue-700"
//                     }`}
//                   >
//                     {getTypeLabel(selectedAdj.type)}
//                   </span>
//                   <StatusBadge status={selectedAdj.status} />
//                 </div>
//               </div>
//               <button
//                 onClick={() => setSelectedAdj(null)}
//                 className="text-gray-400 hover:text-gray-700 text-2xl leading-none ml-4"
//               >
//                 ×
//               </button>
//             </div>

//             {/* Modal Body */}
//             <div className="overflow-y-auto p-6">
//               {(!selectedAdj.products || selectedAdj.products.length === 0) ? (
//                 <p className="text-center text-gray-400 py-8">No product details available</p>
//               ) : (
//                 <div className="overflow-x-auto rounded-lg border border-gray-200">
//                   <table className="w-full text-sm">
//                     <thead>
//                       <tr className="bg-gray-50 border-b border-gray-200">
//                         {["Product", "System Stock", "Adj Qty", "New Total", "Category", "Reason"].map(
//                           (h) => (
//                             <th
//                               key={h}
//                               className={`px-3 py-2.5 text-xs font-semibold text-gray-600 ${
//                                 ["System Stock", "Adj Qty", "New Total"].includes(h)
//                                   ? "text-right"
//                                   : "text-left"
//                               }`}
//                             >
//                               {h}
//                             </th>
//                           )
//                         )}
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {selectedAdj.products.map((p, i) => {
//                         const adjQty = p.adjustQty ?? p.adjustment ?? 0;
//                         return (
//                           <tr
//                             key={i}
//                             className="border-b border-gray-100 hover:bg-gray-50"
//                           >
//                             <td className="px-3 py-2.5">
//                               <div className="font-medium text-gray-800 text-xs">
//                                 {p.productCode}
//                               </div>
//                               <div className="text-xs text-gray-500 truncate max-w-[180px]">
//                                 {p.productName}
//                               </div>
//                             </td>
//                             <td className="px-3 py-2.5 text-right text-xs text-gray-700">
//                               {p.systemStock} {p.unit}
//                             </td>
//                             <td className="px-3 py-2.5 text-right">
//                               <span
//                                 className={`text-xs font-semibold ${
//                                   adjQty > 0
//                                     ? "text-green-600"
//                                     : adjQty < 0
//                                     ? "text-red-600"
//                                     : "text-gray-400"
//                                 }`}
//                               >
//                                 {adjQty > 0 ? "+" : ""}
//                                 {adjQty} {p.unit}
//                               </span>
//                             </td>
//                             <td className="px-3 py-2.5 text-right text-xs font-bold text-indigo-700">
//                               {p.newTotal} {p.unit}
//                             </td>
//                             <td className="px-3 py-2.5 text-xs text-gray-500">
//                               {p.category || "—"}
//                             </td>
//                             <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[160px] truncate">
//                               {p.reason || "—"}
//                             </td>
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 </div>
//               )}
//             </div>

//             {/* Modal Footer */}
//             <div className="p-4 border-t border-gray-200 flex justify-end">
//               <button
//                 onClick={() => setSelectedAdj(null)}
//                 className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdjustmentHistory; 


import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { db } from "../../../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

const AdjustmentHistory = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedAdj, setSelectedAdj] = useState(null);

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "stockAdjustments"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAdjustments(data);
    } catch (err) {
      console.error("Error fetching adjustments:", err);
    }
    setLoading(false);
  };

  // ── Helpers ──
  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toISOString().split("T")[0];
  };

  const getTypeLabel = (type) => {
    if (!type) return "Single";
    return type.toLowerCase().includes("bulk") ? "Bulk" : "Single";
  };

  // ── Stats ──
  const now = new Date();
  const thisMonthCount = adjustments.filter((adj) => {
    const d = adj.createdAt?.toDate ? adj.createdAt.toDate() : new Date(adj.createdAt);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const statusCounts = {
    approved: adjustments.filter((a) => a.status === "approved").length,
    pending: adjustments.filter((a) => a.status === "pending").length,
    rejected: adjustments.filter((a) => a.status === "rejected").length,
  };

  // ── Filtering ──
  const filtered = adjustments.filter((adj) => {
    if (statusFilter !== "all" && adj.status !== statusFilter) return false;
    if (dateFilter !== "all") {
      const d = adj.createdAt?.toDate ? adj.createdAt.toDate() : new Date(adj.createdAt);
      if (dateFilter === "thisMonth") {
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())
          return false;
      } else if (dateFilter === "last7") {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        if (diff > 7) return false;
      } else if (dateFilter === "last30") {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        if (diff > 30) return false;
      }
    }
    if (typeFilter !== "all" && getTypeLabel(adj.type).toLowerCase() !== typeFilter) return false;
    return true;
  });

  // ── Export ──
  const exportToExcel = () => {
    const rows = filtered.map((adj) => ({
      ID: adj.docId || adj.id,
      Date: formatDate(adj.createdAt),
      Type: getTypeLabel(adj.type),
      "Requested By": adj.requestedBy || "—",
      "Requested By Role": adj.requestedByRole || "—",
      Products: adj.totalProducts || 0,
      Status: (adj.status || "pending").toUpperCase(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
      { wch: 18 }, { wch: 10 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Adjustment History");
    XLSX.writeFile(wb, "Adjustment_History.xlsx");
  };

  // ── Status badge ──
  const StatusBadge = ({ status }) => {
    const map = {
      approved: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
          map[status] || "bg-gray-100 text-gray-600"
        }`}
      >
        {status || "pending"}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Adjustment History</h2>
          <p className="text-sm text-slate-500 mt-1">
            All manual & bulk stock adjustment records
          </p>
        </div>
        <button
          onClick={fetchAdjustments}
          className="text-sm text-indigo-600 hover:underline font-medium"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Adjustments", value: adjustments.length, color: "indigo", icon: "📋" },
          { label: "This Month", value: thisMonthCount, color: "blue", icon: "🗓️" },
          { label: "Approved", value: statusCounts.approved, color: "green", icon: "✅" },
          { label: "Pending", value: statusCounts.pending, color: "yellow", icon: "⏳" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-lg p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">

          {/* Status */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Status</p>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[160px]"
            >
              <option value="all">All ({adjustments.length})</option>
              <option value="approved">Approved ({statusCounts.approved})</option>
              <option value="pending">Pending ({statusCounts.pending})</option>
              <option value="rejected">Rejected ({statusCounts.rejected})</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Type</p>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[140px]"
            >
              <option value="all">All Types</option>
              <option value="single">Single</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Date Range</p>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[150px]"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
            </select>
          </div>

          {/* Reset — only when any filter active */}
          {(statusFilter !== "all" || typeFilter !== "all" || dateFilter !== "all") && (
            <div>
              <p className="text-xs text-transparent mb-2">–</p>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDateFilter("all");
                }}
                className="px-4 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                ✕ Reset Filters
              </button>
            </div>
          )}

          {/* Active filter count badge */}
          {(statusFilter !== "all" || typeFilter !== "all" || dateFilter !== "all") && (
            <div className="ml-auto self-end pb-0.5">
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                Showing {filtered.length} of {adjustments.length} records
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Adjustments ({filtered.length})
          </h3>
          <button
            onClick={exportToExcel}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Export to Excel
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3 animate-pulse">🔄</div>
            <p className="text-gray-400 text-sm">Loading adjustments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">No adjustments found</p>
            <p className="text-gray-400 text-sm mt-1">
              Try changing your filters or create a new adjustment
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["ID", "Date", "Type", "Requested By", "Products", "Status", "Action"].map(
                    (col) => (
                      <th
                        key={col}
                        className={`px-4 py-3 text-sm font-semibold text-gray-700 ${
                          ["Products"].includes(col) ? "text-right" : 
                          ["Status", "Action"].includes(col) ? "text-center" : "text-left"
                        }`}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((adj, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedAdj(adj)}
                        className="text-indigo-600 font-medium text-sm hover:underline"
                      >
                        {adj.docId || adj.id?.slice(0, 12) + "..."}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(adj.createdAt)}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          getTypeLabel(adj.type) === "Bulk"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {getTypeLabel(adj.type)}
                      </span>
                    </td>

                    {/* Requested By */}
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {adj.requestedBy || "—"}
                    </td>

                    {/* Products */}
                    <td className="px-4 py-3 text-right text-sm text-gray-700 font-medium">
                      {adj.totalProducts || (adj.products?.length ?? 0)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={adj.status} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedAdj(adj)}
                        className="text-indigo-600 text-sm hover:underline font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedAdj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {selectedAdj.docId || selectedAdj.id}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">
                    {formatDate(selectedAdj.createdAt)}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">
                    {selectedAdj.requestedBy}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      getTypeLabel(selectedAdj.type) === "Bulk"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {getTypeLabel(selectedAdj.type)}
                  </span>
                  <StatusBadge status={selectedAdj.status} />
                </div>
              </div>
              <button
                onClick={() => setSelectedAdj(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none ml-4"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6">
              {(!selectedAdj.products || selectedAdj.products.length === 0) ? (
                <p className="text-center text-gray-400 py-8">No product details available</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {["Product", "System Stock", "Adj Qty", "New Total", "Category", "Reason"].map(
                          (h) => (
                            <th
                              key={h}
                              className={`px-3 py-2.5 text-xs font-semibold text-gray-600 ${
                                ["System Stock", "Adj Qty", "New Total"].includes(h)
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAdj.products.map((p, i) => {
                        const adjQty = p.adjustQty ?? p.adjustment ?? 0;
                        return (
                          <tr
                            key={i}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-gray-800 text-xs">
                                {p.productCode}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-[180px]">
                                {p.productName}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-gray-700">
                              {p.systemStock} {p.unit}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span
                                className={`text-xs font-semibold ${
                                  adjQty > 0
                                    ? "text-green-600"
                                    : adjQty < 0
                                    ? "text-red-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {adjQty > 0 ? "+" : ""}
                                {adjQty} {p.unit}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs font-bold text-indigo-700">
                              {p.newTotal} {p.unit}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-500">
                              {p.category || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[160px] truncate">
                              {p.reason || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedAdj(null)}
                className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdjustmentHistory;