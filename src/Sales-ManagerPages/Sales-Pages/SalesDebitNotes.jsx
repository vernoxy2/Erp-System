import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiCheck,
  FiAlertTriangle,
  FiClock,
  FiCheckCircle,
  FiArrowLeft,
  FiRefreshCw,
  FiPackage,
  FiUser,
  FiPhone,
  FiMapPin,
  FiFileText,
} from "react-icons/fi";

const DB_EXCEL = "excelupload";
const DB_NOTES = "SalesDebitNotes";

const ISSUES = [
  { value: "", label: "— None" },
  { value: "damage", label: "🔴 Damage" },
  { value: "shortage", label: "🟠 Shortage" },
  { value: "quality", label: "🟡 Quality" },
  { value: "wrong_item", label: "🔵 Wrong Item" },
  { value: "other", label: "⚪ Other" },
];

function formatDate(val) {
  if (!val) return "—";
  try {
    const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function StatusPill({ status }) {
  const map = {
    done: "bg-emerald-100 text-emerald-700 border-emerald-200",
    waiting_store_qc: "bg-blue-100 text-blue-700 border-blue-200",
    approved: "bg-violet-100 text-violet-700 border-violet-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    passed_with_issues: "bg-orange-100 text-orange-700 border-orange-200",
  };
  const labels = {
    done: "✅ No Return",
    waiting_store_qc: "⏳ Waiting Store QC",
    approved: "✅ Store Approved",
    rejected: "❌ Rejected",
    passed_with_issues: "⚠️ Issues Pending",
  };
  if (!status) return null;
  return (
    <span
      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${map[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
    >
      {labels[status] || status}
    </span>
  );
}

// ── Detail Screen ─────────────────────────────────────────────────────────
function InvoiceDetail({
  invoice,
  existingNote,
  onBack,
  onSubmit,
  submitting,
}) {
  const header = invoice.excelHeader || invoice.invoiceHeader || {};
  const invoiceItems = invoice.items || [];

  // ✅ Pre-fill ALL invoice items on right side with returnQty=0
  const [returnRows, setReturnRows] = useState(
    invoiceItems.map((item) => ({
      partNo: item.productCode || item.partNo || "",
      description: item.description || item.itemName || "",
      hsnSac: item.hsnSac || "",
      unit: item.unit || "pcs",
      invoiceQty: parseFloat(
        item.physicalQty || item.newReceived || item.quantity || 0,
      ),
      returnQty: 0,
      issueQty: 0,
      issue: "",
      remarks: "",
    })),
  );
  const [remarks, setRemarks] = useState("");
  const isProcessed = !!existingNote;
  const noteStatus = existingNote?.status;
  const updateRow = (idx, field, value) => {
    setReturnRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (field === "returnQty") {
          const v = Math.min(parseFloat(value) || 0, row.invoiceQty);
          // if returnQty set to 0, clear issue too
          return {
            ...row,
            returnQty: v,
            issueQty: v === 0 ? 0 : row.issueQty,
            issue: v === 0 ? "" : row.issue,
          };
        }
        if (field === "issueQty") {
          return {
            ...row,
            issueQty: Math.min(
              parseFloat(value) || 0,
              row.returnQty || row.invoiceQty,
            ),
          };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  // Display rows — if already processed, show submitted items
  const displayRows =
    isProcessed && existingNote?.items?.length > 0
      ? existingNote.items.map((item) => ({
          partNo: item.partNo || "",
          description: item.itemName || "",
          hsnSac: item.hsnSac || "",
          unit: item.unit || "pcs",
          invoiceQty: item.invoiceQty || 0,
          returnQty: item.returnQty || 0,
          issueQty: item.issueQty || 0,
          issue: item.issue || "",
          remarks: item.remarks || "",
        }))
      : returnRows;

  const totalReturn = returnRows.reduce(
    (s, r) => s + (parseFloat(r.returnQty) || 0),
    0,
  );
  const hasReturn = totalReturn > 0;
  const totalIssue = returnRows.reduce(
    (s, r) => s + (parseFloat(r.issueQty) || 0),
    0,
  );

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <FiArrowLeft size={15} /> Back to Invoice List
      </button>

      {/* Party Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider mb-1">
              Sales Invoice
            </p>
            <h2 className="text-xl font-black mb-1">
              {header.consignee || header.buyer || invoice.customer || "—"}
            </h2>
            {(header.address || header.consigneeAddress) && (
              <p className="text-sm text-indigo-200 flex items-center gap-1.5 mt-0.5">
                <FiMapPin size={12} />{" "}
                {header.address || header.consigneeAddress}
              </p>
            )}
            {(header.contact || header.phone || header.mobile) && (
              <p className="text-sm text-indigo-200 flex items-center gap-1.5 mt-0.5">
                <FiPhone size={12} />{" "}
                {header.contact || header.phone || header.mobile}
              </p>
            )}
            {header.gstin && (
              <p className="text-xs text-indigo-300 mt-0.5">
                GSTIN: {header.gstin}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 space-y-2 text-right">
            {noteStatus && <StatusPill status={noteStatus} />}
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              {[
                ["Invoice No", invoice.invoiceNo || header.invoiceNo || "—"],
                ["Date", formatDate(invoice.invoiceDate || invoice.createdAt)],
                ["PO No", invoice.linkedPoNo || "—"],
                ["Vendor", invoice.vendor || header.supplier || "—"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="bg-white/10 rounded-lg px-3 py-2 text-left"
                >
                  <p className="text-[10px] text-indigo-200 font-bold uppercase">
                    {k}
                  </p>
                  <p className="text-xs font-bold text-white truncate max-w-[130px]">
                    {v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {isProcessed && (
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border ${
            noteStatus === "done"
              ? "bg-emerald-50 border-emerald-200"
              : noteStatus === "waiting_store_qc"
                ? "bg-blue-50 border-blue-200"
                : noteStatus === "approved"
                  ? "bg-violet-50 border-violet-200"
                  : noteStatus === "passed_with_issues"
                    ? "bg-orange-50 border-orange-200"
                    : "bg-red-50 border-red-200"
          }`}
        >
          <FiCheckCircle
            size={16}
            className={
              noteStatus === "done" || noteStatus === "approved"
                ? "text-emerald-600"
                : noteStatus === "waiting_store_qc"
                  ? "text-blue-600"
                  : noteStatus === "passed_with_issues"
                    ? "text-orange-500"
                    : "text-red-500"
            }
          />
          <div>
            <p className="text-sm font-bold text-slate-800">
              {noteStatus === "done"
                ? "Marked as No Return"
                : noteStatus === "waiting_store_qc"
                  ? "Return request submitted — waiting Store QC approval"
                  : noteStatus === "approved"
                    ? "Return approved by Store — stock updated"
                    : noteStatus === "passed_with_issues"
                      ? "⚠️ Passed with Issues — some items pending follow-up"
                      : "Return rejected by Store"}
            </p>
            {existingNote?.storeRemarks && (
              <p className="text-xs text-slate-500 mt-0.5">
                Store remarks: {existingNote.storeRemarks}
              </p>
            )}
            {existingNote?.remarks && (
              <p className="text-xs text-slate-500 mt-0.5">
                Your remarks: {existingNote.remarks}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ✅ Two col — Left 2/5 compact, Right 3/5 wider */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT — Fixed Invoice Items (compact) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm lg:col-span-2">
          <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <FiFileText size={13} className="text-slate-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700">
                Sales Invoice Items
              </p>
              <p className="text-[10px] text-slate-400">
                Fixed — as per approved invoice
              </p>
            </div>
            <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
              {invoiceItems.length} items
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {[
                    "No",
                    "Description",
                    "Part No",
                    "HSN/SAC",
                    "Qty",
                    "Unit",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-left font-bold text-slate-400 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoiceItems.map((item, i) => {
                  const qty = parseFloat(
                    item.physicalQty || item.newReceived || item.quantity || 0,
                  );
                  return (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-2 py-2 text-slate-400 font-bold">
                        {i + 1}
                      </td>
                      <td className="px-2 py-2 font-medium text-slate-700 max-w-[130px]">
                        <p className="truncate">
                          {item.description || item.itemName || "—"}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-mono text-[10px] bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                          {item.productCode || item.partNo || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                        {item.hsnSac || "—"}
                      </td>
                      <td className="px-2 py-2 font-black text-slate-800 text-center whitespace-nowrap">
                        {qty}
                      </td>
                      <td className="px-2 py-2 text-slate-400 uppercase text-[10px] whitespace-nowrap">
                        {item.unit || "pcs"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-2 text-[10px] font-bold text-slate-500"
                  >
                    Total
                  </td>
                  <td className="px-2 py-2 font-black text-slate-700 text-center">
                    {invoiceItems.reduce(
                      (s, i) =>
                        s +
                        (parseFloat(
                          i.physicalQty || i.newReceived || i.quantity,
                        ) || 0),
                      0,
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* RIGHT — Return Items (all pre-filled, returnQty editable) */}
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm lg:col-span-3">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiAlertTriangle
                size={14}
                className="text-red-500 flex-shrink-0"
              />
              <div>
                <p className="text-xs font-bold text-red-700">Return Items</p>
                <p className="text-[10px] text-red-400">
                  {isProcessed
                    ? "Read only — already submitted"
                    : "Fill return qty manually (0 = no return)"}
                </p>
              </div>
            </div>
            {hasReturn && !isProcessed && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full border border-red-200 flex-shrink-0 animate-pulse">
                {totalReturn} units to return
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-red-50/50 border-b border-red-100">
                <tr>
                  <th className="px-2 py-2.5 text-left font-bold text-slate-400 w-7">
                    No
                  </th>
                  <th className="px-2 py-2.5 text-left font-bold text-slate-400">
                    Description
                  </th>
                  <th className="px-2 py-2.5 text-left font-bold text-slate-400 w-24">
                    Part No
                  </th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-500 w-16">
                    Invoice
                    <br />
                    Qty
                  </th>
                  <th className="px-10 py-2.5 text-center font-bold text-red-500 w-16">
                    Return
                    <br />
                    Qty
                  </th>
                  <th className="px-5 py-2.5 text-center font-bold text-emerald-600 w-14">
                    OK
                    <br />
                    Qty
                  </th>
                  {/* <th className="px-2 py-2.5 text-left font-bold text-orange-500 w-24">Issue</th> */}
                  {/* <th className="px-2 py-2.5 text-center font-bold text-amber-600 w-14">Issue<br/>Qty</th> */}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {displayRows.map((row, i) => {
                  const invoiceQty = parseFloat(row.invoiceQty) || 0;
                  const returnQty = parseFloat(row.returnQty) || 0;
                  const issueQty = parseFloat(row.issueQty) || 0;
                  const okQty = invoiceQty - returnQty;
                  const hasReturnHere = returnQty > 0;
                  const hasIssue = !!row.issue;

                  return (
                    <tr
                      key={i}
                      className={
                        hasIssue
                          ? "bg-orange-50/30"
                          : hasReturnHere
                            ? "bg-red-50/30"
                            : "hover:bg-slate-50/20"
                      }
                    >
                      <td className="px-2 py-2 text-slate-400 font-bold text-center">
                        {i + 1}
                      </td>

                      {/* Description */}
                      <td className="px-2 py-2 font-medium text-slate-700 max-w-[150px]">
                        <p className="truncate text-[11px]">
                          {row.description || "—"}
                        </p>
                      </td>

                      {/* Part No */}
                      <td className="px-2 py-2">
                        <span className="font-mono text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                          {row.partNo || "—"}
                        </span>
                      </td>

                      {/* Invoice Qty — fixed */}
                      <td className="px-2 py-2 font-bold text-slate-600 text-center whitespace-nowrap">
                        {invoiceQty}
                      </td>

                      {/* Return Qty — editable */}
                      <td className="px-2 py-2">
                        {isProcessed ? (
                          <span
                            className={`text-sm font-black block text-center ${hasReturnHere ? "text-red-600" : "text-slate-300"}`}
                          >
                            {returnQty || "—"}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max={invoiceQty}
                            value={returnQty || ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateRow(i, "returnQty", e.target.value)
                            }
                            className={`w-full h-8 border-2 rounded-lg px-1.5 text-sm font-black text-center focus:outline-none focus:ring-2 transition-all ${
                              hasReturnHere
                                ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-300"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 focus:ring-indigo-200 focus:border-indigo-300"
                            }`}
                          />
                        )}
                      </td>

                      {/* OK Qty — auto */}
                      <td className="px-2 py-2 text-center font-black whitespace-nowrap">
                        <span
                          className={
                            okQty === invoiceQty
                              ? "text-emerald-600"
                              : okQty === 0
                                ? "text-red-500"
                                : "text-amber-600"
                          }
                        >
                          {okQty}
                        </span>
                      </td>

                      {/* Issue — only show if returnQty > 0 */}
                      {/* <td className="px-2 py-2">
                        {isProcessed ? (
                          hasIssue ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                              row.issue === "damage" ? "bg-red-100 text-red-700" :
                              row.issue === "shortage" ? "bg-orange-100 text-orange-700" :
                              row.issue === "quality" ? "bg-amber-100 text-amber-700" :
                              row.issue === "wrong_item" ? "bg-blue-100 text-blue-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>{row.issue?.replace(/_/g, " ")}</span>
                          ) : <span className="text-slate-200 text-[10px]">—</span>
                        ) : (
                          <select
                            value={row.issue || ""}
                            disabled={!hasReturnHere}
                            onChange={(e) => updateRow(i, "issue", e.target.value)}
                            className={`w-full h-8 border rounded-lg px-1.5 text-[11px] font-bold focus:outline-none focus:ring-1 transition-colors ${
                              !hasReturnHere ? "opacity-30 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-400" :
                              hasIssue ? "border-orange-300 bg-orange-50 text-orange-700" :
                              "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                            }`}
                          >
                            {ISSUES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        )}
                      </td> */}

                      {/* Issue Qty — only if issue selected */}
                      {/* <td className="px-2 py-2">
                        {isProcessed ? (
                          <span className={`text-sm font-black block text-center ${issueQty > 0 ? "text-amber-600" : "text-slate-200"}`}>
                            {issueQty > 0 ? issueQty : "—"}
                          </span>
                        ) : hasIssue && hasReturnHere ? (
                          <input
                            type="number"
                            min="0"
                            max={returnQty}
                            value={issueQty || ""}
                            placeholder="0"
                            onChange={(e) => updateRow(i, "issueQty", e.target.value)}
                            className="w-full h-8 border-2 border-amber-300 bg-amber-50 text-amber-700 font-black rounded-lg px-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                          />
                        ) : (
                          <span className="text-slate-200 text-[10px] block text-center">—</span>
                        )}
                      </td> */}
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              {!isProcessed && (
                <tfoot className="bg-red-50/50 border-t border-red-200">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-2 text-xs font-bold text-slate-500"
                    >
                      Total
                    </td>
                    <td className="px-2 py-2 text-center font-black text-slate-700">
                      {invoiceItems.reduce(
                        (s, i) =>
                          s +
                          (parseFloat(
                            i.physicalQty || i.newReceived || i.quantity,
                          ) || 0),
                        0,
                      )}
                    </td>
                    <td className="px-2 py-2 text-center font-black text-red-600">
                      {totalReturn || "—"}
                    </td>
                    <td className="px-2 py-2 text-center font-black text-emerald-600">
                      {invoiceItems.reduce(
                        (s, i) =>
                          s +
                          (parseFloat(
                            i.physicalQty || i.newReceived || i.quantity,
                          ) || 0),
                        0,
                      ) - totalReturn}
                    </td>
                    <td />
                    <td className="px-2 py-2 text-center font-black text-amber-600">
                      {totalIssue > 0 ? totalIssue : "—"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Issue info */}
      {!isProcessed && returnRows.some((r) => r.issue) && (
        <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <FiAlertTriangle
            size={14}
            className="text-orange-500 mt-0.5 flex-shrink-0"
          />
          <p className="text-xs text-orange-700">
            Items with issues → Store will mark{" "}
            <strong>"Passed with Issues"</strong>. Only clean qty added to
            stock, issue qty stays <strong>pending</strong> on both panels.
          </p>
        </div>
      )}

      {/* Overall Remarks */}
      {!isProcessed && (
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Overall Remarks (optional)
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Party complaint, reason for return..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>
      )}

      {/* Action Buttons */}
      {!isProcessed && (
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400 mr-auto">
            {hasReturn
              ? `${totalReturn} units selected for return → will go to Store QC`
              : "Set return qty above for items to return, or click Done if no return needed"}
          </p>
          <button
            onClick={() => onSubmit(invoice, returnRows, remarks, "done")}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-bold text-emerald-700 border-2 border-emerald-300 rounded-xl hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2"
          >
            <FiCheck size={15} /> Done — No Return
          </button>
          <button
            onClick={() => onSubmit(invoice, returnRows, remarks, "return")}
            disabled={submitting || !hasReturn}
            className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <FiRefreshCw size={14} className="animate-spin" /> Submitting...
              </>
            ) : (
              <>🔄 Submit Return to Store QC</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main List Component ───────────────────────────────────────────────────
export default function SalesDebitNotes() {
  const [invoices, setInvoices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("all");
  const [nameFilter, setNameFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, DB_EXCEL), orderBy("createdAt", "desc")),
      );
      const allDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInvoices(
        allDocs.filter(
          (d) =>
            d.type === "INVOICE" &&
            d.storeQcStatus === "approved" &&
            d.linkedSoId,
        ),
      );
      const notesSnap = await getDocs(collection(db, DB_NOTES));
      setNotes(notesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getNote = (invoiceId) =>
    notes.find((n) => n.linkedInvoiceId === invoiceId) || null;

  const handleSubmit = async (invoice, returnRows, remarks, action) => {
    setSubmitting(true);
    try {
      if (action === "done") {
        await addDoc(collection(db, DB_NOTES), {
          type: "debit",
          linkedInvoiceId: invoice.id,
          linkedInvoiceNo: invoice.invoiceNo || "",
          linkedPoNo: invoice.linkedPoNo || "",
          vendorName: invoice.vendor || "",
          customer: invoice.excelHeader?.consignee || invoice.customer || "",
          status: "done",
          action: "no_return",
          items: [],
          remarks: remarks || "No return needed",
          createdAt: serverTimestamp(),
        });
      } else {
        const noteNumber = `DN-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

        // Only items with returnQty > 0
        const returnItems = returnRows
          .filter((r) => (parseFloat(r.returnQty) || 0) > 0)
          .map((r) => ({
            partNo: r.partNo || "",
            itemName: r.description || "",
            hsnSac: r.hsnSac || "",
            unit: r.unit || "pcs",
            invoiceQty: r.invoiceQty || 0,
            returnQty: parseFloat(r.returnQty) || 0,
            issueQty: parseFloat(r.issueQty) || 0,
            issue: r.issue || "",
            remarks: r.remarks || "",
          }));

        await addDoc(collection(db, DB_NOTES), {
          type: "debit",
          noteNumber,
          linkedInvoiceId: invoice.id,
          linkedInvoiceNo: invoice.invoiceNo || "",
          linkedPoNo: invoice.linkedPoNo || "",
          vendorName: invoice.vendor || "",
          customer: invoice.excelHeader?.consignee || invoice.customer || "",
          status: "waiting_store_qc",
          action: "return",
          items: returnItems,
          remarks,
          createdAt: serverTimestamp(),
        });
      }
      await fetchData();
      setSelectedInvoice(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Detail view ───────────────────────────────────────────────────────
  if (selectedInvoice) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            Debit / Credit Notes
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Invoice detail — return management
          </p>
        </div>
        <InvoiceDetail
          invoice={selectedInvoice}
          existingNote={getNote(selectedInvoice.id)}
          onBack={() => setSelectedInvoice(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────
  const pending = invoices.filter((inv) => !getNote(inv.id));
  const inProgress = invoices.filter((inv) =>
    ["waiting_store_qc", "passed_with_issues"].includes(
      getNote(inv.id)?.status,
    ),
  );
  const done = invoices.filter((inv) =>
    ["done", "approved"].includes(getNote(inv.id)?.status),
  );
  const displayInvoices =
    tab === "pending"
      ? pending
      : tab === "progress"
        ? inProgress
        : tab === "done"
          ? done
          : invoices;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">
          Debit / Credit Notes
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Store-approved invoices — return management
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Pending Action",
            value: pending.length,
            color: "text-red-600",
            border: "border-red-200",
            bg: "bg-red-50",
            icon: FiAlertTriangle,
          },
          {
            label: "Waiting Store QC",
            value: inProgress.filter(
              (i) => getNote(i.id)?.status === "waiting_store_qc",
            ).length,
            color: "text-blue-600",
            border: "border-blue-200",
            bg: "bg-blue-50",
            icon: FiClock,
          },
          {
            label: "Issues Pending",
            value: inProgress.filter(
              (i) => getNote(i.id)?.status === "passed_with_issues",
            ).length,
            color: "text-orange-600",
            border: "border-orange-200",
            bg: "bg-orange-50",
            icon: FiAlertTriangle,
          },
          {
            label: "Complete",
            value: done.length,
            color: "text-emerald-600",
            border: "border-emerald-200",
            bg: "bg-emerald-50",
            icon: FiCheckCircle,
          },
        ].map(({ label, value, color, border, bg, icon: Icon }) => (
          <div
            key={label}
            className={`${bg} border ${border} rounded-xl p-4 flex items-center gap-3`}
          >
            <div
              className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${color}`}
            >
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        {/* Summary cards na niche jo koi content hoy to */}
        <div /> {/* empty spacer */}
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value)}
          className="h-9 px-3 pr-8 text-sm font-bold border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
        >
          <option value="all">All ({invoices.length})</option>
          <option value="pending">Pending ({pending.length})</option>
          <option value="progress">In Progress ({inProgress.length})</option>
          <option value="done">Done ({done.length})</option>
        </select>
      </div>
      {/* Invoice List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiRefreshCw
            size={24}
            className="animate-spin mx-auto mb-3 text-indigo-400"
          />
          <p className="text-sm text-slate-400">Loading approved invoices...</p>
        </div>
      ) : displayInvoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiPackage size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-bold text-slate-500">No Invoices Found</p>
          <p className="text-xs text-slate-400 mt-1">
            Only store-approved invoices appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "pending" && pending.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <FiAlertTriangle
                size={14}
                className="text-amber-500 flex-shrink-0"
              />
              <p className="text-xs text-amber-700">
                <strong>{pending.length} invoice(s)</strong> need action — click
                to open, set return qty or mark Done.
              </p>
            </div>
          )}

          {displayInvoices.map((invoice) => {
            const note = getNote(invoice.id);
            const noteStatus = note?.status || null;
            const header = invoice.excelHeader || invoice.invoiceHeader || {};
            const customer =
              header.consignee || header.buyer || invoice.customer || "—";
            const items = invoice.items || [];
            const totalQty = items.reduce(
              (s, i) =>
                s +
                (parseFloat(i.physicalQty || i.newReceived || i.quantity) || 0),
              0,
            );
            const isPending = !noteStatus;
            const isWithIssues = noteStatus === "passed_with_issues";

            return (
              <div
                key={invoice.id}
                onClick={() => setSelectedInvoice(invoice)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                  isPending
                    ? "border-slate-200 hover:border-indigo-300"
                    : noteStatus === "waiting_store_qc"
                      ? "border-l-4 border-l-blue-400 border-blue-200 bg-blue-50/10"
                      : isWithIssues
                        ? "border-l-4 border-l-orange-400 border-orange-200 bg-orange-50/10"
                        : noteStatus === "done" || noteStatus === "approved"
                          ? "border-emerald-200 bg-emerald-50/10"
                          : "border-red-200 bg-red-50/10"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FiUser size={13} className="text-slate-400" />
                      <p className="text-sm font-black text-slate-800">
                        {customer}
                      </p>
                      {noteStatus && <StatusPill status={noteStatus} />}
                      {!noteStatus && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full">
                          Action Needed
                        </span>
                      )}
                      {isWithIssues && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 rounded-full animate-pulse">
                          ⚠️ Follow-up Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Invoice:{" "}
                      <strong className="text-slate-700">
                        {invoice.invoiceNo || "—"}
                      </strong>
                      {invoice.linkedPoNo && (
                        <>
                          {" "}
                          · PO:{" "}
                          <strong className="text-slate-700">
                            {invoice.linkedPoNo}
                          </strong>
                        </>
                      )}
                      {invoice.vendor && (
                        <>
                          {" "}
                          · Vendor:{" "}
                          <strong className="text-slate-700">
                            {invoice.vendor}
                          </strong>
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>
                        {items.length} items · {totalQty} units dispatched
                      </span>
                      {invoice.invoiceDate && (
                        <span>Date: {formatDate(invoice.invoiceDate)}</span>
                      )}
                    </div>
                    {note?.items?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {note.items.slice(0, 3).map((item, i) => (
                          <span
                            key={i}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                              item.issue
                                ? "bg-orange-50 border-orange-200 text-orange-700"
                                : "bg-red-50 border-red-200 text-red-700"
                            }`}
                          >
                            {item.partNo} → {item.returnQty}
                            {item.issue
                              ? ` (${item.issueQty} ${item.issue})`
                              : ""}
                          </span>
                        ))}
                        {note.items.length > 3 && (
                          <span className="text-[10px] text-slate-400">
                            +{note.items.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-slate-300 text-xl">›</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
