import React, { useState, useEffect } from "react";
import {
  collection, getDocs, serverTimestamp,
  query, orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiAlertTriangle, FiClock, FiCheckCircle,
  FiRefreshCw, FiPackage, FiUser,
  FiMapPin, FiFileText, FiEye, FiX,
} from "react-icons/fi";

const DB_CHALLANS = "dispatchChallans";

function formatDate(val) {
  if (!val) return "—";
  try {
    const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function StatusPill({ status }) {
  const map = {
    approved:           "bg-emerald-100 text-emerald-700 border-emerald-200",
    passed_with_issues: "bg-orange-100 text-orange-700 border-orange-200",
    pending_qc:         "bg-amber-100 text-amber-700 border-amber-200",
    rejected:           "bg-red-100 text-red-700 border-red-200",
  };
  const labels = {
    approved:           "✅ Received",
    passed_with_issues: "⚠️ Issues Pending",
    pending_qc:         "⏳ Waiting Store QC",
    rejected:           "❌ Rejected",
  };
  if (!status) return null;
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${map[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {labels[status] || status}
    </span>
  );
}

// ── View Details Modal ────────────────────────────────────────────────────
function ViewDetailsModal({ challan, onClose }) {
  const h = challan.challanHeader || challan;
  const verifiedItems = challan.verifiedItems || challan.items || [];
  const totalDispatched = (challan.items || []).reduce((s, i) => s + (parseFloat(i.dispatchQty || i.qty) || 0), 0);
  const totalVerified   = verifiedItems.reduce((s, i) => s + (parseFloat(i.verifyQty || i.dispatchQty || i.qty) || 0), 0);
  const totalIssue      = verifiedItems.reduce((s, i) => s + (parseFloat(i.issueQty) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">Challan — Received Details</p>
            <h2 className="text-lg font-black text-white mt-0.5">{h.customer || challan.customer || "—"}</h2>
            <p className="text-xs text-emerald-200 mt-0.5">Challan: {challan.challanNo || "—"}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={challan.storeQcStatus} />
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg text-white"><FiX /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Dispatched", value: totalDispatched, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
              { label: "Store Verified",   value: totalVerified,   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
              { label: "Issue Qty",        value: totalIssue,      color: "text-orange-600", bg: totalIssue > 0 ? "bg-orange-50 border-orange-300" : "bg-slate-50 border-slate-200" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`border rounded-xl p-4 text-center ${bg}`}>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{label}</p>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Challan info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Challan Details</p>
            <div className="grid grid-cols-3 gap-4 text-xs">
              {[
                ["Challan No",    challan.challanNo],
                ["Customer",      h.customer || challan.customer],
                ["Date",          challan.challanDate || formatDate(challan.createdAt)],
                ["SO/PO Ref",     h.soPoRef || challan.soPoRef],
                ["Store Approved",formatDate(challan.storeApprovedAt)],
                ["Store Remarks", challan.storeRemarks || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-slate-400 font-bold mb-0.5">{k}</p>
                  <p className="text-slate-800 font-semibold">{v || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Items — Store Verified</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["No","Description","Part No","Dispatched","Verified","Issue","Issue Qty"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-bold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {verifiedItems.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-400 font-bold">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-700 max-w-[150px]"><p className="truncate">{item.description || item.itemName || "—"}</p></td>
                      <td className="px-3 py-2.5"><span className="font-mono text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{item.partNo || item.productCode || "—"}</span></td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-600">{item.dispatchQty || item.qty || "—"}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{item.verifyQty || item.dispatchQty || item.qty || "—"}</td>
                      <td className="px-3 py-2.5">
                        {item.issue ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.issue === "damage" ? "bg-red-100 text-red-700" :
                            item.issue === "shortage" ? "bg-orange-100 text-orange-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>{item.issue?.replace(/_/g, " ")}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-orange-600">{(parseFloat(item.issueQty) || 0) > 0 ? item.issueQty : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {challan.storeRemarks && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Store Remarks</p>
              <p className="text-sm text-slate-700">{challan.storeRemarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function ReceivedOnChallan() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [viewChallan, setViewChallan] = useState(null);
  const [tab, setTab]           = useState("all");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, DB_CHALLANS), orderBy("createdAt", "desc")));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // ✅ Show only store-approved (or with issues) challans
      const received = all.filter(c =>
        c.storeQcStatus === "approved" || c.storeQcStatus === "passed_with_issues"
      );
      setChallans(received);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const approved    = challans.filter(c => c.storeQcStatus === "approved");
  const withIssues  = challans.filter(c => c.storeQcStatus === "passed_with_issues");
  const displayChallans = tab === "approved" ? approved : tab === "issues" ? withIssues : challans;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Received on Challan</h2>
        <p className="text-xs text-slate-400 mt-0.5">Store-verified dispatch challans</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Received",  value: challans.length,   color: "text-indigo-600",  border: "border-indigo-200",  bg: "bg-indigo-50",  icon: FiPackage },
          { label: "Clean Approved",  value: approved.length,   color: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50", icon: FiCheckCircle },
          { label: "With Issues",     value: withIssues.length, color: "text-orange-600",  border: "border-orange-200",  bg: "bg-orange-50",  icon: FiAlertTriangle },
        ].map(({ label, value, color, border, bg, icon: Icon }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${color}`}><Icon size={18} /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center justify-end">
        <select value={tab} onChange={(e) => setTab(e.target.value)}
          className="px-3 py-2.5 text-sm font-bold border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="all">All ({challans.length})</option>
          <option value="approved">✅ Approved ({approved.length})</option>
          <option value="issues">⚠️ With Issues ({withIssues.length})</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiRefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-400" />
          <p className="text-sm text-slate-400">Loading received challans...</p>
        </div>
      ) : displayChallans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiPackage size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-bold text-slate-500">No Challans Received Yet</p>
          <p className="text-xs text-slate-400 mt-1">Challans appear here after Store QC approves them</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withIssues.length > 0 && tab !== "approved" && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <FiAlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700">
                <strong>{withIssues.length} challan(s)</strong> received with issues — follow-up required.
              </p>
            </div>
          )}

          {displayChallans.map(challan => {
            const h = challan.challanHeader || challan;
            const customer = h.customer || h.buyer || challan.customer || "—";
            const items = challan.items || [];
            const totalQty = items.reduce((s, i) => s + (parseFloat(i.dispatchQty || i.qty) || 0), 0);
            const isWithIssues = challan.storeQcStatus === "passed_with_issues";

            return (
              <div key={challan.id}
                className={`bg-white border rounded-xl p-4 transition-all ${
                  isWithIssues ? "border-l-4 border-l-orange-400 border-orange-200 bg-orange-50/10" : "border-emerald-200 bg-emerald-50/10"
                }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FiUser size={13} className="text-slate-400" />
                      <p className="text-sm font-black text-slate-800">{customer}</p>
                      <StatusPill status={challan.storeQcStatus} />
                      {isWithIssues && <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 rounded-full animate-pulse">⚠️ Follow-up Required</span>}
                    </div>
                    <p className="text-xs text-slate-500">
                      Challan: <strong className="text-slate-700">{challan.challanNo || "—"}</strong>
                      {(h.soPoRef || challan.soPoRef) && <> · SO/PO: <strong className="text-slate-700">{h.soPoRef || challan.soPoRef}</strong></>}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{items.length} items · {totalQty} units dispatched</span>
                      <span>Date: {challan.challanDate || formatDate(challan.createdAt)}</span>
                      <span>Approved: {formatDate(challan.storeApprovedAt || challan.storeActionAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewChallan(challan)}
                    className="w-9 h-9 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                    title="View Details"
                  >
                    <FiEye size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      {viewChallan && (
        <ViewDetailsModal challan={viewChallan} onClose={() => setViewChallan(null)} />
      )}
    </div>
  );
}