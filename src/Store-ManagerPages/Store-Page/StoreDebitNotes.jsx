import React, { useState, useEffect } from "react";
import {
  collection, getDocs, doc, updateDoc,
  serverTimestamp, where, query,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiShield, FiAlertTriangle, FiPackage,
  FiClock, FiCheckCircle, FiXCircle, FiFileText,
  FiRefreshCw, FiUser, FiArrowLeft,
} from "react-icons/fi";

const DB_NOTES = "SalesDebitNotes";
const DB_STOCK = "stock";

const ISSUES = [
  { value: "",           label: "— None" },
  { value: "damage",     label: "🔴 Damage" },
  { value: "shortage",   label: "🟠 Shortage" },
  { value: "quality",    label: "🟡 Quality" },
  { value: "wrong_item", label: "🔵 Wrong Item" },
  { value: "other",      label: "⚪ Other" },
];

function formatDate(val) {
  if (!val) return "—";
  try {
    const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return "—"; }
}

function StatusPill({ status }) {
  const map = {
    waiting_store_qc:   "bg-amber-100 text-amber-700 border-amber-200",
    approved:           "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected:           "bg-red-100 text-red-700 border-red-200",
    passed_with_issues: "bg-orange-100 text-orange-700 border-orange-200",
  };
  const labels = {
    waiting_store_qc:   "⏳ Pending QC",
    approved:           "✅ Approved",
    rejected:           "❌ Rejected",
    passed_with_issues: "⚠️ Issues Pending",
  };
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${map[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {labels[status] || status}
    </span>
  );
}

async function updateStockForReturn(item, noteRef, noteNumber, qty, isIssue = false) {
  if (!qty || qty <= 0) return;
  const key = (item.partNo || "").trim();
  if (!key) return;
  const now = new Date().toISOString();
  const stockSnap = await getDocs(query(collection(db, DB_STOCK), where("productCode", "==", key)));
  if (stockSnap.empty) return;
  const sd = stockSnap.docs[0];
  const sdata = sd.data();
  const currentAvail = parseFloat(sdata.available) || 0;
  const ledger = Array.isArray(sdata.ledger) ? sdata.ledger : [];
  const updatePayload = {
    available: currentAvail + qty,
    lastUpdated: now,
    ledger: [...ledger, {
      type: "return-in", qty,
      ref: noteRef, by: "Store Team",
      balance: currentAvail + qty, date: now,
      remarks: `Return approved — Debit Note: ${noteNumber}${isIssue ? ` (Issue: ${item.issue})` : ""}`,
    }],
  };
  if (isIssue && item.issue) {
    updatePayload.hasIssue = true;
    updatePayload.qcIssue = item.issue;
    updatePayload.qcIssueDetail = `Return issue — ${item.issue} · ${item.issueQty} units`;
    updatePayload.lastQCDate = now;
  }
  await updateDoc(doc(db, DB_STOCK, sd.id), updatePayload);
}

// ── Detail Screen ─────────────────────────────────────────────────────────
function NoteDetail({ note, onBack, onApprove, onReject, onPassWithIssues, saving }) {
  const [storeRemarks, setStoreRemarks] = useState("");

  const [verifyRows, setVerifyRows] = useState(
    (note.items || []).map(item => ({
      partNo:     item.partNo || "",
      itemName:   item.itemName || "",
      hsnSac:     item.hsnSac || "",
      unit:       item.unit || "pcs",
      invoiceQty: parseFloat(item.invoiceQty) || 0,
      returnQty:  parseFloat(item.returnQty) || 0,
      verifyQty:  parseFloat(item.returnQty) || 0,
      issue:      "",
      issueQty:   0,
      remarks:    item.remarks || "",
    }))
  );

  const updateRow = (idx, field, value) => {
    setVerifyRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      if (field === "verifyQty") {
        const v = Math.min(parseFloat(value) || 0, row.invoiceQty);
        return { ...row, verifyQty: v, issue: v === 0 ? "" : row.issue, issueQty: v === 0 ? 0 : row.issueQty };
      }
      if (field === "issueQty") {
        return { ...row, issueQty: Math.min(parseFloat(value) || 0, row.verifyQty || row.invoiceQty) };
      }
      if (field === "issue") {
        return { ...row, issue: value, issueQty: value === "" ? 0 : row.issueQty };
      }
      return { ...row, [field]: value };
    }));
  };

  const totalDispatched = verifyRows.reduce((s, r) => s + (r.invoiceQty || 0), 0);
  const totalReturn     = verifyRows.reduce((s, r) => s + (r.returnQty || 0), 0);
  const totalVerified   = verifyRows.reduce((s, r) => s + (parseFloat(r.verifyQty) || 0), 0);
  const totalIssue      = verifyRows.reduce((s, r) => s + (parseFloat(r.issueQty) || 0), 0);
  const totalClean      = totalVerified - totalIssue;
  // const totalOk         = totalDispatched - totalVerified;
  const totalOk = totalReturn - totalVerified;
  const hasIssues       = verifyRows.some(r => r.issue && r.issueQty > 0);
  const isProcessed     = note.status !== "waiting_store_qc";

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <FiArrowLeft size={15} /> Back to Debit Notes List
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider mb-1">Return Request — Store QC</p>
            <h2 className="text-xl font-black mb-1 flex items-center gap-2">
              <FiUser size={18} /> {note.customer || note.vendorName || "—"}
            </h2>
            <p className="text-sm text-indigo-200">Note: <strong className="text-white">{note.noteNumber || "—"}</strong></p>
            {note.submittedByName && <p className="text-xs text-indigo-300 mt-0.5">Submitted by: {note.submittedByName}</p>}
          </div>
          <div className="flex-shrink-0 space-y-2 text-right">
            <StatusPill status={note.status} />
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              {[
                ["Invoice No", note.linkedInvoiceNo || "—"],
                ["PO No",      note.linkedPoNo || "—"],
                ["Vendor",     note.vendorName || "—"],
                ["Submitted",  formatDate(note.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="bg-white/10 rounded-lg px-3 py-2 text-left">
                  <p className="text-[10px] text-indigo-200 font-bold uppercase">{k}</p>
                  <p className="text-xs font-bold text-white truncate max-w-[130px]">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total Dispatched", value: totalDispatched, color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-200" },
          { label: "Return Claimed",   value: totalReturn,     color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
          { label: "Store Verified",   value: totalVerified,   color: "text-red-600",     bg: "bg-red-50 border-red-200" },
          { label: "Issue Qty",        value: totalIssue,      color: "text-orange-600",  bg: totalIssue > 0 ? "bg-orange-50 border-orange-300" : "bg-slate-50 border-slate-200" },
          { label: "OK (No Return)",   value: totalOk,         color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`border rounded-xl p-3 text-center ${bg}`}>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-400">units</p>
          </div>
        ))}
      </div>

      {/* Issue logic info */}
      {hasIssues && !isProcessed && (
        <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-300 rounded-xl">
          <FiAlertTriangle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-orange-700 space-y-0.5">
            <p className="font-bold">Issue Items Detected</p>
            <p>
              <strong>Approve</strong> → Clean qty ({totalClean}) will be added to stock, issue badge set.
              &nbsp;<strong>Passed with Issues</strong> → Only clean qty added to stock, issue qty ({totalIssue}) will remain pending on both panels.
            </p>
          </div>
        </div>
      )}

      {/* Processed banner */}
      {isProcessed && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          note.status === "approved" ? "bg-emerald-50 border-emerald-200" :
          note.status === "rejected" ? "bg-red-50 border-red-200" :
          "bg-orange-50 border-orange-200"
        }`}>
          {note.status === "approved"
            ? <FiCheckCircle size={16} className="text-emerald-600" />
            : note.status === "rejected"
              ? <FiXCircle size={16} className="text-red-500" />
              : <FiAlertTriangle size={16} className="text-orange-500" />}
          <div>
            <p className="text-sm font-bold text-slate-800">
              {note.status === "approved" ? "Return approved — stock updated" :
               note.status === "rejected" ? "Return rejected" :
               "Passed with issues — issue qty pending follow-up on Sales panel"}
            </p>
            {note.storeRemarks && <p className="text-xs text-slate-500 mt-0.5">Store remarks: {note.storeRemarks}</p>}
          </div>
        </div>
      )}

      {/* Two column */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT — Sales dispatched */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm lg:col-span-2">
          <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <FiFileText size={13} className="text-slate-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700">Sales Dispatched Items</p>
              <p className="text-[10px] text-slate-400">Fixed — approved invoice</p>
            </div>
            <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
              {(note.items || []).length} items
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["No", "Description", "Part No", "Disp Qty", "Unit"].map(h => (
                    <th key={h} className="px-2 py-2 text-left font-bold text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(note.items || []).map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-2 py-2 text-slate-400 font-bold">{i + 1}</td>
                    <td className="px-2 py-2 font-medium text-slate-700 max-w-[120px]"><p className="truncate">{item.itemName || "—"}</p></td>
                    <td className="px-2 py-2"><span className="font-mono text-[10px] bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded font-bold whitespace-nowrap">{item.partNo || "—"}</span></td>
                    <td className="px-2 py-2 font-black text-slate-800 text-center">{item.invoiceQty || 0}</td>
                    <td className="px-2 py-2 text-slate-400 uppercase text-[10px]">{item.unit || "pcs"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-2 py-2 text-[10px] font-bold text-slate-500">Total</td>
                  <td className="px-2 py-2 font-black text-slate-700 text-center">{totalDispatched}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* RIGHT — Store verify */}
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm lg:col-span-3">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiAlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-700">
                  {isProcessed ? "Verified Return Items" : "Verify Return Items — Store QC"}
                </p>
                <p className="text-[10px] text-red-400">
                  {isProcessed ? "Read only — processed" : "Adjust qty · set issue if any damage/shortage found"}
                </p>
              </div>
            </div>
            {!isProcessed && totalVerified > 0 && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full border border-red-200 flex-shrink-0">
                {totalVerified} verified
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-red-50/50 border-b border-red-100">
                <tr>
                  <th className="px-2 py-2.5 text-left font-bold text-slate-400 w-7 whitespace-nowrap">No</th>
                  <th className="px-2 py-2.5 text-left font-bold text-slate-400 whitespace-nowrap">Description</th>
                  <th className="px-2 py-2.5 text-left font-bold text-slate-400 w-24 whitespace-nowrap">Part No</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-500 w-12 whitespace-nowrap">Inv<br/>Qty</th>
                  <th className="px-2 py-2.5 text-center font-bold text-blue-500 w-12 whitespace-nowrap">Return<br/>Qty</th>
                  <th className="px-7 py-2.5 text-center font-bold text-red-500 w-14 whitespace-nowrap">Verify<br/>Qty</th>
                  {/* OK column removed */}
                  <th className="px-2 py-2.5 text-left font-bold text-orange-500 w-24 whitespace-nowrap">Issue</th>
                  <th className="px-2 py-2.5 text-center font-bold text-emerald-600 w-14 whitespace-nowrap">Physical<br/>Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {verifyRows.map((row, i) => {
                  const invoiceQty = row.invoiceQty || 0;
                  const returnQty  = row.returnQty || 0;
                  const verifyQty  = parseFloat(row.verifyQty) || 0;
                  const issueQty   = parseFloat(row.issueQty) || 0;
                  const hasVerify  = verifyQty > 0;
                  const hasIssue   = !!(row.issue);
                  const isMismatch = !isProcessed && hasVerify && verifyQty !== returnQty;

                  return (
                    <tr key={i} className={
                      hasIssue ? "bg-orange-50/30" :
                      hasVerify ? "bg-red-50/20" :
                      "hover:bg-slate-50/20"
                    }>
                      <td className="px-2 py-2 text-slate-400 font-bold text-center">{i + 1}</td>

                      <td className="px-2 py-2 font-medium text-slate-700 max-w-[120px]">
                        <p className="truncate text-[11px]">{row.itemName || "—"}</p>
                      </td>

                      <td className="px-2 py-2">
                        <span className="font-mono text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                          {row.partNo || "—"}
                        </span>
                      </td>

                      <td className="px-2 py-2 font-bold text-slate-600 text-center">{invoiceQty}</td>

                      <td className="px-2 py-2 text-center">
                        <span className={`text-sm font-black ${returnQty > 0 ? "text-blue-600" : "text-slate-300"}`}>
                          {returnQty || "—"}
                        </span>
                      </td>

                      <td className="px-2 py-2">
                        {isProcessed ? (
                          <span className={`text-sm font-black block text-center ${hasVerify ? "text-red-600" : "text-slate-300"}`}>
                            {verifyQty || "—"}
                          </span>
                        ) : (
                          <div className="relative">
                            <input
                              type="number" min="0" max={invoiceQty}
                              value={verifyQty || ""} placeholder="0"
                              onChange={(e) => updateRow(i, "verifyQty", e.target.value)}
                              className={`w-full h-8 border-2 rounded-lg px-1.5 text-sm font-black text-center focus:outline-none focus:ring-2 transition-all ${
                                hasVerify
                                  ? isMismatch
                                    ? "border-amber-400 bg-amber-50 text-amber-700 focus:ring-amber-300"
                                    : "border-red-400 bg-red-50 text-red-700 focus:ring-red-300"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 focus:ring-indigo-200 focus:border-indigo-300"
                              }`}
                            />
                            {isMismatch && (
                              <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-amber-400 text-white px-1 rounded-full font-bold whitespace-nowrap">
                                ≠{returnQty}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* OK column removed */}

                      <td className="px-2 py-2">
                        {isProcessed ? (
                          hasIssue ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                              row.issue === "damage"     ? "bg-red-100 text-red-700" :
                              row.issue === "shortage"   ? "bg-orange-100 text-orange-700" :
                              row.issue === "quality"    ? "bg-amber-100 text-amber-700" :
                              row.issue === "wrong_item" ? "bg-blue-100 text-blue-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>{row.issue?.replace(/_/g, " ")}</span>
                          ) : <span className="text-slate-200 text-[10px]">—</span>
                        ) : (
                          <select
                            value={row.issue || ""}
                            disabled={!hasVerify}
                            onChange={(e) => updateRow(i, "issue", e.target.value)}
                            className={`w-full h-8 border rounded-lg px-1 text-[11px] font-bold focus:outline-none focus:ring-1 transition-colors ${
                              !hasVerify ? "opacity-30 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-400" :
                              hasIssue ? "border-orange-300 bg-orange-50 text-orange-700" :
                              "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                            }`}
                          >
                            {ISSUES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        )}
                      </td>

                      {/* Physical Qty = Verify - Issue */}
                      <td className="px-2 py-2 text-center font-black whitespace-nowrap">
                        <span className={`text-sm font-black ${
                          hasVerify ? "text-emerald-600" : "text-slate-300"
                        }`}>
                          {/* {hasVerify ? Math.max(0, verifyQty - issueQty) : "—"} */}
                          {hasVerify ? Math.max(0, returnQty - verifyQty) : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {!isProcessed && (
                <tfoot className="bg-red-50/50 border-t border-red-200">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-xs font-bold text-slate-500">Total</td>
                    <td className="px-2 py-2 text-center font-black text-slate-600">{totalDispatched}</td>
                    <td className="px-2 py-2 text-center font-black text-blue-600">{totalReturn}</td>
                    <td className="px-2 py-2 text-center font-black text-red-600">{totalVerified || "—"}</td>
                    {/* OK column removed */}
                    <td />
                    <td className="px-2 py-2 text-center font-black text-emerald-600">{totalClean > 0 ? totalClean : "—"}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Sales remarks */}
      {note.remarks && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Sales Team Remarks</p>
          <p className="text-sm text-slate-700">{note.remarks}</p>
        </div>
      )}

      {/* Store action */}
      {!isProcessed && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Store QC Action</p>
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <FiShield size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 space-y-0.5">
              <p><strong>Approve</strong> → All verified qty added to stock (clean + issue both), issue badge set</p>
              <p><strong>Passed with Issues</strong> → Only clean qty ({totalClean}) added to stock, issue qty ({totalIssue}) remains pending — status stays pending on Sales panel</p>
              <p><strong>Reject</strong> → No stock update</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Store Remarks (optional)</label>
            <textarea rows={2} value={storeRemarks} onChange={(e) => setStoreRemarks(e.target.value)}
              placeholder="Inspection notes, condition of returned items..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={() => onReject(note.id, storeRemarks)} disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 flex items-center gap-2">
              <FiXCircle size={15} /> Reject Return
            </button>
            <button onClick={() => onPassWithIssues(note.id, storeRemarks, note, verifyRows)} disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-amber-700 border-2 border-amber-200 rounded-xl hover:bg-amber-50 disabled:opacity-50 flex items-center gap-2">
              <FiAlertTriangle size={15} /> Passed with Issues
            </button>
            <button onClick={() => onApprove(note.id, storeRemarks, note, verifyRows)} disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
              {saving
                ? <><FiRefreshCw size={14} className="animate-spin" /> Processing...</>
                : <><FiCheckCircle size={15} /> Approve & Update Stock</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function StoreDebitNotes() {
  const [notes, setNotes]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [tab, setTab]                   = useState("pending");

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, DB_NOTES));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(n => n.action === "return")
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotes(list);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleApprove = async (noteId, remarks, note, verifyRows) => {
    setSaving(true);
    try {
      for (const row of verifyRows) {
        const verifyQty = parseFloat(row.verifyQty) || 0;
        const issueQty  = parseFloat(row.issueQty) || 0;
        const cleanQty  = Math.max(0, verifyQty - issueQty);
        if (cleanQty > 0) await updateStockForReturn(row, note.linkedInvoiceNo || noteId, note.noteNumber || noteId, cleanQty, false);
        if (issueQty > 0 && row.issue) await updateStockForReturn(row, note.linkedInvoiceNo || noteId, note.noteNumber || noteId, issueQty, true);
      }
      await updateDoc(doc(db, DB_NOTES, noteId), {
        status: "approved", storeRemarks: remarks,
        verifiedItems: verifyRows,
        storeApprovedAt: serverTimestamp(), storeApprovedBy: "Store Team",
      });
      await fetchNotes(); setSelectedNote(null);
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const handlePassWithIssues = async (noteId, remarks, note, verifyRows) => {
    setSaving(true);
    try {
      for (const row of verifyRows) {
        const verifyQty = parseFloat(row.verifyQty) || 0;
        const issueQty  = parseFloat(row.issueQty) || 0;
        const cleanQty  = Math.max(0, verifyQty - issueQty);
        if (cleanQty > 0) await updateStockForReturn(row, note.linkedInvoiceNo || noteId, note.noteNumber || noteId, cleanQty, false);
        if (issueQty > 0 && row.issue && row.partNo) {
          const stockSnap = await getDocs(query(collection(db, DB_STOCK), where("productCode", "==", row.partNo.trim())));
          if (!stockSnap.empty) {
            await updateDoc(doc(db, DB_STOCK, stockSnap.docs[0].id), {
              hasIssue: true, qcIssue: row.issue,
              qcIssueDetail: `Return issue — ${row.issue} · ${issueQty} units pending`,
              lastQCDate: new Date().toISOString(),
            });
          }
        }
      }
      await updateDoc(doc(db, DB_NOTES, noteId), {
        status: "passed_with_issues", storeRemarks: remarks,
        verifiedItems: verifyRows,
        storeActionAt: serverTimestamp(), storeActionBy: "Store Team",
      });
      await fetchNotes(); setSelectedNote(null);
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const handleReject = async (noteId, remarks) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, DB_NOTES, noteId), {
        status: "rejected", storeRemarks: remarks,
        storeRejectedAt: serverTimestamp(), storeRejectedBy: "Store Team",
      });
      await fetchNotes(); setSelectedNote(null);
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const pendingNotes  = notes.filter(n => n.status === "waiting_store_qc");
  const approvedNotes = notes.filter(n => n.status === "approved");
  const issueNotes    = notes.filter(n => n.status === "passed_with_issues");
  const rejectedNotes = notes.filter(n => n.status === "rejected");
  const displayNotes  =
    tab === "pending"  ? pendingNotes :
    tab === "approved" ? approvedNotes :
    tab === "issues"   ? issueNotes :
    tab === "rejected" ? rejectedNotes :
    notes;

  if (selectedNote) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">Debit Notes — Store QC</h2>
          <p className="text-xs text-slate-400 mt-0.5">Review return requests from Sales team</p>
        </div>
        <NoteDetail
          note={selectedNote} onBack={() => setSelectedNote(null)}
          onApprove={handleApprove} onReject={handleReject}
          onPassWithIssues={handlePassWithIssues} saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Debit Notes — Store QC</h2>
        <p className="text-xs text-slate-400 mt-0.5">Review return requests from Sales team</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending QC",  value: pendingNotes.length,  color: "text-amber-600",   border: "border-amber-200",   bg: "bg-amber-50",   icon: FiClock,        key: "pending" },
          { label: "Approved",    value: approvedNotes.length, color: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50", icon: FiCheckCircle,  key: "approved" },
          { label: "With Issues", value: issueNotes.length,    color: "text-orange-600",  border: "border-orange-200",  bg: "bg-orange-50",  icon: FiAlertTriangle,key: "issues" },
          { label: "Rejected",    value: rejectedNotes.length, color: "text-red-600",     border: "border-red-200",     bg: "bg-red-50",     icon: FiXCircle,      key: "rejected" },
        ].map(({ label, value, color, border, bg, icon: Icon, key }) => (
          <div key={key} onClick={() => setTab(key)}
            className={`${bg} border ${border} rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-all ${tab === key ? "ring-2 ring-offset-1 ring-indigo-300" : ""}`}>
            <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${color}`}><Icon size={18} /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div />
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value)}
          className="h-9 px-3 pr-8 text-sm font-bold border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
        >
          <option value="all">All ({notes.length})</option>
          <option value="pending">⏳ Pending ({pendingNotes.length})</option>
          <option value="approved">✅ Approved ({approvedNotes.length})</option>
          <option value="issues">⚠️ Issues ({issueNotes.length})</option>
          <option value="rejected">❌ Rejected ({rejectedNotes.length})</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiRefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-400" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      ) : displayNotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiShield size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-bold text-slate-500">{tab === "pending" ? "No Pending QC Requests" : "No Notes Found"}</p>
          <p className="text-xs text-slate-400 mt-1">{tab === "pending" ? "All requests processed" : "Check other tabs"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "pending" && pendingNotes.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <FiAlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>{pendingNotes.length} return request(s)</strong> waiting for physical inspection and QC approval.
              </p>
            </div>
          )}
          {displayNotes.map(note => {
            const totalReturn  = (note.items || []).reduce((s, i) => s + (parseFloat(i.returnQty) || 0), 0);
            const isPending    = note.status === "waiting_store_qc";
            const isWithIssues = note.status === "passed_with_issues";

            return (
              <div key={note.id} onClick={() => setSelectedNote(note)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                  isPending    ? "border-l-4 border-l-amber-400 border-amber-200 bg-amber-50/10" :
                  note.status === "approved" ? "border-emerald-200 bg-emerald-50/10" :
                  isWithIssues ? "border-l-4 border-l-orange-400 border-orange-200 bg-orange-50/10" :
                  "border-red-200 bg-red-50/10"
                }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FiUser size={13} className="text-slate-400" />
                      <p className="text-sm font-black text-slate-800">{note.customer || note.vendorName || "—"}</p>
                      <StatusPill status={note.status} />
                      {isPending && <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full animate-pulse">Awaiting Inspection</span>}
                      {isWithIssues && <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 rounded-full">⚠️ Follow-up</span>}
                      {note.noteNumber && <span className="font-mono text-[10px] text-slate-400">#{note.noteNumber}</span>}
                    </div>
                    <p className="text-xs text-slate-500">
                      Invoice: <strong className="text-slate-700">{note.linkedInvoiceNo || "—"}</strong>
                      {note.linkedPoNo && <> · PO: <strong className="text-slate-700">{note.linkedPoNo}</strong></>}
                      {note.submittedByName && <> · By: <strong className="text-slate-600">{note.submittedByName}</strong></>}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{(note.items || []).length} items</span>
                      <span className="text-blue-500 font-bold">Return: {totalReturn} units</span>
                      <span>Submitted: {formatDate(note.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(note.items || []).slice(0, 3).map((item, i) => (
                        <span key={i} className="text-[10px] bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-md font-bold">
                          {item.partNo} → {item.returnQty} return
                        </span>
                      ))}
                      {(note.items || []).length > 3 && <span className="text-[10px] text-slate-400">+{(note.items || []).length - 3} more</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedNote(note); }}
                    className={`px-4 py-2 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                      isPending ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-400 hover:bg-slate-500"
                    }`}>
                    {isPending ? "Review →" : "View"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}