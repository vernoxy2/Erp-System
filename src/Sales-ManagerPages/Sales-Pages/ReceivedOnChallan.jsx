// import React, { useEffect, useState } from "react";
// import { collection, getDocs } from "firebase/firestore";
// import { db } from "../../firebase";
// import {
//   FiAlertTriangle, FiPackage, FiChevronRight,
//   FiArrowLeft, FiCalendar, FiTruck, FiFileText,
// } from "react-icons/fi";

// const ISSUE_COLORS = {
//   damage:     { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    label: "Damage"     },
//   shortage:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", label: "Shortage"   },
//   excess:     { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   label: "Excess"     },
//   quality:    { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", label: "Quality"    },
//   wrong_item: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", label: "Wrong Item" },
//   other:      { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-500",   label: "Other"      },
// };

// const getIssueStyle = (issue) => ISSUE_COLORS[issue?.toLowerCase()] || ISSUE_COLORS.other;

// const IssueBadge = ({ issue }) => {
//   const s = getIssueStyle(issue);
//   return (
//     <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
//       <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
//       {s.label}
//     </span>
//   );
// };

// const StatusBadge = ({ status }) => {
//   const map = {
//     partial:  "bg-orange-100 text-orange-700",
//     received: "bg-green-100 text-green-700",
//     excess:   "bg-blue-100 text-blue-700",
//     ordered:  "bg-gray-100 text-gray-600",
//   };
//   return (
//     <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${map[status?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
//       {status || "—"}
//     </span>
//   );
// };

// const InfoField = ({ label, value, highlight }) => (
//   <div className="flex flex-col">
//     <span className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">{label}</span>
//     <span className={`font-semibold text-sm ${highlight ? "text-indigo-700" : "text-gray-800"}`}>
//       {value || "—"}
//     </span>
//   </div>
// );

// // ─── Detail View ─────────────────────────────────────────────────────────────

// const ChallanDetail = ({ challan, onBack }) => {
//   const { excelHeader, poStatus, totalItems, totalReceivedQty, items = [] } = challan;
//   const issueItems = items.filter((i) => i.issue && i.issue !== "none" && i.issue !== "");
//   const okItems    = items.filter((i) => !i.issue || i.issue === "none" || i.issue === "");

//   return (
//     <div className="p-6 max-w-6xl mx-auto">
//       <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
//         <FiArrowLeft /> Back to list
//       </button>

//       {/* ── Challan Information Card ── */}
//       <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
//         <div className="flex items-center gap-3 mb-5">
//           <h2 className="text-xl font-bold text-gray-800">{excelHeader?.reference || "—"}</h2>
//           <StatusBadge status={poStatus} />
//         </div>

//         {/* 6 fields grid */}
//         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-4 border-t border-gray-100 pt-5">
//           <InfoField label="Challan No"        value={excelHeader?.reference} />
//           <InfoField label="Vendor Challan No" value={excelHeader?.voucherNo} />
//           <InfoField label="Challan Date"      value={excelHeader?.dated} />
//           <InfoField label="Linked Invoice"    value={excelHeader?.reference}  highlight />
//           <InfoField label="Linked PO"         value={excelHeader?.voucherNo}  highlight />
//           <InfoField label="Supplier"          value={excelHeader?.supplier} />
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-4 mt-4">
//           <InfoField label="Total Items"        value={String(totalItems ?? "—")} />
//           <InfoField label="Total Received Qty" value={String(totalReceivedQty ?? "—")} />
//         </div>
//       </div>

//       {/* Issue Items */}
//       {issueItems.length > 0 && (
//         <div className="mb-6">
//           <div className="flex items-center gap-2 mb-3">
//             <FiAlertTriangle className="text-red-500" />
//             <h3 className="font-semibold text-gray-800">Issue Items ({issueItems.length})</h3>
//           </div>
//           <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="bg-red-50 text-left text-xs uppercase tracking-wide text-gray-500">
//                   <th className="px-4 py-3">Product</th>
//                   <th className="px-4 py-3">Part No</th>
//                   <th className="px-4 py-3 text-center">Ordered</th>
//                   <th className="px-4 py-3 text-center">Invoice Qty</th>
//                   <th className="px-4 py-3 text-center">Physical</th>
//                   <th className="px-4 py-3 text-center">Damaged / Short</th>
//                   <th className="px-4 py-3 text-center">Issue</th>
//                   <th className="px-4 py-3">Details</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {issueItems.map((item, idx) => (
//                   <tr key={idx} className="hover:bg-red-50/40 transition-colors">
//                     <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px]">{item.description}</td>
//                     <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.productCode}</td>
//                     <td className="px-4 py-3 text-center text-gray-700">{item.orderedQty}</td>
//                     <td className="px-4 py-3 text-center text-gray-700">{item.quantity || item.orderedQty}</td>
//                     <td className="px-4 py-3 text-center font-semibold text-green-700">{item.physicalQty}</td>
//                     <td className="px-4 py-3 text-center font-semibold text-red-600">
//                       {item.damagedQty > 0
//                         ? item.damagedQty
//                         : item.shortage > 0
//                           ? item.shortage
//                           : (item.orderedQty - item.physicalQty) > 0
//                             ? (item.orderedQty - item.physicalQty)
//                             : "—"}
//                     </td>
//                     <td className="px-4 py-3 text-center"><IssueBadge issue={item.issue} /></td>
//                     <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">{item.issueDetail || "—"}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

    
//     </div>
//   );
// };

// // ─── List View ────────────────────────────────────────────────────────────────

// const ReceivedOnChallan = () => {
//   const [challans, setChallans]        = useState([]);
//   const [loading, setLoading]          = useState(true);
//   const [selectedChallan, setSelected] = useState(null);
//   const [filter, setFilter]            = useState("issues");
//   const [search, setSearch]            = useState("");

//   useEffect(() => {
//     const fetchChallans = async () => {
//       try {
//         const snap = await getDocs(collection(db, "excelupload"));
//         const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
//         const received = data.filter((d) => d.storeQcStatus === "approved" || d.receivedAt);
//         setChallans(received);
//       } catch (err) {
//         console.error("Error fetching challans:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchChallans();
//   }, []);

//   const getIssueCount = (challan) =>
//     (challan.items || []).filter((i) => i.issue && i.issue !== "none" && i.issue !== "").length;

//   const getIssueTypes = (challan) => {
//     const types = new Set();
//     (challan.items || []).forEach((i) => { if (i.issue && i.issue !== "none") types.add(i.issue); });
//     return [...types];
//   };

//   const filtered = challans
//     .filter((c) => filter === "all" || getIssueCount(c) > 0)
//     .filter((c) => {
//       if (!search) return true;
//       const s = search.toLowerCase();
//       return (
//         c.excelHeader?.reference?.toLowerCase().includes(s) ||
//         c.excelHeader?.supplier?.toLowerCase().includes(s) ||
//         c.excelHeader?.voucherNo?.toLowerCase().includes(s)
//       );
//     });

//   if (selectedChallan) {
//     return <ChallanDetail challan={selectedChallan} onBack={() => setSelected(null)} />;
//   }

//   return (
//     <div className="p-6 max-w-6xl mx-auto">
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold text-gray-800">Received on Challan</h1>
//         <p className="text-sm text-gray-500 mt-1">All inward challans with damage / shortage / quality issues</p>
//       </div>

//       <div className="flex flex-wrap items-center gap-3 mb-6">
//         <input
//           type="text"
//           placeholder="Search by invoice no, supplier..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-300"
//         />
//         <div className="flex rounded-lg overflow-hidden border border-gray-200">
//           <button
//             onClick={() => setFilter("issues")}
//             className={`px-4 py-2 text-sm font-medium transition-colors ${filter === "issues" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
//           >
//             Issues Only
//           </button>
//           <button
//             onClick={() => setFilter("all")}
//             className={`px-4 py-2 text-sm font-medium transition-colors ${filter === "all" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
//           >
//             All Challans
//           </button>
//         </div>
//         <span className="text-sm text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
//       </div>

//       {loading ? (
//         <div className="flex items-center justify-center h-48 text-gray-400">Loading challans...</div>
//       ) : filtered.length === 0 ? (
//         <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
//           <FiPackage size={32} />
//           <p>No challans found</p>
//         </div>
//       ) : (
//         <div className="space-y-3">
//           {filtered.map((challan) => {
//             const issueCount = getIssueCount(challan);
//             const issueTypes = getIssueTypes(challan);
//             const hasIssues  = issueCount > 0;
//             return (
//               <div
//                 key={challan.id}
//                 onClick={() => setSelected(challan)}
//                 className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all flex flex-wrap items-center justify-between gap-4 ${hasIssues ? "border-red-200 hover:border-red-300" : "border-gray-200 hover:border-gray-300"}`}
//               >
//                 <div className="flex items-center gap-4">
//                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasIssues ? "bg-red-100" : "bg-green-100"}`}>
//                     {hasIssues ? <FiAlertTriangle className="text-red-500" /> : <FiPackage className="text-green-500" />}
//                   </div>
//                   <div>
//                     <div className="flex items-center gap-2 flex-wrap">
//                       <span className="font-semibold text-gray-800">{challan.excelHeader?.reference || "—"}</span>
//                       <StatusBadge status={challan.poStatus} />
//                       {hasIssues && (
//                         <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
//                           {issueCount} issue{issueCount > 1 ? "s" : ""}
//                         </span>
//                       )}
//                     </div>
//                     <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
//                       <span className="flex items-center gap-1"><FiTruck size={11} /> {challan.excelHeader?.supplier || "—"}</span>
//                       <span className="flex items-center gap-1"><FiFileText size={11} /> {challan.excelHeader?.voucherNo || "—"}</span>
//                       <span className="flex items-center gap-1"><FiCalendar size={11} /> {challan.excelHeader?.dated || "—"}</span>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                   <div className="flex gap-1 flex-wrap">
//                     {issueTypes.map((type) => <IssueBadge key={type} issue={type} />)}
//                   </div>
//                   <div className="text-right text-xs text-gray-500 hidden sm:block">
//                     <div>{challan.totalItems} items</div>
//                     <div>{challan.totalReceivedQty} qty received</div>
//                   </div>
//                   <FiChevronRight className="text-gray-400" />
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default ReceivedOnChallan;


import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiAlertTriangle, FiPackage, FiChevronRight,
  FiArrowLeft, FiCalendar, FiTruck, FiFileText,
} from "react-icons/fi";

const ISSUE_COLORS = {
  damage:     { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    label: "Damage"     },
  shortage:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", label: "Shortage"   },
  excess:     { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   label: "Excess"     },
  quality:    { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", label: "Quality"    },
  wrong_item: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", label: "Wrong Item" },
  other:      { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-500",   label: "Other"      },
};

const getIssueStyle = (issue) => ISSUE_COLORS[issue?.toLowerCase()] || ISSUE_COLORS.other;

const IssueBadge = ({ issue }) => {
  const s = getIssueStyle(issue);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    partial:  "bg-orange-100 text-orange-700",
    received: "bg-green-100 text-green-700",
    excess:   "bg-blue-100 text-blue-700",
    ordered:  "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${map[status?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
      {status || "—"}
    </span>
  );
};

const InfoField = ({ label, value, highlight }) => (
  <div className="flex flex-col">
    <span className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">{label}</span>
    <span className={`font-semibold text-sm ${highlight ? "text-indigo-700" : "text-gray-800"}`}>
      {value || "—"}
    </span>
  </div>
);

// ─── Detail View ─────────────────────────────────────────────────────────────

const ChallanDetail = ({ challan, onBack }) => {
  const { excelHeader, poStatus, totalItems, totalReceivedQty, items = [] } = challan;
  const issueItems = items.filter((i) => i.issue && i.issue !== "none" && i.issue !== "");
  const okItems    = items.filter((i) => !i.issue || i.issue === "none" || i.issue === "");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <FiArrowLeft /> Back to list
      </button>

      {/* ── Challan Information Card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xl font-bold text-gray-800">{excelHeader?.reference || "—"}</h2>
          <StatusBadge status={poStatus} />
        </div>

        {/* 6 fields grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-4 border-t border-gray-100 pt-5">
          <InfoField label="Challan No"        value={excelHeader?.reference} />
          <InfoField label="Vendor Challan No" value={excelHeader?.voucherNo} />
          <InfoField label="Challan Date"      value={excelHeader?.dated} />
          <InfoField label="Linked Invoice"    value={excelHeader?.reference}  highlight />
          <InfoField label="Linked PO"         value={excelHeader?.voucherNo}  highlight />
          <InfoField label="Supplier"          value={excelHeader?.supplier} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-4 mt-4">
          <InfoField label="Total Items"        value={String(totalItems ?? "—")} />
          <InfoField label="Total Received Qty" value={String(totalReceivedQty ?? "—")} />
        </div>
      </div>

      {/* Issue Items */}
      {issueItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FiAlertTriangle className="text-red-500" />
            <h3 className="font-semibold text-gray-800">Issue Items ({issueItems.length})</h3>
          </div>
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Part No</th>
                  <th className="px-4 py-3 text-center">Ordered</th>
                  <th className="px-4 py-3 text-center">Invoice Qty</th>
                  <th className="px-4 py-3 text-center">Physical</th>
                  <th className="px-4 py-3 text-center">Damaged / Short</th>
                  <th className="px-4 py-3 text-center">Issue</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {issueItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px]">{item.description}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.productCode}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{item.orderedQty}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{item.quantity || item.orderedQty}</td>
                    <td className="px-4 py-3 text-center font-semibold text-green-700">{item.physicalQty}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">
                      {item.damagedQty > 0
                        ? item.damagedQty
                        : item.shortage > 0
                          ? item.shortage
                          : (item.orderedQty - item.physicalQty) > 0
                            ? (item.orderedQty - item.physicalQty)
                            : "—"}
                    </td>
                    <td className="px-4 py-3 text-center"><IssueBadge issue={item.issue} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">{item.issueDetail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── List View ────────────────────────────────────────────────────────────────

const ReceivedOnChallan = () => {
  const [challans, setChallans]        = useState([]);
  const [loading, setLoading]          = useState(true);
  const [selectedChallan, setSelected] = useState(null);
  const [filter, setFilter]            = useState("issues");
  const [search, setSearch]            = useState("");

  useEffect(() => {
    const fetchChallans = async () => {
      try {
        const snap = await getDocs(collection(db, "excelupload"));
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const received = data.filter((d) => 
          (d.storeQcStatus === "approved" || d.receivedAt) &&
          !d.replacementComplete  // ✅ hide once replacement is done
        );
        setChallans(received);
      } catch (err) {
        console.error("Error fetching challans:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChallans();
  }, []);

  const getIssueCount = (challan) =>
    (challan.items || []).filter((i) => i.issue && i.issue !== "none" && i.issue !== "").length;

  const getIssueTypes = (challan) => {
    const types = new Set();
    (challan.items || []).forEach((i) => { if (i.issue && i.issue !== "none") types.add(i.issue); });
    return [...types];
  };

  const filtered = challans
    .filter((c) => filter === "all" || getIssueCount(c) > 0)
    .filter((c) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        c.excelHeader?.reference?.toLowerCase().includes(s) ||
        c.excelHeader?.supplier?.toLowerCase().includes(s) ||
        c.excelHeader?.voucherNo?.toLowerCase().includes(s)
      );
    });

  if (selectedChallan) {
    return <ChallanDetail challan={selectedChallan} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Received on Challan</h1>
        <p className="text-sm text-gray-500 mt-1">All inward challans with damage / shortage / quality issues</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by invoice no, supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <span className="text-sm text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Loading challans...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <FiPackage size={32} />
          <p>No challans found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((challan) => {
            const issueCount = getIssueCount(challan);
            const issueTypes = getIssueTypes(challan);
            const hasIssues  = issueCount > 0;
            return (
              <div
                key={challan.id}
                onClick={() => setSelected(challan)}
                className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all flex flex-wrap items-center justify-between gap-4 ${hasIssues ? "border-red-200 hover:border-red-300" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasIssues ? "bg-red-100" : "bg-green-100"}`}>
                    {hasIssues ? <FiAlertTriangle className="text-red-500" /> : <FiPackage className="text-green-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{challan.excelHeader?.reference || "—"}</span>
                      <StatusBadge status={challan.poStatus} />
                      {hasIssues && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                          {issueCount} issue{issueCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><FiTruck size={11} /> {challan.excelHeader?.supplier || "—"}</span>
                      <span className="flex items-center gap-1"><FiFileText size={11} /> {challan.excelHeader?.voucherNo || "—"}</span>
                      <span className="flex items-center gap-1"><FiCalendar size={11} /> {challan.excelHeader?.dated || "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 flex-wrap">
                    {issueTypes.map((type) => <IssueBadge key={type} issue={type} />)}
                  </div>
                  <div className="text-right text-xs text-gray-500 hidden sm:block">
                    <div>{challan.totalItems} items</div>
                    <div>{challan.totalReceivedQty} qty received</div>
                  </div>
                  <FiChevronRight className="text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReceivedOnChallan;