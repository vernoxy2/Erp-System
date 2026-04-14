// import React, { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   FiFileText,
//   FiCheck,
//   FiAlertTriangle,
//   FiUpload,
//   FiClock,
//   FiAlertCircle,
//   FiShield,
//   FiPackage,
//   FiTruck,
//   FiChevronRight,
//   FiCalendar,
//   FiBox,
//   FiChevronLeft,
// } from "react-icons/fi";
// import {
//   Card,
//   CardHeader,
//   Input,
//   BtnPrimary,
//   BtnSecondary,
// } from "../SalesComponent/ui/index";
// import { db } from "../../firebase";
// import {
//   collection,
//   getDocs,
//   query,
//   orderBy,
//   addDoc,
//   updateDoc,
//   doc,
//   where,
//   arrayUnion,
//   onSnapshot,
// } from "firebase/firestore";
// import * as XLSX from "xlsx";

// function calcEtaStatus(deliveryDate) {
//   if (!deliveryDate) return { status: "ordered", remainingDays: 0 };
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const eta = new Date(deliveryDate);
//   eta.setHours(0, 0, 0, 0);
//   const diff = Math.round((eta - today) / (1000 * 60 * 60 * 24));
//   if (diff < 0) return { status: "overdue", remainingDays: diff };
//   if (diff <= 2) return { status: "warning", remainingDays: diff };
//   return { status: "ordered", remainingDays: diff };
// }

// function toInputDate(val) {
//   if (!val) return "";
//   const s = String(val).trim();
//   if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
//   const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
//   if (dmy)
//     return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
//   const monShort = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
//   if (monShort) {
//     const months = {
//       jan: "01",
//       feb: "02",
//       mar: "03",
//       apr: "04",
//       may: "05",
//       jun: "06",
//       jul: "07",
//       aug: "08",
//       sep: "09",
//       oct: "10",
//       nov: "11",
//       dec: "12",
//     };
//     const m = months[monShort[2].toLowerCase()];
//     const yr = monShort[3].length === 2 ? "20" + monShort[3] : monShort[3];
//     if (m) return `${yr}-${m}-${monShort[1].padStart(2, "0")}`;
//   }
//   if (/^\d{5}$/.test(s)) {
//     const d = new Date(Math.round((+s - 25569) * 86400 * 1000));
//     if (!isNaN(d)) return d.toISOString().split("T")[0];
//   }
//   const d = new Date(s);
//   if (!isNaN(d)) return d.toISOString().split("T")[0];
//   return "";
// }

// function formatDateTime(val) {
//   if (!val) return "—";
//   try {
//     let date;
//     if (typeof val?.toDate === "function") date = val.toDate();
//     else if (val?.seconds) date = new Date(val.seconds * 1000);
//     else date = new Date(val);
//     return date.toLocaleString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     });
//   } catch {
//     return "—";
//   }
// }
// function formatDate(isoStr) {
//   if (!isoStr) return "—";
//   try {
//     return new Date(isoStr).toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   } catch {
//     return isoStr;
//   }
// }
// function formatDateLabel(isoStr) {
//   if (!isoStr) return "";
//   try {
//     return new Date(isoStr).toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   } catch {
//     return isoStr;
//   }
// }
// function getDateKey(val) {
//   if (!val) return null;
//   try {
//     let d;
//     if (typeof val?.toDate === "function") d = val.toDate();
//     else if (val?.seconds) d = new Date(val.seconds * 1000);
//     else d = new Date(val);
//     return d.toISOString().split("T")[0];
//   } catch {
//     return null;
//   }
// }
// function getItemStatus(orderedQty, totalReceivedQty) {
//   if (totalReceivedQty === 0) return "ordered";
//   if (totalReceivedQty < orderedQty) return "partial";
//   if (totalReceivedQty === orderedQty) return "complete";
//   return "excess";
// }
// function calcPoStatus(items) {
//   const s = items.map((i) =>
//     getItemStatus(i.orderedQty || i.quantity || 0, i.totalReceivedQty || 0),
//   );
//   if (s.every((x) => x === "complete")) return "complete";
//   if (s.some((x) => x === "excess")) return "excess";
//   if (s.some((x) => x === "partial" || x === "complete")) return "partial";
//   return "ordered";
// }

// function StatusPill({ status }) {
//   const map = {
//     material_hold: "bg-blue-50 text-blue-700 border-blue-200",
//     ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     dispatched: "bg-slate-50 text-slate-700 border-slate-200",
//     pending: "bg-amber-50 text-amber-700 border-amber-200",
//     overdue: "bg-red-50 text-red-700 border-red-200",
//     warning: "bg-orange-50 text-orange-700 border-orange-200",
//     ordered: "bg-blue-50 text-blue-700 border-blue-200",
//     partial: "bg-orange-50 text-orange-700 border-orange-200",
//     complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     excess: "bg-purple-50 text-purple-700 border-purple-200",
//     received: "bg-teal-50 text-teal-700 border-teal-200",
//     waiting_qc: "bg-indigo-50 text-indigo-700 border-indigo-200",
//   };
//   const n = status?.toLowerCase();
//   const label = n === "waiting_qc" ? "Waiting QC" : n?.replace("_", " ");
//   return (
//     <span
//       className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wide ${map[n] || map.pending}`}
//     >
//       {label}
//     </span>
//   );
// }

// function ReceiptProgress({ received, total }) {
//   const pct =
//     total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
//   const color =
//     pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-orange-400" : "bg-slate-300";
//   const text =
//     pct === 100
//       ? "text-emerald-600"
//       : pct > 0
//         ? "text-orange-500"
//         : "text-slate-400";
//   return (
//     <div className="flex items-center gap-2 min-w-0">
//       <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
//         <div
//           className={`h-full rounded-full ${color}`}
//           style={{ width: `${pct}%` }}
//         />
//       </div>
//       <span
//         className={`text-[11px] font-bold tabular-nums whitespace-nowrap ${text}`}
//       >
//         {received}/{total}
//       </span>
//     </div>
//   );
// }

// const MONTHS_CAL = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];
// const DAYS_CAL = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// function CalendarPicker({ activeDates, selected, onChange }) {
//   const today = new Date().toISOString().split("T")[0];
//   const base = selected !== "all" ? new Date(selected) : new Date();
//   const [open, setOpen] = useState(false);
//   const [view, setView] = useState({
//     year: base.getFullYear(),
//     month: base.getMonth(),
//   });
//   const ref = useRef(null);
//   useEffect(() => {
//     const h = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", h);
//     return () => document.removeEventListener("mousedown", h);
//   }, []);
//   const activeSet = new Set(activeDates);
//   const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
//   const firstDayOfWk = new Date(view.year, view.month, 1).getDay();
//   const prevMonth = () =>
//     setView((v) =>
//       v.month === 0
//         ? { year: v.year - 1, month: 11 }
//         : { ...v, month: v.month - 1 },
//     );
//   const nextMonth = () =>
//     setView((v) =>
//       v.month === 11
//         ? { year: v.year + 1, month: 0 }
//         : { ...v, month: v.month + 1 },
//     );
//   const handleDay = (day) => {
//     const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//     if (!activeSet.has(iso)) return;
//     onChange(selected === iso ? "all" : iso);
//     setOpen(false);
//   };
//   const cells = [];
//   for (let i = 0; i < firstDayOfWk; i++) cells.push(null);
//   for (let d = 1; d <= daysInMonth; d++) cells.push(d);
//   while (cells.length % 7 !== 0) cells.push(null);
//   const btnLabel = selected === "all" ? "All dates" : formatDateLabel(selected);
//   return (
//     <div className="relative" ref={ref}>
//       <button
//         onClick={() => setOpen((o) => !o)}
//         className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm border ${selected !== "all" ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}
//       >
//         <FiCalendar size={14} />
//         {btnLabel}
//         {selected !== "all" && (
//           <span
//             onClick={(e) => {
//               e.stopPropagation();
//               onChange("all");
//             }}
//             className="ml-1 w-4 h-4 rounded-full bg-white/25 hover:bg-white/50 flex items-center justify-center text-white text-xs"
//             title="Clear"
//           >
//             ×
//           </span>
//         )}
//       </button>
//       {open && (
//         <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
//           <div className="flex items-center justify-between px-4 py-3 bg-indigo-600">
//             <button
//               onClick={prevMonth}
//               className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"
//             >
//               <FiChevronLeft size={15} />
//             </button>
//             <span className="text-sm font-bold text-white">
//               {MONTHS_CAL[view.month]} {view.year}
//             </span>
//             <button
//               onClick={nextMonth}
//               className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"
//             >
//               <FiChevronRight size={15} />
//             </button>
//           </div>
//           <div className="grid grid-cols-7 px-3 pt-3 pb-1">
//             {DAYS_CAL.map((d) => (
//               <div
//                 key={d}
//                 className="text-center text-[10px] font-bold text-slate-400"
//               >
//                 {d}
//               </div>
//             ))}
//           </div>
//           <div className="grid grid-cols-7 gap-y-1 px-3 pb-3">
//             {cells.map((day, idx) => {
//               if (!day) return <div key={idx} />;
//               const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//               const hasData = activeSet.has(iso);
//               const isSel = selected === iso;
//               const isToday = iso === today;
//               return (
//                 <button
//                   key={idx}
//                   onClick={() => handleDay(day)}
//                   disabled={!hasData}
//                   className={`relative mx-auto w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${isSel ? "bg-indigo-600 text-white shadow-md" : hasData ? "text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer" : "text-slate-300 cursor-not-allowed"} ${isToday && !isSel ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
//                 >
//                   {day}
//                   {hasData && !isSel && (
//                     <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
//                   )}
//                 </button>
//               );
//             })}
//           </div>
//           <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
//             <p className="text-[10px] text-slate-400">
//               {activeDates.length} date{activeDates.length !== 1 ? "s" : ""}{" "}
//               have POs
//             </p>
//             {selected !== "all" && (
//               <button
//                 onClick={() => {
//                   onChange("all");
//                   setOpen(false);
//                 }}
//                 className="text-xs text-indigo-600 font-semibold hover:underline"
//               >
//                 Show all
//               </button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// function POSelectCard({ po, onSelect }) {
//   const totalOrdered = po.items.reduce((s, i) => s + (i.orderedQty || 0), 0);
//   const totalReceived = po.items.reduce(
//     (s, i) => s + (i.totalReceivedQty || 0),
//     0,
//   );
//   const remaining = totalOrdered - totalReceived;
//   const isDamage = po.hasDamagedPending;
//   const isWaiting = po.status === "waiting_qc";
//   const isOverdue = po.status === "overdue";
//   const accentBar = isDamage
//     ? "bg-red-500"
//     : isWaiting
//       ? "bg-indigo-500"
//       : isOverdue
//         ? "bg-red-400"
//         : po.status === "partial"
//           ? "bg-orange-400"
//           : "bg-slate-300";
//   const btnStyle = isDamage
//     ? "bg-red-600 hover:bg-red-700"
//     : "bg-indigo-600 hover:bg-indigo-700";
//   const btnLabel = isDamage
//     ? "Upload Replacement Invoice"
//     : po.status === "partial"
//       ? "Receive Remaining"
//       : "Receive Material";
//   return (
//     <div
//       onClick={() => onSelect(po)}
//       className="relative bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-150 overflow-hidden cursor-pointer"
//     >
//       <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentBar}`} />
//       <div className="pl-4 pr-4 pt-3 pb-3">
//         <div className="flex items-center justify-between gap-3">
//           <div className="flex items-center gap-2 flex-wrap min-w-0">
//             <span className="text-sm font-black text-slate-800">
//               {po.poNumber}
//             </span>
//             <StatusPill status={po.status} />
//             {isDamage && (
//               <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 border border-red-200 rounded-full text-[10px] font-bold text-red-700">
//                 <FiAlertTriangle size={8} /> {po.totalDamagedQty} Dmg
//               </span>
//             )}
//             {po.storeQcStatus === "approved_with_issues" && !isDamage && (
//               <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">
//                 <FiAlertTriangle size={8} /> QC Issues
//               </span>
//             )}
//             <span className="text-[10px] text-slate-600 flex items-center gap-1">
//               <FiCalendar size={8} />
//               {formatDateTime(po.createdAt)}
//             </span>
//           </div>
//           <button
//             className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-bold ${btnStyle} transition-colors`}
//             onClick={(e) => {
//               e.stopPropagation();
//               onSelect(po);
//             }}
//           >
//             {btnLabel} <FiChevronRight size={11} />
//           </button>
//         </div>
//         <div className="mt-2.5 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
//           <span className="flex items-center gap-1">
//             <FiTruck size={10} className="text-slate-400" />
//             <span className="font-semibold text-slate-700">{po.vendor}</span>
//           </span>
//           <span className="flex items-center gap-1">
//             <FiBox size={10} className="text-slate-400" />
//             {po.items.length} items
//           </span>
//           <span className="flex items-center gap-1">
//             <FiClock size={10} className="text-slate-400" />
//             <span
//               className={
//                 isOverdue
//                   ? "text-red-500 font-bold"
//                   : po.status === "warning"
//                     ? "text-orange-500 font-bold"
//                     : ""
//               }
//             >
//               ETA: {po.eta !== "—" ? po.eta : "Not set"}
//             </span>
//           </span>
//           <div className="flex items-center gap-1.5 flex-1 min-w-32">
//             <ReceiptProgress received={totalReceived} total={totalOrdered} />
//           </div>
//         </div>
//         {(isDamage ||
//           (!isDamage && po.status === "partial" && remaining > 0) ||
//           isWaiting) && (
//           <div className="mt-2 flex flex-col gap-1">
//             {isDamage && (
//               <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
//                 <FiAlertTriangle
//                   size={11}
//                   className="text-red-500 flex-shrink-0"
//                 />
//                 <p className="text-[11px] font-bold text-red-700">
//                   {po.totalDamagedQty} damaged units require replacement invoice
//                 </p>
//               </div>
//             )}
//             {!isDamage && po.status === "partial" && remaining > 0 && (
//               <div className="flex items-center gap-2 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
//                 <FiPackage
//                   size={11}
//                   className="text-orange-500 flex-shrink-0"
//                 />
//                 <p className="text-[11px] font-bold text-orange-700">
//                   {remaining} units still pending from vendor
//                 </p>
//               </div>
//             )}
//             {isWaiting && (
//               <div className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
//                 <span className="text-xs">⏳</span>
//                 <p className="text-[11px] font-bold text-indigo-700">
//                   Invoice submitted — waiting for store QC approval
//                 </p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// function POHistoryTimeline({ selectedPO, linkedInvoices, loadingHistory }) {
//   if (!selectedPO) return null;
//   const totalOrdered = selectedPO.items.reduce(
//     (s, i) => s + (i.orderedQty || 0),
//     0,
//   );
//   const totalReceived = selectedPO.items.reduce(
//     (s, i) => s + (i.totalReceivedQty || 0),
//     0,
//   );
//   const totalPending = Math.max(0, totalOrdered - totalReceived);
//   const events = [];
//   events.push({
//     type: "created",
//     icon: "📄",
//     label: "Purchase Order Created",
//     sub: `PO: ${selectedPO.poNumber} · Vendor: ${selectedPO.vendor}`,
//     datetime: selectedPO.createdAt || null,
//     status: "ordered",
//   });
//   [...linkedInvoices]
//     .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
//     .forEach((inv) => {
//       const thisQty = (inv.items || []).reduce(
//         (s, i) => s + (i.newReceived || 0),
//         0,
//       );
//       const invOrdered = (inv.items || []).reduce(
//         (s, i) => s + (i.orderedQty || i.quantity || 0),
//         0,
//       );
//       const pending = Math.max(
//         0,
//         invOrdered -
//           (inv.items || []).reduce((s, i) => s + (i.totalReceivedQty || 0), 0),
//       );
//       const damagedItems = (inv.items || [])
//         .filter((i) => i.issue === "damage" && (i.damagedQty || 0) > 0)
//         .map((i) => ({
//           productCode: i.productCode,
//           damagedQty: i.damagedQty,
//           issueDetail: i.issueDetail || "",
//         }));
//       events.push({
//         type: "invoice",
//         icon: "⬆️",
//         label: `Invoice Uploaded${inv.invoiceNo ? ` — ${inv.invoiceNo}` : ""}`,
//         sub: `+${thisQty} units received`,
//         datetime: inv.createdAt,
//         invoiceDate: inv.invoiceDate,
//         qc: inv.qualityCheck,
//         remarks: inv.remarks,
//         status: inv.poStatus || "partial",
//         pending,
//         damagedItems,
//       });
//       if (inv.poStatus === "partial")
//         events.push({
//           type: "status",
//           icon: "🔄",
//           label: "Status changed → PARTIAL",
//           sub: `${pending} units still pending`,
//           datetime: inv.createdAt,
//           status: "partial",
//           pending,
//         });
//       else if (inv.poStatus === "complete")
//         events.push({
//           type: "status",
//           icon: "✅",
//           label: "Status changed → COMPLETE",
//           sub: `All ${invOrdered} units received`,
//           datetime: inv.createdAt,
//           status: "complete",
//         });
//       else if (inv.poStatus === "excess")
//         events.push({
//           type: "status",
//           icon: "⚠️",
//           label: "Status changed → EXCESS",
//           sub: `Received more than ordered`,
//           datetime: inv.createdAt,
//           status: "excess",
//         });
//     });
//   return (
//     <Card>
//       <CardHeader
//         title="PO History Timeline"
//         subtitle={`${linkedInvoices.length} invoice${linkedInvoices.length !== 1 ? "s" : ""} · ${totalReceived}/${totalOrdered} units received${totalPending > 0 ? ` · ${totalPending} pending` : ""}`}
//       />
//       {loadingHistory ? (
//         <div className="px-6 py-8 text-center">
//           <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto mb-2" />
//           <p className="text-xs text-slate-400">Loading history...</p>
//         </div>
//       ) : (
//         <div className="divide-y divide-slate-50">
//           {events.map((event, idx) => (
//             <div
//               key={idx}
//               className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
//             >
//               <div className="flex items-start gap-3 flex-1 min-w-0">
//                 <span className="text-sm mt-0.5 flex-shrink-0">
//                   {event.icon}
//                 </span>
//                 <div className="min-w-0">
//                   <div className="flex items-center gap-2 flex-wrap">
//                     <p className="text-xs font-bold text-slate-800">
//                       {event.label}
//                     </p>
//                     <StatusPill status={event.status} />
//                   </div>
//                   <p className="text-[11px] text-slate-500 mt-0.5">
//                     {event.sub}
//                   </p>
//                   {event.type === "invoice" && (
//                     <div className="flex items-center gap-3 mt-1 flex-wrap">
//                       {event.invoiceDate && (
//                         <span className="text-[10px] text-slate-400">
//                           📅 {formatDate(event.invoiceDate)}
//                         </span>
//                       )}
//                       {event.qc && (
//                         <span
//                           className={`text-[10px] font-bold ${event.qc === "passed" ? "text-emerald-600" : event.qc === "failed" ? "text-red-600" : "text-orange-600"}`}
//                         >
//                           🔍 QC: {event.qc.toUpperCase()}
//                         </span>
//                       )}
//                       {event.remarks && (
//                         <span className="text-[10px] text-slate-400 italic">
//                           💬 {event.remarks}
//                         </span>
//                       )}
//                     </div>
//                   )}
//                   {event.type === "invoice" &&
//                     event.damagedItems?.length > 0 && (
//                       <div className="mt-1 space-y-0.5">
//                         {event.damagedItems.map((d, i) => (
//                           <span
//                             key={i}
//                             className="text-[10px] text-red-500 font-bold block"
//                           >
//                             🔴 {d.productCode}: {d.damagedQty} damaged
//                             {d.issueDetail ? ` — ${d.issueDetail}` : ""}
//                           </span>
//                         ))}
//                       </div>
//                     )}
//                   {event.type === "status" &&
//                     event.status === "partial" &&
//                     event.pending > 0 && (
//                       <p className="text-[10px] text-orange-500 font-bold mt-1">
//                         ↳ Next invoice required for remaining {event.pending}{" "}
//                         units
//                       </p>
//                     )}
//                 </div>
//               </div>
//               {event.datetime && (
//                 <p className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 flex items-center gap-1 mt-0.5">
//                   <FiClock size={9} />
//                   {formatDateTime(event.datetime)}
//                 </p>
//               )}
//             </div>
//           ))}
//           {totalPending > 0 && linkedInvoices.length > 0 && (
//             <div className="px-6 py-3 flex items-center gap-3">
//               <span className="text-sm flex-shrink-0">⏳</span>
//               <div>
//                 <p className="text-xs font-bold text-slate-400">
//                   Awaiting next invoice...
//                 </p>
//                 <p className="text-[11px] text-orange-500 font-bold mt-0.5">
//                   {totalPending} units still pending
//                 </p>
//               </div>
//             </div>
//           )}
//           {linkedInvoices.length === 0 && (
//             <div className="px-6 py-4 flex items-center gap-3">
//               <span className="text-sm">⏳</span>
//               <p className="text-xs text-slate-400">
//                 No invoices uploaded yet for this PO
//               </p>
//             </div>
//           )}
//         </div>
//       )}
//     </Card>
//   );
// }

// function WaitingForStoreApproval({
//   selectedPO,
//   invoiceNo,
//   getTotalNewReceived,
// }) {
//   const [dots, setDots] = useState(".");
//   useEffect(() => {
//     const t = setInterval(
//       () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
//       600,
//     );
//     return () => clearInterval(t);
//   }, []);
//   return (
//     <div className="space-y-5">
//       <Card>
//         <div className="p-10 flex flex-col items-center text-center">
//           <div className="relative mb-6">
//             <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
//               <FiShield size={34} className="text-indigo-400" />
//             </div>
//             <span className="absolute inset-0 rounded-full border-2 border-indigo-300 animate-ping opacity-30" />
//             <span
//               className="absolute -inset-2 rounded-full border border-indigo-200 animate-ping opacity-20"
//               style={{ animationDelay: "0.4s" }}
//             />
//           </div>
//           <h3 className="text-base font-black text-slate-800 mb-2">
//             Waiting for Store QC Approval{dots}
//           </h3>
//           <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-7">
//             The store team is currently verifying the received material quality.
//             This page will <strong>automatically unlock</strong> once they
//             approve — no need to refresh.
//           </p>
//           <div className="flex items-center gap-3 flex-wrap justify-center mb-8">
//             {[
//               ["PO", selectedPO?.poNumber],
//               ["Invoice", invoiceNo || "—"],
//               ["Units", getTotalNewReceived()],
//             ].map(([label, val]) => (
//               <div
//                 key={label}
//                 className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full"
//               >
//                 <span className="text-[10px] text-slate-400 font-bold uppercase">
//                   {label}
//                 </span>
//                 <span className="text-xs font-black text-slate-700">{val}</span>
//               </div>
//             ))}
//           </div>
//           <div className="w-full max-w-xs space-y-3 text-left">
//             {[
//               { label: "Invoice uploaded to system", done: true },
//               { label: "Store team notified for QC", done: true },
//               {
//                 label: "Store QC inspection in progress",
//                 done: false,
//                 active: true,
//               },
//               { label: "Sales confirm receipt", done: false },
//             ].map((s, i) => (
//               <div key={i} className="flex items-center gap-3">
//                 <div
//                   className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? "bg-emerald-500" : s.active ? "bg-indigo-100 border-2 border-indigo-400" : "bg-slate-100 border-2 border-slate-200"}`}
//                 >
//                   {s.done ? (
//                     <FiCheck size={11} className="text-white" />
//                   ) : s.active ? (
//                     <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
//                   ) : null}
//                 </div>
//                 <span
//                   className={`text-xs ${s.done ? "text-emerald-700 font-medium" : s.active ? "text-indigo-700 font-bold" : "text-slate-400"}`}
//                 >
//                   {s.label}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </Card>
//       <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
//         <FiAlertCircle
//           size={15}
//           className="text-blue-500 mt-0.5 flex-shrink-0"
//         />
//         <p className="text-xs text-blue-800">
//           <strong>Store team</strong> will review and approve from their panel.
//           Once they mark it <strong>Approved</strong>, the Submit button will
//           appear here automatically.
//         </p>
//       </div>
//     </div>
//   );
// }

// export default function UploadVendorInvoice() {
//   const navigate = useNavigate();
//   const urlParams = new URLSearchParams(window.location.search);
//   const urlPoId = urlParams.get("poId");

//   const [step, setStep] = useState(urlPoId ? 2 : 1);
//   const [selectedPO, setSelectedPO] = useState(null);
//   const [invoiceExcelFile, setInvoiceExcelFile] = useState(null);
//   const [invoiceHeader, setInvoiceHeader] = useState(null);
//   const [invoiceNo, setInvoiceNo] = useState("");
//   const [invoiceDate, setInvoiceDate] = useState(
//     new Date().toISOString().split("T")[0],
//   );
//   const [parsingExcel, setParsingExcel] = useState(false);
//   const [excelParsed, setExcelParsed] = useState(false);
//   const [receivedItems, setReceivedItems] = useState([]);
//   const [qualityCheck, setQualityCheck] = useState("passed");
//   const [remarks, setRemarks] = useState("");
//   const [uploading, setUploading] = useState(false);
//   const [pendingPOs, setPendingPOs] = useState([]);
//   const [loadingPOs, setLoadingPOs] = useState(true);
//   const [linkedInvoices, setLinkedInvoices] = useState([]);
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [duplicateWarning, setDuplicateWarning] = useState("");
//   const [savedInvoiceId, setSavedInvoiceId] = useState(null);
//   const [storeQcStatus, setStoreQcStatus] = useState(null);
//   const [storeQcApprovedBy, setStoreQcApprovedBy] = useState("");
//   const [storeQcApprovedAt, setStoreQcApprovedAt] = useState("");
//   const [selectedDate, setSelectedDate] = useState("all");
//   const unsubQcRef = useRef(null);

//   useEffect(() => {
//     const fetchPOs = async () => {
//       try {
//         const snap = await getDocs(
//           query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
//         );
//         const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//         const pos = all.filter((d) => {
//           if (d.type === "INVOICE" || d.type === "SALES_ORDER") return false;
//           if (d.type !== "PO") {
//             const b = d.excelHeader?.buyer;
//             if (b && b.trim() !== "") return false;
//           }
//           const hasDamagedPending = (d.items || []).some(
//             (i) => (i.damagedQty || 0) > 0,
//           );
//           if (
//             (d.poStatus === "complete" ||
//               d.poStatus === "received" ||
//               d.poStatus === "excess") &&
//             !d.storeQcPending &&
//             !hasDamagedPending
//           )
//             return false;
//           return true;
//         });
//         setPendingPOs(
//           pos.map((po) => {
//             const { status: etaStatus, remainingDays } = calcEtaStatus(
//               po.deliveryDate,
//             );
//             const totalDamagedQty = (po.items || []).reduce(
//               (sum, i) => sum + (i.damagedQty || 0),
//               0,
//             );
//             return {
//               id: po.id,
//               poNumber:
//                 po.woNumber ||
//                 po.excelHeader?.voucherNo ||
//                 po.excelHeader?.poNumber ||
//                 po.excelHeader?.orderNo ||
//                 po.poNumber ||
//                 po.id.slice(0, 8).toUpperCase(),
//               vendor:
//                 po.customer ||
//                 po.excelHeader?.supplier ||
//                 po.excelHeader?.consignee ||
//                 "—",
//               date:
//                 po.excelHeader?.dated ||
//                 po.excelHeader?.date ||
//                 po.excelHeader?.invoiceDate ||
//                 (po.createdAt ? formatDateLabel(po.createdAt) : ""),
//               eta: po.deliveryDate || "—",
//               status: po.storeQcPending
//                 ? "waiting_qc"
//                 : po.poStatus || etaStatus,
//               remainingDays,
//               createdAt: po.createdAt || null,
//               storeQcStatus: po.storeQcStatus || null,
//               totalDamagedQty,
//               hasDamagedPending: totalDamagedQty > 0,
//               items: (po.items || []).map((item) => ({
//                 ...item,
//                 orderedQty: item.orderedQty || item.quantity || 0,
//                 totalReceivedQty:
//                   item.totalReceivedQty || item.receivedQty || 0,
//                 unit: item.unit || "pcs",
//               })),
//             };
//           }),
//         );
//       } catch (err) {
//         void err;
//       } finally {
//         setLoadingPOs(false);
//       }
//     };
//     fetchPOs();
//   }, []);

//   useEffect(() => {
//     if (loadingPOs || pendingPOs.length === 0 || !urlPoId) return;
//     const matched = pendingPOs.find((po) => po.id === urlPoId);
//     if (matched) handleSelectPO(matched);
//   }, [loadingPOs, pendingPOs.length]);

//   useEffect(() => {
//     if (!selectedPO) {
//       setLinkedInvoices([]);
//       return;
//     }
//     setLoadingHistory(true);
//     getDocs(
//       query(
//         collection(db, "excelupload"),
//         where("linkedPoId", "==", selectedPO.id),
//       ),
//     )
//       .then((snap) => {
//         setLinkedInvoices(
//           snap.docs
//             .map((d) => ({ id: d.id, ...d.data() }))
//             .filter((d) => d.type === "INVOICE")
//             .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
//         );
//       })
//       .catch(() => {})
//       .finally(() => setLoadingHistory(false));
//   }, [selectedPO?.id]);

//   useEffect(() => {
//     if (!selectedPO || loadingHistory || savedInvoiceId) return;
//     const pendingInv = linkedInvoices.find(
//       (inv) => inv.storeQcStatus === "pending",
//     );
//     if (pendingInv) {
//       setInvoiceNo(pendingInv.invoiceNo || "");
//       setInvoiceDate(
//         pendingInv.invoiceDate || new Date().toISOString().split("T")[0],
//       );
//       setSavedInvoiceId(pendingInv.id);
//       setStep(4);
//     }
//   }, [linkedInvoices, loadingHistory, selectedPO]);

//   useEffect(() => {
//     if (!savedInvoiceId) return;
//     if (unsubQcRef.current) unsubQcRef.current();
//     setStoreQcStatus("pending");
//     const unsub = onSnapshot(
//       doc(db, "excelupload", savedInvoiceId),
//       (snap) => {
//         if (!snap.exists()) return;
//         const data = snap.data();
//         setStoreQcStatus(data.storeQcStatus || "pending");
//         setStoreQcApprovedBy(data.storeQcApprovedBy || "");
//         setStoreQcApprovedAt(data.storeQcApprovedAt || "");
//         if (data.items) setReceivedItems(data.items);
//       },
//       () => {
//         setStoreQcStatus("pending");
//       },
//     );
//     unsubQcRef.current = unsub;
//     return () => unsub();
//   }, [savedInvoiceId]);

//   const availableDates = [
//     ...new Set(
//       pendingPOs.map((po) => getDateKey(po.createdAt)).filter(Boolean),
//     ),
//   ].sort((a, b) => b.localeCompare(a));
//   const filteredPOs =
//     selectedDate === "all"
//       ? pendingPOs
//       : pendingPOs.filter((po) => getDateKey(po.createdAt) === selectedDate);

//   const handleSelectPO = (po) => {
//     setSelectedPO(po);
//     setReceivedItems(
//       po.items.map((item) => ({
//         ...item,
//         newReceived: 0,
//         alreadyReceived: item.totalReceivedQty || 0,
//         orderedQty: item.orderedQty || item.quantity || 0,
//       })),
//     );
//     setExcelParsed(false);
//     setInvoiceExcelFile(null);
//     setInvoiceHeader(null);
//     setInvoiceNo("");
//     setDuplicateWarning("");
//     setSavedInvoiceId(null);
//     setStoreQcStatus(null);
//     setStep(2);
//   };

//   const handleInvoiceExcel = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setInvoiceExcelFile(file);
//     setParsingExcel(true);
//     setDuplicateWarning("");
//     const reader = new FileReader();
//     reader.onload = (event) => {
//       try {
//         const data = new Uint8Array(event.target.result);
//         const workbook = XLSX.read(data, { type: "array" });
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];
//         const range = XLSX.utils.decode_range(sheet["!ref"]);
//         const findVal = (keywords) => {
//           for (let row = 0; row <= Math.min(40, range.e.r); row++) {
//             for (let col = 0; col <= range.e.c; col++) {
//               const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
//               if (cell && cell.v) {
//                 const val = String(cell.v).toLowerCase();
//                 for (const kw of keywords) {
//                   if (val.includes(kw.toLowerCase())) {
//                     const right =
//                       sheet[XLSX.utils.encode_cell({ r: row, c: col + 1 })];
//                     const below =
//                       sheet[XLSX.utils.encode_cell({ r: row + 1, c: col })];
//                     const right2 =
//                       sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
//                     if (right && right.v) return String(right.v);
//                     if (below && below.v) return String(below.v);
//                     if (right2 && right2.v) return String(right2.v);
//                   }
//                 }
//               }
//             }
//           }
//           return "";
//         };
//         const rawSupplierInv = findVal([
//           "Supplier Invoice No.",
//           "Supplier Invoice No. & Date",
//           "Supplier Inv",
//         ]);
//         let parsedInvoiceNo = "",
//           parsedInvoiceDate = "";
//         if (rawSupplierInv) {
//           const dtMatch = rawSupplierInv.match(/^(.+?)\s+dt\.?\s*(.+)$/i);
//           if (dtMatch) {
//             parsedInvoiceNo = dtMatch[1].trim();
//             parsedInvoiceDate = dtMatch[2].trim();
//           } else {
//             parsedInvoiceNo = rawSupplierInv.trim();
//           }
//         }
//         if (!parsedInvoiceNo)
//           parsedInvoiceNo = findVal([
//             "Invoice No.",
//             "Invoice No",
//             "Invoice Number",
//             "Bill No",
//           ]);
//         if (!parsedInvoiceDate)
//           parsedInvoiceDate = findVal([
//             "Dates",
//             "Dated",
//             "Invoice Date",
//             "Bill Date",
//           ]);
//         const header = {
//           invoiceNo: parsedInvoiceNo,
//           dated: parsedInvoiceDate,
//           supplier: findVal(["Supplier (Bill from)", "Supplier", "Bill from"]),
//           consignee: findVal(["Consignee (Ship to)", "Consignee", "Ship to"]),
//           gstin: findVal(["GSTIN/UIN", "GSTIN"]),
//         };
//         if (header.invoiceNo) {
//           setInvoiceNo(header.invoiceNo);
//           if (
//             linkedInvoices.some(
//               (inv) =>
//                 inv.invoiceNo?.toLowerCase().trim() ===
//                 header.invoiceNo?.toLowerCase().trim(),
//             )
//           )
//             setDuplicateWarning(
//               `⚠️ Invoice "${header.invoiceNo}" has already been uploaded for this PO.`,
//             );
//         }
//         if (header.dated) {
//           const c = toInputDate(header.dated);
//           setInvoiceDate(c || header.dated);
//         }
//         setInvoiceHeader(header);
//         let tableStartRow = -1;
//         for (let row = 0; row <= range.e.r; row++) {
//           for (let col = 0; col <= range.e.c; col++) {
//             const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
//             if (cell && cell.v) {
//               const val = String(cell.v).toLowerCase();
//               if (
//                 val.includes("description of goods") ||
//                 val === "sl" ||
//                 val === "si"
//               ) {
//                 tableStartRow = row;
//                 break;
//               }
//             }
//           }
//           if (tableStartRow !== -1) break;
//         }
//         if (tableStartRow === -1) {
//           alert("Table not found");
//           setParsingExcel(false);
//           return;
//         }
//         let descCol = -1,
//           hsnCol = -1,
//           partCol = -1,
//           qtyCol = -1;
//         for (let col = 0; col <= range.e.c; col++) {
//           const cell =
//             sheet[XLSX.utils.encode_cell({ r: tableStartRow, c: col })];
//           if (cell && cell.v) {
//             const val = String(cell.v).toLowerCase();
//             if (val.includes("description")) descCol = col;
//             if (val.includes("hsn")) hsnCol = col;
//             if (val.includes("part")) partCol = col;
//             if (val.includes("quantity")) qtyCol = col;
//           }
//         }
//         const invoiceItems = [];
//         for (let row = tableStartRow + 2; row <= range.e.r; row++) {
//           const descCell =
//             sheet[XLSX.utils.encode_cell({ r: row, c: descCol })];
//           if (!descCell || !descCell.v) break;
//           const partCode =
//             partCol >= 0
//               ? sheet[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v || ""
//               : "";
//           const qty =
//             qtyCol >= 0
//               ? parseFloat(
//                   sheet[XLSX.utils.encode_cell({ r: row, c: qtyCol })]?.v || 0,
//                 )
//               : 0;
//           invoiceItems.push({
//             productCode: String(partCode).trim(),
//             description: String(descCell.v),
//             invoiceQty: qty,
//             hsnSac:
//               hsnCol >= 0
//                 ? sheet[XLSX.utils.encode_cell({ r: row, c: hsnCol })]?.v || ""
//                 : "",
//           });
//         }
//         if (selectedPO) {
//           setReceivedItems(
//             selectedPO.items.map((poItem) => {
//               const already = poItem.totalReceivedQty || 0;
//               const orderedQty = poItem.orderedQty || poItem.quantity || 0;
//               const matched = invoiceItems.find(
//                 (inv) =>
//                   inv.productCode &&
//                   poItem.productCode &&
//                   inv.productCode.toLowerCase().trim() ===
//                     poItem.productCode.toLowerCase().trim(),
//               );
//               return {
//                 ...poItem,
//                 orderedQty,
//                 alreadyReceived: already,
//                 newReceived: matched ? matched.invoiceQty : 0,
//                 invoiceQty: matched ? matched.invoiceQty : 0,
//                 matchedFromExcel: !!matched,
//               };
//             }),
//           );
//           setExcelParsed(true);
//         }
//         setParsingExcel(false);
//       } catch (err) {
//         setParsingExcel(false);
//         alert("Error: " + err.message);
//       }
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   const handleInvoiceNoChange = (val) => {
//     setInvoiceNo(val);
//     if (!val.trim()) {
//       setDuplicateWarning("");
//       return;
//     }
//     setDuplicateWarning(
//       linkedInvoices.some(
//         (inv) =>
//           inv.invoiceNo?.toLowerCase().trim() === val.toLowerCase().trim(),
//       )
//         ? `⚠️ Invoice "${val}" has already been uploaded for this PO.`
//         : "",
//     );
//   };

//   const handleSaveAndWait = async () => {
//     setUploading(true);
//     try {
//       const now = new Date().toISOString();
//       const updatedItems = receivedItems.map((item) => {
//         const oq = item.orderedQty || 0,
//           ar = item.alreadyReceived || 0,
//           nr = item.newReceived || 0,
//           tr = ar + nr;
//         return {
//           ...item,
//           totalReceivedQty: tr,
//           orderedQty: oq,
//           quantity: oq,
//           shortage: Math.max(0, oq - tr),
//           itemStatus: getItemStatus(oq, tr),
//         };
//       });
//       const poStatus = calcPoStatus(
//         updatedItems.map((i) => ({
//           orderedQty: i.orderedQty,
//           totalReceivedQty: i.totalReceivedQty,
//         })),
//       );
//       const invoiceRef = await addDoc(collection(db, "excelupload"), {
//         type: "INVOICE",
//         linkedPoId: selectedPO.id,
//         linkedPoNo: selectedPO.poNumber,
//         invoiceNo,
//         invoiceDate,
//         vendor: selectedPO.vendor,
//         invoiceHeader: invoiceHeader || {},
//         items: updatedItems,
//         poStatus,
//         invoiceIndex: linkedInvoices.length + 1,
//         createdAt: now,
//         storeQcStatus: "pending",
//       });
//       await updateDoc(doc(db, "excelupload", selectedPO.id), {
//         storeQcPending: true,
//         pendingInvoiceId: invoiceRef.id,
//       });
//       setSavedInvoiceId(invoiceRef.id);
//       setUploading(false);
//       setStep(4);
//       // ✅ Store ને notify — new PO invoice for QC
//       await addDoc(collection(db, "notifications"), {
//         type: "pending_qc",
//         source: "po",
//         target: "store",
//         refNo: selectedPO.poNumber,
//         invoiceNo: invoiceNo,
//         productCode: "",
//         message: `📦 New Invoice pending QC — ${invoiceNo} (PO: ${selectedPO.poNumber} · ${selectedPO.vendor})`,
//         isRead: false,
//         isResolved: false,
//         createdAt: now,
//         resolvedAt: null,
//       });
//     } catch (err) {
//       setUploading(false);
//       alert("Error: " + err.message);
//     }
//   };

//   const handleFinalSubmit = async () => {
//     setUploading(true);
//     try {
//       const now = new Date().toISOString();
//       const updatedItems = receivedItems.map((item) => {
//         const oq = item.orderedQty || 0,
//           ar = item.alreadyReceived || 0,
//           nr = item.newReceived || 0,
//           tr = ar + nr;
//         return {
//           ...item,
//           totalReceivedQty: tr,
//           orderedQty: oq,
//           quantity: oq,
//           shortage: Math.max(0, oq - tr),
//           itemStatus: getItemStatus(oq, tr),
//         };
//       });
//       const rawPoStatus = calcPoStatus(
//         updatedItems.map((i) => ({
//           orderedQty: i.orderedQty,
//           totalReceivedQty: i.totalReceivedQty,
//         })),
//       );
//       const displayPoStatus =
//         rawPoStatus === "partial" || rawPoStatus === "complete"
//           ? "received"
//           : rawPoStatus;
//       await updateDoc(doc(db, "excelupload", selectedPO.id), {
//         items: updatedItems,
//         poStatus: displayPoStatus,
//         salesConfirmedAt: now,
//         invoiceNo,
//         invoiceNos: arrayUnion(invoiceNo),
//         invoiceDate,
//         qualityCheck,
//         remarks,
//         invoiceCount: linkedInvoices.length + 1,
//         totalReceivedQty: updatedItems.reduce(
//           (s, i) => s + i.totalReceivedQty,
//           0,
//         ),
//         storeQcPending: false,
//         pendingInvoiceId: null,
//       });
//       if (savedInvoiceId)
//         await updateDoc(doc(db, "excelupload", savedInvoiceId), {
//           qualityCheck,
//           remarks,
//           salesConfirmedAt: now,
//           poStatus: displayPoStatus,
//         });
//       setUploading(false);
//       setStep(5);
//     } catch (err) {
//       setUploading(false);
//       alert("Error: " + err.message);
//     }
//   };

//   const getTotalShortage = () =>
//     receivedItems.reduce(
//       (sum, item) =>
//         sum +
//         Math.max(
//           0,
//           (item.orderedQty || 0) -
//             ((item.alreadyReceived || 0) + (item.newReceived || 0)),
//         ),
//       0,
//     );
//   const getTotalNewReceived = () =>
//     receivedItems.reduce((sum, item) => sum + (item.newReceived || 0), 0);
//   const livePoStatus = (() => {
//     const c = calcPoStatus(
//       receivedItems.map((i) => ({
//         orderedQty: i.orderedQty || 0,
//         totalReceivedQty: (i.alreadyReceived || 0) + (i.newReceived || 0),
//       })),
//     );
//     if (c === "partial" || c === "complete") return "received";
//     if (c === "excess") return "excess";
//     return c;
//   })();
//   const isStoreApproved =
//     storeQcStatus === "approved" || storeQcStatus === "approved_with_issues";
//   const hasIssues = storeQcStatus === "approved_with_issues";
//   const damagedItemsList = receivedItems.filter(
//     (i) => i.issue === "damage" && (i.damagedQty || 0) > 0,
//   );
//   const steps = [
//     { num: 1, label: "Select PO" },
//     { num: 2, label: "Upload Invoice" },
//     { num: 3, label: "Verify Qty" },
//     { num: 4, label: "Submit Invoice" },
//   ];

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-xl font-black text-slate-800">
//             Upload Vendor Invoice
//           </h2>
//           <p className="text-xs text-slate-400 mt-0.5">
//             Record material receipt and update inventory
//           </p>
//         </div>
//         <BtnSecondary onClick={() => navigate("/sales/purchase-orders")}>
//           Cancel
//         </BtnSecondary>
//       </div>

//       {step < 5 && (
//         <Card className="p-5">
//           <div className="flex items-center justify-between max-w-2xl mx-auto">
//             {steps.map((s, idx) => (
//               <React.Fragment key={s.num}>
//                 <div className="flex flex-col items-center gap-1">
//                   <div
//                     className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${step > s.num ? "bg-indigo-600 text-white" : step === s.num ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-200 text-slate-400"}`}
//                   >
//                     {step > s.num ? <FiCheck size={16} /> : s.num}
//                   </div>
//                   <p
//                     className={`text-[10px] font-bold whitespace-nowrap ${step >= s.num ? "text-slate-700" : "text-slate-400"}`}
//                   >
//                     {s.label}
//                   </p>
//                 </div>
//                 {idx < 3 && (
//                   <div
//                     className={`flex-1 h-0.5 mx-1 ${step > s.num ? "bg-indigo-600" : "bg-slate-200"}`}
//                   />
//                 )}
//               </React.Fragment>
//             ))}
//           </div>
//         </Card>
//       )}

//       {step === 1 && (
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-black text-slate-800">
//                 Select Purchase Order
//               </p>
//               <p className="text-xs text-slate-400 mt-0.5">
//                 {filteredPOs.length} PO{filteredPOs.length !== 1 ? "s" : ""}
//                 {selectedDate !== "all"
//                   ? ` on ${formatDateLabel(selectedDate)}`
//                   : " awaiting material"}
//               </p>
//             </div>
//             <CalendarPicker
//               activeDates={availableDates}
//               selected={selectedDate}
//               onChange={setSelectedDate}
//             />
//           </div>
//           {loadingPOs ? (
//             <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
//               <p className="text-sm text-slate-400">
//                 Loading purchase orders...
//               </p>
//             </div>
//           ) : filteredPOs.length === 0 ? (
//             <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
//               <FiCalendar size={40} className="mx-auto mb-3 text-slate-300" />
//               <p className="text-sm font-bold text-slate-600">
//                 {selectedDate !== "all"
//                   ? `${formatDateLabel(selectedDate)} na koi PO nathi`
//                   : "No Pending Purchase Orders"}
//               </p>
//               <p className="text-xs text-slate-400 mt-1">
//                 {selectedDate !== "all" ? (
//                   <button
//                     onClick={() => setSelectedDate("all")}
//                     className="text-indigo-500 hover:underline font-semibold"
//                   >
//                     All dates jouo
//                   </button>
//                 ) : (
//                   "All POs are fully received or completed"
//                 )}
//               </p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {filteredPOs.map((po) => (
//                 <POSelectCard key={po.id} po={po} onSelect={handleSelectPO} />
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {step === 2 && selectedPO && (
//         <div className="space-y-6">
//           {selectedPO.hasDamagedPending && (
//             <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
//               <FiAlertTriangle
//                 size={15}
//                 className="text-red-500 mt-0.5 flex-shrink-0"
//               />
//               <div>
//                 <p className="text-sm font-black text-red-800">
//                   Damage Replacement Invoice
//                 </p>
//                 <p className="text-xs text-red-700 mt-0.5">
//                   This PO has{" "}
//                   <strong>{selectedPO.totalDamagedQty} damaged units</strong>{" "}
//                   that were not added to stock. Upload the vendor's replacement
//                   invoice.
//                 </p>
//               </div>
//             </div>
//           )}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             <Card>
//               <CardHeader title="Selected Purchase Order" />
//               <div className="p-6 space-y-4">
//                 <div className="p-4 bg-slate-50 rounded-lg">
//                   <div className="grid grid-cols-2 gap-3 text-xs">
//                     <div>
//                       <p className="text-slate-400 font-bold mb-1">PO Number</p>
//                       <p className="text-slate-800 font-bold">
//                         {selectedPO.poNumber}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-slate-400 font-bold mb-1">Vendor</p>
//                       <p className="text-slate-800 font-bold">
//                         {selectedPO.vendor}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-slate-400 font-bold mb-1">PO Date</p>
//                       <p className="text-slate-800">{selectedPO.date || "—"}</p>
//                     </div>
//                     <div>
//                       <p className="text-slate-400 font-bold mb-1">Status</p>
//                       <StatusPill status={selectedPO.status} />
//                     </div>
//                   </div>
//                 </div>
//                 <div>
//                   <p className="text-xs font-bold text-slate-600 mb-2">
//                     📋 PO Items ({selectedPO.items.length}):
//                   </p>
//                   <div className="space-y-1 max-h-48 overflow-y-auto">
//                     {selectedPO.items.map((item, idx) => (
//                       <div
//                         key={idx}
//                         className={`flex items-start text-xs px-3 py-2 rounded-lg gap-3 ${(item.damagedQty || 0) > 0 ? "bg-red-50 border border-red-100" : "bg-slate-50"}`}
//                       >
//                         <span className="w-6 font-bold text-slate-600">
//                           {idx + 1}.
//                         </span>
//                         <span className="w-28 font-mono text-slate-700">
//                           {item.productCode}
//                         </span>
//                         <span className="flex-1 text-slate-500">
//                           {item.description}
//                         </span>
//                         <span className="w-20 text-slate-500">
//                           {item.orderedQty} {item.unit}
//                         </span>
//                         {item.totalReceivedQty > 0 && (
//                           <span className="w-20 text-orange-600 font-bold">
//                             Recv: {item.totalReceivedQty}
//                           </span>
//                         )}
//                         {(item.damagedQty || 0) > 0 && (
//                           <span className="flex items-center gap-1 w-16 text-red-600 font-bold">
//                             <FiAlertTriangle size={9} /> {item.damagedQty}
//                           </span>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </Card>
//             <Card>
//               <CardHeader
//                 title="Upload Invoice Excel"
//                 subtitle="Vendor invoice Excel file"
//               />
//               <div className="p-6 space-y-4">
//                 <div>
//                   <label className="block text-xs font-bold text-slate-700 mb-2">
//                     Select Invoice Excel File{" "}
//                     <span className="text-red-500">*</span>
//                   </label>
//                   <div
//                     className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer"
//                     onClick={() =>
//                       document.getElementById("invoiceExcelInput").click()
//                     }
//                   >
//                     <FiUpload
//                       size={24}
//                       className="mx-auto mb-2 text-slate-400"
//                     />
//                     <p className="text-sm text-slate-600 font-medium">
//                       {invoiceExcelFile
//                         ? invoiceExcelFile.name
//                         : "Click to upload Invoice Excel"}
//                     </p>
//                     <p className="text-xs text-slate-400 mt-1">.xlsx or .xls</p>
//                     <input
//                       id="invoiceExcelInput"
//                       type="file"
//                       accept=".xlsx,.xls"
//                       className="hidden"
//                       onChange={handleInvoiceExcel}
//                     />
//                   </div>
//                 </div>
//                 {parsingExcel && (
//                   <div className="text-center py-4">
//                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
//                     <p className="text-sm text-slate-500">
//                       Parsing Invoice Excel...
//                     </p>
//                   </div>
//                 )}
//                 {invoiceHeader && excelParsed && (
//                   <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
//                     <p className="text-xs font-bold text-emerald-700 mb-2">
//                       ✅ Invoice Excel Parsed Successfully!
//                     </p>
//                     <div className="grid grid-cols-2 gap-2 text-xs">
//                       {invoiceHeader.invoiceNo && (
//                         <div>
//                           <p className="text-slate-400">Supplier Invoice No.</p>
//                           <p className="font-bold text-slate-800">
//                             {invoiceHeader.invoiceNo}
//                           </p>
//                         </div>
//                       )}
//                       {invoiceHeader.dated && (
//                         <div>
//                           <p className="text-slate-400">Dated</p>
//                           <p className="font-bold text-slate-800">
//                             {invoiceHeader.dated}
//                           </p>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 )}
//                 {duplicateWarning && (
//                   <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
//                     <FiAlertTriangle
//                       size={14}
//                       className="text-red-500 mt-0.5 flex-shrink-0"
//                     />
//                     <p className="text-xs font-bold text-red-700">
//                       {duplicateWarning}
//                     </p>
//                   </div>
//                 )}
//                 <Input
//                   label="Invoice Number"
//                   value={invoiceNo}
//                   onChange={(e) => handleInvoiceNoChange(e.target.value)}
//                   placeholder="Auto-filled from Excel or enter manually"
//                   required
//                 />
//                 <Input
//                   label="Invoice Date"
//                   type="date"
//                   value={invoiceDate}
//                   onChange={(e) => setInvoiceDate(e.target.value)}
//                   required
//                 />
//                 {excelParsed && (
//                   <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                     <p className="text-xs font-bold text-blue-700">
//                       📦{" "}
//                       {receivedItems.filter((i) => i.matchedFromExcel).length}{" "}
//                       items matched from Invoice Excel
//                     </p>
//                     {receivedItems.filter((i) => !i.matchedFromExcel).length >
//                       0 && (
//                       <p className="text-xs text-orange-600 mt-1">
//                         ⚠️{" "}
//                         {
//                           receivedItems.filter((i) => !i.matchedFromExcel)
//                             .length
//                         }{" "}
//                         PO items not found in Invoice
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </Card>
//           </div>
//           <POHistoryTimeline
//             selectedPO={selectedPO}
//             linkedInvoices={linkedInvoices}
//             loadingHistory={loadingHistory}
//           />
//         </div>
//       )}

//       {step === 3 && selectedPO && (
//         <Card>
//           <CardHeader title="Invoice Details" />
//           <div className="p-6 space-y-4">
//             <div className="p-4 bg-slate-50 rounded-lg">
//               <div className="grid grid-cols-2 gap-3 text-xs">
//                 <div>
//                   <p className="text-slate-400 font-bold mb-1">PO Number</p>
//                   <p className="text-slate-800 font-bold">
//                     {selectedPO.poNumber}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-slate-400 font-bold mb-1">Invoice No</p>
//                   <p className="text-slate-800 font-bold">{invoiceNo || "—"}</p>
//                 </div>
//                 <div>
//                   <p className="text-slate-400 font-bold mb-1">Vendor</p>
//                   <p className="text-slate-800">{selectedPO.vendor}</p>
//                 </div>
//                 <div>
//                   <p className="text-slate-400 font-bold mb-1">Invoice Date</p>
//                   <p className="text-slate-800">{invoiceDate}</p>
//                 </div>
//                 <div>
//                   <p className="text-slate-400 font-bold mb-1">
//                     Current PO Status
//                   </p>
//                   <StatusPill status={selectedPO.status} />
//                 </div>
//                 <div>
//                   <p className="text-slate-400 font-bold mb-1">
//                     After This Invoice
//                   </p>
//                   <StatusPill status={livePoStatus} />
//                 </div>
//               </div>
//             </div>
//             <div className="p-3 bg-slate-50 rounded-lg">
//               <p className="text-xs font-bold text-slate-600 mb-2">Summary:</p>
//               <div className="space-y-1 text-xs">
//                 <div className="flex justify-between">
//                   <span className="text-slate-500">This Invoice Qty:</span>
//                   <span className="font-bold text-slate-800">
//                     {getTotalNewReceived()} units
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-slate-500">Still Pending:</span>
//                   <span
//                     className={`font-bold ${getTotalShortage() > 0 ? "text-orange-600" : "text-emerald-600"}`}
//                   >
//                     {getTotalShortage()} units
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-slate-500">PO Status After:</span>
//                   <StatusPill status={livePoStatus} />
//                 </div>
//               </div>
//             </div>
//             <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
//               <FiAlertCircle
//                 size={13}
//                 className="text-indigo-500 mt-0.5 flex-shrink-0"
//               />
//               <p className="text-xs text-indigo-700">
//                 Clicking <strong>"Submit for Store QC"</strong> will send this
//                 invoice to the Store team for quality verification. Stock will
//                 update only after their approval.
//               </p>
//             </div>
//           </div>
//         </Card>
//       )}

//       {step === 4 && selectedPO && (
//         <>
//           {!isStoreApproved && (
//             <WaitingForStoreApproval
//               selectedPO={selectedPO}
//               invoiceNo={invoiceNo}
//               getTotalNewReceived={getTotalNewReceived}
//             />
//           )}
//           {isStoreApproved && (
//             <div className="space-y-5">
//               <div
//                 className={`flex items-center gap-4 p-4 rounded-xl border ${hasIssues ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50" : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50"}`}
//               >
//                 <div
//                   className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${hasIssues ? "bg-amber-500" : "bg-emerald-500"}`}
//                 >
//                   {hasIssues ? (
//                     <FiAlertTriangle size={20} className="text-white" />
//                   ) : (
//                     <FiCheck size={20} className="text-white" />
//                   )}
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <p
//                     className={`text-sm font-black ${hasIssues ? "text-amber-800" : "text-emerald-800"}`}
//                   >
//                     {hasIssues
//                       ? "Quality Check: Approved with Issues"
//                       : "Quality Check Approved by Store"}
//                   </p>
//                   <p
//                     className={`text-xs mt-0.5 ${hasIssues ? "text-amber-600" : "text-emerald-600"}`}
//                   >
//                     {storeQcApprovedBy
//                       ? `Approved by ${storeQcApprovedBy}`
//                       : "Items verified by store team."}
//                     {storeQcApprovedAt
//                       ? ` · ${formatDateTime(storeQcApprovedAt)}`
//                       : ""}
//                   </p>
//                 </div>
//                 <StatusPill status="received" />
//               </div>
//               {hasIssues && (
//                 <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
//                   <FiAlertTriangle
//                     size={15}
//                     className="text-amber-500 mt-0.5 flex-shrink-0"
//                   />
//                   <div>
//                     <p className="text-sm font-black text-amber-800">
//                       Damage Noted by Store Team
//                     </p>
//                     <p className="text-xs text-amber-700 mt-1">
//                       Damaged units are <strong>not added to stock</strong> and
//                       will remain pending from vendor.
//                     </p>
//                     {damagedItemsList.length > 0 && (
//                       <div className="mt-2 space-y-1">
//                         {damagedItemsList.map((item, i) => (
//                           <div
//                             key={i}
//                             className="flex items-center gap-2 text-xs text-amber-800"
//                           >
//                             <span className="font-bold font-mono bg-amber-100 px-1.5 py-0.5 rounded">
//                               {item.productCode}
//                             </span>
//                             <span>
//                               — <strong>{item.damagedQty}</strong> units damaged
//                             </span>
//                             {item.issueDetail && (
//                               <span className="text-amber-600 italic">
//                                 ({item.issueDetail})
//                               </span>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//               <Card>
//                 <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-50">
//                   <div>
//                     <h3 className="text-sm font-black text-slate-800">
//                       Invoice Summary
//                     </h3>
//                     <p className="text-[11px] text-slate-400 mt-0.5">
//                       Review before final submission
//                     </p>
//                   </div>
//                   <span className="px-3 py-1 text-[10px] font-black rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
//                     Ready to Submit
//                   </span>
//                 </div>
//                 <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
//                   {[
//                     ["PO Number", selectedPO.poNumber],
//                     ["Vendor", selectedPO.vendor],
//                     ["Invoice No.", invoiceNo || "—"],
//                     ["Invoice Date", invoiceDate || "—"],
//                     ["Total Invoices for PO", `#${linkedInvoices.length + 1}`],
//                     ["Units This Invoice", `${getTotalNewReceived()} units`],
//                   ].map(([label, val]) => (
//                     <div key={label}>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
//                         {label}
//                       </p>
//                       <p className="text-sm font-bold text-slate-800">{val}</p>
//                     </div>
//                   ))}
//                 </div>
//               </Card>
//               <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
//                 <FiAlertCircle
//                   size={15}
//                   className="text-amber-600 mt-0.5 flex-shrink-0"
//                 />
//                 <p className="text-xs text-amber-800">
//                   Once submitted, this invoice will be{" "}
//                   <strong>locked for editing</strong>. Stock records are already
//                   updated by Store.
//                 </p>
//               </div>
//             </div>
//           )}
//         </>
//       )}

//       {step === 2 && (
//         <div className="flex justify-end gap-3">
//           <BtnSecondary onClick={() => setStep(1)}>← Back</BtnSecondary>
//           <BtnPrimary
//             onClick={() => setStep(3)}
//             disabled={!excelParsed || !invoiceNo}
//           >
//             Next: Verify Quantities →
//           </BtnPrimary>
//         </div>
//       )}
//       {step === 3 && (
//         <div className="flex justify-end gap-3">
//           <BtnSecondary onClick={() => setStep(2)}>← Back</BtnSecondary>
//           <BtnPrimary onClick={handleSaveAndWait} disabled={uploading}>
//             {uploading ? (
//               <span className="flex items-center gap-2">
//                 <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
//                 Saving...
//               </span>
//             ) : (
//               "Submit for Store QC →"
//             )}
//           </BtnPrimary>
//         </div>
//       )}
//       {step === 4 && (
//         <div className="flex justify-end gap-3">
//           {isStoreApproved && (
//             <BtnPrimary onClick={handleFinalSubmit} disabled={uploading}>
//               {uploading ? (
//                 <span className="flex items-center gap-2">
//                   <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
//                   Processing...
//                 </span>
//               ) : (
//                 "✓ Confirm Receipt"
//               )}
//             </BtnPrimary>
//           )}
//         </div>
//       )}

//       {step === 5 && selectedPO && (
//         <div className="space-y-6">
//           {/* Steps bar — all complete */}
//           <Card className="p-5">
//             <div className="flex items-center justify-between max-w-2xl mx-auto">
//               {steps.map((s, idx) => (
//                 <React.Fragment key={s.num}>
//                   <div className="flex flex-col items-center gap-1">
//                     <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-indigo-600 text-white">
//                       <FiCheck size={16} />
//                     </div>
//                     <p className="text-[10px] font-bold whitespace-nowrap text-slate-700">
//                       {s.label}
//                     </p>
//                   </div>
//                   {idx < 3 && (
//                     <div className="flex-1 h-0.5 mx-1 bg-indigo-600" />
//                   )}
//                 </React.Fragment>
//               ))}
//             </div>
//           </Card>

//           {/* Main success card */}
//           <Card>
//             <div className="p-10 text-center">
//               {/* Animated success icon */}
//               <div className="relative w-24 h-24 mx-auto mb-6">
//                 <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center shadow-lg shadow-emerald-100">
//                   <FiCheck size={44} className="text-emerald-600" />
//                 </div>
//               </div>

//               <h3 className="text-xl font-black text-slate-800 mb-2">
//                 Invoice Confirmed & Receipt Complete!
//               </h3>
//               <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
//                 Store QC approved. Material received and stock updated
//                 successfully.
//               </p>

//               {/* PO info chips */}
//               <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
//                 <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
//                   <span className="text-[10px] font-bold text-slate-400 uppercase">
//                     PO
//                   </span>
//                   <span className="text-xs font-black text-slate-800">
//                     {selectedPO.poNumber}
//                   </span>
//                 </div>
//                 <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
//                   <span className="text-[10px] font-bold text-slate-400 uppercase">
//                     Invoice
//                   </span>
//                   <span className="text-xs font-black text-slate-800">
//                     {invoiceNo || "—"}
//                   </span>
//                 </div>
//                 <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
//                   <span className="text-[10px] font-bold text-slate-400 uppercase">
//                     Units
//                   </span>
//                   <span className="text-xs font-black text-slate-800">
//                     {getTotalNewReceived()}
//                   </span>
//                 </div>
//               </div>

//               {/* Completion checklist */}
//               <div className="max-w-sm mx-auto text-left space-y-3 mb-8">
//                 {[
//                   {
//                     label: "Invoice uploaded to system",
//                     sub: `Invoice: ${invoiceNo}`,
//                     done: true,
//                   },
//                   {
//                     label: "Store team notified for QC",
//                     sub: "Store Manager verified quality",
//                     done: true,
//                   },
//                   {
//                     label: "Store QC inspection complete",
//                     sub: hasIssues
//                       ? "Approved with issues noted"
//                       : "All items quality verified",
//                     done: true,
//                     issues: hasIssues,
//                   },
//                   {
//                     label: "Stock updated in inventory",
//                     sub: `+${getTotalNewReceived()} units added`,
//                     done: true,
//                   },
//                   {
//                     label: "Receipt confirmed by Sales",
//                     sub: "Invoice locked and recorded",
//                     done: true,
//                   },
//                 ].map((item, i) => (
//                   <div
//                     key={i}
//                     className={`flex items-start gap-3 p-3 rounded-xl ${item.issues ? "bg-amber-50 border border-amber-200" : "bg-emerald-50/60"}`}
//                   >
//                     <div
//                       className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.issues ? "bg-amber-500" : "bg-emerald-500"}`}
//                     >
//                       {item.issues ? (
//                         <FiAlertTriangle size={11} className="text-white" />
//                       ) : (
//                         <FiCheck size={12} className="text-white" />
//                       )}
//                     </div>
//                     <div>
//                       <p
//                         className={`text-xs font-bold ${item.issues ? "text-amber-700" : "text-slate-700"}`}
//                       >
//                         {item.label}
//                       </p>
//                       <p
//                         className={`text-[11px] mt-0.5 ${item.issues ? "text-amber-500" : "text-slate-400"}`}
//                       >
//                         {item.sub}
//                       </p>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Shortage warning */}
//               {getTotalShortage() > 0 && (
//                 <div className="max-w-sm mx-auto mb-6 flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-left">
//                   <FiAlertTriangle
//                     size={14}
//                     className="text-orange-500 mt-0.5 flex-shrink-0"
//                   />
//                   <p className="text-xs text-orange-700">
//                     <strong>{getTotalShortage()} units</strong> still pending
//                     from vendor. Upload another invoice when received.
//                   </p>
//                 </div>
//               )}

//               {/* Damage note */}
//               {hasIssues && damagedItemsList.length > 0 && (
//                 <div className="max-w-sm mx-auto mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-left">
//                   <p className="text-xs font-bold text-red-700 mb-2">
//                     🔴 Damage Tracked (vendor follow-up pending):
//                   </p>
//                   {damagedItemsList.map((item, i) => (
//                     <div
//                       key={i}
//                       className="flex items-center gap-2 text-xs text-red-700 mt-1"
//                     >
//                       <span className="font-mono font-bold bg-red-100 px-1.5 py-0.5 rounded">
//                         {item.productCode}
//                       </span>
//                       <span>
//                         — <strong>{item.damagedQty}</strong> units
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <div className="flex items-center justify-center gap-3 flex-wrap">
//                 {getTotalShortage() > 0 && (
//                   <BtnPrimary onClick={() => window.location.reload()}>
//                     Upload Remaining Invoice
//                   </BtnPrimary>
//                 )}
//                 <BtnSecondary
//                   onClick={() => {
//                     setStep(1);
//                     setSelectedPO(null);
//                     setReceivedItems([]);
//                     setExcelParsed(false);
//                     setInvoiceExcelFile(null);
//                     setInvoiceNo("");
//                     setInvoiceHeader(null);
//                     setLinkedInvoices([]);
//                     setDuplicateWarning("");
//                     setSavedInvoiceId(null);
//                   }}
//                 >
//                   Upload Another Invoice
//                 </BtnSecondary>
//                 <BtnPrimary onClick={() => navigate("/sales/purchase-orders")}>
//                   View Purchase Orders →
//                 </BtnPrimary>
//               </div>
//             </div>
//           </Card>

//           {/* Bottom info note */}
//           <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
//             <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
//               <FiCheck size={11} className="text-emerald-700" />
//             </div>
//             <p className="text-xs text-emerald-700">
//               <strong>Stock updated</strong> — {getTotalNewReceived()} units
//               added to inventory.
//               {getTotalShortage() > 0
//                 ? ` ${getTotalShortage()} units still pending from vendor.`
//                 : " All ordered units received successfully."}
//               {hasIssues &&
//                 " Some damaged units tracked for vendor debit note."}
//             </p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// import React, { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   FiFileText,
//   FiCheck,
//   FiAlertTriangle,
//   FiUpload,
//   FiClock,
//   FiAlertCircle,
//   FiShield,
//   FiPackage,
//   FiTruck,
//   FiChevronRight,
//   FiCalendar,
//   FiBox,
//   FiChevronLeft,
// } from "react-icons/fi";
// import {
//   Card,
//   CardHeader,
//   Input,
//   BtnPrimary,
//   BtnSecondary,
// } from "../SalesComponent/ui/index";
// import { db } from "../../firebase";
// import {
//   collection,
//   getDocs,
//   query,
//   orderBy,
//   addDoc,
//   updateDoc,
//   doc,
//   where,
//   arrayUnion,
//   onSnapshot,
// } from "firebase/firestore";
// import * as XLSX from "xlsx";

// function calcEtaStatus(deliveryDate) {
//   if (!deliveryDate) return { status: "ordered", remainingDays: 0 };
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const eta = new Date(deliveryDate);
//   eta.setHours(0, 0, 0, 0);
//   const diff = Math.round((eta - today) / (1000 * 60 * 60 * 24));
//   if (diff < 0) return { status: "overdue", remainingDays: diff };
//   if (diff <= 2) return { status: "warning", remainingDays: diff };
//   return { status: "ordered", remainingDays: diff };
// }

// function toInputDate(val) {
//   if (!val) return "";
//   const s = String(val).trim();
//   if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
//   const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
//   if (dmy)
//     return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
//   const monShort = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
//   if (monShort) {
//     const months = {
//       jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
//       jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
//     };
//     const m = months[monShort[2].toLowerCase()];
//     const yr = monShort[3].length === 2 ? "20" + monShort[3] : monShort[3];
//     if (m) return `${yr}-${m}-${monShort[1].padStart(2, "0")}`;
//   }
//   if (/^\d{5}$/.test(s)) {
//     const d = new Date(Math.round((+s - 25569) * 86400 * 1000));
//     if (!isNaN(d)) return d.toISOString().split("T")[0];
//   }
//   const d = new Date(s);
//   if (!isNaN(d)) return d.toISOString().split("T")[0];
//   return "";
// }

// function formatDateTime(val) {
//   if (!val) return "—";
//   try {
//     let date;
//     if (typeof val?.toDate === "function") date = val.toDate();
//     else if (val?.seconds) date = new Date(val.seconds * 1000);
//     else date = new Date(val);
//     return date.toLocaleString("en-IN", {
//       day: "2-digit", month: "short", year: "numeric",
//       hour: "2-digit", minute: "2-digit", hour12: true,
//     });
//   } catch {
//     return "—";
//   }
// }
// function formatDate(isoStr) {
//   if (!isoStr) return "—";
//   try {
//     return new Date(isoStr).toLocaleDateString("en-IN", {
//       day: "2-digit", month: "short", year: "numeric",
//     });
//   } catch {
//     return isoStr;
//   }
// }
// function formatDateLabel(isoStr) {
//   if (!isoStr) return "";
//   try {
//     return new Date(isoStr).toLocaleDateString("en-IN", {
//       day: "2-digit", month: "short", year: "numeric",
//     });
//   } catch {
//     return isoStr;
//   }
// }
// function getDateKey(val) {
//   if (!val) return null;
//   try {
//     let d;
//     if (typeof val?.toDate === "function") d = val.toDate();
//     else if (val?.seconds) d = new Date(val.seconds * 1000);
//     else d = new Date(val);
//     return d.toISOString().split("T")[0];
//   } catch {
//     return null;
//   }
// }
// function getItemStatus(orderedQty, totalReceivedQty) {
//   if (totalReceivedQty === 0) return "ordered";
//   if (totalReceivedQty < orderedQty) return "partial";
//   if (totalReceivedQty === orderedQty) return "complete";
//   return "excess";
// }
// function calcPoStatus(items) {
//   const s = items.map((i) =>
//     getItemStatus(i.orderedQty || i.quantity || 0, i.totalReceivedQty || 0),
//   );
//   if (s.every((x) => x === "complete")) return "complete";
//   if (s.some((x) => x === "excess")) return "excess";
//   if (s.some((x) => x === "partial" || x === "complete")) return "partial";
//   return "ordered";
// }

// function StatusPill({ status }) {
//   const map = {
//     material_hold: "bg-blue-50 text-blue-700 border-blue-200",
//     ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     dispatched: "bg-slate-50 text-slate-700 border-slate-200",
//     pending: "bg-amber-50 text-amber-700 border-amber-200",
//     overdue: "bg-red-50 text-red-700 border-red-200",
//     warning: "bg-orange-50 text-orange-700 border-orange-200",
//     ordered: "bg-blue-50 text-blue-700 border-blue-200",
//     partial: "bg-orange-50 text-orange-700 border-orange-200",
//     complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     excess: "bg-purple-50 text-purple-700 border-purple-200",
//     received: "bg-teal-50 text-teal-700 border-teal-200",
//     waiting_qc: "bg-indigo-50 text-indigo-700 border-indigo-200",
//   };
//   const n = status?.toLowerCase();
//   const label = n === "waiting_qc" ? "Waiting QC" : n?.replace("_", " ");
//   return (
//     <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wide ${map[n] || map.pending}`}>
//       {label}
//     </span>
//   );
// }

// function ReceiptProgress({ received, total }) {
//   const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
//   const color = pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-orange-400" : "bg-slate-300";
//   const text = pct === 100 ? "text-emerald-600" : pct > 0 ? "text-orange-500" : "text-slate-400";
//   return (
//     <div className="flex items-center gap-2 min-w-0">
//       <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
//         <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
//       </div>
//       <span className={`text-[11px] font-bold tabular-nums whitespace-nowrap ${text}`}>
//         {received}/{total}
//       </span>
//     </div>
//   );
// }

// const MONTHS_CAL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
// const DAYS_CAL = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// function CalendarPicker({ activeDates, selected, onChange }) {
//   const today = new Date().toISOString().split("T")[0];
//   const base = selected !== "all" ? new Date(selected) : new Date();
//   const [open, setOpen] = useState(false);
//   const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });
//   const ref = useRef(null);
//   useEffect(() => {
//     const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener("mousedown", h);
//     return () => document.removeEventListener("mousedown", h);
//   }, []);
//   const activeSet = new Set(activeDates);
//   const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
//   const firstDayOfWk = new Date(view.year, view.month, 1).getDay();
//   const prevMonth = () => setView((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
//   const nextMonth = () => setView((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
//   const handleDay = (day) => {
//     const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//     if (!activeSet.has(iso)) return;
//     onChange(selected === iso ? "all" : iso);
//     setOpen(false);
//   };
//   const cells = [];
//   for (let i = 0; i < firstDayOfWk; i++) cells.push(null);
//   for (let d = 1; d <= daysInMonth; d++) cells.push(d);
//   while (cells.length % 7 !== 0) cells.push(null);
//   const btnLabel = selected === "all" ? "All dates" : formatDateLabel(selected);
//   return (
//     <div className="relative" ref={ref}>
//       <button
//         onClick={() => setOpen((o) => !o)}
//         className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm border ${selected !== "all" ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}
//       >
//         <FiCalendar size={14} />
//         {btnLabel}
//         {selected !== "all" && (
//           <span onClick={(e) => { e.stopPropagation(); onChange("all"); }} className="ml-1 w-4 h-4 rounded-full bg-white/25 hover:bg-white/50 flex items-center justify-center text-white text-xs" title="Clear">×</span>
//         )}
//       </button>
//       {open && (
//         <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
//           <div className="flex items-center justify-between px-4 py-3 bg-indigo-600">
//             <button onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"><FiChevronLeft size={15} /></button>
//             <span className="text-sm font-bold text-white">{MONTHS_CAL[view.month]} {view.year}</span>
//             <button onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"><FiChevronRight size={15} /></button>
//           </div>
//           <div className="grid grid-cols-7 px-3 pt-3 pb-1">
//             {DAYS_CAL.map((d) => (<div key={d} className="text-center text-[10px] font-bold text-slate-400">{d}</div>))}
//           </div>
//           <div className="grid grid-cols-7 gap-y-1 px-3 pb-3">
//             {cells.map((day, idx) => {
//               if (!day) return <div key={idx} />;
//               const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//               const hasData = activeSet.has(iso);
//               const isSel = selected === iso;
//               const isToday = iso === today;
//               return (
//                 <button key={idx} onClick={() => handleDay(day)} disabled={!hasData}
//                   className={`relative mx-auto w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${isSel ? "bg-indigo-600 text-white shadow-md" : hasData ? "text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer" : "text-slate-300 cursor-not-allowed"} ${isToday && !isSel ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
//                 >
//                   {day}
//                   {hasData && !isSel && (<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />)}
//                 </button>
//               );
//             })}
//           </div>
//           <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
//             <p className="text-[10px] text-slate-400">{activeDates.length} date{activeDates.length !== 1 ? "s" : ""} have POs</p>
//             {selected !== "all" && (
//               <button onClick={() => { onChange("all"); setOpen(false); }} className="text-xs text-indigo-600 font-semibold hover:underline">Show all</button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// function POSelectCard({ po, onSelect }) {
//   const totalOrdered = po.items.reduce((s, i) => s + (i.orderedQty || 0), 0);
//   const totalReceived = po.items.reduce((s, i) => s + (i.totalReceivedQty || 0), 0);
//   const remaining = totalOrdered - totalReceived;
//   const isDamage = po.hasDamagedPending;
//   const isWaiting = po.status === "waiting_qc";
//   const isOverdue = po.status === "overdue";
//   const accentBar = isDamage ? "bg-red-500" : isWaiting ? "bg-indigo-500" : isOverdue ? "bg-red-400" : po.status === "partial" ? "bg-orange-400" : "bg-slate-300";
//   const btnStyle = isDamage ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700";
//   const btnLabel = isDamage ? "Upload Replacement Invoice" : po.status === "partial" ? "Receive Remaining" : "Receive Material";
//   return (
//     <div onClick={() => onSelect(po)} className="relative bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-150 overflow-hidden cursor-pointer">
//       <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentBar}`} />
//       <div className="pl-4 pr-4 pt-3 pb-3">
//         <div className="flex items-center justify-between gap-3">
//           <div className="flex items-center gap-2 flex-wrap min-w-0">
//             <span className="text-sm font-black text-slate-800">{po.poNumber}</span>
//             <StatusPill status={po.status} />
//             {isDamage && (
//               <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 border border-red-200 rounded-full text-[10px] font-bold text-red-700">
//                 <FiAlertTriangle size={8} /> {po.totalDamagedQty} Dmg
//               </span>
//             )}
//             {po.storeQcStatus === "approved_with_issues" && !isDamage && (
//               <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">
//                 <FiAlertTriangle size={8} /> QC Issues
//               </span>
//             )}
//             {/* ✅ CHANGE 1: QC Issue badges per issue type */}
//             {(() => {
//               const sc = (po.items||[]).filter(i=>i.issue==="shortage").length;
//               const qc = (po.items||[]).filter(i=>i.issue==="quality").length;
//               const ec = (po.items||[]).filter(i=>i.issue==="excess").length;
//               const wc = (po.items||[]).filter(i=>i.issue==="wrong_item").length;
//               return (<>
//                 {sc>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 border border-orange-200 rounded-full text-[10px] font-bold text-orange-700">🟠 {sc} Shortage</span>}
//                 {qc>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">🟡 {qc} Quality</span>}
//                 {ec>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 border border-purple-200 rounded-full text-[10px] font-bold text-purple-700">🟣 {ec} Excess</span>}
//                 {wc>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded-full text-[10px] font-bold text-blue-700">🔵 {wc} Wrong</span>}
//               </>);
//             })()}
//             <span className="text-[10px] text-slate-600 flex items-center gap-1">
//               <FiCalendar size={8} />{formatDateTime(po.createdAt)}
//             </span>
//           </div>
//           <button
//             className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-bold ${btnStyle} transition-colors`}
//             onClick={(e) => { e.stopPropagation(); onSelect(po); }}
//           >
//             {btnLabel} <FiChevronRight size={11} />
//           </button>
//         </div>
//         <div className="mt-2.5 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
//           <span className="flex items-center gap-1"><FiTruck size={10} className="text-slate-400" /><span className="font-semibold text-slate-700">{po.vendor}</span></span>
//           <span className="flex items-center gap-1"><FiBox size={10} className="text-slate-400" />{po.items.length} items</span>
//           <span className="flex items-center gap-1">
//             <FiClock size={10} className="text-slate-400" />
//             <span className={isOverdue ? "text-red-500 font-bold" : po.status === "warning" ? "text-orange-500 font-bold" : ""}>
//               ETA: {po.eta !== "—" ? po.eta : "Not set"}
//             </span>
//           </span>
//           <div className="flex items-center gap-1.5 flex-1 min-w-32">
//             <ReceiptProgress received={totalReceived} total={totalOrdered} />
//           </div>
//         </div>
//         {(isDamage || (!isDamage && po.status === "partial" && remaining > 0) || isWaiting) && (
//           <div className="mt-2 flex flex-col gap-1">
//             {isDamage && (
//               <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
//                 <FiAlertTriangle size={11} className="text-red-500 flex-shrink-0" />
//                 <p className="text-[11px] font-bold text-red-700">{po.totalDamagedQty} damaged units require replacement invoice</p>
//               </div>
//             )}
//             {!isDamage && po.status === "partial" && remaining > 0 && (
//               <div className="flex items-center gap-2 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
//                 <FiPackage size={11} className="text-orange-500 flex-shrink-0" />
//                 <p className="text-[11px] font-bold text-orange-700">{remaining} units still pending from vendor</p>
//               </div>
//             )}
//             {isWaiting && (
//               <div className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
//                 <span className="text-xs">⏳</span>
//                 <p className="text-[11px] font-bold text-indigo-700">Invoice submitted — waiting for store QC approval</p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// function POHistoryTimeline({ selectedPO, linkedInvoices, loadingHistory }) {
//   if (!selectedPO) return null;
//   const totalOrdered = selectedPO.items.reduce((s, i) => s + (i.orderedQty || 0), 0);
//   const totalReceived = selectedPO.items.reduce((s, i) => s + (i.totalReceivedQty || 0), 0);
//   const totalPending = Math.max(0, totalOrdered - totalReceived);
//   const events = [];
//   events.push({ type: "created", icon: "📄", label: "Purchase Order Created", sub: `PO: ${selectedPO.poNumber} · Vendor: ${selectedPO.vendor}`, datetime: selectedPO.createdAt || null, status: "ordered" });
//   [...linkedInvoices].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach((inv) => {
//     const thisQty = (inv.items || []).reduce((s, i) => s + (i.newReceived || 0), 0);
//     const invOrdered = (inv.items || []).reduce((s, i) => s + (i.orderedQty || i.quantity || 0), 0);
//     const pending = Math.max(0, invOrdered - (inv.items || []).reduce((s, i) => s + (i.totalReceivedQty || 0), 0));
//     const damagedItems = (inv.items || []).filter((i) => i.issue === "damage" && (i.damagedQty || 0) > 0).map((i) => ({ productCode: i.productCode, damagedQty: i.damagedQty, issueDetail: i.issueDetail || "" }));
//     events.push({ type: "invoice", icon: "⬆️", label: `Invoice Uploaded${inv.invoiceNo ? ` — ${inv.invoiceNo}` : ""}`, sub: `+${thisQty} units received`, datetime: inv.createdAt, invoiceDate: inv.invoiceDate, qc: inv.qualityCheck, remarks: inv.remarks, status: inv.poStatus || "partial", pending, damagedItems });
//     if (inv.poStatus === "partial") events.push({ type: "status", icon: "🔄", label: "Status changed → PARTIAL", sub: `${pending} units still pending`, datetime: inv.createdAt, status: "partial", pending });
//     else if (inv.poStatus === "complete") events.push({ type: "status", icon: "✅", label: "Status changed → COMPLETE", sub: `All ${invOrdered} units received`, datetime: inv.createdAt, status: "complete" });
//     else if (inv.poStatus === "excess") events.push({ type: "status", icon: "⚠️", label: "Status changed → EXCESS", sub: `Received more than ordered`, datetime: inv.createdAt, status: "excess" });
//   });
//   return (
//     <Card>
//       <CardHeader title="PO History Timeline" subtitle={`${linkedInvoices.length} invoice${linkedInvoices.length !== 1 ? "s" : ""} · ${totalReceived}/${totalOrdered} units received${totalPending > 0 ? ` · ${totalPending} pending` : ""}`} />
//       {loadingHistory ? (
//         <div className="px-6 py-8 text-center">
//           <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto mb-2" />
//           <p className="text-xs text-slate-400">Loading history...</p>
//         </div>
//       ) : (
//         <div className="divide-y divide-slate-50">
//           {events.map((event, idx) => (
//             <div key={idx} className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors">
//               <div className="flex items-start gap-3 flex-1 min-w-0">
//                 <span className="text-sm mt-0.5 flex-shrink-0">{event.icon}</span>
//                 <div className="min-w-0">
//                   <div className="flex items-center gap-2 flex-wrap">
//                     <p className="text-xs font-bold text-slate-800">{event.label}</p>
//                     <StatusPill status={event.status} />
//                   </div>
//                   <p className="text-[11px] text-slate-500 mt-0.5">{event.sub}</p>
//                   {event.type === "invoice" && (
//                     <div className="flex items-center gap-3 mt-1 flex-wrap">
//                       {event.invoiceDate && <span className="text-[10px] text-slate-400">📅 {formatDate(event.invoiceDate)}</span>}
//                       {event.qc && (<span className={`text-[10px] font-bold ${event.qc === "passed" ? "text-emerald-600" : event.qc === "failed" ? "text-red-600" : "text-orange-600"}`}>🔍 QC: {event.qc.toUpperCase()}</span>)}
//                       {event.remarks && <span className="text-[10px] text-slate-400 italic">💬 {event.remarks}</span>}
//                     </div>
//                   )}
//                   {event.type === "invoice" && event.damagedItems?.length > 0 && (
//                     <div className="mt-1 space-y-0.5">
//                       {event.damagedItems.map((d, i) => (<span key={i} className="text-[10px] text-red-500 font-bold block">🔴 {d.productCode}: {d.damagedQty} damaged{d.issueDetail ? ` — ${d.issueDetail}` : ""}</span>))}
//                     </div>
//                   )}
//                   {event.type === "status" && event.status === "partial" && event.pending > 0 && (
//                     <p className="text-[10px] text-orange-500 font-bold mt-1">↳ Next invoice required for remaining {event.pending} units</p>
//                   )}
//                 </div>
//               </div>
//               {event.datetime && (
//                 <p className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 flex items-center gap-1 mt-0.5">
//                   <FiClock size={9} />{formatDateTime(event.datetime)}
//                 </p>
//               )}
//             </div>
//           ))}
//           {totalPending > 0 && linkedInvoices.length > 0 && (
//             <div className="px-6 py-3 flex items-center gap-3">
//               <span className="text-sm flex-shrink-0">⏳</span>
//               <div>
//                 <p className="text-xs font-bold text-slate-400">Awaiting next invoice...</p>
//                 <p className="text-[11px] text-orange-500 font-bold mt-0.5">{totalPending} units still pending</p>
//               </div>
//             </div>
//           )}
//           {linkedInvoices.length === 0 && (
//             <div className="px-6 py-4 flex items-center gap-3">
//               <span className="text-sm">⏳</span>
//               <p className="text-xs text-slate-400">No invoices uploaded yet for this PO</p>
//             </div>
//           )}
//         </div>
//       )}
//     </Card>
//   );
// }

// function WaitingForStoreApproval({ selectedPO, invoiceNo, getTotalNewReceived }) {
//   const [dots, setDots] = useState(".");
//   useEffect(() => {
//     const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 600);
//     return () => clearInterval(t);
//   }, []);
//   return (
//     <div className="space-y-5">
//       <Card>
//         <div className="p-10 flex flex-col items-center text-center">
//           <div className="relative mb-6">
//             <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
//               <FiShield size={34} className="text-indigo-400" />
//             </div>
//             <span className="absolute inset-0 rounded-full border-2 border-indigo-300 animate-ping opacity-30" />
//             <span className="absolute -inset-2 rounded-full border border-indigo-200 animate-ping opacity-20" style={{ animationDelay: "0.4s" }} />
//           </div>
//           <h3 className="text-base font-black text-slate-800 mb-2">Waiting for Store QC Approval{dots}</h3>
//           <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-7">
//             The store team is currently verifying the received material quality. This page will <strong>automatically unlock</strong> once they approve — no need to refresh.
//           </p>
//           <div className="flex items-center gap-3 flex-wrap justify-center mb-8">
//             {[["PO", selectedPO?.poNumber], ["Invoice", invoiceNo || "—"], ["Units", getTotalNewReceived()]].map(([label, val]) => (
//               <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
//                 <span className="text-[10px] text-slate-400 font-bold uppercase">{label}</span>
//                 <span className="text-xs font-black text-slate-700">{val}</span>
//               </div>
//             ))}
//           </div>
//           <div className="w-full max-w-xs space-y-3 text-left">
//             {[
//               { label: "Invoice uploaded to system", done: true },
//               { label: "Store team notified for QC", done: true },
//               { label: "Store QC inspection in progress", done: false, active: true },
//               { label: "Sales confirm receipt", done: false },
//             ].map((s, i) => (
//               <div key={i} className="flex items-center gap-3">
//                 <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? "bg-emerald-500" : s.active ? "bg-indigo-100 border-2 border-indigo-400" : "bg-slate-100 border-2 border-slate-200"}`}>
//                   {s.done ? <FiCheck size={11} className="text-white" /> : s.active ? <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> : null}
//                 </div>
//                 <span className={`text-xs ${s.done ? "text-emerald-700 font-medium" : s.active ? "text-indigo-700 font-bold" : "text-slate-400"}`}>{s.label}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </Card>
//       <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
//         <FiAlertCircle size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
//         <p className="text-xs text-blue-800">
//           <strong>Store team</strong> will review and approve from their panel. Once they mark it <strong>Approved</strong>, the Submit button will appear here automatically.
//         </p>
//       </div>
//     </div>
//   );
// }

// export default function UploadVendorInvoice() {
//   const navigate = useNavigate();
//   const urlParams = new URLSearchParams(window.location.search);
//   const urlPoId = urlParams.get("poId");

//   const [step, setStep] = useState(urlPoId ? 2 : 1);
//   const [selectedPO, setSelectedPO] = useState(null);
//   const [invoiceExcelFile, setInvoiceExcelFile] = useState(null);
//   const [invoiceHeader, setInvoiceHeader] = useState(null);
//   const [invoiceNo, setInvoiceNo] = useState("");
//   const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
//   const [parsingExcel, setParsingExcel] = useState(false);
//   const [excelParsed, setExcelParsed] = useState(false);
//   const [receivedItems, setReceivedItems] = useState([]);
//   const [qualityCheck, setQualityCheck] = useState("passed");
//   const [remarks, setRemarks] = useState("");
//   const [uploading, setUploading] = useState(false);
//   const [pendingPOs, setPendingPOs] = useState([]);
//   const [loadingPOs, setLoadingPOs] = useState(true);
//   const [linkedInvoices, setLinkedInvoices] = useState([]);
//   const [loadingHistory, setLoadingHistory] = useState(false);
//   const [duplicateWarning, setDuplicateWarning] = useState("");
//   const [savedInvoiceId, setSavedInvoiceId] = useState(null);
//   const [storeQcStatus, setStoreQcStatus] = useState(null);
//   const [storeQcApprovedBy, setStoreQcApprovedBy] = useState("");
//   const [storeQcApprovedAt, setStoreQcApprovedAt] = useState("");
//   const [selectedDate, setSelectedDate] = useState("all");
//   const unsubQcRef = useRef(null);

//   useEffect(() => {
//     const fetchPOs = async () => {
//       try {
//         const snap = await getDocs(query(collection(db, "excelupload"), orderBy("createdAt", "desc")));
//         const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//         const pos = all.filter((d) => {
//           if (d.type === "INVOICE" || d.type === "SALES_ORDER") return false;
//           if (d.type !== "PO") {
//             const b = d.excelHeader?.buyer;
//             if (b && b.trim() !== "") return false;
//           }
//           const hasDamagedPending = (d.items || []).some((i) => (i.damagedQty || 0) > 0);
//           if ((d.poStatus === "complete" || d.poStatus === "received" || d.poStatus === "excess") && !d.storeQcPending && !hasDamagedPending) return false;
//           return true;
//         });
//         setPendingPOs(
//           pos.map((po) => {
//             const { status: etaStatus, remainingDays } = calcEtaStatus(po.deliveryDate);
//             const totalDamagedQty = (po.items || []).reduce((sum, i) => sum + (i.damagedQty || 0), 0);
//             return {
//               id: po.id,
//               poNumber: po.woNumber || po.excelHeader?.voucherNo || po.excelHeader?.poNumber || po.excelHeader?.orderNo || po.poNumber || po.id.slice(0, 8).toUpperCase(),
//               vendor: po.customer || po.excelHeader?.supplier || po.excelHeader?.consignee || "—",
//               date: po.excelHeader?.dated || po.excelHeader?.date || po.excelHeader?.invoiceDate || (po.createdAt ? formatDateLabel(po.createdAt) : ""),
//               eta: po.deliveryDate || "—",
//               status: po.storeQcPending ? "waiting_qc" : po.poStatus || etaStatus,
//               remainingDays,
//               createdAt: po.createdAt || null,
//               storeQcStatus: po.storeQcStatus || null,
//               totalDamagedQty,
//               hasDamagedPending: totalDamagedQty > 0,
//               items: (po.items || []).map((item) => ({
//                 ...item,
//                 orderedQty: item.orderedQty || item.quantity || 0,
//                 totalReceivedQty: item.totalReceivedQty || item.receivedQty || 0,
//                 unit: item.unit || "pcs",
//               })),
//             };
//           }),
//         );
//       } catch (err) {
//         void err;
//       } finally {
//         setLoadingPOs(false);
//       }
//     };
//     fetchPOs();
//   }, []);

//   useEffect(() => {
//     if (loadingPOs || pendingPOs.length === 0 || !urlPoId) return;
//     const matched = pendingPOs.find((po) => po.id === urlPoId);
//     if (matched) handleSelectPO(matched);
//   }, [loadingPOs, pendingPOs.length]);

//   useEffect(() => {
//     if (!selectedPO) { setLinkedInvoices([]); return; }
//     setLoadingHistory(true);
//     getDocs(query(collection(db, "excelupload"), where("linkedPoId", "==", selectedPO.id)))
//       .then((snap) => {
//         setLinkedInvoices(
//           snap.docs.map((d) => ({ id: d.id, ...d.data() }))
//             .filter((d) => d.type === "INVOICE")
//             .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
//         );
//       })
//       .catch(() => {})
//       .finally(() => setLoadingHistory(false));
//   }, [selectedPO?.id]);

//   useEffect(() => {
//     if (!selectedPO || loadingHistory || savedInvoiceId) return;
//     const pendingInv = linkedInvoices.find((inv) => inv.storeQcStatus === "pending");
//     if (pendingInv) {
//       setInvoiceNo(pendingInv.invoiceNo || "");
//       setInvoiceDate(pendingInv.invoiceDate || new Date().toISOString().split("T")[0]);
//       setSavedInvoiceId(pendingInv.id);
//       setStep(4);
//     }
//   }, [linkedInvoices, loadingHistory, selectedPO]);

//   useEffect(() => {
//     if (!savedInvoiceId) return;
//     if (unsubQcRef.current) unsubQcRef.current();
//     setStoreQcStatus("pending");
//     const unsub = onSnapshot(
//       doc(db, "excelupload", savedInvoiceId),
//       (snap) => {
//         if (!snap.exists()) return;
//         const data = snap.data();
//         setStoreQcStatus(data.storeQcStatus || "pending");
//         setStoreQcApprovedBy(data.storeQcApprovedBy || "");
//         setStoreQcApprovedAt(data.storeQcApprovedAt || "");
//         if (data.items) setReceivedItems(data.items);
//       },
//       () => { setStoreQcStatus("pending"); },
//     );
//     unsubQcRef.current = unsub;
//     return () => unsub();
//   }, [savedInvoiceId]);

//   const availableDates = [...new Set(pendingPOs.map((po) => getDateKey(po.createdAt)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
//   const filteredPOs = selectedDate === "all" ? pendingPOs : pendingPOs.filter((po) => getDateKey(po.createdAt) === selectedDate);

//   const handleSelectPO = (po) => {
//     setSelectedPO(po);
//     setReceivedItems(po.items.map((item) => ({ ...item, newReceived: 0, alreadyReceived: item.totalReceivedQty || 0, orderedQty: item.orderedQty || item.quantity || 0 })));
//     setExcelParsed(false);
//     setInvoiceExcelFile(null);
//     setInvoiceHeader(null);
//     setInvoiceNo("");
//     setDuplicateWarning("");
//     setSavedInvoiceId(null);
//     setStoreQcStatus(null);
//     setStep(2);
//   };

//   const handleInvoiceExcel = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setInvoiceExcelFile(file);
//     setParsingExcel(true);
//     setDuplicateWarning("");
//     const reader = new FileReader();
//     reader.onload = (event) => {
//       try {
//         const data = new Uint8Array(event.target.result);
//         const workbook = XLSX.read(data, { type: "array" });
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];
//         const range = XLSX.utils.decode_range(sheet["!ref"]);
//         const findVal = (keywords) => {
//           for (let row = 0; row <= Math.min(40, range.e.r); row++) {
//             for (let col = 0; col <= range.e.c; col++) {
//               const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
//               if (cell && cell.v) {
//                 const val = String(cell.v).toLowerCase();
//                 for (const kw of keywords) {
//                   if (val.includes(kw.toLowerCase())) {
//                     const right = sheet[XLSX.utils.encode_cell({ r: row, c: col + 1 })];
//                     const below = sheet[XLSX.utils.encode_cell({ r: row + 1, c: col })];
//                     const right2 = sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
//                     if (right && right.v) return String(right.v);
//                     if (below && below.v) return String(below.v);
//                     if (right2 && right2.v) return String(right2.v);
//                   }
//                 }
//               }
//             }
//           }
//           return "";
//         };
//         const rawSupplierInv = findVal(["Supplier Invoice No.", "Supplier Invoice No. & Date", "Supplier Inv"]);
//         let parsedInvoiceNo = "", parsedInvoiceDate = "";
//         if (rawSupplierInv) {
//           const dtMatch = rawSupplierInv.match(/^(.+?)\s+dt\.?\s*(.+)$/i);
//           if (dtMatch) { parsedInvoiceNo = dtMatch[1].trim(); parsedInvoiceDate = dtMatch[2].trim(); }
//           else { parsedInvoiceNo = rawSupplierInv.trim(); }
//         }
//         if (!parsedInvoiceNo) parsedInvoiceNo = findVal(["Invoice No.", "Invoice No", "Invoice Number", "Bill No"]);
//         if (!parsedInvoiceDate) parsedInvoiceDate = findVal(["Dates", "Dated", "Invoice Date", "Bill Date"]);
//         const header = {
//           invoiceNo: parsedInvoiceNo, dated: parsedInvoiceDate,
//           supplier: findVal(["Supplier (Bill from)", "Supplier", "Bill from"]),
//           consignee: findVal(["Consignee (Ship to)", "Consignee", "Ship to"]),
//           gstin: findVal(["GSTIN/UIN", "GSTIN"]),
//         };
//         if (header.invoiceNo) {
//           setInvoiceNo(header.invoiceNo);
//           if (linkedInvoices.some((inv) => inv.invoiceNo?.toLowerCase().trim() === header.invoiceNo?.toLowerCase().trim()))
//             setDuplicateWarning(`⚠️ Invoice "${header.invoiceNo}" has already been uploaded for this PO.`);
//         }
//         if (header.dated) { const c = toInputDate(header.dated); setInvoiceDate(c || header.dated); }
//         setInvoiceHeader(header);
//         let tableStartRow = -1;
//         for (let row = 0; row <= range.e.r; row++) {
//           for (let col = 0; col <= range.e.c; col++) {
//             const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
//             if (cell && cell.v) {
//               const val = String(cell.v).toLowerCase();
//               if (val.includes("description of goods") || val === "sl" || val === "si") { tableStartRow = row; break; }
//             }
//           }
//           if (tableStartRow !== -1) break;
//         }
//         if (tableStartRow === -1) { alert("Table not found"); setParsingExcel(false); return; }
//         let descCol = -1, hsnCol = -1, partCol = -1, qtyCol = -1;
//         for (let col = 0; col <= range.e.c; col++) {
//           const cell = sheet[XLSX.utils.encode_cell({ r: tableStartRow, c: col })];
//           if (cell && cell.v) {
//             const val = String(cell.v).toLowerCase();
//             if (val.includes("description")) descCol = col;
//             if (val.includes("hsn")) hsnCol = col;
//             if (val.includes("part")) partCol = col;
//             if (val.includes("quantity")) qtyCol = col;
//           }
//         }
//         const invoiceItems = [];
//         for (let row = tableStartRow + 2; row <= range.e.r; row++) {
//           const descCell = sheet[XLSX.utils.encode_cell({ r: row, c: descCol })];
//           if (!descCell || !descCell.v) break;
//           const partCode = partCol >= 0 ? sheet[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v || "" : "";
//           const qty = qtyCol >= 0 ? parseFloat(sheet[XLSX.utils.encode_cell({ r: row, c: qtyCol })]?.v || 0) : 0;
//           invoiceItems.push({ productCode: String(partCode).trim(), description: String(descCell.v), invoiceQty: qty, hsnSac: hsnCol >= 0 ? sheet[XLSX.utils.encode_cell({ r: row, c: hsnCol })]?.v || "" : "" });
//         }
//         if (selectedPO) {
//           setReceivedItems(
//             selectedPO.items.map((poItem) => {
//               const already = poItem.totalReceivedQty || 0;
//               const orderedQty = poItem.orderedQty || poItem.quantity || 0;
//               const matched = invoiceItems.find((inv) => inv.productCode && poItem.productCode && inv.productCode.toLowerCase().trim() === poItem.productCode.toLowerCase().trim());
//               return { ...poItem, orderedQty, alreadyReceived: already, newReceived: matched ? matched.invoiceQty : 0, invoiceQty: matched ? matched.invoiceQty : 0, matchedFromExcel: !!matched };
//             }),
//           );
//           setExcelParsed(true);
//         }
//         setParsingExcel(false);
//       } catch (err) {
//         setParsingExcel(false);
//         alert("Error: " + err.message);
//       }
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   const handleInvoiceNoChange = (val) => {
//     setInvoiceNo(val);
//     if (!val.trim()) { setDuplicateWarning(""); return; }
//     setDuplicateWarning(
//       linkedInvoices.some((inv) => inv.invoiceNo?.toLowerCase().trim() === val.toLowerCase().trim())
//         ? `⚠️ Invoice "${val}" has already been uploaded for this PO.` : "",
//     );
//   };

//   const handleSaveAndWait = async () => {
//     setUploading(true);
//     try {
//       const now = new Date().toISOString();
//       const updatedItems = receivedItems.map((item) => {
//         const oq = item.orderedQty || 0, ar = item.alreadyReceived || 0, nr = item.newReceived || 0, tr = ar + nr;
//         return { ...item, totalReceivedQty: tr, orderedQty: oq, quantity: oq, shortage: Math.max(0, oq - tr), itemStatus: getItemStatus(oq, tr) };
//       });
//       const poStatus = calcPoStatus(updatedItems.map((i) => ({ orderedQty: i.orderedQty, totalReceivedQty: i.totalReceivedQty })));
//       const invoiceRef = await addDoc(collection(db, "excelupload"), {
//         type: "INVOICE", linkedPoId: selectedPO.id, linkedPoNo: selectedPO.poNumber,
//         invoiceNo, invoiceDate, vendor: selectedPO.vendor, invoiceHeader: invoiceHeader || {},
//         items: updatedItems, poStatus, invoiceIndex: linkedInvoices.length + 1,
//         createdAt: now, storeQcStatus: "pending",
//       });
//       await updateDoc(doc(db, "excelupload", selectedPO.id), { storeQcPending: true, pendingInvoiceId: invoiceRef.id });
//       setSavedInvoiceId(invoiceRef.id);
//       setUploading(false);
//       setStep(4);
//       await addDoc(collection(db, "notifications"), {
//         type: "pending_qc", source: "po", target: "store",
//         refNo: selectedPO.poNumber, invoiceNo: invoiceNo, productCode: "",
//         message: `📦 New Invoice pending QC — ${invoiceNo} (PO: ${selectedPO.poNumber} · ${selectedPO.vendor})`,
//         isRead: false, isResolved: false, createdAt: now, resolvedAt: null,
//       });
//     } catch (err) {
//       setUploading(false);
//       alert("Error: " + err.message);
//     }
//   };

//   const handleFinalSubmit = async () => {
//     setUploading(true);
//     try {
//       const now = new Date().toISOString();
//       const updatedItems = receivedItems.map((item) => {
//         const oq = item.orderedQty || 0, ar = item.alreadyReceived || 0, nr = item.newReceived || 0, tr = ar + nr;
//         return { ...item, totalReceivedQty: tr, orderedQty: oq, quantity: oq, shortage: Math.max(0, oq - tr), itemStatus: getItemStatus(oq, tr) };
//       });
//       const rawPoStatus = calcPoStatus(updatedItems.map((i) => ({ orderedQty: i.orderedQty, totalReceivedQty: i.totalReceivedQty })));
//       const displayPoStatus = rawPoStatus === "partial" || rawPoStatus === "complete" ? "received" : rawPoStatus;
//       await updateDoc(doc(db, "excelupload", selectedPO.id), {
//         items: updatedItems, poStatus: displayPoStatus, salesConfirmedAt: now,
//         invoiceNo, invoiceNos: arrayUnion(invoiceNo), invoiceDate, qualityCheck, remarks,
//         invoiceCount: linkedInvoices.length + 1,
//         totalReceivedQty: updatedItems.reduce((s, i) => s + i.totalReceivedQty, 0),
//         storeQcPending: false, pendingInvoiceId: null,
//       });
//       if (savedInvoiceId)
//         await updateDoc(doc(db, "excelupload", savedInvoiceId), { qualityCheck, remarks, salesConfirmedAt: now, poStatus: displayPoStatus });
//       setUploading(false);
//       setStep(5);
//     } catch (err) {
//       setUploading(false);
//       alert("Error: " + err.message);
//     }
//   };

//   const getTotalShortage = () => receivedItems.reduce((sum, item) => sum + Math.max(0, (item.orderedQty || 0) - ((item.alreadyReceived || 0) + (item.newReceived || 0))), 0);
//   const getTotalNewReceived = () => receivedItems.reduce((sum, item) => sum + (item.newReceived || 0), 0);
//   const livePoStatus = (() => {
//     const c = calcPoStatus(receivedItems.map((i) => ({ orderedQty: i.orderedQty || 0, totalReceivedQty: (i.alreadyReceived || 0) + (i.newReceived || 0) })));
//     if (c === "partial" || c === "complete") return "received";
//     if (c === "excess") return "excess";
//     return c;
//   })();
//   const isStoreApproved = storeQcStatus === "approved" || storeQcStatus === "approved_with_issues";
//   const hasIssues = storeQcStatus === "approved_with_issues";
//   const damagedItemsList = receivedItems.filter((i) => i.issue === "damage" && (i.damagedQty || 0) > 0);
//   const steps = [{ num: 1, label: "Select PO" }, { num: 2, label: "Upload Invoice" }, { num: 3, label: "Verify Qty" }, { num: 4, label: "Submit Invoice" }];

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-xl font-black text-slate-800">Upload Vendor Invoice</h2>
//           <p className="text-xs text-slate-400 mt-0.5">Record material receipt and update inventory</p>
//         </div>
//         <BtnSecondary onClick={() => navigate("/sales/purchase-orders")}>Cancel</BtnSecondary>
//       </div>

//       {step < 5 && (
//         <Card className="p-5">
//           <div className="flex items-center justify-between max-w-2xl mx-auto">
//             {steps.map((s, idx) => (
//               <React.Fragment key={s.num}>
//                 <div className="flex flex-col items-center gap-1">
//                   <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${step > s.num ? "bg-indigo-600 text-white" : step === s.num ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-200 text-slate-400"}`}>
//                     {step > s.num ? <FiCheck size={16} /> : s.num}
//                   </div>
//                   <p className={`text-[10px] font-bold whitespace-nowrap ${step >= s.num ? "text-slate-700" : "text-slate-400"}`}>{s.label}</p>
//                 </div>
//                 {idx < 3 && <div className={`flex-1 h-0.5 mx-1 ${step > s.num ? "bg-indigo-600" : "bg-slate-200"}`} />}
//               </React.Fragment>
//             ))}
//           </div>
//         </Card>
//       )}

//       {step === 1 && (
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-black text-slate-800">Select Purchase Order</p>
//               <p className="text-xs text-slate-400 mt-0.5">
//                 {filteredPOs.length} PO{filteredPOs.length !== 1 ? "s" : ""}
//                 {selectedDate !== "all" ? ` on ${formatDateLabel(selectedDate)}` : " awaiting material"}
//               </p>
//             </div>
//             <CalendarPicker activeDates={availableDates} selected={selectedDate} onChange={setSelectedDate} />
//           </div>
//           {loadingPOs ? (
//             <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
//               <p className="text-sm text-slate-400">Loading purchase orders...</p>
//             </div>
//           ) : filteredPOs.length === 0 ? (
//             <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
//               <FiCalendar size={40} className="mx-auto mb-3 text-slate-300" />
//               <p className="text-sm font-bold text-slate-600">{selectedDate !== "all" ? `${formatDateLabel(selectedDate)} na koi PO nathi` : "No Pending Purchase Orders"}</p>
//               <p className="text-xs text-slate-400 mt-1">
//                 {selectedDate !== "all" ? <button onClick={() => setSelectedDate("all")} className="text-indigo-500 hover:underline font-semibold">All dates jouo</button> : "All POs are fully received or completed"}
//               </p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {filteredPOs.map((po) => (<POSelectCard key={po.id} po={po} onSelect={handleSelectPO} />))}
//             </div>
//           )}
//         </div>
//       )}

//       {step === 2 && selectedPO && (
//         <div className="space-y-6">
//           {selectedPO.hasDamagedPending && (
//             <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
//               <FiAlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
//               <div>
//                 <p className="text-sm font-black text-red-800">Damage Replacement Invoice</p>
//                 <p className="text-xs text-red-700 mt-0.5">This PO has <strong>{selectedPO.totalDamagedQty} damaged units</strong> that were not added to stock. Upload the vendor's replacement invoice.</p>
//               </div>
//             </div>
//           )}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             <Card>
//               <CardHeader title="Selected Purchase Order" />
//               <div className="p-6 space-y-4">
//                 <div className="p-4 bg-slate-50 rounded-lg">
//                   <div className="grid grid-cols-2 gap-3 text-xs">
//                     <div><p className="text-slate-400 font-bold mb-1">PO Number</p><p className="text-slate-800 font-bold">{selectedPO.poNumber}</p></div>
//                     <div><p className="text-slate-400 font-bold mb-1">Vendor</p><p className="text-slate-800 font-bold">{selectedPO.vendor}</p></div>
//                     <div><p className="text-slate-400 font-bold mb-1">PO Date</p><p className="text-slate-800">{selectedPO.date || "—"}</p></div>
//                     <div><p className="text-slate-400 font-bold mb-1">Status</p><StatusPill status={selectedPO.status} /></div>
//                   </div>
//                 </div>
//                 <div>
//                   <p className="text-xs font-bold text-slate-600 mb-2">📋 PO Items ({selectedPO.items.length}):</p>
//                   <div className="space-y-1 max-h-48 overflow-y-auto">
//                     {selectedPO.items.map((item, idx) => (
//                       <div key={idx} className={`flex items-start text-xs px-3 py-2 rounded-lg gap-3 ${(item.damagedQty || 0) > 0 ? "bg-red-50 border border-red-100" : "bg-slate-50"}`}>
//                         <span className="w-6 font-bold text-slate-600">{idx + 1}.</span>
//                         <span className="w-28 font-mono text-slate-700">{item.productCode}</span>
//                         <span className="flex-1 text-slate-500">{item.description}</span>
//                         <span className="w-20 text-slate-500">{item.orderedQty} {item.unit}</span>
//                         {item.totalReceivedQty > 0 && (<span className="w-20 text-orange-600 font-bold">Recv: {item.totalReceivedQty}</span>)}
//                         {(item.damagedQty || 0) > 0 && (
//                           <span className="flex items-center gap-1 w-16 text-red-600 font-bold">
//                             <FiAlertTriangle size={9} /> {item.damagedQty}
//                           </span>
//                         )}
//                         {/* ✅ CHANGE 2: QC Issue badge per item */}
//                         {item.issue && item.issue !== "damage" && (
//                           <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
//                             item.issue==="shortage" ? "bg-orange-100 text-orange-700" :
//                             item.issue==="quality"  ? "bg-amber-100 text-amber-700"   :
//                             item.issue==="excess"   ? "bg-purple-100 text-purple-700" :
//                             item.issue==="wrong_item" ? "bg-blue-100 text-blue-700"   :
//                             "bg-slate-100 text-slate-600"
//                           }`}>
//                             {item.issue==="shortage"?"🟠":item.issue==="quality"?"🟡":item.issue==="excess"?"🟣":item.issue==="wrong_item"?"🔵":"⚠"} {item.issue.replace("_"," ")}
//                           </span>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </Card>
//             <Card>
//               <CardHeader title="Upload Invoice Excel" subtitle="Vendor invoice Excel file" />
//               <div className="p-6 space-y-4">
//                 <div>
//                   <label className="block text-xs font-bold text-slate-700 mb-2">Select Invoice Excel File <span className="text-red-500">*</span></label>
//                   <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => document.getElementById("invoiceExcelInput").click()}>
//                     <FiUpload size={24} className="mx-auto mb-2 text-slate-400" />
//                     <p className="text-sm text-slate-600 font-medium">{invoiceExcelFile ? invoiceExcelFile.name : "Click to upload Invoice Excel"}</p>
//                     <p className="text-xs text-slate-400 mt-1">.xlsx or .xls</p>
//                     <input id="invoiceExcelInput" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleInvoiceExcel} />
//                   </div>
//                 </div>
//                 {parsingExcel && (
//                   <div className="text-center py-4">
//                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
//                     <p className="text-sm text-slate-500">Parsing Invoice Excel...</p>
//                   </div>
//                 )}
//                 {invoiceHeader && excelParsed && (
//                   <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
//                     <p className="text-xs font-bold text-emerald-700 mb-2">✅ Invoice Excel Parsed Successfully!</p>
//                     <div className="grid grid-cols-2 gap-2 text-xs">
//                       {invoiceHeader.invoiceNo && <div><p className="text-slate-400">Supplier Invoice No.</p><p className="font-bold text-slate-800">{invoiceHeader.invoiceNo}</p></div>}
//                       {invoiceHeader.dated && <div><p className="text-slate-400">Dated</p><p className="font-bold text-slate-800">{invoiceHeader.dated}</p></div>}
//                     </div>
//                   </div>
//                 )}
//                 {duplicateWarning && (
//                   <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
//                     <FiAlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
//                     <p className="text-xs font-bold text-red-700">{duplicateWarning}</p>
//                   </div>
//                 )}
//                 <Input label="Invoice Number" value={invoiceNo} onChange={(e) => handleInvoiceNoChange(e.target.value)} placeholder="Auto-filled from Excel or enter manually" required />
//                 <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
//                 {excelParsed && (
//                   <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                     <p className="text-xs font-bold text-blue-700">📦 {receivedItems.filter((i) => i.matchedFromExcel).length} items matched from Invoice Excel</p>
//                     {receivedItems.filter((i) => !i.matchedFromExcel).length > 0 && (
//                       <p className="text-xs text-orange-600 mt-1">⚠️ {receivedItems.filter((i) => !i.matchedFromExcel).length} PO items not found in Invoice</p>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </Card>
//           </div>
//           <POHistoryTimeline selectedPO={selectedPO} linkedInvoices={linkedInvoices} loadingHistory={loadingHistory} />
//         </div>
//       )}

//       {step === 3 && selectedPO && (
//         <Card>
//           <CardHeader title="Invoice Details" />
//           <div className="p-6 space-y-4">
//             <div className="p-4 bg-slate-50 rounded-lg">
//               <div className="grid grid-cols-2 gap-3 text-xs">
//                 <div><p className="text-slate-400 font-bold mb-1">PO Number</p><p className="text-slate-800 font-bold">{selectedPO.poNumber}</p></div>
//                 <div><p className="text-slate-400 font-bold mb-1">Invoice No</p><p className="text-slate-800 font-bold">{invoiceNo || "—"}</p></div>
//                 <div><p className="text-slate-400 font-bold mb-1">Vendor</p><p className="text-slate-800">{selectedPO.vendor}</p></div>
//                 <div><p className="text-slate-400 font-bold mb-1">Invoice Date</p><p className="text-slate-800">{invoiceDate}</p></div>
//                 <div><p className="text-slate-400 font-bold mb-1">Current PO Status</p><StatusPill status={selectedPO.status} /></div>
//                 <div><p className="text-slate-400 font-bold mb-1">After This Invoice</p><StatusPill status={livePoStatus} /></div>
//               </div>
//             </div>
//             <div className="p-3 bg-slate-50 rounded-lg">
//               <p className="text-xs font-bold text-slate-600 mb-2">Summary:</p>
//               <div className="space-y-1 text-xs">
//                 <div className="flex justify-between"><span className="text-slate-500">This Invoice Qty:</span><span className="font-bold text-slate-800">{getTotalNewReceived()} units</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">Still Pending:</span><span className={`font-bold ${getTotalShortage() > 0 ? "text-orange-600" : "text-emerald-600"}`}>{getTotalShortage()} units</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">PO Status After:</span><StatusPill status={livePoStatus} /></div>
//               </div>
//             </div>
//             <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
//               <FiAlertCircle size={13} className="text-indigo-500 mt-0.5 flex-shrink-0" />
//               <p className="text-xs text-indigo-700">Clicking <strong>"Submit for Store QC"</strong> will send this invoice to the Store team for quality verification. Stock will update only after their approval.</p>
//             </div>
//           </div>
//         </Card>
//       )}

//       {step === 4 && selectedPO && (
//         <>
//           {!isStoreApproved && (<WaitingForStoreApproval selectedPO={selectedPO} invoiceNo={invoiceNo} getTotalNewReceived={getTotalNewReceived} />)}
//           {isStoreApproved && (
//             <div className="space-y-5">
//               <div className={`flex items-center gap-4 p-4 rounded-xl border ${hasIssues ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50" : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50"}`}>
//                 <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${hasIssues ? "bg-amber-500" : "bg-emerald-500"}`}>
//                   {hasIssues ? <FiAlertTriangle size={20} className="text-white" /> : <FiCheck size={20} className="text-white" />}
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <p className={`text-sm font-black ${hasIssues ? "text-amber-800" : "text-emerald-800"}`}>
//                     {hasIssues ? "Quality Check: Approved with Issues" : "Quality Check Approved by Store"}
//                   </p>
//                   <p className={`text-xs mt-0.5 ${hasIssues ? "text-amber-600" : "text-emerald-600"}`}>
//                     {storeQcApprovedBy ? `Approved by ${storeQcApprovedBy}` : "Items verified by store team."}
//                     {storeQcApprovedAt ? ` · ${formatDateTime(storeQcApprovedAt)}` : ""}
//                   </p>
//                 </div>
//                 <StatusPill status="received" />
//               </div>
//               {hasIssues && (
//                 <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
//                   <FiAlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
//                   <div>
//                     <p className="text-sm font-black text-amber-800">Damage Noted by Store Team</p>
//                     <p className="text-xs text-amber-700 mt-1">Damaged units are <strong>not added to stock</strong> and will remain pending from vendor.</p>
//                     {damagedItemsList.length > 0 && (
//                       <div className="mt-2 space-y-1">
//                         {damagedItemsList.map((item, i) => (
//                           <div key={i} className="flex items-center gap-2 text-xs text-amber-800">
//                             <span className="font-bold font-mono bg-amber-100 px-1.5 py-0.5 rounded">{item.productCode}</span>
//                             <span>— <strong>{item.damagedQty}</strong> units damaged</span>
//                             {item.issueDetail && <span className="text-amber-600 italic">({item.issueDetail})</span>}
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//               <Card>
//                 <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-50">
//                   <div>
//                     <h3 className="text-sm font-black text-slate-800">Invoice Summary</h3>
//                     <p className="text-[11px] text-slate-400 mt-0.5">Review before final submission</p>
//                   </div>
//                   <span className="px-3 py-1 text-[10px] font-black rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">Ready to Submit</span>
//                 </div>
//                 <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
//                   {[["PO Number", selectedPO.poNumber], ["Vendor", selectedPO.vendor], ["Invoice No.", invoiceNo || "—"], ["Invoice Date", invoiceDate || "—"], ["Total Invoices for PO", `#${linkedInvoices.length + 1}`], ["Units This Invoice", `${getTotalNewReceived()} units`]].map(([label, val]) => (
//                     <div key={label}>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
//                       <p className="text-sm font-bold text-slate-800">{val}</p>
//                     </div>
//                   ))}
//                 </div>
//               </Card>
//               <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
//                 <FiAlertCircle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
//                 <p className="text-xs text-amber-800">Once submitted, this invoice will be <strong>locked for editing</strong>. Stock records are already updated by Store.</p>
//               </div>
//             </div>
//           )}
//         </>
//       )}

//       {step === 2 && (
//         <div className="flex justify-end gap-3">
//           <BtnSecondary onClick={() => setStep(1)}>← Back</BtnSecondary>
//           <BtnPrimary onClick={() => setStep(3)} disabled={!excelParsed || !invoiceNo}>Next: Verify Quantities →</BtnPrimary>
//         </div>
//       )}
//       {step === 3 && (
//         <div className="flex justify-end gap-3">
//           <BtnSecondary onClick={() => setStep(2)}>← Back</BtnSecondary>
//           <BtnPrimary onClick={handleSaveAndWait} disabled={uploading}>
//             {uploading ? (<span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</span>) : "Submit for Store QC →"}
//           </BtnPrimary>
//         </div>
//       )}
//       {step === 4 && (
//         <div className="flex justify-end gap-3">
//           {isStoreApproved && (
//             <BtnPrimary onClick={handleFinalSubmit} disabled={uploading}>
//               {uploading ? (<span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</span>) : "✓ Confirm Receipt"}
//             </BtnPrimary>
//           )}
//         </div>
//       )}

//       {step === 5 && selectedPO && (
//         <div className="space-y-6">
//           <Card className="p-5">
//             <div className="flex items-center justify-between max-w-2xl mx-auto">
//               {steps.map((s, idx) => (
//                 <React.Fragment key={s.num}>
//                   <div className="flex flex-col items-center gap-1">
//                     <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-indigo-600 text-white"><FiCheck size={16} /></div>
//                     <p className="text-[10px] font-bold whitespace-nowrap text-slate-700">{s.label}</p>
//                   </div>
//                   {idx < 3 && <div className="flex-1 h-0.5 mx-1 bg-indigo-600" />}
//                 </React.Fragment>
//               ))}
//             </div>
//           </Card>
//           <Card>
//             <div className="p-10 text-center">
//               <div className="relative w-24 h-24 mx-auto mb-6">
//                 <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center shadow-lg shadow-emerald-100">
//                   <FiCheck size={44} className="text-emerald-600" />
//                 </div>
//               </div>
//               <h3 className="text-xl font-black text-slate-800 mb-2">Invoice Confirmed & Receipt Complete!</h3>
//               <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">Store QC approved. Material received and stock updated successfully.</p>
//               <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
//                 {[["PO", selectedPO.poNumber], ["Invoice", invoiceNo || "—"], ["Units", getTotalNewReceived()]].map(([label, val]) => (
//                   <div key={label} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
//                     <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
//                     <span className="text-xs font-black text-slate-800">{val}</span>
//                   </div>
//                 ))}
//               </div>
//               <div className="max-w-sm mx-auto text-left space-y-3 mb-8">
//                 {[
//                   { label: "Invoice uploaded to system", sub: `Invoice: ${invoiceNo}`, done: true },
//                   { label: "Store team notified for QC", sub: "Store Manager verified quality", done: true },
//                   { label: "Store QC inspection complete", sub: hasIssues ? "Approved with issues noted" : "All items quality verified", done: true, issues: hasIssues },
//                   { label: "Stock updated in inventory", sub: `+${getTotalNewReceived()} units added`, done: true },
//                   { label: "Receipt confirmed by Sales", sub: "Invoice locked and recorded", done: true },
//                 ].map((item, i) => (
//                   <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${item.issues ? "bg-amber-50 border border-amber-200" : "bg-emerald-50/60"}`}>
//                     <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.issues ? "bg-amber-500" : "bg-emerald-500"}`}>
//                       {item.issues ? <FiAlertTriangle size={11} className="text-white" /> : <FiCheck size={12} className="text-white" />}
//                     </div>
//                     <div>
//                       <p className={`text-xs font-bold ${item.issues ? "text-amber-700" : "text-slate-700"}`}>{item.label}</p>
//                       <p className={`text-[11px] mt-0.5 ${item.issues ? "text-amber-500" : "text-slate-400"}`}>{item.sub}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               {getTotalShortage() > 0 && (
//                 <div className="max-w-sm mx-auto mb-6 flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-left">
//                   <FiAlertTriangle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
//                   <p className="text-xs text-orange-700"><strong>{getTotalShortage()} units</strong> still pending from vendor. Upload another invoice when received.</p>
//                 </div>
//               )}
//               {hasIssues && damagedItemsList.length > 0 && (
//                 <div className="max-w-sm mx-auto mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-left">
//                   <p className="text-xs font-bold text-red-700 mb-2">🔴 Damage Tracked (vendor follow-up pending):</p>
//                   {damagedItemsList.map((item, i) => (
//                     <div key={i} className="flex items-center gap-2 text-xs text-red-700 mt-1">
//                       <span className="font-mono font-bold bg-red-100 px-1.5 py-0.5 rounded">{item.productCode}</span>
//                       <span>— <strong>{item.damagedQty}</strong> units</span>
//                     </div>
//                   ))}
//                 </div>
//               )}
//               <div className="flex items-center justify-center gap-3 flex-wrap">
//                 {getTotalShortage() > 0 && (<BtnPrimary onClick={() => window.location.reload()}>Upload Remaining Invoice</BtnPrimary>)}
//                 <BtnSecondary onClick={() => { setStep(1); setSelectedPO(null); setReceivedItems([]); setExcelParsed(false); setInvoiceExcelFile(null); setInvoiceNo(""); setInvoiceHeader(null); setLinkedInvoices([]); setDuplicateWarning(""); setSavedInvoiceId(null); }}>
//                   Upload Another Invoice
//                 </BtnSecondary>
//                 <BtnPrimary onClick={() => navigate("/sales/purchase-orders")}>View Purchase Orders →</BtnPrimary>
//               </div>
//             </div>
//           </Card>
//           <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
//             <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5"><FiCheck size={11} className="text-emerald-700" /></div>
//             <p className="text-xs text-emerald-700">
//               <strong>Stock updated</strong> — {getTotalNewReceived()} units added to inventory.
//               {getTotalShortage() > 0 ? ` ${getTotalShortage()} units still pending from vendor.` : " All ordered units received successfully."}
//               {hasIssues && " Some damaged units tracked for vendor debit note."}
//             </p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheck, FiAlertTriangle, FiUpload, FiClock, FiAlertCircle,
  FiShield, FiPackage, FiTruck, FiChevronRight, FiCalendar,
  FiBox, FiChevronLeft,
} from "react-icons/fi";
import { Card, CardHeader, Input, BtnPrimary, BtnSecondary } from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import {
  collection, getDocs, query, orderBy, addDoc, updateDoc,
  doc, where, arrayUnion, onSnapshot,
} from "firebase/firestore";
import * as XLSX from "xlsx";

function calcEtaStatus(deliveryDate) {
  if (!deliveryDate) return { status: "ordered", remainingDays: 0 };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const eta = new Date(deliveryDate); eta.setHours(0, 0, 0, 0);
  const diff = Math.round((eta - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { status: "overdue", remainingDays: diff };
  if (diff <= 2) return { status: "warning", remainingDays: diff };
  return { status: "ordered", remainingDays: diff };
}

function toInputDate(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const monShort = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (monShort) {
    const months = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
    const m = months[monShort[2].toLowerCase()];
    const yr = monShort[3].length === 2 ? "20" + monShort[3] : monShort[3];
    if (m) return `${yr}-${m}-${monShort[1].padStart(2, "0")}`;
  }
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Math.round((+s - 25569) * 86400 * 1000));
    if (!isNaN(d)) return d.toISOString().split("T")[0];
  }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return "";
}

function formatDateTime(val) {
  if (!val) return "—";
  try {
    let date;
    if (typeof val?.toDate === "function") date = val.toDate();
    else if (val?.seconds) date = new Date(val.seconds * 1000);
    else date = new Date(val);
    return date.toLocaleString("en-IN", { day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true });
  } catch { return "—"; }
}
function formatDate(isoStr) {
  if (!isoStr) return "—";
  try { return new Date(isoStr).toLocaleDateString("en-IN", { day:"2-digit",month:"short",year:"numeric" }); }
  catch { return isoStr; }
}
function formatDateLabel(isoStr) {
  if (!isoStr) return "";
  try { return new Date(isoStr).toLocaleDateString("en-IN", { day:"2-digit",month:"short",year:"numeric" }); }
  catch { return isoStr; }
}
function getDateKey(val) {
  if (!val) return null;
  try {
    let d;
    if (typeof val?.toDate === "function") d = val.toDate();
    else if (val?.seconds) d = new Date(val.seconds * 1000);
    else d = new Date(val);
    return d.toISOString().split("T")[0];
  } catch { return null; }
}
function getItemStatus(orderedQty, totalReceivedQty) {
  if (totalReceivedQty === 0) return "ordered";
  if (totalReceivedQty < orderedQty) return "partial";
  if (totalReceivedQty === orderedQty) return "complete";
  return "excess";
}
function calcPoStatus(items) {
  const s = items.map((i) => getItemStatus(i.orderedQty || i.quantity || 0, i.totalReceivedQty || 0));
  if (s.every((x) => x === "complete")) return "complete";
  if (s.some((x) => x === "excess")) return "excess";
  if (s.some((x) => x === "partial" || x === "complete")) return "partial";
  return "ordered";
}

function StatusPill({ status }) {
  const map = {
    material_hold:"bg-blue-50 text-blue-700 border-blue-200",
    ready:"bg-emerald-50 text-emerald-700 border-emerald-200",
    dispatched:"bg-slate-50 text-slate-700 border-slate-200",
    pending:"bg-amber-50 text-amber-700 border-amber-200",
    overdue:"bg-red-50 text-red-700 border-red-200",
    warning:"bg-orange-50 text-orange-700 border-orange-200",
    ordered:"bg-blue-50 text-blue-700 border-blue-200",
    partial:"bg-orange-50 text-orange-700 border-orange-200",
    complete:"bg-emerald-50 text-emerald-700 border-emerald-200",
    excess:"bg-purple-50 text-purple-700 border-purple-200",
    received:"bg-teal-50 text-teal-700 border-teal-200",
    waiting_qc:"bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  const n = status?.toLowerCase();
  const label = n === "waiting_qc" ? "Waiting QC" : n?.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wide ${map[n] || map.pending}`}>
      {label}
    </span>
  );
}

function ReceiptProgress({ received, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
  const color = pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-orange-400" : "bg-slate-300";
  const text = pct === 100 ? "text-emerald-600" : pct > 0 ? "text-orange-500" : "text-slate-400";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-bold tabular-nums whitespace-nowrap ${text}`}>{received}/{total}</span>
    </div>
  );
}

const MONTHS_CAL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_CAL = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarPicker({ activeDates, selected, onChange }) {
  const today = new Date().toISOString().split("T")[0];
  const base = selected !== "all" ? new Date(selected) : new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const activeSet = new Set(activeDates);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDayOfWk = new Date(view.year, view.month, 1).getDay();
  const prevMonth = () => setView((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setView((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  const handleDay = (day) => {
    const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!activeSet.has(iso)) return;
    onChange(selected === iso ? "all" : iso);
    setOpen(false);
  };
  const cells = [];
  for (let i = 0; i < firstDayOfWk; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const btnLabel = selected === "all" ? "All dates" : formatDateLabel(selected);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm border ${selected !== "all" ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}>
        <FiCalendar size={14} />
        {btnLabel}
        {selected !== "all" && (
          <span onClick={(e) => { e.stopPropagation(); onChange("all"); }}
            className="ml-1 w-4 h-4 rounded-full bg-white/25 hover:bg-white/50 flex items-center justify-center text-white text-xs" title="Clear">×</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600">
            <button onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"><FiChevronLeft size={15} /></button>
            <span className="text-sm font-bold text-white">{MONTHS_CAL[view.month]} {view.year}</span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"><FiChevronRight size={15} /></button>
          </div>
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS_CAL.map((d) => (<div key={d} className="text-center text-[10px] font-bold text-slate-400">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-y-1 px-3 pb-3">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasData = activeSet.has(iso);
              const isSel = selected === iso;
              const isToday = iso === today;
              return (
                <button key={idx} onClick={() => handleDay(day)} disabled={!hasData}
                  className={`relative mx-auto w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${isSel ? "bg-indigo-600 text-white shadow-md" : hasData ? "text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer" : "text-slate-300 cursor-not-allowed"} ${isToday && !isSel ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}>
                  {day}
                  {hasData && !isSel && (<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />)}
                </button>
              );
            })}
          </div>
          <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">{activeDates.length} date{activeDates.length !== 1 ? "s" : ""} have POs</p>
            {selected !== "all" && (
              <button onClick={() => { onChange("all"); setOpen(false); }} className="text-xs text-indigo-600 font-semibold hover:underline">Show all</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ UPDATED POSelectCard — status based button and behaviour
function POSelectCard({ po, onSelect }) {
  const totalOrdered = po.items.reduce((s, i) => s + (i.orderedQty || 0), 0);
  const totalReceived = po.items.reduce((s, i) => s + (i.totalReceivedQty || 0), 0);
  const remaining = totalOrdered - totalReceived;
  const isDamage = po.hasDamagedPending;
  const isWaiting = po.status === "waiting_qc";
  const isOverdue = po.status === "overdue";

  // ✅ FIX: approved = complete thayela, no more actions
  const isApproved = po.storeQcStatus === "approved" &&
    (po.status === "received" || po.status === "complete" || po.status === "excess");
  const hasQcIssues = po.storeQcStatus === "approved_with_issues";

  const accentBar =
    isApproved ? "bg-emerald-500" :
    isDamage ? "bg-red-500" :
    isWaiting ? "bg-indigo-500" :
    isOverdue ? "bg-red-400" :
    hasQcIssues ? "bg-amber-400" :
    po.status === "partial" ? "bg-orange-400" : "bg-slate-300";

  const btnStyle =
    isApproved ? "bg-emerald-600 opacity-60 cursor-not-allowed" :
    isDamage ? "bg-red-600 hover:bg-red-700" :
    hasQcIssues ? "bg-amber-500 hover:bg-amber-600" :
    "bg-indigo-600 hover:bg-indigo-700";

  const btnLabel =
    isApproved ? "✅ Received & Complete" :
    isDamage ? "Upload Replacement Invoice" :
    hasQcIssues ? "⚠️ Review Issues" :
    po.status === "partial" ? "Receive Remaining" :
    "Receive Material";

  return (
    <div
      onClick={() => !isApproved && onSelect(po)}
      className={`relative bg-white rounded-xl border transition-all duration-150 overflow-hidden ${isApproved ? "border-emerald-200 bg-emerald-50/20 cursor-default" : "border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer"}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentBar}`} />
      <div className="pl-4 pr-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-black text-slate-800">{po.poNumber}</span>
            <StatusPill status={po.status} />

            {/* ✅ Approved badge */}
            {isApproved && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 border border-emerald-200 rounded-full text-[10px] font-bold text-emerald-700">
                ✅ QC Approved
              </span>
            )}

            {isDamage && !isApproved && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 border border-red-200 rounded-full text-[10px] font-bold text-red-700">
                <FiAlertTriangle size={8} /> {po.totalDamagedQty} Dmg
              </span>
            )}

            {/* ✅ QC Issues badge */}
            {hasQcIssues && !isApproved && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">
                <FiAlertTriangle size={8} /> QC Issues
              </span>
            )}

            {/* Issue type badges */}
            {!isApproved && (() => {
              const sc = (po.items||[]).filter(i=>i.issue==="shortage").length;
              const qc = (po.items||[]).filter(i=>i.issue==="quality").length;
              const ec = (po.items||[]).filter(i=>i.issue==="excess").length;
              const wc = (po.items||[]).filter(i=>i.issue==="wrong_item").length;
              return (<>
                {sc>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 border border-orange-200 rounded-full text-[10px] font-bold text-orange-700">🟠 {sc} Shortage</span>}
                {qc>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">🟡 {qc} Quality</span>}
                {ec>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 border border-purple-200 rounded-full text-[10px] font-bold text-purple-700">🟣 {ec} Excess</span>}
                {wc>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded-full text-[10px] font-bold text-blue-700">🔵 {wc} Wrong</span>}
              </>);
            })()}

            <span className="text-[10px] text-slate-600 flex items-center gap-1">
              <FiCalendar size={8} />{formatDateTime(po.createdAt)}
            </span>
          </div>
          <button
            disabled={isApproved}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-bold ${btnStyle} transition-colors`}
            onClick={(e) => { e.stopPropagation(); if (!isApproved) onSelect(po); }}
          >
            {btnLabel} {!isApproved && <FiChevronRight size={11} />}
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
          <span className="flex items-center gap-1"><FiTruck size={10} className="text-slate-400" /><span className="font-semibold text-slate-700">{po.vendor}</span></span>
          <span className="flex items-center gap-1"><FiBox size={10} className="text-slate-400" />{po.items.length} items</span>
          <span className="flex items-center gap-1">
            <FiClock size={10} className="text-slate-400" />
            <span className={isOverdue ? "text-red-500 font-bold" : po.status === "warning" ? "text-orange-500 font-bold" : ""}>
              ETA: {po.eta !== "—" ? po.eta : "Not set"}
            </span>
          </span>
          <div className="flex items-center gap-1.5 flex-1 min-w-32">
            <ReceiptProgress received={totalReceived} total={totalOrdered} />
          </div>
        </div>

        {/* Info banners */}
        {isApproved && (
          <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <FiCheck size={11} className="text-emerald-500 flex-shrink-0" />
            <p className="text-[11px] font-bold text-emerald-700">
              All material received & QC approved — {totalReceived}/{totalOrdered} units
            </p>
          </div>
        )}
        {!isApproved && (isDamage || (!isDamage && po.status === "partial" && remaining > 0) || isWaiting) && (
          <div className="mt-2 flex flex-col gap-1">
            {isDamage && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <FiAlertTriangle size={11} className="text-red-500 flex-shrink-0" />
                <p className="text-[11px] font-bold text-red-700">{po.totalDamagedQty} damaged units require replacement invoice</p>
              </div>
            )}
            {!isDamage && po.status === "partial" && remaining > 0 && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                <FiPackage size={11} className="text-orange-500 flex-shrink-0" />
                <p className="text-[11px] font-bold text-orange-700">{remaining} units still pending from vendor</p>
              </div>
            )}
            {isWaiting && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="text-xs">⏳</span>
                <p className="text-[11px] font-bold text-indigo-700">Invoice submitted — waiting for store QC approval</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function POHistoryTimeline({ selectedPO, linkedInvoices, loadingHistory }) {
  if (!selectedPO) return null;
  const totalOrdered = selectedPO.items.reduce((s, i) => s + (i.orderedQty || 0), 0);
  const totalReceived = selectedPO.items.reduce((s, i) => s + (i.totalReceivedQty || 0), 0);
  const totalPending = Math.max(0, totalOrdered - totalReceived);
  const events = [];
  events.push({ type: "created", icon: "📄", label: "Purchase Order Created", sub: `PO: ${selectedPO.poNumber} · Vendor: ${selectedPO.vendor}`, datetime: selectedPO.createdAt || null, status: "ordered" });
  [...linkedInvoices].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach((inv) => {
    const thisQty = (inv.items || []).reduce((s, i) => s + (i.newReceived || 0), 0);
    const invOrdered = (inv.items || []).reduce((s, i) => s + (i.orderedQty || i.quantity || 0), 0);
    const pending = Math.max(0, invOrdered - (inv.items || []).reduce((s, i) => s + (i.totalReceivedQty || 0), 0));
    const damagedItems = (inv.items || []).filter((i) => i.issue === "damage" && (i.damagedQty || 0) > 0).map((i) => ({ productCode: i.productCode, damagedQty: i.damagedQty, issueDetail: i.issueDetail || "" }));
    events.push({ type: "invoice", icon: "⬆️", label: `Invoice Uploaded${inv.invoiceNo ? ` — ${inv.invoiceNo}` : ""}`, sub: `+${thisQty} units received`, datetime: inv.createdAt, invoiceDate: inv.invoiceDate, qc: inv.qualityCheck, remarks: inv.remarks, status: inv.poStatus || "partial", pending, damagedItems });
    if (inv.poStatus === "partial") events.push({ type: "status", icon: "🔄", label: "Status changed → PARTIAL", sub: `${pending} units still pending`, datetime: inv.createdAt, status: "partial", pending });
    else if (inv.poStatus === "complete" || inv.poStatus === "received") events.push({ type: "status", icon: "✅", label: "Status changed → RECEIVED", sub: `All ${invOrdered} units received`, datetime: inv.createdAt, status: "received" });
    else if (inv.poStatus === "excess") events.push({ type: "status", icon: "⚠️", label: "Status changed → EXCESS", sub: `Received more than ordered`, datetime: inv.createdAt, status: "excess" });
  });
  return (
    <Card>
      <CardHeader title="PO History Timeline" subtitle={`${linkedInvoices.length} invoice${linkedInvoices.length !== 1 ? "s" : ""} · ${totalReceived}/${totalOrdered} units received${totalPending > 0 ? ` · ${totalPending} pending` : ""}`} />
      {loadingHistory ? (
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading history...</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {events.map((event, idx) => (
            <div key={idx} className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-sm mt-0.5 flex-shrink-0">{event.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-800">{event.label}</p>
                    <StatusPill status={event.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{event.sub}</p>
                  {event.type === "invoice" && (
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {event.invoiceDate && <span className="text-[10px] text-slate-400">📅 {formatDate(event.invoiceDate)}</span>}
                      {event.qc && (<span className={`text-[10px] font-bold ${event.qc === "passed" ? "text-emerald-600" : event.qc === "failed" ? "text-red-600" : "text-orange-600"}`}>🔍 QC: {event.qc.toUpperCase()}</span>)}
                      {event.remarks && <span className="text-[10px] text-slate-400 italic">💬 {event.remarks}</span>}
                    </div>
                  )}
                  {event.type === "invoice" && event.damagedItems?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {event.damagedItems.map((d, i) => (<span key={i} className="text-[10px] text-red-500 font-bold block">🔴 {d.productCode}: {d.damagedQty} damaged{d.issueDetail ? ` — ${d.issueDetail}` : ""}</span>))}
                    </div>
                  )}
                  {event.type === "status" && event.status === "partial" && event.pending > 0 && (
                    <p className="text-[10px] text-orange-500 font-bold mt-1">↳ Next invoice required for remaining {event.pending} units</p>
                  )}
                </div>
              </div>
              {event.datetime && (
                <p className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 flex items-center gap-1 mt-0.5">
                  <FiClock size={9} />{formatDateTime(event.datetime)}
                </p>
              )}
            </div>
          ))}
          {totalPending > 0 && linkedInvoices.length > 0 && (
            <div className="px-6 py-3 flex items-center gap-3">
              <span className="text-sm flex-shrink-0">⏳</span>
              <div>
                <p className="text-xs font-bold text-slate-400">Awaiting next invoice...</p>
                <p className="text-[11px] text-orange-500 font-bold mt-0.5">{totalPending} units still pending</p>
              </div>
            </div>
          )}
          {linkedInvoices.length === 0 && (
            <div className="px-6 py-4 flex items-center gap-3">
              <span className="text-sm">⏳</span>
              <p className="text-xs text-slate-400">No invoices uploaded yet for this PO</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function WaitingForStoreApproval({ selectedPO, invoiceNo, getTotalNewReceived }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-5">
      <Card>
        <div className="p-10 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
              <FiShield size={34} className="text-indigo-400" />
            </div>
            <span className="absolute inset-0 rounded-full border-2 border-indigo-300 animate-ping opacity-30" />
            <span className="absolute -inset-2 rounded-full border border-indigo-200 animate-ping opacity-20" style={{ animationDelay: "0.4s" }} />
          </div>
          <h3 className="text-base font-black text-slate-800 mb-2">Waiting for Store QC Approval{dots}</h3>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-7">
            The store team is currently verifying the received material quality. This page will <strong>automatically unlock</strong> once they approve — no need to refresh.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center mb-8">
            {[["PO", selectedPO?.poNumber], ["Invoice", invoiceNo || "—"], ["Units", getTotalNewReceived()]].map(([label, val]) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase">{label}</span>
                <span className="text-xs font-black text-slate-700">{val}</span>
              </div>
            ))}
          </div>
          <div className="w-full max-w-xs space-y-3 text-left">
            {[
              { label: "Invoice uploaded to system", done: true },
              { label: "Store team notified for QC", done: true },
              { label: "Store QC inspection in progress", done: false, active: true },
              { label: "Sales confirm receipt", done: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? "bg-emerald-500" : s.active ? "bg-indigo-100 border-2 border-indigo-400" : "bg-slate-100 border-2 border-slate-200"}`}>
                  {s.done ? <FiCheck size={11} className="text-white" /> : s.active ? <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> : null}
                </div>
                <span className={`text-xs ${s.done ? "text-emerald-700 font-medium" : s.active ? "text-indigo-700 font-bold" : "text-slate-400"}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
        <FiAlertCircle size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          <strong>Store team</strong> will review and approve from their panel. Once they mark it <strong>Approved</strong>, the Submit button will appear here automatically.
        </p>
      </div>
    </div>
  );
}

export default function UploadVendorInvoice() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const urlPoId = urlParams.get("poId");

  const [step, setStep] = useState(urlPoId ? 2 : 1);
  const [selectedPO, setSelectedPO] = useState(null);
  const [invoiceExcelFile, setInvoiceExcelFile] = useState(null);
  const [invoiceHeader, setInvoiceHeader] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [parsingExcel, setParsingExcel] = useState(false);
  const [excelParsed, setExcelParsed] = useState(false);
  const [receivedItems, setReceivedItems] = useState([]);
  const [qualityCheck, setQualityCheck] = useState("passed");
  const [remarks, setRemarks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [linkedInvoices, setLinkedInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);
  const [storeQcStatus, setStoreQcStatus] = useState(null);
  const [storeQcApprovedBy, setStoreQcApprovedBy] = useState("");
  const [storeQcApprovedAt, setStoreQcApprovedAt] = useState("");
  const [selectedDate, setSelectedDate] = useState("all");
  const unsubQcRef = useRef(null);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const snap = await getDocs(query(collection(db, "excelupload"), orderBy("createdAt", "desc")));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const pos = all.filter((d) => {
          const t = (d.type || "").toUpperCase().replace(/[_\s]/g, "");
          return (t === "PO" || t === "PURCHASEORDER") && !d.linkedPoId;
        });

        setPendingPOs(
          pos.map((po) => {
            const { status: etaStatus, remainingDays } = calcEtaStatus(po.deliveryDate);
            const totalDamagedQty = (po.items || []).reduce((sum, i) => sum + (i.damagedQty || 0), 0);
            return {
              id: po.id,
              poNumber: po.woNumber || po.excelHeader?.voucherNo || po.excelHeader?.poNumber || po.excelHeader?.orderNo || po.poNumber || po.id.slice(0, 8).toUpperCase(),
              vendor: po.customer || po.excelHeader?.supplier || po.excelHeader?.consignee || "—",
              date: po.excelHeader?.dated || po.excelHeader?.date || po.excelHeader?.invoiceDate || (po.createdAt ? formatDateLabel(po.createdAt) : ""),
              eta: po.deliveryDate || "—",
              status: po.storeQcPending ? "waiting_qc" : po.poStatus || etaStatus,
              remainingDays,
              createdAt: po.createdAt || null,
              storeQcStatus: po.storeQcStatus || null,
              totalDamagedQty,
              hasDamagedPending: totalDamagedQty > 0,
              items: (po.items || []).map((item) => ({
                ...item,
                orderedQty: item.orderedQty || item.quantity || 0,
                totalReceivedQty: item.totalReceivedQty || item.receivedQty || 0,
                unit: item.unit || "pcs",
              })),
            };
          }),
        );
      } catch (err) {
        void err;
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchPOs();
  }, []);

  useEffect(() => {
    if (loadingPOs || pendingPOs.length === 0 || !urlPoId) return;
    const matched = pendingPOs.find((po) => po.id === urlPoId);
    if (matched) handleSelectPO(matched);
  }, [loadingPOs, pendingPOs.length]);

  useEffect(() => {
    if (!selectedPO) { setLinkedInvoices([]); return; }
    setLoadingHistory(true);
    getDocs(query(collection(db, "excelupload"), where("linkedPoId", "==", selectedPO.id)))
      .then((snap) => {
        setLinkedInvoices(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            .filter((d) => d.type === "INVOICE")
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [selectedPO?.id]);

  useEffect(() => {
    if (!selectedPO || loadingHistory || savedInvoiceId) return;
    const pendingInv = linkedInvoices.find((inv) => inv.storeQcStatus === "pending");
    if (pendingInv) {
      setInvoiceNo(pendingInv.invoiceNo || "");
      setInvoiceDate(pendingInv.invoiceDate || new Date().toISOString().split("T")[0]);
      setSavedInvoiceId(pendingInv.id);
      setStep(4);
    }
  }, [linkedInvoices, loadingHistory, selectedPO]);

  useEffect(() => {
    if (!savedInvoiceId) return;
    if (unsubQcRef.current) unsubQcRef.current();
    setStoreQcStatus("pending");
    const unsub = onSnapshot(
      doc(db, "excelupload", savedInvoiceId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setStoreQcStatus(data.storeQcStatus || "pending");
        setStoreQcApprovedBy(data.storeQcApprovedBy || "");
        setStoreQcApprovedAt(data.storeQcApprovedAt || "");
        if (data.items) setReceivedItems(data.items);
      },
      () => { setStoreQcStatus("pending"); },
    );
    unsubQcRef.current = unsub;
    return () => unsub();
  }, [savedInvoiceId]);

  const availableDates = [...new Set(pendingPOs.map((po) => getDateKey(po.createdAt)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const filteredPOs = selectedDate === "all" ? pendingPOs : pendingPOs.filter((po) => getDateKey(po.createdAt) === selectedDate);

  // ✅ FIX 2: handleSelectPO — approved POs block karo
  const handleSelectPO = (po) => {
    const isApproved = po.storeQcStatus === "approved" &&
      (po.status === "received" || po.status === "complete" || po.status === "excess");
    if (isApproved) return; // silently block

    setSelectedPO(po);
    setReceivedItems(po.items.map((item) => ({ ...item, newReceived: 0, alreadyReceived: item.totalReceivedQty || 0, orderedQty: item.orderedQty || item.quantity || 0 })));
    setExcelParsed(false);
    setInvoiceExcelFile(null);
    setInvoiceHeader(null);
    setInvoiceNo("");
    setDuplicateWarning("");
    setSavedInvoiceId(null);
    setStoreQcStatus(null);
    setStep(2);
  };

  const handleInvoiceExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setInvoiceExcelFile(file);
    setParsingExcel(true);
    setDuplicateWarning("");
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        const findVal = (keywords) => {
          for (let row = 0; row <= Math.min(40, range.e.r); row++) {
            for (let col = 0; col <= range.e.c; col++) {
              const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
              if (cell && cell.v) {
                const val = String(cell.v).toLowerCase();
                for (const kw of keywords) {
                  if (val.includes(kw.toLowerCase())) {
                    const right = sheet[XLSX.utils.encode_cell({ r: row, c: col + 1 })];
                    const below = sheet[XLSX.utils.encode_cell({ r: row + 1, c: col })];
                    const right2 = sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
                    if (right && right.v) return String(right.v);
                    if (below && below.v) return String(below.v);
                    if (right2 && right2.v) return String(right2.v);
                  }
                }
              }
            }
          }
          return "";
        };
        const rawSupplierInv = findVal(["Supplier Invoice No.", "Supplier Invoice No. & Date", "Supplier Inv"]);
        let parsedInvoiceNo = "", parsedInvoiceDate = "";
        if (rawSupplierInv) {
          const dtMatch = rawSupplierInv.match(/^(.+?)\s+dt\.?\s*(.+)$/i);
          if (dtMatch) { parsedInvoiceNo = dtMatch[1].trim(); parsedInvoiceDate = dtMatch[2].trim(); }
          else { parsedInvoiceNo = rawSupplierInv.trim(); }
        }
        if (!parsedInvoiceNo) parsedInvoiceNo = findVal(["Invoice No.", "Invoice No", "Invoice Number", "Bill No"]);
        if (!parsedInvoiceDate) parsedInvoiceDate = findVal(["Dates", "Dated", "Invoice Date", "Bill Date"]);
        const header = {
          invoiceNo: parsedInvoiceNo, dated: parsedInvoiceDate,
          supplier: findVal(["Supplier (Bill from)", "Supplier", "Bill from"]),
          consignee: findVal(["Consignee (Ship to)", "Consignee", "Ship to"]),
          gstin: findVal(["GSTIN/UIN", "GSTIN"]),
        };
        if (header.invoiceNo) {
          setInvoiceNo(header.invoiceNo);
          if (linkedInvoices.some((inv) => inv.invoiceNo?.toLowerCase().trim() === header.invoiceNo?.toLowerCase().trim()))
            setDuplicateWarning(`⚠️ Invoice "${header.invoiceNo}" has already been uploaded for this PO.`);
        }
        if (header.dated) { const c = toInputDate(header.dated); setInvoiceDate(c || header.dated); }
        setInvoiceHeader(header);
        let tableStartRow = -1;
        for (let row = 0; row <= range.e.r; row++) {
          for (let col = 0; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
            if (cell && cell.v) {
              const val = String(cell.v).toLowerCase();
              if (val.includes("description of goods") || val === "sl" || val === "si") { tableStartRow = row; break; }
            }
          }
          if (tableStartRow !== -1) break;
        }
        if (tableStartRow === -1) { alert("Table not found"); setParsingExcel(false); return; }
        let descCol = -1, hsnCol = -1, partCol = -1, qtyCol = -1;
        for (let col = 0; col <= range.e.c; col++) {
          const cell = sheet[XLSX.utils.encode_cell({ r: tableStartRow, c: col })];
          if (cell && cell.v) {
            const val = String(cell.v).toLowerCase();
            if (val.includes("description")) descCol = col;
            if (val.includes("hsn")) hsnCol = col;
            if (val.includes("part")) partCol = col;
            if (val.includes("quantity")) qtyCol = col;
          }
        }
        const invoiceItems = [];
        for (let row = tableStartRow + 2; row <= range.e.r; row++) {
          const descCell = sheet[XLSX.utils.encode_cell({ r: row, c: descCol })];
          if (!descCell || !descCell.v) break;
          const partCode = partCol >= 0 ? sheet[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v || "" : "";
          const qty = qtyCol >= 0 ? parseFloat(sheet[XLSX.utils.encode_cell({ r: row, c: qtyCol })]?.v || 0) : 0;
          invoiceItems.push({ productCode: String(partCode).trim(), description: String(descCell.v), invoiceQty: qty, hsnSac: hsnCol >= 0 ? sheet[XLSX.utils.encode_cell({ r: row, c: hsnCol })]?.v || "" : "" });
        }
        if (selectedPO) {
          setReceivedItems(
            selectedPO.items.map((poItem) => {
              const already = poItem.totalReceivedQty || 0;
              const orderedQty = poItem.orderedQty || poItem.quantity || 0;
              const matched = invoiceItems.find((inv) => inv.productCode && poItem.productCode && inv.productCode.toLowerCase().trim() === poItem.productCode.toLowerCase().trim());
              return { ...poItem, orderedQty, alreadyReceived: already, newReceived: matched ? matched.invoiceQty : 0, invoiceQty: matched ? matched.invoiceQty : 0, matchedFromExcel: !!matched };
            }),
          );
          setExcelParsed(true);
        }
        setParsingExcel(false);
      } catch (err) {
        setParsingExcel(false);
        alert("Error: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleInvoiceNoChange = (val) => {
    setInvoiceNo(val);
    if (!val.trim()) { setDuplicateWarning(""); return; }
    setDuplicateWarning(
      linkedInvoices.some((inv) => inv.invoiceNo?.toLowerCase().trim() === val.toLowerCase().trim())
        ? `⚠️ Invoice "${val}" has already been uploaded for this PO.` : "",
    );
  };

  const handleSaveAndWait = async () => {
    setUploading(true);
    try {
      const now = new Date().toISOString();
      const updatedItems = receivedItems.map((item) => {
        const oq = item.orderedQty || 0, ar = item.alreadyReceived || 0, nr = item.newReceived || 0, tr = ar + nr;
        return { ...item, totalReceivedQty: tr, orderedQty: oq, quantity: oq, shortage: Math.max(0, oq - tr), itemStatus: getItemStatus(oq, tr) };
      });
      const poStatus = calcPoStatus(updatedItems.map((i) => ({ orderedQty: i.orderedQty, totalReceivedQty: i.totalReceivedQty })));
      const invoiceRef = await addDoc(collection(db, "excelupload"), {
        type: "INVOICE", linkedPoId: selectedPO.id, linkedPoNo: selectedPO.poNumber,
        invoiceNo, invoiceDate, vendor: selectedPO.vendor, invoiceHeader: invoiceHeader || {},
        items: updatedItems, poStatus, invoiceIndex: linkedInvoices.length + 1,
        createdAt: now, storeQcStatus: "pending",
      });
      await updateDoc(doc(db, "excelupload", selectedPO.id), { storeQcPending: true, pendingInvoiceId: invoiceRef.id });
      setSavedInvoiceId(invoiceRef.id);
      setUploading(false);
      setStep(4);
      await addDoc(collection(db, "notifications"), {
        type: "pending_qc", source: "po", target: "store",
        refNo: selectedPO.poNumber, invoiceNo: invoiceNo, productCode: "",
        message: `📦 New Invoice pending QC — ${invoiceNo} (PO: ${selectedPO.poNumber} · ${selectedPO.vendor})`,
        isRead: false, isResolved: false, createdAt: now, resolvedAt: null,
      });
    } catch (err) {
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  // ✅ FIX 3: handleFinalSubmit — partial stays partial, complete becomes received
  const handleFinalSubmit = async () => {
    setUploading(true);
    try {
      const now = new Date().toISOString();
      const updatedItems = receivedItems.map((item) => {
        const oq = item.orderedQty || 0, ar = item.alreadyReceived || 0, nr = item.newReceived || 0, tr = ar + nr;
        return { ...item, totalReceivedQty: tr, orderedQty: oq, quantity: oq, shortage: Math.max(0, oq - tr), itemStatus: getItemStatus(oq, tr) };
      });
      const rawPoStatus = calcPoStatus(updatedItems.map((i) => ({ orderedQty: i.orderedQty, totalReceivedQty: i.totalReceivedQty })));

      // ✅ FIX: partial stays "partial" so PO stays in list for next invoice
      // only "complete" becomes "received"
      const displayPoStatus = rawPoStatus === "complete" ? "received" : rawPoStatus;

      await updateDoc(doc(db, "excelupload", selectedPO.id), {
        items: updatedItems,
        poStatus: displayPoStatus,
        salesConfirmedAt: now,
        invoiceNo,
        invoiceNos: arrayUnion(invoiceNo),
        invoiceDate,
        qualityCheck,
        remarks,
        invoiceCount: linkedInvoices.length + 1,
        totalReceivedQty: updatedItems.reduce((s, i) => s + i.totalReceivedQty, 0),
        storeQcPending: false,
        pendingInvoiceId: null,
      });
      if (savedInvoiceId)
        await updateDoc(doc(db, "excelupload", savedInvoiceId), { qualityCheck, remarks, salesConfirmedAt: now, poStatus: displayPoStatus });
      setUploading(false);
      setStep(5);
    } catch (err) {
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  const getTotalShortage = () => receivedItems.reduce((sum, item) => sum + Math.max(0, (item.orderedQty || 0) - ((item.alreadyReceived || 0) + (item.newReceived || 0))), 0);
  const getTotalNewReceived = () => receivedItems.reduce((sum, item) => sum + (item.newReceived || 0), 0);
  const livePoStatus = (() => {
    const c = calcPoStatus(receivedItems.map((i) => ({ orderedQty: i.orderedQty || 0, totalReceivedQty: (i.alreadyReceived || 0) + (i.newReceived || 0) })));
    if (c === "complete") return "received";
    if (c === "excess") return "excess";
    return c;
  })();
  const isStoreApproved = storeQcStatus === "approved" || storeQcStatus === "approved_with_issues";
  const hasIssues = storeQcStatus === "approved_with_issues";
  const damagedItemsList = receivedItems.filter((i) => i.issue === "damage" && (i.damagedQty || 0) > 0);
  const steps = [{ num: 1, label: "Select PO" }, { num: 2, label: "Upload Invoice" }, { num: 3, label: "Verify Qty" }, { num: 4, label: "Submit Invoice" }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Upload Vendor Invoice</h2>
          <p className="text-xs text-slate-400 mt-0.5">Record material receipt and update inventory</p>
        </div>
        <BtnSecondary onClick={() => navigate("/sales/purchase-orders")}>Cancel</BtnSecondary>
      </div>

      {step < 5 && (
        <Card className="p-5">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${step > s.num ? "bg-indigo-600 text-white" : step === s.num ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-200 text-slate-400"}`}>
                    {step > s.num ? <FiCheck size={16} /> : s.num}
                  </div>
                  <p className={`text-[10px] font-bold whitespace-nowrap ${step >= s.num ? "text-slate-700" : "text-slate-400"}`}>{s.label}</p>
                </div>
                {idx < 3 && <div className={`flex-1 h-0.5 mx-1 ${step > s.num ? "bg-indigo-600" : "bg-slate-200"}`} />}
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-800">Select Purchase Order</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {filteredPOs.length} PO{filteredPOs.length !== 1 ? "s" : ""}
                {selectedDate !== "all" ? ` on ${formatDateLabel(selectedDate)}` : " total"}
              </p>
            </div>
            <CalendarPicker activeDates={availableDates} selected={selectedDate} onChange={setSelectedDate} />
          </div>
          {loadingPOs ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading purchase orders...</p>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
              <FiCalendar size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">{selectedDate !== "all" ? `${formatDateLabel(selectedDate)} na koi PO nathi` : "No Purchase Orders Found"}</p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedDate !== "all" ? <button onClick={() => setSelectedDate("all")} className="text-indigo-500 hover:underline font-semibold">All dates jouo</button> : "Upload a PO to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPOs.map((po) => (<POSelectCard key={po.id} po={po} onSelect={handleSelectPO} />))}
            </div>
          )}
        </div>
      )}

      {step === 2 && selectedPO && (
        <div className="space-y-6">
          {selectedPO.hasDamagedPending && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <FiAlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-black text-red-800">Damage Replacement Invoice</p>
                <p className="text-xs text-red-700 mt-0.5">This PO has <strong>{selectedPO.totalDamagedQty} damaged units</strong> that were not added to stock. Upload the vendor's replacement invoice.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Selected Purchase Order" />
              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-slate-400 font-bold mb-1">PO Number</p><p className="text-slate-800 font-bold">{selectedPO.poNumber}</p></div>
                    <div><p className="text-slate-400 font-bold mb-1">Vendor</p><p className="text-slate-800 font-bold">{selectedPO.vendor}</p></div>
                    <div><p className="text-slate-400 font-bold mb-1">PO Date</p><p className="text-slate-800">{selectedPO.date || "—"}</p></div>
                    <div><p className="text-slate-400 font-bold mb-1">Status</p><StatusPill status={selectedPO.status} /></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">📋 PO Items ({selectedPO.items.length}):</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedPO.items.map((item, idx) => (
                      <div key={idx} className={`flex items-start text-xs px-3 py-2 rounded-lg gap-3 ${(item.damagedQty || 0) > 0 ? "bg-red-50 border border-red-100" : "bg-slate-50"}`}>
                        <span className="w-6 font-bold text-slate-600">{idx + 1}.</span>
                        <span className="w-28 font-mono text-slate-700">{item.productCode}</span>
                        <span className="flex-1 text-slate-500">{item.description}</span>
                        <span className="w-20 text-slate-500">{item.orderedQty} {item.unit}</span>
                        {item.totalReceivedQty > 0 && (<span className="w-20 text-orange-600 font-bold">Recv: {item.totalReceivedQty}</span>)}
                        {(item.damagedQty || 0) > 0 && (
                          <span className="flex items-center gap-1 w-16 text-red-600 font-bold">
                            <FiAlertTriangle size={9} /> {item.damagedQty}
                          </span>
                        )}
                        {item.issue && item.issue !== "damage" && (
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.issue==="shortage" ? "bg-orange-100 text-orange-700" :
                            item.issue==="quality"  ? "bg-amber-100 text-amber-700"   :
                            item.issue==="excess"   ? "bg-purple-100 text-purple-700" :
                            item.issue==="wrong_item" ? "bg-blue-100 text-blue-700"   :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {item.issue==="shortage"?"🟠":item.issue==="quality"?"🟡":item.issue==="excess"?"🟣":item.issue==="wrong_item"?"🔵":"⚠"} {item.issue.replace("_"," ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Upload Invoice Excel" subtitle="Vendor invoice Excel file" />
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Select Invoice Excel File <span className="text-red-500">*</span></label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => document.getElementById("invoiceExcelInput").click()}>
                    <FiUpload size={24} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 font-medium">{invoiceExcelFile ? invoiceExcelFile.name : "Click to upload Invoice Excel"}</p>
                    <p className="text-xs text-slate-400 mt-1">.xlsx or .xls</p>
                    <input id="invoiceExcelInput" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleInvoiceExcel} />
                  </div>
                </div>
                {parsingExcel && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Parsing Invoice Excel...</p>
                  </div>
                )}
                {invoiceHeader && excelParsed && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs font-bold text-emerald-700 mb-2">✅ Invoice Excel Parsed Successfully!</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {invoiceHeader.invoiceNo && <div><p className="text-slate-400">Supplier Invoice No.</p><p className="font-bold text-slate-800">{invoiceHeader.invoiceNo}</p></div>}
                      {invoiceHeader.dated && <div><p className="text-slate-400">Dated</p><p className="font-bold text-slate-800">{invoiceHeader.dated}</p></div>}
                    </div>
                  </div>
                )}
                {duplicateWarning && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <FiAlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-bold text-red-700">{duplicateWarning}</p>
                  </div>
                )}
                <Input label="Invoice Number" value={invoiceNo} onChange={(e) => handleInvoiceNoChange(e.target.value)} placeholder="Auto-filled from Excel or enter manually" required />
                <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
                {excelParsed && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-bold text-blue-700">📦 {receivedItems.filter((i) => i.matchedFromExcel).length} items matched from Invoice Excel</p>
                    {receivedItems.filter((i) => !i.matchedFromExcel).length > 0 && (
                      <p className="text-xs text-orange-600 mt-1">⚠️ {receivedItems.filter((i) => !i.matchedFromExcel).length} PO items not found in Invoice</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
          <POHistoryTimeline selectedPO={selectedPO} linkedInvoices={linkedInvoices} loadingHistory={loadingHistory} />
        </div>
      )}

      {step === 3 && selectedPO && (
        <Card>
          <CardHeader title="Invoice Details" />
          <div className="p-6 space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p className="text-slate-400 font-bold mb-1">PO Number</p><p className="text-slate-800 font-bold">{selectedPO.poNumber}</p></div>
                <div><p className="text-slate-400 font-bold mb-1">Invoice No</p><p className="text-slate-800 font-bold">{invoiceNo || "—"}</p></div>
                <div><p className="text-slate-400 font-bold mb-1">Vendor</p><p className="text-slate-800">{selectedPO.vendor}</p></div>
                <div><p className="text-slate-400 font-bold mb-1">Invoice Date</p><p className="text-slate-800">{invoiceDate}</p></div>
                <div><p className="text-slate-400 font-bold mb-1">Current PO Status</p><StatusPill status={selectedPO.status} /></div>
                <div><p className="text-slate-400 font-bold mb-1">After This Invoice</p><StatusPill status={livePoStatus} /></div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-bold text-slate-600 mb-2">Summary:</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">This Invoice Qty:</span><span className="font-bold text-slate-800">{getTotalNewReceived()} units</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Still Pending:</span><span className={`font-bold ${getTotalShortage() > 0 ? "text-orange-600" : "text-emerald-600"}`}>{getTotalShortage()} units</span></div>
                <div className="flex justify-between"><span className="text-slate-500">PO Status After:</span><StatusPill status={livePoStatus} /></div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <FiAlertCircle size={13} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-indigo-700">Clicking <strong>"Submit for Store QC"</strong> will send this invoice to the Store team for quality verification. Stock will update only after their approval.</p>
            </div>
          </div>
        </Card>
      )}

      {step === 4 && selectedPO && (
        <>
          {!isStoreApproved && (<WaitingForStoreApproval selectedPO={selectedPO} invoiceNo={invoiceNo} getTotalNewReceived={getTotalNewReceived} />)}
          {isStoreApproved && (
            <div className="space-y-5">
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${hasIssues ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50" : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${hasIssues ? "bg-amber-500" : "bg-emerald-500"}`}>
                  {hasIssues ? <FiAlertTriangle size={20} className="text-white" /> : <FiCheck size={20} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black ${hasIssues ? "text-amber-800" : "text-emerald-800"}`}>
                    {hasIssues ? "Quality Check: Approved with Issues" : "Quality Check Approved by Store"}
                  </p>
                  <p className={`text-xs mt-0.5 ${hasIssues ? "text-amber-600" : "text-emerald-600"}`}>
                    {storeQcApprovedBy ? `Approved by ${storeQcApprovedBy}` : "Items verified by store team."}
                    {storeQcApprovedAt ? ` · ${formatDateTime(storeQcApprovedAt)}` : ""}
                  </p>
                </div>
                <StatusPill status="received" />
              </div>
              {hasIssues && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <FiAlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black text-amber-800">Damage Noted by Store Team</p>
                    <p className="text-xs text-amber-700 mt-1">Damaged units are <strong>not added to stock</strong> and will remain pending from vendor.</p>
                    {damagedItemsList.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {damagedItemsList.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-amber-800">
                            <span className="font-bold font-mono bg-amber-100 px-1.5 py-0.5 rounded">{item.productCode}</span>
                            <span>— <strong>{item.damagedQty}</strong> units damaged</span>
                            {item.issueDetail && <span className="text-amber-600 italic">({item.issueDetail})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <Card>
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-50">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Invoice Summary</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Review before final submission</p>
                  </div>
                  <span className="px-3 py-1 text-[10px] font-black rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">Ready to Submit</span>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  {[["PO Number", selectedPO.poNumber], ["Vendor", selectedPO.vendor], ["Invoice No.", invoiceNo || "—"], ["Invoice Date", invoiceDate || "—"], ["Total Invoices for PO", `#${linkedInvoices.length + 1}`], ["Units This Invoice", `${getTotalNewReceived()} units`]].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm font-bold text-slate-800">{val}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <FiAlertCircle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">Once submitted, this invoice will be <strong>locked for editing</strong>. Stock records are already updated by Store.</p>
              </div>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => setStep(1)}>← Back</BtnSecondary>
          <BtnPrimary onClick={() => setStep(3)} disabled={!excelParsed || !invoiceNo}>Next: Verify Quantities →</BtnPrimary>
        </div>
      )}
      {step === 3 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => setStep(2)}>← Back</BtnSecondary>
          <BtnPrimary onClick={handleSaveAndWait} disabled={uploading}>
            {uploading ? (<span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</span>) : "Submit for Store QC →"}
          </BtnPrimary>
        </div>
      )}
      {step === 4 && (
        <div className="flex justify-end gap-3">
          {isStoreApproved && (
            <BtnPrimary onClick={handleFinalSubmit} disabled={uploading}>
              {uploading ? (<span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</span>) : "✓ Confirm Receipt"}
            </BtnPrimary>
          )}
        </div>
      )}

      {step === 5 && selectedPO && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {steps.map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-indigo-600 text-white"><FiCheck size={16} /></div>
                    <p className="text-[10px] font-bold whitespace-nowrap text-slate-700">{s.label}</p>
                  </div>
                  {idx < 3 && <div className="flex-1 h-0.5 mx-1 bg-indigo-600" />}
                </React.Fragment>
              ))}
            </div>
          </Card>
          <Card>
            <div className="p-10 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center shadow-lg shadow-emerald-100">
                  <FiCheck size={44} className="text-emerald-600" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Invoice Confirmed & Receipt Complete!</h3>
              <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">Store QC approved. Material received and stock updated successfully.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
                {[["PO", selectedPO.poNumber], ["Invoice", invoiceNo || "—"], ["Units", getTotalNewReceived()]].map(([label, val]) => (
                  <div key={label} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
                    <span className="text-xs font-black text-slate-800">{val}</span>
                  </div>
                ))}
              </div>
              <div className="max-w-sm mx-auto text-left space-y-3 mb-8">
                {[
                  { label: "Invoice uploaded to system", sub: `Invoice: ${invoiceNo}`, done: true },
                  { label: "Store team notified for QC", sub: "Store Manager verified quality", done: true },
                  { label: "Store QC inspection complete", sub: hasIssues ? "Approved with issues noted" : "All items quality verified", done: true, issues: hasIssues },
                  { label: "Stock updated in inventory", sub: `+${getTotalNewReceived()} units added`, done: true },
                  { label: "Receipt confirmed by Sales", sub: "Invoice locked and recorded", done: true },
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${item.issues ? "bg-amber-50 border border-amber-200" : "bg-emerald-50/60"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.issues ? "bg-amber-500" : "bg-emerald-500"}`}>
                      {item.issues ? <FiAlertTriangle size={11} className="text-white" /> : <FiCheck size={12} className="text-white" />}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${item.issues ? "text-amber-700" : "text-slate-700"}`}>{item.label}</p>
                      <p className={`text-[11px] mt-0.5 ${item.issues ? "text-amber-500" : "text-slate-400"}`}>{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              {getTotalShortage() > 0 && (
                <div className="max-w-sm mx-auto mb-6 flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-left">
                  <FiAlertTriangle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700"><strong>{getTotalShortage()} units</strong> still pending from vendor. Upload another invoice when received.</p>
                </div>
              )}
              {hasIssues && damagedItemsList.length > 0 && (
                <div className="max-w-sm mx-auto mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-left">
                  <p className="text-xs font-bold text-red-700 mb-2">🔴 Damage Tracked (vendor follow-up pending):</p>
                  {damagedItemsList.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-red-700 mt-1">
                      <span className="font-mono font-bold bg-red-100 px-1.5 py-0.5 rounded">{item.productCode}</span>
                      <span>— <strong>{item.damagedQty}</strong> units</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {getTotalShortage() > 0 && (<BtnPrimary onClick={() => window.location.reload()}>Upload Remaining Invoice</BtnPrimary>)}
                <BtnSecondary onClick={() => { setStep(1); setSelectedPO(null); setReceivedItems([]); setExcelParsed(false); setInvoiceExcelFile(null); setInvoiceNo(""); setInvoiceHeader(null); setLinkedInvoices([]); setDuplicateWarning(""); setSavedInvoiceId(null); }}>
                  Upload Another Invoice
                </BtnSecondary>
                <BtnPrimary onClick={() => navigate("/sales/purchase-orders")}>View Purchase Orders →</BtnPrimary>
              </div>
            </div>
          </Card>
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5"><FiCheck size={11} className="text-emerald-700" /></div>
            <p className="text-xs text-emerald-700">
              <strong>Stock updated</strong> — {getTotalNewReceived()} units added to inventory.
              {getTotalShortage() > 0 ? ` ${getTotalShortage()} units still pending from vendor.` : " All ordered units received successfully."}
              {hasIssues && " Some damaged units tracked for vendor debit note."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}