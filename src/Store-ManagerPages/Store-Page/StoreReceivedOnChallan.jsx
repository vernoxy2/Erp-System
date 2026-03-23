import React, { useState, useEffect } from "react";
import {
  collection, getDocs, doc, updateDoc,
  serverTimestamp, where, query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiShield, FiAlertTriangle, FiFileText,
  FiClock, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiUser, FiArrowLeft,
} from "react-icons/fi";

const DB_CHALLANS = "dispatchChallans";
const DB_STOCK    = "stock";

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
    pending_qc:         "bg-amber-100 text-amber-700 border-amber-200",
    approved:           "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected:           "bg-red-100 text-red-700 border-red-200",
    passed_with_issues: "bg-orange-100 text-orange-700 border-orange-200",
  };
  const labels = {
    pending_qc:         "⏳ Pending QC",
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

async function updateStockForItem(item, ref, challanNo, qty, isIssue = false) {
  if (!qty || qty <= 0) return;
  const key = (item.partNo || item.productCode || "").trim();
  if (!key) return;
  const now = new Date().toISOString();
  const stockSnap = await getDocs(query(collection(db, DB_STOCK), where("productCode", "==", key)));
  if (stockSnap.empty) return;
  const sd = stockSnap.docs[0];
  const sdata = sd.data();
  const currentAvail = parseFloat(sdata.available) || 0;
  const ledger = Array.isArray(sdata.ledger) ? sdata.ledger : [];
  await updateDoc(doc(db, DB_STOCK, sd.id), {
    available: currentAvail + qty,
    lastUpdated: now,
    ledger: [...ledger, {
      type: "challan-in",
      qty, ref, by: "Store Team",
      balance: currentAvail + qty, date: now,
      remarks: `Challan received — ${challanNo}${isIssue ? ` (Issue: ${item.issue})` : ""}`,
    }],
    ...(isIssue && item.issue ? {
      hasIssue: true, qcIssue: item.issue,
      qcIssueDetail: `Challan issue — ${item.issue} · ${item.issueQty || 0} units`,
      lastQCDate: now,
    } : {}),
  });
}

// ── Detail Screen ─────────────────────────────────────────────────────────
function ChallanQCDetail({ challan, onBack, onApprove, onReject, onPassWithIssues, saving }) {
  const [storeRemarks, setStoreRemarks] = useState("");
  const items = challan.items || [];
const source = (challan.verifiedItems && challan.verifiedItems.length > 0)
    ? challan.verifiedItems
    : items;

  const [verifyRows, setVerifyRows] = useState(() => {
  // ✅ If already processed, use verifiedItems which has issue/issueQty data
  const source = (challan.verifiedItems && challan.verifiedItems.length > 0)
    ? challan.verifiedItems
    : items;

  return source.map(item => ({
    partNo:      item.partNo || item.productCode || "",
    description: item.description || item.itemName || "",
    hsnSac:      item.hsnSac || item.hsn || "",
    unit:        item.unit || "pcs",
    dispatchQty: parseFloat(item.dispatchQty || item.qty || 0),
    verifyQty:   parseFloat(item.verifyQty ?? item.dispatchQty ?? item.qty ?? 0),
    issue:       item.issue || "",
    issueQty:    parseFloat(item.issueQty || 0),
  }));
});

  const updateRow = (idx, field, value) => {
    setVerifyRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      if (field === "verifyQty") {
        const v = Math.min(parseFloat(value) || 0, row.dispatchQty);
        return { ...row, verifyQty: v, issue: v === 0 ? "" : row.issue, issueQty: v === 0 ? 0 : row.issueQty };
      }
      if (field === "issueQty")
        
        return { ...row, issueQty: Math.min(parseFloat(value) || 0, row.verifyQty) };
      if (field === "issue")
        return { ...row, issue: value, issueQty: value === "" ? 0 : row.issueQty };
      return { ...row, [field]: value };
    }));
  };

  const totalDispatched = verifyRows.reduce((s, r) => s + (r.dispatchQty || 0), 0);
  const totalVerified   = verifyRows.reduce((s, r) => s + (parseFloat(r.verifyQty) || 0), 0);
  const totalIssue      = verifyRows.reduce((s, r) => s + (parseFloat(r.issueQty) || 0), 0);
  const totalClean      = totalVerified - totalIssue;

  const isProcessed = challan.storeQcStatus !== "pending_qc";
  const h = challan.challanHeader || challan;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <FiArrowLeft size={15} /> Back to List
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider mb-1">Dispatch Challan — Store QC</p>
            <h2 className="text-xl font-black mb-1">
              {h.customer || h.buyer || challan.customer || "—"}
            </h2>
            <p className="text-sm text-indigo-200">
              Challan: <strong className="text-white">{challan.challanNo || "—"}</strong>
            </p>
          </div>
          <div className="flex-shrink-0 space-y-2 text-right">
            <StatusPill status={challan.storeQcStatus} />
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              {[
                ["Challan No",  challan.challanNo || "—"],
                ["Date",        challan.challanDate || "—"],
                ["SO/PO Ref",   h.soPoRef || challan.soPoRef || "—"],
                ["Consignee",   h.consignee || "—"],
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

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Dispatched", value: totalDispatched, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
          { label: "Store Verified",   value: totalVerified,   color: "text-red-600",    bg: "bg-red-50 border-red-200" },
          { label: "Issue Qty",        value: totalIssue,      color: "text-orange-600", bg: totalIssue > 0 ? "bg-orange-50 border-orange-300" : "bg-slate-50 border-slate-200" },
          { label: "Clean Qty",        value: totalClean,      color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`border rounded-xl p-4 text-center ${bg}`}>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-400">units</p>
          </div>
        ))}
      </div>

      {/* Processed banner */}
      {isProcessed && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          challan.storeQcStatus === "approved" ? "bg-emerald-50 border-emerald-200" :
          challan.storeQcStatus === "rejected" ? "bg-red-50 border-red-200" :
          "bg-orange-50 border-orange-200"
        }`}>
          {challan.storeQcStatus === "approved"
            ? <FiCheckCircle size={16} className="text-emerald-600" />
            : challan.storeQcStatus === "rejected"
              ? <FiXCircle size={16} className="text-red-500" />
              : <FiAlertTriangle size={16} className="text-orange-500" />}
          <div>
            <p className="text-sm font-bold text-slate-800">
              {challan.storeQcStatus === "approved" ? "Challan approved — visible in Sales Received on Challan" :
               challan.storeQcStatus === "rejected" ? "Challan rejected" :
               "Passed with issues — pending follow-up"}
            </p>
            {challan.storeRemarks && <p className="text-xs text-slate-500 mt-0.5">Remarks: {challan.storeRemarks}</p>}
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <FiFileText size={14} className="text-slate-500" />
          <p className="text-xs font-bold text-slate-700">Challan Items — Verify Received Qty</p>
          <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {items.length} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold text-slate-400 w-8">No</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-400">Description</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-400 w-28">Part No</th>
                <th className="px-3 py-2.5 text-center font-bold text-slate-500 w-14">Dispatch</th>
                <th className="px-3 py-2.5 text-center font-bold text-red-500 w-16">Verify Qty ✏️</th>
                <th className="px-3 py-2.5 text-center font-bold text-emerald-600 w-12">Physical OK</th>
                <th className="px-3 py-2.5 text-left font-bold text-orange-500 w-24">Issue</th>
                <th className="px-3 py-2.5 text-center font-bold text-amber-600 w-14">Issue Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {verifyRows.map((row, i) => {
                const dispatchQty = row.dispatchQty || 0;
                const verifyQty   = parseFloat(row.verifyQty) || 0;
                const issueQty    = parseFloat(row.issueQty) || 0;
                // const okQty       = dispatchQty - verifyQty;
                const okQty = verifyQty - issueQty;
                const hasVerify   = verifyQty > 0;
                const hasIssue    = !!(row.issue);
                const isMismatch  = !isProcessed && verifyQty !== dispatchQty && hasVerify;

                return (
                  <tr key={i} className={hasIssue ? "bg-orange-50/30" : hasVerify ? "bg-slate-50/40" : "hover:bg-slate-50/20"}>
                    <td className="px-3 py-2.5 text-slate-400 font-bold text-center">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 max-w-[150px]">
                      <p className="truncate">{row.description || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                        {row.partNo || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-600 text-center">{dispatchQty}</td>
                    <td className="px-3 py-2.5">
                      {isProcessed ? (
                        <span className="text-sm font-black block text-center text-red-600">{verifyQty}</span>
                      ) : (
                        <div className="relative">
                          <input type="number" min="0" max={dispatchQty}
                            value={verifyQty || ""} placeholder="0"
                            onChange={(e) => updateRow(i, "verifyQty", e.target.value)}
                            className={`w-full h-8 border-2 rounded-lg px-1.5 text-sm font-black text-center focus:outline-none focus:ring-2 transition-all ${
                              isMismatch ? "border-amber-400 bg-amber-50 text-amber-700 focus:ring-amber-300" :
                              "border-red-300 bg-red-50 text-red-700 focus:ring-red-300"
                            }`}
                          />
                          {isMismatch && (
                            <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-amber-400 text-white px-1 rounded-full font-bold whitespace-nowrap">≠{dispatchQty}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black">
                      <span className={okQty === 0 ? "text-red-500" : okQty > 0 ? "text-amber-600" : "text-emerald-600"}>{okQty}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {isProcessed ? (
                        hasIssue ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                            row.issue === "damage" ? "bg-red-100 text-red-700" :
                            row.issue === "shortage" ? "bg-orange-100 text-orange-700" :
                            row.issue === "quality" ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>{row.issue?.replace(/_/g, " ")}</span>
                        ) : <span className="text-slate-200 text-[10px]">—</span>
                      ) : (
                        <select value={row.issue || ""} disabled={!hasVerify}
                          onChange={(e) => updateRow(i, "issue", e.target.value)}
                          className={`w-full h-8 border rounded-lg px-1 text-[11px] font-bold focus:outline-none focus:ring-1 transition-colors ${
                            !hasVerify ? "opacity-30 cursor-not-allowed bg-slate-50 border-slate-100" :
                            hasIssue ? "border-orange-300 bg-orange-50 text-orange-700" :
                            "border-slate-200 text-slate-500 bg-white"
                          }`}>
                          {ISSUES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {isProcessed ? (
                        <span className={`text-sm font-black block text-center ${issueQty > 0 ? "text-amber-600" : "text-slate-200"}`}>{issueQty > 0 ? issueQty : "—"}</span>
                      ) : hasIssue && hasVerify ? (
                        <input type="number" min="0" max={verifyQty}
                          value={issueQty || ""} placeholder="0"
                          onChange={(e) => updateRow(i, "issueQty", e.target.value)}
                          className="w-full h-8 border-2 border-amber-300 bg-amber-50 text-amber-700 font-black rounded-lg px-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      ) : (
                        <span className="text-slate-200 text-[10px] block text-center">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!isProcessed && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-xs font-bold text-slate-500">Total</td>
                  <td className="px-16 py-2 text-center font-black text-slate-600">{totalDispatched}</td>
                  <td className="px-16 py-2 text-center font-black text-red-600">{totalVerified}</td>
                  <td className="px-10 py-2 text-center font-black text-emerald-600">{totalDispatched - totalVerified}</td>
                  <td />
                  <td className="px-16 py-2 text-center font-black text-amber-600">{totalIssue > 0 ? totalIssue : "—"}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Action */}
      {!isProcessed && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Store QC Action</p>
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <FiShield size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 space-y-0.5">
              <p><strong>Approve</strong> → challan visible in Sales "Received on Challan" list, stock updated</p>
              <p><strong>Passed with Issues</strong> → visible in Sales list with issue badge, issue qty pending</p>
              <p><strong>Reject</strong> → no stock update, challan rejected</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Store Remarks (optional)</label>
            <textarea rows={2} value={storeRemarks} onChange={(e) => setStoreRemarks(e.target.value)}
              placeholder="Inspection notes..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={() => onReject(challan.id, storeRemarks)} disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 flex items-center gap-2">
              <FiXCircle size={15} /> Reject
            </button>
            <button onClick={() => onPassWithIssues(challan.id, storeRemarks, challan, verifyRows)} disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-amber-700 border-2 border-amber-200 rounded-xl hover:bg-amber-50 disabled:opacity-50 flex items-center gap-2">
              <FiAlertTriangle size={15} /> Passed with Issues
            </button>
            <button onClick={() => onApprove(challan.id, storeRemarks, challan, verifyRows)} disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? <><FiRefreshCw size={14} className="animate-spin" /> Processing...</> : <><FiCheckCircle size={15} /> Approve & Update Stock</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function StoreReceivedOnChallan() {
  const [challans, setChallans]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [tab, setTab]                   = useState("pending");

  useEffect(() => { fetchChallans(); }, []);

  // ✅ Fetch from dispatchChallans — all that have storeQcStatus set
  const fetchChallans = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, DB_CHALLANS), orderBy("createdAt", "desc")));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.storeQcStatus); // only challans that have qc status
      setChallans(list);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleApprove = async (challanId, remarks, challan, verifyRows) => {
    setSaving(true);
    try {
      for (const row of verifyRows) {
        const verifyQty = parseFloat(row.verifyQty) || 0;
        const issueQty  = parseFloat(row.issueQty) || 0;
        const cleanQty  = Math.max(0, verifyQty - issueQty);
        if (cleanQty > 0)
          await updateStockForItem(row, challan.challanNo || challanId, challan.challanNo || challanId, cleanQty, false);
        if (issueQty > 0 && row.issue)
          await updateStockForItem({ ...row }, challan.challanNo || challanId, challan.challanNo || challanId, issueQty, true);
      }
      await updateDoc(doc(db, DB_CHALLANS, challanId), {
        storeQcStatus: "approved",
        storeRemarks: remarks,
        verifiedItems: verifyRows,
        storeApprovedAt: serverTimestamp(),
        storeApprovedBy: "Store Team",
      });
      await fetchChallans(); setSelectedChallan(null);
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const handlePassWithIssues = async (challanId, remarks, challan, verifyRows) => {
    setSaving(true);
    try {
      for (const row of verifyRows) {
        const verifyQty = parseFloat(row.verifyQty) || 0;
        const issueQty  = parseFloat(row.issueQty) || 0;
        const cleanQty  = Math.max(0, verifyQty - issueQty);
        if (cleanQty > 0)
          await updateStockForItem(row, challan.challanNo || challanId, challan.challanNo || challanId, cleanQty, false);
        if (issueQty > 0 && row.issue && (row.partNo || row.productCode)) {
          const key = (row.partNo || row.productCode || "").trim();
          const stockSnap = await getDocs(query(collection(db, DB_STOCK), where("productCode", "==", key)));
          if (!stockSnap.empty) {
            await updateDoc(doc(db, DB_STOCK, stockSnap.docs[0].id), {
              hasIssue: true, qcIssue: row.issue,
              qcIssueDetail: `Challan issue — ${row.issue} · ${issueQty} units pending`,
              lastQCDate: new Date().toISOString(),
            });
          }
        }
      }
      await updateDoc(doc(db, DB_CHALLANS, challanId), {
        storeQcStatus: "passed_with_issues",
        storeRemarks: remarks,
        verifiedItems: verifyRows,
        storeActionAt: serverTimestamp(),
        storeActionBy: "Store Team",
      });
      await fetchChallans(); setSelectedChallan(null);
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const handleReject = async (challanId, remarks) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, DB_CHALLANS, challanId), {
        storeQcStatus: "rejected",
        storeRemarks: remarks,
        storeRejectedAt: serverTimestamp(),
        storeRejectedBy: "Store Team",
      });
      await fetchChallans(); setSelectedChallan(null);
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const pendingChallans  = challans.filter(c => c.storeQcStatus === "pending_qc");
  const approvedChallans = challans.filter(c => c.storeQcStatus === "approved");
  const issueChallans    = challans.filter(c => c.storeQcStatus === "passed_with_issues");
  const rejectedChallans = challans.filter(c => c.storeQcStatus === "rejected");

  const displayChallans =
    tab === "pending"  ? pendingChallans :
    tab === "approved" ? approvedChallans :
    tab === "issues"   ? issueChallans :
    tab === "rejected" ? rejectedChallans :
    challans;

  if (selectedChallan) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">Received on Challan — Store QC</h2>
          <p className="text-xs text-slate-400 mt-0.5">Verify dispatch challan items</p>
        </div>
        <ChallanQCDetail
          challan={selectedChallan}
          onBack={() => setSelectedChallan(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onPassWithIssues={handlePassWithIssues}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Received on Challan — Store QC</h2>
        <p className="text-xs text-slate-400 mt-0.5">Verify dispatch challan items before Sales receives them</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending QC",  value: pendingChallans.length,  color: "text-amber-600",   border: "border-amber-200",   bg: "bg-amber-50",   icon: FiClock,        key: "pending" },
          { label: "Approved",    value: approvedChallans.length, color: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50", icon: FiCheckCircle,  key: "approved" },
          { label: "With Issues", value: issueChallans.length,    color: "text-orange-600",  border: "border-orange-200",  bg: "bg-orange-50",  icon: FiAlertTriangle,key: "issues" },
          { label: "Rejected",    value: rejectedChallans.length, color: "text-red-600",     border: "border-red-200",     bg: "bg-red-50",     icon: FiXCircle,      key: "rejected" },
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

      <div className="flex items-center justify-end">
        <select value={tab} onChange={(e) => setTab(e.target.value)}
          className="px-3 py-2.5 text-sm font-bold border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="all">All ({challans.length})</option>
          <option value="pending">⏳ Pending QC ({pendingChallans.length})</option>
          <option value="approved">✅ Approved ({approvedChallans.length})</option>
          <option value="issues">⚠️ With Issues ({issueChallans.length})</option>
          <option value="rejected">❌ Rejected ({rejectedChallans.length})</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiRefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-400" />
          <p className="text-sm text-slate-400">Loading challans...</p>
        </div>
      ) : displayChallans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiShield size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-bold text-slate-500">
            {tab === "pending" ? "No Pending QC Challans" : "No Challans Found"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {tab === "pending" ? "Challans will appear here when dispatched" : "Check other tabs"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "pending" && pendingChallans.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <FiAlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>{pendingChallans.length} challan(s)</strong> waiting for physical verification before Sales receives them.
              </p>
            </div>
          )}
          {displayChallans.map(challan => {
            const isPending    = challan.storeQcStatus === "pending_qc";
            const isWithIssues = challan.storeQcStatus === "passed_with_issues";
            const h = challan.challanHeader || challan;
            const customer = h.customer || h.buyer || challan.customer || "—";
            const items = challan.items || [];
            const totalQty = items.reduce((s, i) => s + (parseFloat(i.dispatchQty || i.qty) || 0), 0);

            return (
              <div key={challan.id} onClick={() => setSelectedChallan(challan)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                  isPending ? "border-l-4 border-l-amber-400 border-amber-200 bg-amber-50/10" :
                  challan.storeQcStatus === "approved" ? "border-emerald-200 bg-emerald-50/10" :
                  isWithIssues ? "border-l-4 border-l-orange-400 border-orange-200 bg-orange-50/10" :
                  "border-red-200 bg-red-50/10"
                }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FiUser size={13} className="text-slate-400" />
                      <p className="text-sm font-black text-slate-800">{customer}</p>
                      <StatusPill status={challan.storeQcStatus} />
                      {isPending && <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full animate-pulse">Awaiting Verification</span>}
                    </div>
                    <p className="text-xs text-slate-500">
                      Challan: <strong className="text-slate-700">{challan.challanNo || "—"}</strong>
                      {(h.soPoRef || challan.soPoRef) && <> · SO/PO: <strong className="text-slate-700">{h.soPoRef || challan.soPoRef}</strong></>}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{items.length} items · {totalQty} units</span>
                      <span>Date: {challan.challanDate || formatDate(challan.createdAt)}</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedChallan(challan); }}
                    className={`px-4 py-2 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                      isPending ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-400 hover:bg-slate-500"
                    }`}>
                    {isPending ? "Verify →" : "View"}
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