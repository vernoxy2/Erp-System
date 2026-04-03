// import React, { useState } from 'react';

// const VerificationReports = () => {
//   const [selectedReport, setSelectedReport] = useState(null);

//   const reports = [
//     {
//       id: 'VR-2026-001',
//       type: 'Random Sample',
//       date: '2026-08-15',
//       performedBy: 'Rajesh Kumar',
//       status: 'completed',
//       totalProducts: 252,
//       matched: 249,
//       mismatched: 3,
//       accuracy: 98.8,
//       products: [
//         { code: 'MS ANGLE', name: 'MS Angle 50x50x6mm', system: 450, physical: 445, variance: -5, status: 'mismatch' },
//         { code: 'GI BOLT', name: 'GI Bolt M12x100', system: 100, physical: 97, variance: -3, status: 'mismatch' },
//         { code: 'PPCH PIPE', name: 'PPCH Pipe 2 inch', system: 195, physical: 205, variance: 10, status: 'mismatch' }
//       ]
//     },
//     {
//       id: 'VR-2026-002',
//       type: 'Category Count',
//       date: '2026-08-10',
//       performedBy: 'Priya Sharma',
//       status: 'completed',
//       totalProducts: 85,
//       matched: 85,
//       mismatched: 0,
//       accuracy: 100,
//       products: []
//     },
//     {
//       id: 'VR-2026-003',
//       type: 'Full Count',
//       date: '2026-07-01',
//       performedBy: 'Admin User',
//       status: 'completed',
//       totalProducts: 1261,
//       matched: 1245,
//       mismatched: 16,
//       accuracy: 98.7,
//       products: []
//     }
//   ];

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h2 className="text-2xl font-black text-slate-800">
//             Verification Reports
//           </h2>
//           <p className="text-sm text-slate-500 mt-1">
//             View past physical stock verification reports
//           </p>
//         </div>
//       </div>

//       {/* Summary Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         <div className="bg-white border border-gray-200 rounded-lg p-5">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Total Verifications</p>
//               <p className="text-2xl font-bold text-gray-800">{reports.length}</p>
//             </div>
//             <div className="bg-indigo-100 p-3 rounded-full">
//               <span className="text-2xl">📋</span>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white border border-gray-200 rounded-lg p-5">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Average Accuracy</p>
//               <p className="text-2xl font-bold text-green-600">
//                 {(reports.reduce((sum, r) => sum + r.accuracy, 0) / reports.length).toFixed(1)}%
//               </p>
//             </div>
//             <div className="bg-green-100 p-3 rounded-full">
//               <span className="text-2xl">✓</span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Reports List */}
//       {!selectedReport && (
//         <div className="bg-white border border-gray-200 rounded-lg p-6">
//           <h2 className="text-xl font-semibold text-gray-800 mb-4">All Verification Reports</h2>
          
//           <div className="space-y-4">
//             {reports.map((report) => (
//               <div
//                 key={report.id}
//                 className="border border-gray-200 rounded-lg p-5 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
//                 onClick={() => setSelectedReport(report)}
//               >
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <h3 className="text-lg font-semibold text-gray-800 mb-2">{report.id}</h3>
//                     <div className="space-y-1">
//                       <p className="text-sm text-gray-600">Type: {report.type}</p>
//                       <p className="text-sm text-gray-600">Date: {report.date}</p>
//                       <p className="text-sm text-gray-600">Performed by: {report.performedBy}</p>
//                     </div>
//                   </div>

//                   <div>
//                     <div className="grid grid-cols-2 gap-3 mb-3">
//                       <div className="bg-gray-50 rounded-lg p-3">
//                         <p className="text-xs text-gray-600">Total</p>
//                         <p className="text-xl font-bold text-gray-800">{report.totalProducts}</p>
//                       </div>
//                       <div className="bg-green-50 rounded-lg p-3">
//                         <p className="text-xs text-green-700">Matched</p>
//                         <p className="text-xl font-bold text-green-800">{report.matched}</p>
//                       </div>
//                     </div>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div className="bg-red-50 rounded-lg p-3">
//                         <p className="text-xs text-red-700">Mismatched</p>
//                         <p className="text-xl font-bold text-red-800">{report.mismatched}</p>
//                       </div>
//                       <div className="bg-blue-50 rounded-lg p-3">
//                         <p className="text-xs text-blue-700">Accuracy</p>
//                         <p className="text-xl font-bold text-blue-800">{report.accuracy}%</p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="mt-4 pt-4 border-t border-gray-200">
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       setSelectedReport(report);
//                     }}
//                     className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
//                   >
//                     View Full Report →
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Report Detail View */}
//       {selectedReport && (
//         <div className="space-y-6">
//           {/* Back Button */}
//           <button
//             onClick={() => setSelectedReport(null)}
//             className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2"
//           >
//             <span>←</span>
//             <span>Back to Reports</span>
//           </button>

//           {/* Report Header */}
//           <div className="bg-white border border-gray-200 rounded-lg p-6">
//             <div className="flex items-center justify-between mb-6">
//               <div>
//                 <h2 className="text-2xl font-bold text-gray-800">{selectedReport.id}</h2>
//                 <p className="text-gray-600 mt-1">{selectedReport.type}</p>
//               </div>
//               <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
//                 COMPLETED
//               </span>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-3">
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Date:</span>
//                   <span className="font-semibold text-gray-800">{selectedReport.date}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Performed By:</span>
//                   <span className="font-semibold text-gray-800">{selectedReport.performedBy}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Total Products:</span>
//                   <span className="font-semibold text-gray-800">{selectedReport.totalProducts}</span>
//                 </div>
//               </div>

//               <div className="space-y-3">
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Matched:</span>
//                   <span className="font-semibold text-green-600">{selectedReport.matched}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Mismatched:</span>
//                   <span className="font-semibold text-red-600">{selectedReport.mismatched}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Accuracy:</span>
//                   <span className="font-semibold text-blue-600">{selectedReport.accuracy}%</span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Mismatches */}
//           {selectedReport.products.length > 0 && (
//             <div className="bg-white border border-gray-200 rounded-lg p-6">
//               <h3 className="text-xl font-semibold text-gray-800 mb-4">
//                 Mismatched Products ({selectedReport.mismatched})
//               </h3>

//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead>
//                     <tr className="bg-gray-50 border-b border-gray-200">
//                       <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
//                       <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">System Stock</th>
//                       <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Physical Count</th>
//                       <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Variance</th>
//                       <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {selectedReport.products.map((product, index) => (
//                       <tr key={index} className="border-b border-gray-100">
//                         <td className="px-4 py-3">
//                           <div className="font-medium text-gray-800">{product.code}</div>
//                           <div className="text-sm text-gray-600">{product.name}</div>
//                         </td>
//                         <td className="px-4 py-3 text-right text-gray-800">{product.system}</td>
//                         <td className="px-4 py-3 text-right text-gray-800">{product.physical}</td>
//                         <td className="px-4 py-3 text-right">
//                           <span className={product.variance < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
//                             {product.variance > 0 ? '+' : ''}{product.variance}
//                           </span>
//                         </td>
//                         <td className="px-4 py-3 text-center">
//                           <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
//                             MISMATCH
//                           </span>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="mt-6 pt-6 border-t border-gray-200">
//                 <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
//                   Create Adjustment from This Report
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* No Mismatches */}
//           {selectedReport.products.length === 0 && selectedReport.mismatched === 0 && (
//             <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
//               <div className="text-6xl mb-4">✅</div>
//               <h3 className="text-xl font-semibold text-green-800 mb-2">Perfect Match!</h3>
//               <p className="text-green-700">All products matched the system stock. No adjustments needed.</p>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default VerificationReports;

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

const VerificationReports = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Fetch reports from Firebase ──
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "stockVerifications"),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(data);
    } catch (err) {
      console.error("Error fetching verification reports:", err);
    }
    setLoading(false);
  };

  // ── Navigate to ManualStockAdjustment with mismatched products ──
  const handleCreateAdjustment = (report) => {
    // Build the prefill payload expected by ManualStockAdjustment
    const prefillProducts = (report.products || [])
      .filter((p) => p.status === "mismatch" || p.variance !== 0)
      .map((p) => ({
        productCode: p.code || p.productCode || "",
        productName: p.name || p.productName || "",
        systemStock: p.system ?? p.systemStock ?? 0,
        physicalCount: p.physical ?? p.physicalCount ?? 0,
        adjustQty: (p.physical ?? p.physicalCount ?? 0) - (p.system ?? p.systemStock ?? 0),
        unit: p.unit || "KG",
        category: "Physical Verification Mismatch",
        reason: `Verification Report ${report.id || report.docId} — Physical count mismatch`,
      }));

    navigate("/stock-audit/manual-adjustment", {
      state: {
        fromVerification: true,
        verificationId: report.id || report.docId,
        prefillProducts,
      },
    });
  };

  // ── Helpers ──
  const formatDate = (val) => {
    if (!val) return "—";
    if (val?.toDate) return val.toDate().toISOString().split("T")[0];
    return String(val).split("T")[0];
  };

  const avgAccuracy =
    reports.length > 0
      ? (reports.reduce((s, r) => s + (r.accuracy ?? 0), 0) / reports.length).toFixed(1)
      : "—";

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading verification reports...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Verification Reports</h2>
          <p className="text-sm text-slate-500 mt-1">
            View past physical stock verification reports
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Verifications</p>
              <p className="text-2xl font-bold text-gray-800">{reports.length}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Accuracy</p>
              <p className="text-2xl font-bold text-green-600">{avgAccuracy}%</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-xl text-green-700 font-bold">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {reports.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 font-medium">No verification reports found</p>
          <p className="text-gray-400 text-sm mt-1">
            Run a stock verification first to see reports here.
          </p>
        </div>
      )}

      {/* ── Reports List ── */}
      {!selectedReport && reports.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">All Verification Reports</h2>

          <div className="space-y-4">
            {reports.map((report) => {
              const mismatched = report.mismatched ?? 0;
              const matched = report.matched ?? 0;
              const total = report.totalProducts ?? report.total ?? 0;
              const accuracy = report.accuracy ?? 0;

              return (
                <div
                  key={report.id}
                  className="border border-gray-200 rounded-lg p-5 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {report.docId || report.id}
                      </h3>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">Type: {report.type || "—"}</p>
                        <p className="text-sm text-gray-600">Date: {formatDate(report.date)}</p>
                        <p className="text-sm text-gray-600">
                          Performed by: {report.performedBy || "—"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600">Total</p>
                          <p className="text-xl font-bold text-gray-800">{total}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-green-700">Matched</p>
                          <p className="text-xl font-bold text-green-800">{matched}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-xs text-red-700">Mismatched</p>
                          <p className="text-xl font-bold text-red-800">{mismatched}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-blue-700">Accuracy</p>
                          <p className="text-xl font-bold text-blue-800">{accuracy}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(report);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      View Full Report →
                    </button>

                    {/* Quick action: only show if mismatches exist */}
                    {mismatched > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateAdjustment(report);
                        }}
                        className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        + Create Adjustment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Report Detail View ── */}
      {selectedReport && (
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedReport(null)}
            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Reports</span>
          </button>

          {/* Report Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedReport.docId || selectedReport.id}
                </h2>
                <p className="text-gray-600 mt-1">{selectedReport.type}</p>
              </div>
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                COMPLETED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(selectedReport.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Performed By:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedReport.performedBy || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Products:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedReport.totalProducts ?? selectedReport.total ?? 0}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Matched:</span>
                  <span className="font-semibold text-green-600">
                    {selectedReport.matched ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mismatched:</span>
                  <span className="font-semibold text-red-600">
                    {selectedReport.mismatched ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="font-semibold text-blue-600">
                    {selectedReport.accuracy ?? 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mismatches Table */}
          {(selectedReport.products || []).filter(
            (p) => p.status === "mismatch" || p.variance !== 0
          ).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Mismatched Products ({selectedReport.mismatched ?? 0})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Product
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        System Stock
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        Physical Count
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        Variance
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.products || [])
                      .filter((p) => p.status === "mismatch" || p.variance !== 0)
                      .map((product, index) => {
                        const system = product.system ?? product.systemStock ?? 0;
                        const physical = product.physical ?? product.physicalCount ?? 0;
                        const variance = product.variance ?? physical - system;
                        return (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800">
                                {product.code || product.productCode}
                              </div>
                              <div className="text-sm text-gray-600">
                                {product.name || product.productName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-800">{system}</td>
                            <td className="px-4 py-3 text-right text-gray-800">{physical}</td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={
                                  variance < 0
                                    ? "text-red-600 font-semibold"
                                    : "text-green-600 font-semibold"
                                }
                              >
                                {variance > 0 ? "+" : ""}
                                {variance}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                MISMATCH
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* ── Create Adjustment Button ── */}
              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Mismatched products will be auto-filled in the adjustment form.
                </p>
                <button
                  onClick={() => handleCreateAdjustment(selectedReport)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Create Adjustment from This Report →
                </button>
              </div>
            </div>
          )}

          {/* No Mismatches */}
          {(selectedReport.mismatched ?? 0) === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">Perfect Match!</h3>
              <p className="text-green-700">
                All products matched the system stock. No adjustments needed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationReports;