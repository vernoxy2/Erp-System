// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { db } from "../../firebase";
// import { collection, getDocs, orderBy, query } from "firebase/firestore";

// const STATUS_COLORS = {
//   dispatched: "bg-green-100 text-green-700 border-green-200",
//   pending:    "bg-amber-100 text-amber-700 border-amber-200",
//   cancelled:  "bg-red-100 text-red-600 border-red-200",
// };

// const PAGE_SIZE = 10;

// export default function DispatchOnChallanList() {
//   const navigate = useNavigate();
//   const [challans, setChallans] = useState([]);
//   const [loading, setLoading]   = useState(true);
//   const [search, setSearch]     = useState("");
//   const [page, setPage]         = useState(1);

//   useEffect(() => {
//     (async () => {
//       try {
//         const q = query(collection(db, "challans"), orderBy("createdAt", "desc"));
//         const snap = await getDocs(q);
//         setChallans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   // Reset to page 1 on search change
//   useEffect(() => { setPage(1); }, [search]);

//   const filtered = challans.filter((c) => {
//     const s = search.toLowerCase();
//     return (
//       !s ||
//       c.challanNo?.toLowerCase().includes(s) ||
//       c.header?.customer?.toLowerCase().includes(s) ||
//       c.soReference?.toLowerCase().includes(s) ||
//       c.header?.destination?.toLowerCase().includes(s)
//     );
//   });

//   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
//   const safePage   = Math.min(page, totalPages);
//   const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

//   const totalItems = (c) =>
//     (c.items || []).reduce((sum, r) => sum + (Number(r.dispatchQty) || 0), 0);

//   // Build page numbers array (show max 5 around current)
//   const pageNumbers = () => {
//     const range = [];
//     const delta = 2;
//     const left  = Math.max(1, safePage - delta);
//     const right = Math.min(totalPages, safePage + delta);
//     for (let i = left; i <= right; i++) range.push(i);
//     return range;
//   };

//   return (
//     <div className="space-y-6">

//       {/* ── Page Header ── */}
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => navigate("/sales/sales-orders")}
//             className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
//             title="Back to Sales Orders"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
//               <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
//             </svg>
//           </button>
//           <div>
//             <h2 className="text-2xl font-black text-slate-800">Dispatch on Challan</h2>
//             <p className="text-sm text-slate-500 mt-0.5">Manage all delivery challans</p>
//           </div>
//         </div>

//         <button
//           onClick={() => navigate("/sales/dispatch-on-challan/create")}
//           className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
//             <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
//           </svg>
//           Create Challan
//         </button>
//       </div>

//       {/* ── Stats Row ── */}
//       <div className="grid grid-cols-3 gap-4">
//         {[
//           { label: "Total Challans",         value: challans.length, icon: "📋", color: "bg-indigo-50 border-indigo-100" },
//           { label: "Dispatched",             value: challans.filter((c) => c.status === "dispatched").length, icon: "🚚", color: "bg-green-50 border-green-100" },
//           { label: "Total Items Dispatched", value: challans.reduce((s, c) => s + totalItems(c), 0), icon: "📦", color: "bg-amber-50 border-amber-100" },
//         ].map(({ label, value, icon, color }) => (
//           <div key={label} className={`rounded-xl border p-4 ${color} flex items-center gap-4`}>
//             <span className="text-3xl">{icon}</span>
//             <div>
//               <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
//               <p className="text-2xl font-black text-slate-800 mt-0.5">{value}</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* ── Search + Table ── */}
//       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

//         {/* Toolbar */}
//         <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
//           <div className="relative flex-1 max-w-xs">
//             <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
//             </svg>
//             <input
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               placeholder="Search challan no, customer..."
//               className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
//             />
//           </div>
//           <span className="text-xs text-slate-400 font-semibold">
//             {filtered.length} record{filtered.length !== 1 ? "s" : ""}
//             {totalPages > 1 && ` • Page ${safePage} of ${totalPages}`}
//           </span>
//         </div>

//         {/* Table */}
//         {loading ? (
//           <div className="flex items-center justify-center py-20 text-slate-400">
//             <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mr-3" />
//             Loading challans...
//           </div>
//         ) : filtered.length === 0 ? (
//           <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//             <span className="text-5xl mb-4">📋</span>
//             <p className="font-semibold text-slate-500">No challans found</p>
//             <p className="text-sm mt-1">
//               {search ? "Try a different search term" : 'Click "Create Challan" to get started'}
//             </p>
//             {!search && (
//               <button
//                 onClick={() => navigate("/sales/dispatch-on-challan/create")}
//                 className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow transition-all"
//               >
//                 + Create First Challan
//               </button>
//             )}
//           </div>
//         ) : (
//           <>
//             <div className="overflow-x-auto">
//               <table className="w-full min-w-[800px]">
//                 <thead>
//                   <tr className="bg-slate-50 border-b border-slate-200">
//                     {["#", "Challan No", "Date", "Customer", "SO Reference", "Destination", "Items / Qty", "Status", ""].map((h) => (
//                       <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {paginated.map((c, idx) => (
//                     <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
//                       {/* Global row number across pages */}
//                       <td className="px-4 py-3 text-sm text-slate-400">
//                         {(safePage - 1) * PAGE_SIZE + idx + 1}
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className="font-mono font-bold text-indigo-700 text-sm">{c.challanNo}</span>
//                       </td>
//                       <td className="px-4 py-3 text-sm text-slate-600">
//                         {c.header?.challanDate || "—"}
//                       </td>
//                       <td className="px-4 py-3">
//                         <p className="text-sm font-semibold text-slate-800">{c.header?.customer || "—"}</p>
//                         {c.header?.companyName && (
//                           <p className="text-xs text-slate-400 mt-0.5">{c.header.companyName}</p>
//                         )}
//                       </td>
//                       <td className="px-4 py-3 text-sm font-mono text-slate-600">{c.soReference || "—"}</td>
//                       <td className="px-4 py-3 text-sm text-slate-600">{c.header?.destination || "—"}</td>
//                       <td className="px-4 py-3">
//                         <div className="flex items-center gap-2">
//                           <span className="text-xs text-slate-500">{(c.items || []).length} items</span>
//                           <span className="text-slate-300">•</span>
//                           <span className="text-sm font-bold text-slate-800">{totalItems(c)} qty</span>
//                         </div>
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_COLORS[c.status] || STATUS_COLORS.pending}`}>
//                           {c.status || "pending"}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3 text-right">
//                         <button
//                           onClick={() => navigate(`/sales/dispatch-on-challan/${c.id}`)}
//                           className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
//                         >
//                           View →
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* ── Pagination Bar ── */}
//             {totalPages > 1 && (
//               <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">

//                 {/* Left: showing info */}
//                 <p className="text-xs text-slate-500">
//                   Showing{" "}
//                   <span className="font-bold text-slate-700">
//                     {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}
//                   </span>{" "}
//                   of{" "}
//                   <span className="font-bold text-slate-700">{filtered.length}</span>{" "}
//                   challans
//                 </p>

//                 {/* Right: page buttons */}
//                 <div className="flex items-center gap-1">
//                   {/* First */}
//                   <button
//                     onClick={() => setPage(1)}
//                     disabled={safePage === 1}
//                     className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//                     title="First page"
//                   >
//                     «
//                   </button>

//                   {/* Prev */}
//                   <button
//                     onClick={() => setPage((p) => Math.max(1, p - 1))}
//                     disabled={safePage === 1}
//                     className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//                   >
//                     ‹ Prev
//                   </button>

//                   {/* Left ellipsis */}
//                   {pageNumbers()[0] > 1 && (
//                     <span className="px-2 text-slate-400 text-xs">…</span>
//                   )}

//                   {/* Page numbers */}
//                   {pageNumbers().map((n) => (
//                     <button
//                       key={n}
//                       onClick={() => setPage(n)}
//                       className={`w-8 h-8 text-xs rounded-lg border font-semibold transition-all
//                         ${n === safePage
//                           ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
//                           : "bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200"
//                         }`}
//                     >
//                       {n}
//                     </button>
//                   ))}

//                   {/* Right ellipsis */}
//                   {pageNumbers()[pageNumbers().length - 1] < totalPages && (
//                     <span className="px-2 text-slate-400 text-xs">…</span>
//                   )}

//                   {/* Next */}
//                   <button
//                     onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//                     disabled={safePage === totalPages}
//                     className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//                   >
//                     Next ›
//                   </button>

//                   {/* Last */}
//                   <button
//                     onClick={() => setPage(totalPages)}
//                     disabled={safePage === totalPages}
//                     className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//                     title="Last page"
//                   >
//                     »
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  orderBy,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const STATUS_COLORS = {
  dispatched: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

// ─── Draft helpers ────────────────────────────────────────────────────────────
const DRAFT_KEY = "dispatch_challan_draft";
function loadDraft(initial) {
  try {
    const s = localStorage.getItem(DRAFT_KEY);
    return s ? { ...initial, ...JSON.parse(s) } : initial;
  } catch {
    return initial;
  }
}
function saveDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

// ─── Stock lookup ─────────────────────────────────────────────────────────────
async function lookupStock(productCode) {
  try {
    const q = query(
      collection(db, "stock"),
      where("productCode", "==", productCode.trim().toUpperCase()),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0].data();
      return {
        description: d.description || d.productName || "",
        hsn: d.hsnSac || d.hsnCode || "",
        unit: d.unit || "",
        stock: d.available ?? d.quantity ?? d.availableQty ?? 0,
        found: true,
      };
    }
  } catch (e) {
    console.error(e);
  }
  return { description: "", hsn: "", unit: "", stock: 0, found: false };
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(header, rows, challanNo) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Delivery Challan - ${challanNo}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
  .hbox{border:2px solid #111;padding:10px}.title{text-align:center;font-size:16px;font-weight:bold;text-decoration:underline;margin-bottom:8px}
  .g2{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #111}.g3{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #111}
  .cell{padding:5px 8px;border-right:1px solid #111;border-bottom:1px solid #111}.cell:last-child{border-right:none}
  .cl{font-size:9px;color:#555;font-weight:bold;text-transform:uppercase}.cv{font-size:11px;font-weight:bold;margin-top:2px}
  .stitle{background:#1e293b;color:white;padding:5px 8px;font-size:10px;font-weight:bold;border:1px solid #111;border-top:none}
  table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:10px;font-weight:bold;border:1px solid #111}
  td{padding:5px 8px;border:1px solid #ccc;font-size:11px}tfoot td{font-weight:bold;background:#f1f5f9;border-top:2px solid #111}
  .sbox{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #111;border-top:none}
  .sc{padding:30px 10px 10px;border-right:1px solid #111;text-align:center;font-size:10px;font-weight:bold}.sc:last-child{border-right:none}
  </style></head><body>
  <div class="hbox"><div class="title">DELIVERY CHALLAN</div>
  <div class="g3">
    <div class="cell"><div class="cl">Challan No</div><div class="cv">${challanNo}</div></div>
    <div class="cell"><div class="cl">Date</div><div class="cv">${header.challanDate || ""}</div></div>
    <div class="cell"><div class="cl">SO Reference</div><div class="cv">${header.soReference || ""}</div></div>
  </div>
  <div class="g2">
    <div class="cell"><div class="cl">Customer</div><div class="cv">${header.customer || ""}</div></div>
    <div class="cell"><div class="cl">Consignee</div><div class="cv">${header.consignee || ""}</div></div>
  </div>
  <div class="g2">
    <div class="cell"><div class="cl">Destination</div><div class="cv">${header.destination || ""}</div></div>
    <div class="cell"><div class="cl">Approx Invoice Date</div><div class="cv">${header.approxInvoiceDate || ""}</div></div>
  </div>
  <div class="g3">
    <div class="cell"><div class="cl">Vehicle No</div><div class="cv">${header.vehicleNo || "—"}</div></div>
    <div class="cell"><div class="cl">Driver</div><div class="cv">${header.driverName || "—"}</div></div>
    <div class="cell"><div class="cl">Driver Contact</div><div class="cv">${header.driverContact || "—"}</div></div>
  </div></div>
  <div class="stitle">ITEMS / PRODUCTS</div>
  <table><thead><tr><th>SL</th><th>Part No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th><th>Remarks</th></tr></thead>
  <tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td><b>${r.productCode || ""}</b></td><td>${r.description || ""}</td><td>${r.hsn || ""}</td><td><b>${r.dispatchQty || 0}</b></td><td>${r.unit || ""}</td><td>${r.remarks || ""}</td></tr>`).join("")}</tbody>
  <tfoot><tr><td colspan="4" style="text-align:right">TOTAL</td><td><b>${rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0)}</b></td><td colspan="2"></td></tr></tfoot></table>
  <div class="sbox"><div class="sc">Prepared By</div><div class="sc">Checked By</div><div class="sc">Authorised Signatory</div></div>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.focus();
    w.print();
  };
}

function exportCSV(header, rows, challanNo) {
  const lines = [
    ["DELIVERY CHALLAN"],
    ["Challan No", challanNo],
    ["Date", header.challanDate],
    [""],
    ["Customer", header.customer],
    ["SO Reference", header.soReference],
    ["Vehicle No", header.vehicleNo],
    ["Driver", header.driverName],
    ["Driver Contact", header.driverContact],
    [""],
    [
      "SL",
      "Part No",
      "Description",
      "HSN/SAC",
      "Dispatch Qty",
      "Unit",
      "Remarks",
    ],
    ...rows.map((r, i) => [
      i + 1,
      r.productCode,
      r.description,
      r.hsn,
      r.dispatchQty,
      r.unit,
      r.remarks || "",
    ]),
  ];
  const csv = lines
    .map((r) => r.map((c) => `"${c ?? ""}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${challanNo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  readOnly = false,
  mono = false,
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300
          ${readOnly ? "bg-slate-50 border-slate-200 text-slate-500" : "border-slate-300 bg-white text-slate-800"}
          ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const FORM_DEFAULTS = {
  challanNo: "",
  challanDate: todayISO(),
  soReference: "",
  customer: "",
  companyName: "",
  address: "",
  stateName: "",
  consignee: "",
  destination: "",
  invoiceNos: "",
  approxInvoiceDate: "",
  vehicleNo: "",
  driverName: "",
  driverContact: "",
  deliveryNote: "",
  rows: [
    {
      productCode: "",
      description: "",
      hsn: "",
      unit: "",
      dispatchQty: 0,
      stock: 0,
      remarks: "",
      lookingUp: false,
      found: false,
    },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
export default function DispatchOnChallanList() {
  const navigate = useNavigate();

  // ── List state ──
  const [challans, setChallans] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ── Modal / Form state ──
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setFormRaw] = useState(() => loadDraft(FORM_DEFAULTS));

  const setForm = (updater) =>
    setFormRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveDraft(next);
      return next;
    });
  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const {
    challanNo,
    challanDate,
    soReference,
    customer,
    companyName,
    address,
    stateName,
    consignee,
    destination,
    invoiceNos,
    approxInvoiceDate,
    vehicleNo,
    driverName,
    driverContact,
    deliveryNote,
    rows,
  } = form;

  // ── Fetch challans ──
  const fetchChallans = async () => {
    try {
      setListLoading(true);
      const q = query(
        collection(db, "dispatchChallans"),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      setChallans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search]);

  // ── Filtered + paginated ──
  const filtered = challans.filter((c) => {
    const s = search.toLowerCase();
    return (
      !s ||
      c.challanNo?.toLowerCase().includes(s) ||
      c.header?.customer?.toLowerCase().includes(s) ||
      c.soReference?.toLowerCase().includes(s) ||
      c.header?.destination?.toLowerCase().includes(s)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const totalQty = (c) =>
    (c.items || []).reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0);

  const pageNumbers = () => {
    const delta = 2,
      left = Math.max(1, safePage - delta),
      right = Math.min(totalPages, safePage + delta);
    const r = [];
    for (let i = left; i <= right; i++) r.push(i);
    return r;
  };

  // ── Row helpers ──
  const setRows = (updater) =>
    setForm((prev) => ({
      ...prev,
      rows: typeof updater === "function" ? updater(prev.rows) : updater,
    }));
  const addRow = () =>
    setRows((p) => [
      ...p,
      {
        productCode: "",
        description: "",
        hsn: "",
        unit: "",
        dispatchQty: 0,
        stock: 0,
        remarks: "",
        lookingUp: false,
        found: false,
      },
    ]);
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));
  const updateRow = async (i, field, value) => {
    setRows((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: value };
      return n;
    });
    if (field === "productCode") {
      const trimmed = value.trim();
      if (trimmed.length >= 2) {
        setRows((p) => {
          const n = [...p];
          n[i] = { ...n[i], lookingUp: true };
          return n;
        });
        const info = await lookupStock(trimmed);
        setRows((p) => {
          const n = [...p];
          n[i] = {
            ...n[i],
            lookingUp: false,
            found: info.found,
            description: info.found ? info.description : n[i].description,
            hsn: info.found ? info.hsn : n[i].hsn,
            unit: info.found ? info.unit : n[i].unit,
            stock: info.found ? info.stock : 0,
          };
          return n;
        });
      } else {
        setRows((p) => {
          const n = [...p];
          n[i] = { ...n[i], found: false };
          return n;
        });
      }
    }
  };

  const getHeader = () => ({
    challanDate,
    soReference,
    customer,
    companyName,
    address,
    stateName,
    consignee,
    destination,
    invoiceNos,
    approxInvoiceDate,
    vehicleNo,
    driverName,
    driverContact,
    deliveryNote,
  });
  const canSave =
    challanNo.trim() &&
    challanDate &&
    approxInvoiceDate &&
    rows.some((r) => r.productCode && r.dispatchQty > 0);

  // ── Save ──
  const handleSave = async () => {
    try {
      setSaving(true);
      // await addDoc(collection(db, "challans"), {
      //   challanNo, createdAt: serverTimestamp(), header: getHeader(),
      //   items: rows.filter(r => r.productCode), status: "dispatched", soReference,
      // });
      await addDoc(collection(db, "dispatchChallans"), {
        challanNo,
        createdAt: serverTimestamp(),
        header: getHeader(),
        items: rows.filter((r) => r.productCode),
        status: "dispatched",
        soReference,
        storeQcStatus: "pending_qc", // ← Store QC માં show થવા માટે
        challanDate: challanDate,
        customer: customer,
      });
      clearDraft();
      setDone(true);
      fetchChallans(); // refresh list in background
    } catch (e) {
      console.error(e);
      alert("Error saving challan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenForm = () => {
    setDone(false);
    setShowForm(true);
  };
  const handleCloseForm = () => {
    clearDraft();
    setFormRaw(FORM_DEFAULTS);
    setShowForm(false);
    setDone(false);
  };
  const handleNewChallan = () => {
    clearDraft();
    setFormRaw(FORM_DEFAULTS);
    setDone(false);
  };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">
            Dispatch on Challan
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage all delivery challans
          </p>
        </div>
        <button
          onClick={handleOpenForm}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Challan
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Challans",
            value: challans.length,
            icon: "📋",
            color: "bg-indigo-50 border-indigo-100",
          },
          {
            label: "Dispatched",
            value: challans.filter((c) => c.status === "dispatched").length,
            icon: "🚚",
            color: "bg-green-50 border-green-100",
          },
          {
            label: "Total Items Dispatched",
            value: challans.reduce((s, c) => s + totalQty(c), 0),
            icon: "📦",
            color: "bg-amber-50 border-amber-100",
          },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 ${color} flex items-center gap-4`}
          >
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                {label}
              </p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── List Card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challan no, customer..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {totalPages > 1 && ` • Page ${safePage} of ${totalPages}`}
          </span>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mr-3" />
            Loading challans...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-5xl mb-4">📋</span>
            <p className="font-semibold text-slate-500">No challans found</p>
            <p className="text-sm mt-1">
              {search
                ? "Try a different search term"
                : 'Click "Create Challan" to get started'}
            </p>
            {!search && (
              <button
                onClick={handleOpenForm}
                className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow"
              >
                + Create First Challan
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {[
                      "#",
                      "Challan No",
                      "Date",
                      "Customer",
                      "SO Reference",
                      "Destination",
                      "Items / Qty",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((c, idx) => (
                    <tr
                      key={c.id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {(safePage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-indigo-700 text-sm">
                          {c.challanNo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {c.header?.challanDate || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {c.header?.customer || "—"}
                        </p>
                        {c.header?.companyName && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {c.header.companyName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">
                        {c.soReference || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {c.header?.destination || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {(c.items || []).length} items
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-sm font-bold text-slate-800">
                            {totalQty(c)} qty
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_COLORS[c.status] || STATUS_COLORS.pending}`}
                        >
                          {c.status || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            navigate(`/sales/dispatch-on-challan/${c.id}`)
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-bold text-slate-700">
                    {(safePage - 1) * PAGE_SIZE + 1}–
                    {Math.min(safePage * PAGE_SIZE, filtered.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-700">
                    {filtered.length}
                  </span>{" "}
                  challans
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ‹ Prev
                  </button>
                  {pageNumbers()[0] > 1 && (
                    <span className="px-2 text-slate-400 text-xs">…</span>
                  )}
                  {pageNumbers().map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 text-xs rounded-lg border font-semibold transition-all ${n === safePage ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-indigo-50"}`}
                    >
                      {n}
                    </button>
                  ))}
                  {pageNumbers()[pageNumbers().length - 1] < totalPages && (
                    <span className="px-2 text-slate-400 text-xs">…</span>
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next ›
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Create Challan Form
      ══════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 mb-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  Create Delivery Challan
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Fill in the details to create a new challan
                </p>
              </div>
              <button
                onClick={handleCloseForm}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* ── SUCCESS screen ── */}
              {/* {done ? (
                <div className="space-y-5">
                  <div className="bg-green-600 rounded-xl px-6 py-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">✅</div>
                    <div>
                      <h3 className="text-lg font-black text-white">Challan Created Successfully!</h3>
                      <p className="text-sm text-white opacity-80 mt-0.5">{challanNo} • Saved to Firebase</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[["Challan No",challanNo],["Customer",customer||"—"],["SO Reference",soReference||"—"],["Approx Invoice Date",approxInvoiceDate],["Vehicle No",vehicleNo||"—"],["Driver Contact",driverContact||"—"]].map(([label,val])=>(
                      <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-400 font-semibold">{label}</p>
                        <p className="text-sm text-slate-800 font-bold mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <p className="text-sm font-bold text-slate-700 mb-3">📥 Download Challan</p>
                    <div className="flex gap-3">
                      <button onClick={()=>exportPDF(getHeader(),rows.filter(r=>r.productCode),challanNo)} className="flex items-center gap-2.5 px-5 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow">
                        <span className="text-lg">📄</span><div><p className="font-bold leading-tight">Download PDF</p><p className="text-xs text-red-200">Print ready</p></div>
                      </button>
                      <button onClick={()=>exportCSV(getHeader(),rows.filter(r=>r.productCode),challanNo)} className="flex items-center gap-2.5 px-5 py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-bold rounded-xl shadow">
                        <span className="text-lg">📊</span><div><p className="font-bold leading-tight">Download Excel</p><p className="text-xs text-green-200">CSV format</p></div>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleNewChallan} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg">+ New Challan</button>
                    <button onClick={handleCloseForm} className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">✕ Close</button>
                  </div>
                </div>
              ) : ( */}
              {done ? (
                <div className="space-y-6 py-4">
                  {/* Stepper */}
                  <div className="flex items-center justify-center gap-0">
                    {[
                      { label: "Create Challan", done: true },
                      { label: "Store QC", done: false, active: true },
                      { label: "Approved", done: false },
                    ].map((s, i, arr) => (
                      <React.Fragment key={s.label}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2
              ${
                s.done
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : s.active
                    ? "bg-white border-indigo-500 text-indigo-600"
                    : "bg-white border-slate-200 text-slate-400"
              }`}
                          >
                            {s.done ? "✓" : i + 1}
                          </div>
                          <span
                            className={`text-[10px] font-bold ${s.active ? "text-indigo-600" : s.done ? "text-slate-600" : "text-slate-300"}`}
                          >
                            {s.label}
                          </span>
                        </div>
                        {i < arr.length - 1 && (
                          <div
                            className={`h-0.5 w-20 mb-5 ${s.done ? "bg-indigo-500" : "bg-slate-200"}`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Waiting card */}
                  <div className="text-center space-y-3 py-4">
                    <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center mx-auto">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-9 h-9 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-2.007-.496-3.9-1.372-5.565"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-800">
                      Waiting for Store QC Approval
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      The store team will verify the dispatched items. This will
                      update automatically once they approve.
                    </p>
                  </div>

                  {/* Challan info chips */}
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {[
                      ["Challan", challanNo],
                      ["Customer", customer || "—"],
                      ["Items", rows.filter((r) => r.productCode).length],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="px-4 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600"
                      >
                        <span className="text-slate-400 font-semibold">
                          {k}{" "}
                        </span>
                        {v}
                      </div>
                    ))}
                  </div>

                  {/* Steps */}
                  <div className="max-w-md mx-auto space-y-2">
                    {[
                      {
                        label: "Challan Created",
                        sub: `${rows.filter((r) => r.productCode).length} items • ${challanNo}`,
                        done: true,
                      },
                      {
                        label: "Store team notified for QC",
                        sub: "Notification sent to Store Manager",
                        done: true,
                      },
                      {
                        label: "Store QC inspection in progress",
                        sub: "Store team is verifying dispatched items",
                        active: true,
                      },
                      {
                        label: "QC Approved",
                        sub: "Will update status to approved",
                        done: false,
                      },
                    ].map((step) => (
                      <div
                        key={step.label}
                        className={`flex items-start gap-3 p-3 rounded-xl border
          ${
            step.done
              ? "bg-white border-slate-200"
              : step.active
                ? "bg-indigo-50 border-indigo-200"
                : "bg-slate-50 border-slate-100 opacity-60"
          }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs
            ${
              step.done
                ? "bg-green-500 text-white"
                : step.active
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-200 text-slate-400"
            }`}
                        >
                          {step.done ? "✓" : step.active ? "⟳" : "○"}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-bold ${step.active ? "text-indigo-700" : "text-slate-700"}`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {step.sub}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleNewChallan}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg"
                    >
                      + New Challan
                    </button>
                    <button
                      onClick={handleCloseForm}
                      className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Section 1: Challan Details */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 bg-indigo-600">
                      <h4 className="text-sm font-bold text-white">
                        1. Challan Details
                      </h4>
                    </div>
                    <div className="p-5 grid grid-cols-3 gap-4">
                      <Field
                        label="Challan No"
                        value={challanNo}
                        onChange={set("challanNo")}
                        placeholder="e.g. CH-2526-001"
                        required
                        mono
                      />
                      <Field
                        label="Challan Date"
                        value={challanDate}
                        onChange={set("challanDate")}
                        type="date"
                        required
                      />
                      <Field
                        label="SO / PO Reference"
                        value={soReference}
                        onChange={set("soReference")}
                        placeholder="e.g. EVFN/2526/02790"
                      />
                      <Field
                        label="Customer / Buyer"
                        value={customer}
                        onChange={set("customer")}
                        placeholder="Customer / Buyer name"
                        required
                      />
                      <div className="col-span-2">
                        <Field
                          label="Company Name"
                          value={companyName}
                          onChange={set("companyName")}
                          placeholder="Company name"
                        />
                      </div>
                      <div className="col-span-2">
                        <Field
                          label="Address"
                          value={address}
                          onChange={set("address")}
                          placeholder="Full address"
                        />
                      </div>
                      <Field
                        label="State"
                        value={stateName}
                        onChange={set("stateName")}
                        placeholder="e.g. Gujarat"
                      />
                      <div className="col-span-2">
                        <Field
                          label="Consignee (Ship To)"
                          value={consignee}
                          onChange={set("consignee")}
                          placeholder="Consignee name & address"
                        />
                      </div>
                      <Field
                        label="Destination"
                        value={destination}
                        onChange={set("destination")}
                        placeholder="e.g. VALSAD"
                      />
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
                          Invoice Nos (Unbilled)
                        </label>
                        <input
                          value={invoiceNos}
                          onChange={set("invoiceNos")}
                          placeholder="e.g. F/0716/25-26"
                          className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg bg-amber-50 text-amber-800 font-mono focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      </div>
                      <Field
                        label="Approx. Invoice Date"
                        value={approxInvoiceDate}
                        onChange={set("approxInvoiceDate")}
                        type="date"
                        required
                      />
                    </div>
                  </div>

                  {/* Section 2: Items */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 bg-green-700 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">
                        2. Items / Products
                      </h4>
                      <span className="text-xs text-green-200">
                        {rows.length} row{rows.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[820px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase w-8">
                              SL
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                              Part No{" "}
                              <span className="text-indigo-400 normal-case font-normal">
                                (type to auto-fill)
                              </span>
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                              Description
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                              HSN/SAC
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                              Unit
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                              Stock
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                              Dispatch Qty{" "}
                              <span className="text-red-400">*</span>
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                              Remarks
                            </th>
                            <th className="px-3 py-2.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.map((row, i) => (
                            <tr
                              key={i}
                              className={`${row.found ? "bg-green-50/30" : ""} hover:bg-slate-50/50 transition-colors`}
                            >
                              <td className="px-3 py-2.5 text-sm text-slate-400 text-center">
                                {i + 1}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="relative">
                                  <input
                                    value={row.productCode}
                                    onChange={(e) =>
                                      updateRow(
                                        i,
                                        "productCode",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Part No"
                                    className={`w-32 px-2 py-1.5 text-xs border rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 ${row.found ? "border-green-400 bg-green-50 text-green-800" : "border-slate-300"}`}
                                  />
                                  {row.lookingUp && (
                                    <div className="absolute right-1.5 top-1.5 w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                  )}
                                  {row.found && !row.lookingUp && (
                                    <span className="absolute right-1.5 top-1.5 text-green-500 text-xs">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  value={row.description}
                                  onChange={(e) =>
                                    updateRow(i, "description", e.target.value)
                                  }
                                  placeholder="Auto-filled from Part No"
                                  className={`w-52 px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 ${row.found ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`}
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  value={row.hsn}
                                  onChange={(e) =>
                                    updateRow(i, "hsn", e.target.value)
                                  }
                                  placeholder="HSN"
                                  className={`w-24 px-2 py-1.5 text-xs border rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 ${row.found ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`}
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  value={row.unit}
                                  onChange={(e) =>
                                    updateRow(i, "unit", e.target.value)
                                  }
                                  placeholder="pcs"
                                  className={`w-16 px-2 py-1.5 text-xs border rounded text-center focus:outline-none focus:ring-2 focus:ring-indigo-200 ${row.found ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`}
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`text-sm font-bold ${(row.stock ?? 0) > 0 ? "text-green-600" : "text-red-400"}`}
                                >
                                  {row.found ? (row.stock ?? 0) : "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.dispatchQty || ""}
                                  onChange={(e) =>
                                    updateRow(
                                      i,
                                      "dispatchQty",
                                      Number(e.target.value),
                                    )
                                  }
                                  placeholder="0"
                                  className="w-20 px-2 py-1.5 text-sm border border-indigo-300 rounded text-center font-bold text-indigo-700 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  value={row.remarks}
                                  onChange={(e) =>
                                    updateRow(i, "remarks", e.target.value)
                                  }
                                  placeholder="Optional"
                                  className="w-28 px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {rows.length > 1 && (
                                  <button
                                    onClick={() => removeRow(i)}
                                    className="text-red-300 hover:text-red-500 text-xl leading-none transition-colors"
                                  >
                                    ×
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                      <button
                        onClick={addRow}
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        <span className="text-lg font-bold">+</span> Add Row
                      </button>
                      <span className="text-sm text-slate-500">
                        Total Qty:{" "}
                        <span className="font-black text-slate-800 text-base">
                          {rows.reduce(
                            (s, r) => s + (Number(r.dispatchQty) || 0),
                            0,
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Section 3: Transport */}
                  <details className="rounded-xl border border-slate-200 overflow-hidden group">
                    <summary className="px-5 py-3 bg-slate-700 cursor-pointer list-none flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">
                        3. Transport Details{" "}
                        <span className="text-slate-400 font-normal text-xs ml-2">
                          (optional)
                        </span>
                      </h4>
                      <span className="text-white text-xs opacity-60 group-open:hidden">
                        ▼ Click to expand
                      </span>
                      <span className="text-white text-xs opacity-60 hidden group-open:inline">
                        ▲ Click to collapse
                      </span>
                    </summary>
                    <div className="p-5 grid grid-cols-3 gap-4">
                      <Field
                        label="Vehicle No"
                        value={vehicleNo}
                        onChange={set("vehicleNo")}
                        placeholder="GJ-06-AB-1234"
                      />
                      <Field
                        label="Driver Name"
                        value={driverName}
                        onChange={set("driverName")}
                        placeholder="Driver name"
                      />
                      <Field
                        label="Driver Contact No"
                        value={driverContact}
                        onChange={set("driverContact")}
                        placeholder="e.g. 98765 43210"
                        mono
                      />
                      <div className="col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
                          Delivery Note
                        </label>
                        <textarea
                          value={deliveryNote}
                          onChange={set("deliveryNote")}
                          rows={2}
                          placeholder="Special instructions..."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                        />
                      </div>
                    </div>
                  </details>

                  {/* Form Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={handleCloseForm}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!canSave || saving}
                      className={`px-6 py-2.5 text-sm font-bold rounded-lg shadow transition-all ${canSave && !saving ? "bg-green-600 hover:bg-green-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                    >
                      {saving ? "⏳ Saving..." : "📋 Create Challan"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
