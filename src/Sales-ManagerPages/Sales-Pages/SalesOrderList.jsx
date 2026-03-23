// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   FiShoppingBag,
//   FiClock,
//   FiAlertTriangle,
//   FiEye,
//   FiPlus,
//   FiSearch,
//   FiX,
// } from "react-icons/fi";
// import {
//   Card,
//   CardHeader,
//   KPICard,
//   StatusBadge,
//   Table,
//   BtnPrimary,
//   Select,
// } from "../SalesComponent/ui/index";
// import { db } from "../../firebase";
// import { collection, getDocs, query, orderBy } from "firebase/firestore";

// // ── Status Badge override for SO statuses ─────────────────────────────────────
// function SOStatusBadge({ status }) {
//   const styles = {
//     reserved: "bg-blue-50 text-blue-700 border-blue-200",
//     partial: "bg-orange-50 text-orange-700 border-orange-200",
//     ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     excess: "bg-purple-50 text-purple-700 border-purple-200",
//     complete: "bg-green-50 text-green-700 border-green-200",
//   };
//   const labels = {
//     reserved: "RESERVED",
//     partial: "PARTIAL",
//     ready: "READY TO DISPATCH",
//     excess: "EXCESS",
//     complete: "COMPLETE",
//   };
//   return (
//     <span
//       className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}
//     >
//       {labels[status] || status?.toUpperCase()}
//     </span>
//   );
// }

// export default function SalesOrderList() {
//   const navigate = useNavigate();
//   const [filterStatus, setFilterStatus] = useState("all");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [soData, setSoData] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // ── Firebase fetch ────────────────────────────────────────────────────────
//   useEffect(() => {
//     const fetchSOs = async () => {
//       try {
//         const snap = await getDocs(
//           query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
//         );
//         const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

//         // ── Only SALES_ORDER type ──
//         const sos = all.filter(
//           (doc) => doc.type === "SALES_ORDER" && !doc.linkedSoId,
//         );

//         const mapped = sos.map((so) => ({
//           id: so.id,
//           soNumber:
//             so.woNumber ||
//             so.excelHeader?.voucherNo ||
//             so.id.slice(0, 8).toUpperCase(),
//           customer:
//             so.customer ||
//             so.excelHeader?.buyer ||
//             so.excelHeader?.consignee ||
//             "—",
//           contact: so.customerContact || so.excelHeader?.reference || "—",
//           date: so.excelHeader?.dated || "",
//           createdDate: so.createdAt
//             ? new Date(so.createdAt).toLocaleDateString("en-IN")
//             : "",
//           status: so.soStatus || "reserved",
//           items: so.items || [],
//           invoiceCount: so.invoiceCount || 0,
//           totalInvoiced: so.totalInvoicedQty || 0,
//         }));

//         setSoData(mapped);
//       } catch (err) {
//         console.error("Fetch error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchSOs();
//   }, []);

//   // ── Stats ─────────────────────────────────────────────────────────────────
//   const totalSOs = soData.length;
//   const reservedSOs = soData.filter((so) => so.status === "reserved").length;
//   const partialSOs = soData.filter((so) => so.status === "partial").length;
//   const readySOs = soData.filter((so) => so.status === "ready").length;

//   // ── Filter + Search ───────────────────────────────────────────────────────
//   const filteredSOs = soData.filter((so) => {
//     const matchStatus = filterStatus === "all" || so.status === filterStatus;
//     const q = searchQuery.trim().toLowerCase();
//     const matchSearch =
//       !q ||
//       so.soNumber?.toLowerCase().includes(q) ||
//       so.customer?.toLowerCase().includes(q) ||
//       so.contact?.toLowerCase().includes(q) ||
//       so.date?.toLowerCase().includes(q);
//     return matchStatus && matchSearch;
//   });

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64 gap-3">
//         <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
//         <span className="text-slate-500 text-sm">Loading Sales Orders...</span>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-xl font-black text-slate-800">Sales Orders</h2>
//           <p className="text-xs text-slate-400 mt-0.5">
//             Track customer orders and invoicing
//           </p>
//         </div>
//         <BtnPrimary onClick={() => navigate("/sales/sales-orders/upload")}>
//           <FiPlus size={14} /> Upload SO
//         </BtnPrimary>
//       </div>

//       {/* KPI Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//         <KPICard
//           label="Total Sales Orders"
//           value={totalSOs}
//           icon={FiShoppingBag}
//           color="indigo"
//         />
//         <KPICard
//           label="Reserved"
//           value={reservedSOs}
//           icon={FiClock}
//           color="blue"
//         />
//         <KPICard
//           label="Partial"
//           value={partialSOs}
//           icon={FiAlertTriangle}
//           color="amber"
//         />
//         <KPICard
//           label="Ready to Dispatch"
//           value={readySOs}
//           icon={FiShoppingBag}
//           color="emerald"
//         />
//       </div>

//       {/* Ready to Dispatch Alert */}
//       {readySOs > 0 && (
//         <div className="p-4 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700 text-sm">
//           <p className="font-bold">
//             ✅ {readySOs} order{readySOs > 1 ? "s" : ""} ready to dispatch!
//           </p>
//         </div>
//       )}

//       {/* All Sales Orders */}
//       <Card>
//         <CardHeader
//           title="All Sales Orders"
//           subtitle={`${filteredSOs.length} orders`}
//           action={
//             <div className="flex items-center gap-2">
//               {/* Search */}
//               <div className="relative flex items-center">
//                 <FiSearch
//                   size={13}
//                   className="absolute left-2.5 text-slate-400 pointer-events-none"
//                 />
//                 <input
//                   type="text"
//                   placeholder="Search SO, Customer..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48 bg-white"
//                 />
//                 {searchQuery && (
//                   <button
//                     onClick={() => setSearchQuery("")}
//                     className="absolute right-2 text-slate-400 hover:text-slate-600"
//                   >
//                     <FiX size={12} />
//                   </button>
//                 )}
//               </div>
//               {/* Filter */}
//               <Select
//                 value={filterStatus}
//                 onChange={(e) => setFilterStatus(e.target.value)}
//                 options={[
//                   { value: "all", label: "All Status" },
//                   { value: "reserved", label: "Reserved" },
//                   { value: "partial", label: "Partial" },
//                   { value: "ready", label: "Ready to Dispatch" },
//                   { value: "excess", label: "Excess" },
//                 ]}
//                 className="text-xs"
//               />
//             </div>
//           }
//         />

//         <Table
//           headers={[
//             { label: "SO Number" },
//             { label: "Customer" },
//             { label: "Date" },
//             { label: "Items", align: "center" },
//             { label: "Invoiced", align: "center" },
//             { label: "Status", align: "center" },
//             { label: "Action", align: "center" },
//           ]}
//         >
//           {filteredSOs.slice(0, 20).map((so) => {
//             const totalOrdered = so.items.reduce(
//               (s, i) => s + (i.orderedQty || i.quantity || 0),
//               0,
//             );
//             const totalInvoiced = so.items.reduce(
//               (s, i) => s + (i.totalInvoicedQty || 0),
//               0,
//             );
//             return (
//               <tr
//                 key={so.id}
//                 className="hover:bg-slate-50 transition-colors cursor-pointer"
//                 onClick={() => {
//                   if (so.status === "complete") {
//                     navigate(`/sales/sales-orders/complete/${so.id}`);
//                   }
//                 }}
//               >
//                 <td className="px-5 py-4">
//                   <p className="text-sm font-bold text-slate-800 font-mono">
//                     {so.soNumber}
//                   </p>
//                   <p className="text-xs text-slate-400 mt-0.5">
//                     {so.createdDate}
//                   </p>
//                 </td>
//                 <td className="px-5 py-4">
//                   <p className="text-sm text-slate-700">{so.customer}</p>
//                   <p className="text-xs text-slate-400 mt-0.5">{so.contact}</p>
//                 </td>
//                 <td className="px-5 py-4">
//                   <p className="text-sm text-slate-600">{so.date}</p>
//                 </td>
//                 <td className="px-5 py-4 text-center">
//                   <p className="text-sm font-bold text-slate-800">
//                     {so.items.length}
//                   </p>
//                 </td>
//                 <td className="px-5 py-4 text-center">
//                   <p className="text-sm font-bold text-slate-800">
//                     {totalInvoiced}/{totalOrdered}
//                   </p>
//                   {so.invoiceCount > 0 && (
//                     <p className="text-xs text-slate-400">
//                       {so.invoiceCount} invoice{so.invoiceCount > 1 ? "s" : ""}
//                     </p>
//                   )}
//                 </td>
//                 <td className="px-5 py-4 text-center">
//                   <SOStatusBadge status={so.status} />
//                 </td>
//                 <td className="px-5 py-4 text-center">
//                   <div className="flex items-center justify-center gap-2">
//                     {/* <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         if (so.status === "complete") {
//                           navigate(`/sales/sales-orders/complete/${so.id}`);
//                         }
//                       }}
//                       className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
//                       title="View Details"
//                     >
//                       <FiEye size={14} />
//                     </button> */}
//                     {so.status !== "ready" && so.status !== "complete" &&  so.status !== "excess" && (
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           navigate(`/sales/upload-sales-invoice?soId=${so.id}`);
//                         }}
//                         className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
//                       >
//                         {so.status === "partial"
//                           ? "Invoice Remaining"
//                           : "Create Invoice"}
//                       </button>
//                     )}
//                   </div>
//                 </td>
//               </tr>
//             );
//           })}
//         </Table>

//         {/* No results */}
//         {filteredSOs.length === 0 && searchQuery && (
//           <div className="p-10 text-center">
//             <FiSearch size={36} className="mx-auto mb-3 text-slate-300" />
//             <p className="text-sm font-bold text-slate-600">
//               No results for "{searchQuery}"
//             </p>
//             <button
//               onClick={() => setSearchQuery("")}
//               className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
//             >
//               Clear search
//             </button>
//           </div>
//         )}
//         {filteredSOs.length === 0 && !searchQuery && (
//           <div className="p-12 text-center">
//             <FiShoppingBag size={48} className="mx-auto mb-3 text-slate-300" />
//             <p className="text-sm font-bold text-slate-600">
//               No Sales Orders Found
//             </p>
//             <p className="text-xs text-slate-400 mt-1">
//               {filterStatus === "all"
//                 ? "Upload your first sales order"
//                 : `No ${filterStatus} orders`}
//             </p>
//             {filterStatus === "all" && (
//               <BtnPrimary
//                 onClick={() => navigate("/sales/sales-orders/upload")}
//                 className="mt-4 mx-auto"
//               >
//                 <FiPlus size={14} /> Upload Sales Order
//               </BtnPrimary>
//             )}
//           </div>
//         )}
//       </Card>

//       {/* Status Legend */}
//       <Card>
//         <div className="p-6">
//           <p className="text-xs font-bold text-slate-700 mb-4">
//             📋 Status Legend:
//           </p>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             <div className="flex items-center gap-3">
//               <div className="w-3 h-3 rounded-full bg-blue-500" />
//               <div>
//                 <p className="text-xs font-bold text-slate-700">Reserved</p>
//                 <p className="text-xs text-slate-400">
//                   SO created, no invoice yet
//                 </p>
//               </div>
//             </div>
//             <div className="flex items-center gap-3">
//               <div className="w-3 h-3 rounded-full bg-orange-500" />
//               <div>
//                 <p className="text-xs font-bold text-slate-700">Partial</p>
//                 <p className="text-xs text-slate-400">Some items invoiced</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-3">
//               <div className="w-3 h-3 rounded-full bg-emerald-500" />
//               <div>
//                 <p className="text-xs font-bold text-slate-700">
//                   Ready to Dispatch
//                 </p>
//                 <p className="text-xs text-slate-400">All items invoiced</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-3">
//               <div className="w-3 h-3 rounded-full bg-purple-500" />
//               <div>
//                 <p className="text-xs font-bold text-slate-700">Excess</p>
//                 <p className="text-xs text-slate-400">More than ordered</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }


import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShoppingBag,
  FiClock,
  FiAlertTriangle,
  FiEye,
  FiPlus,
  FiSearch,
  FiX,
  FiCheck,
} from "react-icons/fi";
import {
  Card,
  CardHeader,
  KPICard,
  StatusBadge,
  Table,
  BtnPrimary,
  Select,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return isoStr; }
}

function SOStatusBadge({ status }) {
  const styles = {
    reserved:         "bg-blue-50 text-blue-700 border-blue-200",
    partial:          "bg-orange-50 text-orange-700 border-orange-200",
    partial_approved: "bg-orange-50 text-orange-700 border-orange-200",
    ready:            "bg-emerald-50 text-emerald-700 border-emerald-200",
    ready_for_dispatch:"bg-emerald-50 text-emerald-700 border-emerald-200",
    waiting_for_qc:   "bg-violet-50 text-violet-700 border-violet-200",
    excess:           "bg-purple-50 text-purple-700 border-purple-200",
    complete:         "bg-green-50 text-green-700 border-green-200",
  };
  const labels = {
    reserved:          "RESERVED",
    partial:           "PARTIAL",
    partial_approved:  "PARTIAL",
    ready:             "READY TO DISPATCH",
    ready_for_dispatch:"READY TO DISPATCH",
    waiting_for_qc:    "WAITING FOR QC",
    excess:            "EXCESS",
    complete:          "COMPLETE",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {labels[status] || status?.toUpperCase()}
    </span>
  );
}

export default function SalesOrderList() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [soData, setSoData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSOs = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
        );
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // ✅ Include both SALES_ORDER and SO types
        const sos = all.filter((doc) => {
          const t = (doc.type || "").toUpperCase().replace(/[_\s]/g, "");
          return (t === "SALESORDER" || t === "SO") && !doc.linkedSoId;
        });

        const mapped = sos.map((so) => ({
          id: so.id,
          soNumber:
            so.woNumber ||
            so.excelHeader?.voucherNo ||
            so.id.slice(0, 8).toUpperCase(),
          customer:
            so.customer ||
            so.excelHeader?.buyer ||
            so.excelHeader?.consignee ||
            "—",
          contact: so.customerContact || so.excelHeader?.reference || "—",
          date: so.excelHeader?.dated || "",
          createdAt: so.createdAt || null,
          status: so.soStatus || "reserved",
          items: so.items || [],
          invoiceCount: so.invoiceCount || 0,
          totalInvoiced: so.totalInvoicedQty || 0,
        }));

        setSoData(mapped);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSOs();
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSOs    = soData.length;
  const reservedSOs = soData.filter((so) => so.status === "reserved").length;
  const partialSOs  = soData.filter((so) => so.status === "partial" || so.status === "partial_approved").length;
  const readySOs    = soData.filter((so) => so.status === "ready" || so.status === "ready_for_dispatch").length;
  const completeSOs = soData.filter((so) => so.status === "complete").length;

  // ── Filter + Search ───────────────────────────────────────────────────────
  const filteredSOs = soData.filter((so) => {
    const matchStatus =
      filterStatus === "all" ||
      so.status === filterStatus ||
      (filterStatus === "partial" && so.status === "partial_approved") ||
      (filterStatus === "ready" && so.status === "ready_for_dispatch");
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      so.soNumber?.toLowerCase().includes(q) ||
      so.customer?.toLowerCase().includes(q) ||
      so.contact?.toLowerCase().includes(q) ||
      so.date?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        <span className="text-slate-500 text-sm">Loading Sales Orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Sales Orders</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track customer orders and invoicing</p>
        </div>
        <BtnPrimary onClick={() => navigate("/sales/sales-orders/upload")}>
          <FiPlus size={14} /> Upload SO
        </BtnPrimary>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard label="Total Sales Orders" value={totalSOs}    icon={FiShoppingBag} color="indigo" />
        <KPICard label="Reserved"           value={reservedSOs} icon={FiClock}        color="blue"   />
        <KPICard label="Partial"            value={partialSOs}  icon={FiAlertTriangle} color="amber" />
        <KPICard label="Ready to Dispatch"  value={readySOs}    icon={FiShoppingBag}  color="emerald"/>
        <KPICard label="Complete"           value={completeSOs} icon={FiCheck}        color="green"  />
      </div>

      {readySOs > 0 && (
        <div className="p-4 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700 text-sm">
          <p className="font-bold">✅ {readySOs} order{readySOs > 1 ? "s" : ""} ready to dispatch!</p>
        </div>
      )}

      {/* All Sales Orders */}
      <Card>
        <CardHeader
          title="All Sales Orders"
          subtitle={`${filteredSOs.length} orders`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <FiSearch size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search SO, Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48 bg-white"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 text-slate-400 hover:text-slate-600">
                    <FiX size={12} />
                  </button>
                )}
              </div>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: "all",             label: "All Status" },
                  { value: "reserved",        label: "Reserved" },
                  { value: "waiting_for_qc",  label: "Waiting for QC" },
                  { value: "partial",         label: "Partial" },
                  { value: "ready",           label: "Ready to Dispatch" },
                  { value: "excess",          label: "Excess" },
                  { value: "complete",        label: "Complete" },
                ]}
                className="text-xs"
              />
            </div>
          }
        />

        <Table
          headers={[
            { label: "SO Number" },
            { label: "Customer" },
            { label: "Date" },
            { label: "Created At" },
            { label: "Items", align: "center" },
            { label: "Invoiced", align: "center" },
            { label: "Status", align: "center" },
            { label: "Action", align: "center" },
          ]}
        >
          {filteredSOs.map((so) => {
            const totalOrdered  = so.items.reduce((s, i) => s + (i.orderedQty || i.quantity || 0), 0);
            const totalInvoiced = so.items.reduce((s, i) => s + (i.totalInvoicedQty || 0), 0);
            const isComplete    = so.status === "complete";
            return (
              <tr
                key={so.id}
                className={`hover:bg-slate-50 transition-colors cursor-pointer ${isComplete ? "bg-emerald-50/20" : ""}`}
                onClick={() => {
                  if (isComplete) {
                    navigate(`/sales/upload-sales-invoice?soId=${so.id}`);
                  }
                }}
              >
                <td className="px-5 py-4">
                  <p className="text-sm font-bold text-slate-800 font-mono">{so.soNumber}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-slate-700">{so.customer}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{so.contact}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-slate-600">{so.date || "—"}</p>
                </td>
                {/* ✅ Created At — time column */}
                <td className="px-5 py-4">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <FiClock size={10} className="text-slate-400" />
                    {formatDateTime(so.createdAt)}
                  </p>
                </td>
                <td className="px-5 py-4 text-center">
                  <p className="text-sm font-bold text-slate-800">{so.items.length}</p>
                </td>
                <td className="px-5 py-4 text-center">
                  <p className="text-sm font-bold text-slate-800">{totalInvoiced}/{totalOrdered}</p>
                  {so.invoiceCount > 0 && (
                    <p className="text-xs text-slate-400">{so.invoiceCount} invoice{so.invoiceCount > 1 ? "s" : ""}</p>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <SOStatusBadge status={so.status} />
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {/* ✅ Complete → View Details (eye icon) */}
                    {isComplete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sales/upload-sales-invoice?soId=${so.id}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        <FiEye size={11} /> View Details
                      </button>
                    )}
                    {/* ✅ Non-complete, non-ready → Create/Invoice button */}
                    {!isComplete && so.status !== "ready" && so.status !== "ready_for_dispatch" && so.status !== "excess" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sales/upload-sales-invoice?soId=${so.id}`);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                      >
                        {so.status === "partial" || so.status === "partial_approved"
                          ? "Invoice Remaining"
                          : "Create Invoice"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>

        {filteredSOs.length === 0 && searchQuery && (
          <div className="p-10 text-center">
            <FiSearch size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No results for "{searchQuery}"</p>
            <button onClick={() => setSearchQuery("")} className="mt-3 text-xs text-indigo-600 font-bold hover:underline">Clear search</button>
          </div>
        )}
        {filteredSOs.length === 0 && !searchQuery && (
          <div className="p-12 text-center">
            <FiShoppingBag size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No Sales Orders Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterStatus === "all" ? "Upload your first sales order" : `No ${filterStatus} orders`}
            </p>
            {filterStatus === "all" && (
              <BtnPrimary onClick={() => navigate("/sales/sales-orders/upload")} className="mt-4 mx-auto">
                <FiPlus size={14} /> Upload Sales Order
              </BtnPrimary>
            )}
          </div>
        )}
      </Card>

      {/* Status Legend */}
      <Card>
        <div className="p-6">
          <p className="text-xs font-bold text-slate-700 mb-4">📋 Status Legend:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Reserved</p>
                <p className="text-xs text-slate-400">SO created, no invoice yet</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Partial</p>
                <p className="text-xs text-slate-400">Some items invoiced</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Ready to Dispatch</p>
                <p className="text-xs text-slate-400">All items invoiced</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Excess</p>
                <p className="text-xs text-slate-400">More than ordered</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Complete</p>
                <p className="text-xs text-slate-400">Fully invoiced & done</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
