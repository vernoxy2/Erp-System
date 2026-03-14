import React, { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp, getDoc, where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import {
  FiPlus, FiFileText, FiCheckCircle, FiXCircle,
  FiClock, FiAlertTriangle, FiEye, FiX,
  FiSend, FiRefreshCw, FiChevronDown,
  FiChevronLeft, FiChevronRight, FiUpload,
} from "react-icons/fi";
import * as XLSX from "xlsx";

// ── Constants ──────────────────────────────────────────────────────────────

const DB = {
  EXCEL: "excelupload",
  STOCK: "stock",
  NOTES: "debitCreditNotes",
  USER:  "user",
};

const STATUS = {
  draft:    { label: "Draft",    color: "bg-slate-100 text-slate-600",     icon: FiFileText },
  sent:     { label: "Sent",     color: "bg-blue-100 text-blue-600",       icon: FiSend },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-600", icon: FiCheckCircle },
  settled:  { label: "Settled",  color: "bg-violet-100 text-violet-600",   icon: FiCheckCircle },
  complete: { label: "Complete", color: "bg-violet-100 text-violet-600",   icon: FiCheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-600",         icon: FiXCircle },
};

const REASONS = [
  { value: "short_supply", label: "Short Supply — Less material received" },
  { value: "damage",       label: "Damaged Goods — Material received damaged" },
  { value: "wrong_item",   label: "Wrong Item — Incorrect material received" },
  { value: "overcharge",   label: "Overcharge — Excess amount charged" },
  { value: "return",       label: "Return to Vendor" },
];

const PAGE_SIZE = 5;
const emptyItem = () => ({ itemName: "", quantity: "", issue: "", orderedQty: "", okQty: "", pendingQty: "", partNo: "" });

const issueToReason = (issue) => {
  const map = {
    damage:     "damage",
    shortage:   "short_supply",
    short:      "short_supply",
    wrong_item: "wrong_item",
    excess:     "short_supply",
    quality:    "damage",
    other:      "short_supply",
  };
  return map[issue?.toLowerCase()] || "short_supply";
};

// ── Helpers ────────────────────────────────────────────────────────────────

const parseChallanExcel = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        let invoiceNo   = "";
        let vendorName  = "";
        let supplierRef = "";
        let itemRowStart = -1;

        for (let r = 0; r < Math.min(30, aoa.length); r++) {
          const row = aoa[r].map(c => String(c).trim());
          const rowText = row.join(" ").toLowerCase();

          if (rowText.includes("invoice no") || rowText.includes("invoice no.")) {
            for (let c = 0; c < row.length; c++) {
              if (row[c].toLowerCase().includes("invoice no")) {
                for (let nc = c+1; nc < Math.min(c+5, row.length); nc++) {
                  if (row[nc] && !row[nc].toLowerCase().includes("invoice") && !row[nc].toLowerCase().includes("date")) {
                    invoiceNo = row[nc];
                    break;
                  }
                }
              }
            }
          }

          if (rowText.includes("supplier invoice") || rowText.includes("2389") || rowText.includes("/25-26") || rowText.includes("/24-25")) {
            for (let c = 0; c < row.length; c++) {
              if (row[c].match(/\d+\/\d{2}-\d{2}/)) {
                supplierRef = row[c].split(" ")[0];
                break;
              }
            }
          }

          if (rowText.includes("supplier (bill from)") || rowText.includes("supplier (bill")) {
            if (r+1 < aoa.length) {
              const nextRow = aoa[r+1].map(c => String(c).trim()).filter(Boolean);
              if (nextRow.length > 0) vendorName = nextRow[0];
            }
          }

          if (rowText.includes("description of goods") || rowText.includes("description")) {
            if (row.some(c => c.toLowerCase().includes("quantity") || c.toLowerCase().includes("qty"))) {
              itemRowStart = r + 1;
            }
          }
        }

        const items = [];
        if (itemRowStart > 0) {
          for (let r = itemRowStart; r < aoa.length; r++) {
            const row = aoa[r];
            if (!row || row.every(c => !String(c).trim())) continue;

            const slNo = String(row[0]).trim();
            if (!slNo || isNaN(parseInt(slNo))) continue;

            let description = "";
            let quantity = 0;
            let partNo = "";
            let hsnSac = "";

            for (let c = 1; c < row.length; c++) {
              const val = String(row[c]).trim();
              if (!val) continue;

              if (val.match(/^\d{8}$/) && !hsnSac) { hsnSac = val; continue; }
              if (val.match(/^[A-Z]{2,}-\d/) && !partNo) { partNo = val; continue; }
              if (!isNaN(parseFloat(val)) && parseFloat(val) > 0 && val.length < 8) {
                quantity = parseFloat(val);
                continue;
              }
              if (val.length > description.length && isNaN(parseFloat(val))) {
                description = val;
              }
            }

            if (description && quantity > 0) {
              items.push({ itemName: description, quantity, partNo, hsnSac });
            }
          }
        }

        resolve({ invoiceNo, vendorName, supplierRef, items });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });

const parseReplacementFile = async (file) => {
  const result = await parseChallanExcel(file);
  return result.items;
};

const compareItems = (noteItems, replacementItems) =>
  noteItems.map((ni) => {
    const match    = replacementItems.find(ri =>
      ri.itemName.toLowerCase().trim() === ni.itemName.toLowerCase().trim()
    );
    const needed   = parseFloat(ni.quantity) || 0;
    const received = match ? parseFloat(match.quantity) || 0 : 0;
    const status   = received === 0 ? "missing" : received >= needed ? "complete" : "partial";
    return { itemName: ni.itemName, needed, received, status };
  });

// ── Small UI Components ────────────────────────────────────────────────────

const StatusChip = ({ status }) => {
  const s = STATUS[status] || STATUS.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${s.color}`}>
      <s.icon size={10} /> {s.label}
    </span>
  );
};

const Pagination = ({ total, page, setPage }) => {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
      <span className="text-xs text-slate-400">{total} notes</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500">
          <FiChevronLeft size={14} />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => setPage(n)}
            className={`w-6 h-6 text-xs rounded font-semibold transition-colors ${n === page ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            {n}
          </button>
        ))}
        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500">
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

const NoteCard = ({ note, onView, onAction, userRole }) => {
  const isDebit = note.type === "debit";
  // ── Treat as settled if replacementStatus complete (even if Firestore status = draft) ──
  const isSettled = note.status === "settled" || note.status === "complete" || note.replacementStatus === "complete";

  const cardBg = isSettled
    ? "border-violet-100 bg-violet-50/40 hover:bg-violet-50/70"
    : isDebit
    ? "border-pink-100 bg-rose-50/30 hover:bg-rose-50/60"
    : "border-teal-100 bg-teal-50/30 hover:bg-teal-50/60";

  return (
    <div
      onClick={() => onView(note)}
      className={`rounded-xl border p-3 hover:shadow-sm transition-all cursor-pointer ${cardBg}`}>
      {isSettled && (
        <div className="text-[10px] text-violet-600 font-semibold flex items-center gap-1 mb-1.5">
          <FiCheckCircle size={10}/> Click to view full details
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-slate-700">{note.noteNumber}</p>
          <p className="text-sm font-semibold text-slate-800 truncate">{note.vendorName}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {REASONS.find(r => r.value === note.reason)?.label?.split("—")[0]?.trim() || note.reason}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {note.linkedInvoiceNo && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                INV: {note.linkedInvoiceNo}
              </span>
            )}
            {note.linkedPoNo && (
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono">
                PO: {note.linkedPoNo}
              </span>
            )}
            {note.replacementStatus === "partial" && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">⏳ Partial Replace</span>
            )}
            {note.replacementStatus === "complete" && (
              <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-semibold">✅ Replaced</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Show effective status */}
          {isSettled
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-600"><FiCheckCircle size={10}/> Complete</span>
            : <StatusChip status={note.status} />
          }
          <FiEye size={13} className="text-slate-300 mt-1" />
        </div>
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {!isSettled && note.status === "draft" && (
          <button onClick={e => { e.stopPropagation(); onAction(note.id, "sent", note); }}
            className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-semibold">Send</button>
        )}
        {!isSettled && note.status === "sent" && ["store_manager","admin"].includes(userRole) && (
          <>
            <button onClick={e => { e.stopPropagation(); onAction(note.id, "accepted", note); }}
              className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 font-semibold">Accept</button>
            <button onClick={e => { e.stopPropagation(); onAction(note.id, "rejected", note); }}
              className="px-2.5 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold">Reject</button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Replacement Upload Component ───────────────────────────────────────────

const ReplacementUpload = ({ note, onDone, currentUser }) => {
  const fileRef                       = useRef();
  const [file,          setFile]      = useState(null);
  const [comparing,     setComparing] = useState(false);
  const [compareResult, setResult]    = useState(null);
  const [saving,        setSaving]    = useState(false);
  const [done,          setDone]      = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
  };

  const handleCompare = async () => {
    if (!file) return;
    setComparing(true);
    try {
      const parsed = await parseChallanExcel(file);
      const replacementItems = parsed.items && parsed.items.length > 0 ? parsed.items : await parseReplacementFile(file);
      setResult(compareItems(note.items || [], replacementItems));
    } catch (err) { alert("File parse error: " + err.message); }
    setComparing(false);
  };

  const handleConfirm = async () => {
    if (!compareResult) return;
    setSaving(true);
    try {
      const allComplete       = compareResult.every(i => i.status === "complete");
      const anyReceived       = compareResult.some(i => i.received > 0);
      const replacementStatus = allComplete ? "complete" : anyReceived ? "partial" : "missing";

      const stockSnap = await getDocs(collection(db, DB.STOCK));
      for (const item of compareResult) {
        if (item.received <= 0) continue;
        let found = false;
        for (const stockDoc of stockSnap.docs) {
          const sd = stockDoc.data();
          const nameMatch =
            sd.description?.toLowerCase().includes(item.itemName.toLowerCase().split(" ").slice(0,3).join(" ")) ||
            item.itemName.toLowerCase().includes((sd.description||"").toLowerCase().split(" ").slice(0,3).join(" ")) ||
            sd.itemName?.toLowerCase().trim() === item.itemName.toLowerCase().trim();
          if (nameMatch) {
            const ledger = Array.isArray(sd.ledger) ? sd.ledger : [];
            const updatePayload = {
              quantity: (parseFloat(sd.quantity) || 0) + item.received,
              ledger: [...ledger, {
                type:    "in",
                qty:     item.received,
                by:      currentUser?.uid || "system",
                at:      new Date().toISOString(),
                remarks: `Replacement received — Note: ${note.noteNumber}`,
              }],
            };
            if (item.status === "complete") {
              updatePayload.damagedQty = 0;
              updatePayload.hasIssue   = false;
              updatePayload.issueType  = null;
            }
            await updateDoc(doc(db, DB.STOCK, stockDoc.id), updatePayload);
            found = true;
            break;
          }
        }
        if (!found) {
          await addDoc(collection(db, DB.STOCK), {
            itemName: item.itemName,
            quantity: item.received,
            ledger: [{
              type:    "in",
              qty:     item.received,
              by:      currentUser?.uid || "system",
              at:      new Date().toISOString(),
              remarks: `Replacement received — Note: ${note.noteNumber}`,
            }],
          });
        }
      }

      if (allComplete && note.linkedInvoiceId) {
        await updateDoc(doc(db, DB.EXCEL, note.linkedInvoiceId), {
          replacementComplete: true,
          replacementNoteId:   note.id,
        });
      }

      const newStatus = allComplete ? "settled" : note.status;
      await updateDoc(doc(db, DB.NOTES, note.id), {
        replacementStatus,
        replacementItems: compareResult,
        replacementUploadedAt: serverTimestamp(),
        replacementUploadedBy: currentUser?.uid || "system",
        status: newStatus,
        ...(allComplete ? { settledAt: serverTimestamp() } : {}),
      });

      setDone(true);
      setTimeout(() => onDone(newStatus, replacementStatus), 1000);
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-6 gap-2 text-emerald-600">
        <FiCheckCircle size={28} />
        <p className="font-bold text-sm">Stock updated successfully!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          file ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
        }`}
      >
        <FiUpload size={20} className="mx-auto text-slate-400 mb-2" />
        {file ? (
          <p className="text-sm font-semibold text-indigo-700">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-600">Click to upload replacement challan</p>
            <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) or CSV — columns: Item Name, Quantity</p>
          </>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {file && !compareResult && (
        <button onClick={handleCompare} disabled={comparing}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {comparing
            ? <><FiRefreshCw size={14} className="animate-spin" /> Comparing...</>
            : "Compare with Damage List"}
        </button>
      )}

      {compareResult && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comparison Result</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {["Item","Needed","Received","Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compareResult.map((item, i) => (
                  <tr key={i} className={
                    item.status === "complete" ? "bg-emerald-50/50" :
                    item.status === "partial"  ? "bg-amber-50/50"   : "bg-red-50/40"
                  }>
                    <td className="px-3 py-2.5 font-medium text-slate-700 max-w-[160px] truncate">{item.itemName}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-600">{item.needed}</td>
                    <td className="px-3 py-2.5 font-bold">
                      <span className={
                        item.status === "complete" ? "text-emerald-600" :
                        item.status === "partial"  ? "text-amber-600"   : "text-red-500"
                      }>{item.received}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {item.status === "complete" && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✅ Complete</span>}
                      {item.status === "partial"  && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">⚠️ Partial</span>}
                      {item.status === "missing"  && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">❌ Missing</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`rounded-xl p-3 text-sm font-semibold border ${
            compareResult.every(i => i.status === "complete")
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : compareResult.some(i => i.received > 0)
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {compareResult.every(i => i.status === "complete")
              ? "✅ All items received — Note will be Settled & stock updated"
              : compareResult.some(i => i.received > 0)
              ? "⚠️ Partial — Received qty will be added to stock, note stays pending"
              : "❌ No items matched — Please check the file columns"}
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setResult(null); setFile(null); }}
              className="flex-1 py-2 text-sm border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50">
              Re-upload
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || compareResult.every(i => i.received === 0)}
              className="flex-1 py-2 text-sm bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <><FiRefreshCw size={13} className="animate-spin" /> Saving...</>
                : "Confirm & Update Stock"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Note Detail Page ───────────────────────────────────────────────────────

const NoteDetailPage = ({ note, onBack }) => {
  const isDebit = note.type === "debit";
  const effectiveStatus = note.status === "draft" && note.replacementStatus === "complete"
    ? "complete" : note.status;

  const accentBg   = isDebit ? "from-purple-500 to-purple-300" : "from-violet-400 to-indigo-400";
  const accentLight = isDebit ? "bg-pink-50 border-pink-100" : "bg-violet-50 border-violet-100";
  const accentText  = isDebit ? "text-pink-700" : "text-violet-700";

  const statusRow = [
    { label: "Status",      val: <StatusChip status={effectiveStatus} /> },
    { label: "Note #",      val: <span className="font-mono text-xs font-bold">{note.noteNumber}</span> },
    { label: "Created",     val: note.createdAt ? new Date(note.createdAt.seconds * 1000).toLocaleDateString("en-IN") : "—" },
    { label: "Settled At",  val: note.settledAt ? new Date(note.settledAt.seconds * 1000).toLocaleDateString("en-IN") : "—" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
        ← Back to Debit/Credit Notes
      </button>

      <div className={`bg-gradient-to-r ${accentBg} rounded-2xl p-6 text-white mb-5 shadow-md`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-80 font-mono">{note.noteNumber}</p>
            <h1 className="text-2xl font-bold mt-1 capitalize">{note.type} Note</h1>
            <p className="text-sm opacity-90 mt-0.5">{note.vendorName}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold">
              {note.status === "complete" ? "✅ Complete" : "✅ Settled"}
            </span>
            {note.replacementStatus === "complete" && (
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                Replacement Received
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {statusRow.map(({ label, val }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3">
              <p className="text-[10px] uppercase opacity-70 mb-1">{label}</p>
              <div className="text-sm font-semibold">{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Invoice Details</p>
          <div className="space-y-2.5">
            {[
              ["Invoice #", note.linkedInvoiceNo || "—"],
              ["PO #",      note.linkedPoNo || "—"],
              ["Vendor",    note.vendorName || "—"],
              ["Reason",    REASONS.find(r=>r.value===note.reason)?.label?.split("—")[0]||note.reason],
            ].map(([k,v]) => (
              <div key={k} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-slate-400 flex-shrink-0">{k}</span>
                <span className="font-semibold text-slate-800 text-right truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`border rounded-2xl p-4 shadow-sm ${accentLight}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${accentText}`}>Replacement Summary</p>
          {(note.replacementItems||[]).length > 0 ? (
            <div className="space-y-2">
              {(note.replacementItems||[]).map((ri, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 text-xs shadow-sm">
                  <span className="text-slate-700 font-medium truncate flex-1">{ri.itemName}</span>
                  {ri.partNo && <span className="font-mono text-slate-400 text-[10px] bg-slate-100 px-1.5 rounded">{ri.partNo}</span>}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-400">Need <b className="text-slate-600">{ri.needed}</b></span>
                    <span className="text-slate-400">Got <b className="text-emerald-600">{ri.received}</b></span>
                    {ri.status === "complete" && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✅</span>}
                    {ri.status === "partial"  && <span className="text-[10px] bg-amber-100  text-amber-700  px-2 py-0.5 rounded-full font-bold">⚠️</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No replacement items recorded</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mt-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Issue Items</p>
        <div className="border border-orange-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-orange-50">
              <tr>{["Item Name","Part No","Issue","PO Ordered","Damage/Short","OK","Pending"].map(h=>(
                <th key={h} className="px-3 py-2.5 text-left font-bold text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(note.items||[]).map((item,i)=>(
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{item.itemName}</td>
                  <td className="px-3 py-2.5"><span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{item.partNo||"—"}</span></td>
                  <td className="px-3 py-2.5"><span className="text-orange-600 font-semibold capitalize">{item.issue||"—"}</span></td>
                  <td className="px-3 py-2.5 text-center font-bold text-slate-600">{item.orderedQty||"—"}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-red-500">{item.quantity||"—"}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{item.okQty||"—"}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-amber-600">{item.pendingQty||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {note.remarks && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Remarks</p>
          <p className="text-sm text-slate-700">{note.remarks}</p>
        </div>
      )}
    </div>
  );
};

export default function DebitCreditNotes() {
  const [notes,           setNotes]          = useState([]);
  const [invoices,        setInvoices]       = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [showForm,        setShowForm]       = useState(false);
  const [viewNote,        setViewNote]       = useState(null);
  const [detailNote,      setDetailNote]     = useState(null);
  const [editingNoteId,   setEditingNoteId]  = useState(null);
  const [currentUser,     setCurrentUser]    = useState(null);
  const [userRole,        setUserRole]       = useState("");
  const [submitting,      setSubmitting]     = useState(false);
  const [statusFilter,    setStatusFilter]   = useState("all");
  const [debitPage,       setDebitPage]      = useState(1);
  const [creditPage,      setCreditPage]     = useState(1);
  const [showReplacement, setShowReplacement]= useState(false);
  const challanFileRef                       = useRef();
  const [challanFile,    setChallanFile]     = useState(null);
  const [challanParsed,  setChallanParsed]   = useState(null);
  const [challanParsing, setChallanParsing]  = useState(false);
  const [challanMismatch,setChallanMismatch] = useState(null);
  const [form, setForm] = useState({
    type: "debit", linkedInvoiceId: "", linkedInvoiceNo: "",
    linkedPoNo: "", vendorName: "", reason: "short_supply",
    items: [emptyItem()], remarks: "",
  });

  useEffect(() => {
    fetchAll();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const snap = await getDoc(doc(db, DB.USER, user.uid));
        if (snap.exists()) setUserRole(snap.data().role || "user");
      }
    });
    return () => unsub();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const notesSnap = await getDocs(collection(db, DB.NOTES));
      const notesList = notesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.seconds || a.createdAt?.toMillis?.() / 1000 || 0;
          const tb = b.createdAt?.seconds || b.createdAt?.toMillis?.() / 1000 || 0;
          return tb - ta;
        });
      setNotes(notesList);
    } catch (err) {
      console.error("Notes fetch error:", err);
      setNotes([]);
    }

    try {
      const invSnap = await getDocs(collection(db, DB.EXCEL));
      const withIssues = invSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(inv =>
          (
            inv.storeQcStatus === "approved" ||
            inv.storeQcStatus === "received" ||
            inv.poStatus === "received" ||
            inv.receivedAt
          ) &&
          !inv.replacementComplete &&
          (inv.items || []).some(i => i.issue && i.issue !== "none" && i.issue !== "")
        );
      setInvoices(withIssues);
    } catch (err) {
      console.error("Invoices fetch error:", err);
      setInvoices([]);
    }

    setLoading(false);
  };

  const handleInvoiceSelect = (invoiceId) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    const issueItems = (inv.items || []).filter(i => i.issue && i.issue !== "none" && i.issue !== "");
    const dominantIssue = issueItems[0]?.issue || "shortage";
    const autoReason = issueToReason(dominantIssue);
    setChallanFile(null);
    setChallanParsed(null);
    setForm(f => ({
      ...f,
      linkedInvoiceId: invoiceId,
      linkedInvoiceNo: inv.excelHeader?.reference || inv.invoiceNo || "",
      linkedPoNo:      inv.excelHeader?.voucherNo  || inv.linkedPoNo || "",
      vendorName:      inv.excelHeader?.supplier   || inv.vendor || inv.consignee || "",
      reason:          autoReason,
      items: issueItems.length > 0
        ? issueItems.map(item => {
            const ordered  = parseFloat(item.orderedQty || item.quantity || 0);
            const damaged  = parseFloat(item.damagedQty || item.shortage || 0);
            const ok       = ordered - damaged;
            const pending  = damaged;
            return {
              itemName:   item.description || item.itemName || "",
              quantity:   String(damaged),
              issue:      item.issue,
              orderedQty: String(ordered),
              okQty:      String(ok > 0 ? ok : 0),
              pendingQty: String(pending),
              partNo:     item.productCode || item.partNo || "",
            };
          })
        : [emptyItem()],
    }));
  };

  const handleChallanFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setChallanFile(f);
    setChallanParsed(null);
    setChallanMismatch(null);
    setChallanParsing(true);
    try {
      const parsed = await parseChallanExcel(f);
      setChallanParsed(parsed);

      if (form.linkedInvoiceId) {
        const mismatches = [];
        if (parsed.vendorName && form.vendorName) {
          const challanVendor = parsed.vendorName.toLowerCase().trim();
          const noteVendor    = form.vendorName.toLowerCase().trim();
          if (!challanVendor.includes(noteVendor.split(" ")[0]) && !noteVendor.includes(challanVendor.split(" ")[0])) {
            mismatches.push(`Vendor mismatch: Challan "${parsed.vendorName}" ≠ Note "${form.vendorName}"`);
          }
        }

        if (parsed.supplierRef && form.linkedInvoiceNo) {
          const ref1 = parsed.supplierRef.toLowerCase().replace(/\s/g,"");
          const ref2 = form.linkedInvoiceNo.toLowerCase().replace(/\s/g,"");
          if (ref1 !== ref2 && !ref1.includes(ref2) && !ref2.includes(ref1)) {
            mismatches.push(`Invoice ref mismatch: Challan "${parsed.supplierRef}" ≠ Note "${form.linkedInvoiceNo}"`);
          }
        }

        const unmatchedItems = form.items.filter(ni =>
          !parsed.items.some(ci =>
            ci.itemName.toLowerCase().includes(ni.itemName.toLowerCase().split(" ").slice(0,3).join(" ")) ||
            ni.itemName.toLowerCase().includes(ci.itemName.toLowerCase().split(" ").slice(0,3).join(" "))
          )
        );
        if (unmatchedItems.length > 0) {
          mismatches.push(`Items not found in challan: ${unmatchedItems.map(i=>i.itemName).join(", ")}`);
        }
        if (mismatches.length > 0) setChallanMismatch(mismatches);
      }
    } catch (err) {
      alert("Could not parse file: " + err.message);
    }
    setChallanParsing(false);
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...form.items];
    updated[idx][field] = value;
    setForm(f => ({ ...f, items: updated }));
  };

  const generateNoteNumber = (type) => {
    const prefix = type === "debit" ? "DN" : "CN";
    return `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
  };

  const handleSubmit = async () => {
    if (!form.vendorName || !form.items[0].itemName) {
      alert("Please select an invoice with issues.");
      return;
    }
    setSubmitting(true);
    try {
      let matchResults = null;
      let allComplete  = false;
      let anyReceived  = false;

      if (challanParsed && challanParsed.items?.length > 0) {
        const challanItems = challanParsed.items || [];

        matchResults = form.items.map((ni, niIdx) => {
          const needed  = parseFloat(ni.quantity) || 0;
          const niWords = ni.itemName.toLowerCase().split(" ").filter(w => w.length > 2);
          const niLow   = ni.itemName.toLowerCase();

          let m = null;

          if (ni.partNo) {
            m = challanItems.find(ci =>
              ci.partNo && ci.partNo.toLowerCase().trim() === ni.partNo.toLowerCase().trim()
            );
          }

          if (!m) {
            m = challanItems.find(ci => {
              const ciLow = ci.itemName.toLowerCase();
              if (ciLow.includes(niLow.split(" ").slice(0, 3).join(" "))) return true;
              if (niLow.includes(ciLow.split(" ").slice(0, 3).join(" "))) return true;
              return false;
            });
          }

          if (!m) {
            m = challanItems.find(ci => {
              const ciWords = ci.itemName.toLowerCase().split(" ").filter(w => w.length > 2);
              return niWords.filter(w => ciWords.includes(w)).length >= 2;
            });
          }

          if (!m && form.items.length === 1 && challanItems.length === 1) {
            m = challanItems[0];
          }

          if (!m && challanItems[niIdx]) {
            const ciQty = parseFloat(challanItems[niIdx].quantity) || 0;
            if (ciQty > 0 && Math.abs(ciQty - needed) / Math.max(needed, 1) <= 0.5) {
              m = challanItems[niIdx];
            }
          }

          if (!m) {
            m = challanItems.find(ci => {
              const ciQty = parseFloat(ci.quantity) || 0;
              return ciQty === needed && needed > 0;
            });
          }

          const received = m ? parseFloat(m.quantity) || 0 : 0;
          return {
            itemName: ni.itemName,
            partNo:   ni.partNo || "",
            needed,
            received,
            status:   received === 0 ? "missing" : received >= needed ? "complete" : "partial",
          };
        });
        allComplete = matchResults.every(r => r.status === "complete");
        anyReceived = matchResults.some(r => r.received > 0);
      } else if (editingNoteId) {
        try {
          const existingNoteSnap = await getDoc(doc(db, DB.NOTES, editingNoteId));
          if (existingNoteSnap.exists()) {
            const existingNote = existingNoteSnap.data();
            if (
              existingNote.replacementStatus === "complete" &&
              Array.isArray(existingNote.replacementItems) &&
              existingNote.replacementItems.length > 0 &&
              existingNote.replacementItems.every(r => r.status === "complete")
            ) {
              matchResults = existingNote.replacementItems;
              allComplete  = true;
              anyReceived  = true;
            }
          }
        } catch (_) {}
      }

      const replacementStatus = matchResults
        ? (allComplete ? "complete" : anyReceived ? "partial" : "missing")
        : null;

      // ── FIX: "complete" is not in STATUS map → use "settled" ──
      const finalStatus = allComplete ? "settled" : "draft";

      let noteRef;
      if (editingNoteId) {
        noteRef = doc(db, DB.NOTES, editingNoteId);
        await updateDoc(noteRef, {
          ...form,
          status:            finalStatus,
          updatedAt:         serverTimestamp(),
          replacementStatus,
          replacementItems:  matchResults || [],
          ...(allComplete ? { settledAt: serverTimestamp() } : {}),
        });
      } else {
        noteRef = await addDoc(collection(db, DB.NOTES), {
          ...form,
          noteNumber:        generateNoteNumber(form.type),
          totalAmount:       0,
          status:            finalStatus,
          createdBy:         currentUser?.uid || "system",
          createdAt:         serverTimestamp(),
          approvedBy:        null,
          approvedAt:        null,
          replacementStatus,
          replacementItems:  matchResults || [],
          ...(allComplete ? { settledAt: serverTimestamp() } : {}),
        });
      }

      if (allComplete && matchResults) {
        const stockSnap = await getDocs(collection(db, DB.STOCK));
        for (const item of matchResults) {
          if (item.received <= 0) continue;
          for (const sd of stockSnap.docs) {
            const sdata   = sd.data();
            const itemWords = item.itemName.toLowerCase().split(" ").slice(0,3).join(" ");
            const sdDesc    = (sdata.description || sdata.itemName || "").toLowerCase();
            const productCodeMatch =
              item.partNo && sdata.productCode &&
              item.partNo.toLowerCase().trim() === sdata.productCode.toLowerCase().trim();
            const nameMatch =
              sdDesc.includes(itemWords) ||
              item.itemName.toLowerCase().includes(sdDesc.split(" ").slice(0, 3).join(" "));

            if (productCodeMatch || nameMatch) {
              const ledger = Array.isArray(sdata.ledger) ? sdata.ledger : [];
              const existingDamaged  = parseFloat(sdata.damagedQty || 0);
              const remainingDamaged = Math.max(0, existingDamaged - item.received);
              await updateDoc(doc(db, DB.STOCK, sd.id), {
                available:   (parseFloat(sdata.available) || 0) + item.received,
                quantity:    (parseFloat(sdata.quantity)  || 0) + item.received,
                damagedQty:  remainingDamaged,
                hasIssue:    remainingDamaged > 0,
                issueType:   remainingDamaged > 0 ? (sdata.issueType || null) : null,
                ledger: [...ledger, {
                  type:    "replacement-in",
                  qty:     item.received,
                  by:      currentUser?.uid || "system",
                  at:      new Date().toISOString(),
                  remarks: `Replacement challan — Note: ${form.linkedInvoiceNo}`,
                }],
              });
              break;
            }
          }
        }

        if (form.linkedInvoiceId) {
          const invDocRef  = doc(db, DB.EXCEL, form.linkedInvoiceId);
          const invDocSnap = await getDoc(invDocRef);
          if (invDocSnap.exists()) {
            const invData = invDocSnap.data();
            const updatedItems = (invData.items || []).map(invItem => {
              const mr = matchResults.find(r => {
                if (r.partNo && invItem.productCode &&
                    r.partNo.toLowerCase().trim() === invItem.productCode.toLowerCase().trim()) return true;
                const rWords = r.itemName.toLowerCase().split(" ").slice(0, 3).join(" ");
                const iDesc  = (invItem.description || "").toLowerCase();
                return iDesc.includes(rWords) ||
                  r.itemName.toLowerCase().includes(iDesc.split(" ").slice(0, 3).join(" "));
              });
              if (!mr) return invItem;
              const existDmg  = parseFloat(invItem.damagedQty || 0);
              const remaining = Math.max(0, existDmg - mr.received);
              return {
                ...invItem,
                damagedQty:  remaining,
                issue:       remaining > 0 ? invItem.issue       : null,
                issueDetail: remaining > 0 ? invItem.issueDetail : null,
              };
            });
            const allResolved = updatedItems.every(i => !i.issue || !i.damagedQty || i.damagedQty === 0);
            await updateDoc(invDocRef, {
              items:               updatedItems,
              replacementComplete: allResolved,
              replacementNoteId:   editingNoteId || noteRef.id,
              ...(allResolved ? {
                storeQcPending:  false,
                storeQcStatus:   "approved",
              } : {}),
            });
          } else {
            await updateDoc(invDocRef, {
              replacementComplete: true,
              replacementNoteId:   editingNoteId || noteRef.id,
              storeQcStatus:       "approved",
            });
          }
        }
      }

      setForm({ type: "debit", linkedInvoiceId: "", linkedInvoiceNo: "", linkedPoNo: "", vendorName: "", reason: "short_supply", items: [emptyItem()], remarks: "" });
      setChallanFile(null); setChallanParsed(null); setChallanMismatch(null);
      setShowForm(false);
      fetchAll();
    } catch (err) {
      alert("Error submitting note: " + err.message);
      console.error(err);
    }
    setSubmitting(false);
  };

  const updateStatus = async (noteId, newStatus, note) => {
    const updateData = { status: newStatus };
    if (newStatus === "accepted") {
      updateData.approvedBy = currentUser.uid;
      updateData.approvedAt = serverTimestamp();
    }
    await updateDoc(doc(db, DB.NOTES, noteId), updateData);
    fetchAll();
    if (viewNote?.id === noteId) setViewNote(v => ({ ...v, status: newStatus }));
  };

  const applyStatusFilter = (list) =>
    statusFilter === "all" ? list : list.filter(n => n.status === statusFilter);

  const debitNotes  = applyStatusFilter(notes.filter(n => n.type === "debit"));
  const creditNotes = applyStatusFilter(notes.filter(n => n.type === "credit"));
  const debitPaged  = debitNotes.slice((debitPage  - 1) * PAGE_SIZE, debitPage  * PAGE_SIZE);
  const creditPaged = creditNotes.slice((creditPage - 1) * PAGE_SIZE, creditPage * PAGE_SIZE);

  const counts = {
    debit:   notes.filter(n => n.type === "debit").length,
    credit:  notes.filter(n => n.type === "credit").length,
    pending: notes.filter(n => ["draft","sent"].includes(n.status)).length,
  };

  // ── KEY FIX: invoices that have NO existing note yet ──────────────────────
  // An invoice should show "+ Create" card ONLY if:
  //   1. No note already exists for this invoice
  //   2. Invoice has a meaningful identifier (reference OR supplier) — skip ghost/blank records
  const invoicesWithoutNote = (invoiceList) =>
    invoiceList.filter(inv => {
      const hasNote = notes.some(n => n.linkedInvoiceId === inv.id);
      const hasIdentifier = !!(
        inv.excelHeader?.reference ||
        inv.excelHeader?.supplier  ||
        inv.invoiceNo              ||
        inv.vendor
      );
      return !hasNote && hasIdentifier;
    });

  const debitPendingInvoices  = invoicesWithoutNote(
    invoices.filter(inv => {
      const issues = (inv.items||[]).filter(i => i.issue && i.issue !== "none" && i.issue !== "");
      return issues.length > 0 && issues.every(i => i.issue !== "excess");
    })
  );

  const creditPendingInvoices = invoicesWithoutNote(
    invoices.filter(inv => {
      const issues = (inv.items||[]).filter(i => i.issue && i.issue !== "none" && i.issue !== "");
      return issues.some(i => i.issue === "excess");
    })
  );
  // ─────────────────────────────────────────────────────────────────────────

  if (detailNote) {
    return <NoteDetailPage note={detailNote} onBack={() => setDetailNote(null)} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Debit / Credit Notes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vendor disputes, returns and amount adjustments</p>
        </div>
        <button onClick={() => {
          setForm({ type: "debit", linkedInvoiceId: "", linkedInvoiceNo: "", linkedPoNo: "", vendorName: "", reason: "short_supply", items: [emptyItem()], remarks: "" });
          setEditingNoteId(null);
          setChallanFile(null); setChallanParsed(null); setChallanMismatch(null);
          setShowForm(true);
        }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={16} /> New Note
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Debit Notes",    val: counts.debit,   bg: "bg-red-50/60 border-red-100",         text: "text-red-600",     Icon: FiAlertTriangle },
          { label: "Credit Notes",   val: counts.credit,  bg: "bg-emerald-50/60 border-emerald-100", text: "text-emerald-600", Icon: FiCheckCircle },
          { label: "Pending Action", val: counts.pending, bg: "bg-amber-50/60 border-amber-100",     text: "text-amber-600",   Icon: FiClock },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 ${c.bg} flex items-center gap-4`}>
            <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${c.text}`}>
              <c.Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className={`text-2xl font-bold ${c.text}`}>{c.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <select value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setDebitPage(1); setCreditPage(1); }}
            className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="settled">Settled</option>
            <option value="rejected">Rejected</option>
          </select>
          <FiChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Split Columns */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Debit Column ── */}
          <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50/50 border-b border-red-100">
              <FiAlertTriangle size={15} className="text-red-500" />
              <h2 className="font-bold text-red-700 text-sm">Debit Notes</h2>
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{debitNotes.length}</span>
            </div>
            <div className="p-3 space-y-2 min-h-[180px]">

              {/* Pending "+ Create" cards — only invoices WITHOUT an existing note */}
              {debitPendingInvoices.map(inv => {
                const issueItems = (inv.items||[]).filter(i => i.issue && i.issue !== "none" && i.issue !== "");
                const issueTypes = [...new Set(issueItems.map(i => i.issue))];
                const IC = {
                  damage:     "bg-red-100 text-red-700",
                  shortage:   "bg-orange-100 text-orange-700",
                  wrong_item: "bg-purple-100 text-purple-700",
                  quality:    "bg-yellow-100 text-yellow-700",
                };
                return (
                  <div key={inv.id} onClick={() => {
                    const dominantIssue = issueItems[0]?.issue || "damage";
                    const autoReason = issueToReason(dominantIssue);
                    const builtItems = issueItems.map(item => {
                      const ordered = parseFloat(item.orderedQty || item.quantity || 0);
                      const damaged = parseFloat(item.damagedQty || item.shortage || 0);
                      return {
                        itemName:   item.description || "",
                        quantity:   String(damaged || ordered),
                        issue:      item.issue,
                        orderedQty: String(ordered),
                        okQty:      String(ordered - damaged),
                        pendingQty: String(damaged),
                        partNo:     item.productCode || "",
                      };
                    });
                    setForm({ type: "debit", linkedInvoiceId: inv.id, linkedInvoiceNo: inv.excelHeader?.reference || "", linkedPoNo: inv.excelHeader?.voucherNo || "", vendorName: inv.excelHeader?.supplier || "", reason: autoReason, items: builtItems, remarks: "" });
                    setChallanFile(null); setChallanParsed(null); setChallanMismatch(null);
                    setEditingNoteId(null);
                    setShowForm(true);
                  }} className="bg-red-50/40 border border-red-200 border-dashed rounded-xl p-3 cursor-pointer hover:bg-red-50 hover:border-red-300 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 text-xs">{inv.excelHeader?.reference || "—"}</span>
                        {issueTypes.map(t => (
                          <span key={t} className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${IC[t] || "bg-gray-100 text-gray-700"}`}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </span>
                        ))}
                        <span className="text-xs text-slate-400">{issueItems.length} item{issueItems.length > 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-xs text-red-600 font-semibold bg-white px-2 py-1 rounded-lg border border-red-200 flex-shrink-0">+ Create</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{inv.excelHeader?.supplier || "—"}</p>
                  </div>
                );
              })}

              {/* Existing debit notes */}
              {debitPaged.length === 0 && debitPendingInvoices.length === 0
                ? <div className="flex flex-col items-center justify-center py-10 text-slate-300"><FiFileText size={26} className="mb-2"/><p className="text-sm">No debit notes</p></div>
                : debitPaged.map(note => (
                    <NoteCard key={note.id} note={note}
                      onView={n => {
                        // complete/settled/replaced → read-only detail page
                        if (n.status === "complete" || n.status === "settled" || n.replacementStatus === "complete") {
                          setDetailNote(n);
                          return;
                        }
                        setForm({
                          type:            n.type,
                          linkedInvoiceId: n.linkedInvoiceId || "",
                          linkedInvoiceNo: n.linkedInvoiceNo || "",
                          linkedPoNo:      n.linkedPoNo      || "",
                          vendorName:      n.vendorName      || "",
                          reason:          n.reason          || "short_supply",
                          items:           n.items?.length   ? n.items : [emptyItem()],
                          remarks:         n.remarks         || "",
                        });
                        setChallanFile(null); setChallanParsed(null); setChallanMismatch(null);
                        setEditingNoteId(n.id);
                        setShowForm(true);
                      }}
                      onAction={updateStatus} userRole={userRole} />
                  ))
              }
            </div>
            <Pagination total={debitNotes.length} page={debitPage} setPage={setDebitPage} />
          </div>

          {/* ── Credit Column ── */}
          <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50/50 border-b border-emerald-100">
              <FiCheckCircle size={15} className="text-emerald-500" />
              <h2 className="font-bold text-emerald-700 text-sm">Credit Notes</h2>
              <span className="bg-emerald-100 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">{creditNotes.length}</span>
            </div>
            <div className="p-3 space-y-2 min-h-[180px]">

              {/* Pending "+ Create" cards — only invoices WITHOUT an existing note */}
              {creditPendingInvoices.map(inv => {
                const issueItems = (inv.items||[]).filter(i => i.issue && i.issue !== "none" && i.issue !== "");
                return (
                  <div key={inv.id} onClick={() => {
                    setForm({
                      type: "credit", linkedInvoiceId: inv.id,
                      linkedInvoiceNo: inv.excelHeader?.reference || "",
                      linkedPoNo:      inv.excelHeader?.voucherNo || "",
                      vendorName:      inv.excelHeader?.supplier  || "",
                      reason: "short_supply",
                      items: issueItems.map(item => {
                        const ordered = parseFloat(item.orderedQty || item.quantity || 0);
                        const excess  = parseFloat(item.damagedQty || item.shortage || 0);
                        return { itemName: item.description || "", quantity: String(excess || ordered), issue: item.issue, orderedQty: String(ordered), okQty: String(ordered), pendingQty: String(excess), partNo: item.productCode || "" };
                      }),
                      remarks: "",
                    });
                    setChallanFile(null); setChallanParsed(null); setChallanMismatch(null);
                    setEditingNoteId(null);
                    setShowForm(true);
                  }} className="bg-emerald-50/40 border border-emerald-200 border-dashed rounded-xl p-3 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 text-xs">{inv.excelHeader?.reference || "—"}</span>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Excess</span>
                        <span className="text-xs text-slate-400">{issueItems.length} item{issueItems.length > 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold bg-white px-2 py-1 rounded-lg border border-emerald-200 flex-shrink-0">+ Create</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{inv.excelHeader?.supplier || "—"}</p>
                  </div>
                );
              })}

              {/* Existing credit notes */}
              {creditPaged.length === 0 && creditPendingInvoices.length === 0
                ? <div className="flex flex-col items-center justify-center py-10 text-slate-300"><FiFileText size={26} className="mb-2"/><p className="text-sm">No credit notes</p></div>
                : creditPaged.map(note => (
                    <NoteCard key={note.id} note={note}
                      onView={n => {
                        // complete/settled/replaced → read-only detail page
                        if (n.status === "complete" || n.status === "settled" || n.replacementStatus === "complete") {
                          setDetailNote(n);
                          return;
                        }
                        setForm({
                          type:            n.type,
                          linkedInvoiceId: n.linkedInvoiceId || "",
                          linkedInvoiceNo: n.linkedInvoiceNo || "",
                          linkedPoNo:      n.linkedPoNo      || "",
                          vendorName:      n.vendorName      || "",
                          reason:          n.reason          || "short_supply",
                          items:           n.items?.length   ? n.items : [emptyItem()],
                          remarks:         n.remarks         || "",
                        });
                        setChallanFile(null); setChallanParsed(null); setChallanMismatch(null);
                        setEditingNoteId(n.id);
                        setShowForm(true);
                      }}
                      onAction={updateStatus} userRole={userRole} />
                  ))
              }
            </div>
            <Pagination total={creditNotes.length} page={creditPage} setPage={setCreditPage} />
          </div>

        </div>
      )}

      {/* ── Create/Edit Note Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-500/90 to-purple-500/90 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{editingNoteId ? "Edit Debit / Credit Note" : "New Debit / Credit Note"}</h2>
                <p className="text-xs text-indigo-200 mt-0.5">{editingNoteId ? "Pre-filled from existing note — upload challan & submit" : "Select invoice → damage items auto-fill"}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">

              {/* Note Type */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Note Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value:"debit",  label:"Debit Note",  desc:"Vendor owes us", icon:"📋", activeBg:"bg-red-400",     activeTxt:"text-white", inactiveBg:"bg-red-50/50 border border-red-100", inactiveTxt:"text-red-600" },
                    { value:"credit", label:"Credit Note", desc:"We owe vendor",  icon:"✅", activeBg:"bg-emerald-400", activeTxt:"text-white", inactiveBg:"bg-emerald-50/50 border border-emerald-100", inactiveTxt:"text-emerald-600" },
                  ].map(t => (
                    <button key={t.value} onClick={() => setForm(f=>({...f,type:t.value}))}
                      className={`p-3 rounded-xl text-left transition-all ${form.type===t.value ? `${t.activeBg} ${t.activeTxt} shadow-md` : `${t.inactiveBg} ${t.inactiveTxt} hover:shadow-sm`}`}>
                      <p className="text-lg mb-0.5">{t.icon}</p>
                      <p className="text-sm font-bold">{t.label}</p>
                      <p className={`text-xs mt-0.5 ${form.type===t.value ? "opacity-80" : "opacity-60"}`}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Replacement Challan */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Replacement Challan</label>
                <div
                  onClick={() => challanFileRef.current?.click()}
                  className={`relative rounded-xl p-4 text-center cursor-pointer transition-all border-2 border-dashed ${
                    challanFile ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 ${challanFile ? "bg-indigo-100" : "bg-slate-100"}`}>
                    <FiUpload size={18} className={challanFile ? "text-indigo-600" : "text-slate-400"} />
                  </div>
                  {challanParsing ? (
                    <div>
                      <p className="text-sm text-indigo-600 font-semibold">Parsing challan...</p>
                      <p className="text-xs text-slate-400 mt-0.5">Reading invoice, vendor & items</p>
                    </div>
                  ) : challanFile && challanParsed ? (
                    <div className="text-left w-full">
                      <p className="text-sm font-bold text-indigo-700 truncate">{challanFile.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {challanParsed.invoiceNo && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">INV: {challanParsed.invoiceNo}</span>}
                        {challanParsed.supplierRef && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">REF: {challanParsed.supplierRef}</span>}
                        {challanParsed.vendorName && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{challanParsed.vendorName}</span>}
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">✓ {challanParsed.items?.length || 0} items</span>
                      </div>
                    </div>
                  ) : challanFile ? (
                    <p className="text-sm font-bold text-indigo-700">{challanFile.name}</p>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-600">Upload Replacement Challan</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click to browse — Excel (.xlsx) or CSV</p>
                    </div>
                  )}
                  <input ref={challanFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleChallanFileUpload} />
                </div>

                {challanMismatch && challanMismatch.length > 0 && (
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FiAlertTriangle size={14} className="text-red-600 flex-shrink-0" />
                      <p className="text-xs font-bold text-red-700">Challan Mismatch Detected</p>
                    </div>
                    <ul className="space-y-1">
                      {challanMismatch.map((msg, i) => (
                        <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                          <span className="mt-0.5 flex-shrink-0">⚠️</span> {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {challanParsed && !challanMismatch && form.linkedInvoiceId && (
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 flex items-center gap-2">
                    <FiCheckCircle size={14} className="text-emerald-600" />
                    <p className="text-xs font-bold text-emerald-700">Challan matches invoice & vendor ✓</p>
                  </div>
                )}
              </div>

              {/* Linked Invoice */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Linked Invoice</label>
                <select value={form.linkedInvoiceId} onChange={e => handleInvoiceSelect(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                  <option value="">— Select invoice with issues —</option>
                  {form.linkedInvoiceId && !invoices.find(i => i.id === form.linkedInvoiceId) && (
                    <option value={form.linkedInvoiceId}>
                      {form.linkedInvoiceNo || form.linkedInvoiceId} | {form.vendorName}
                    </option>
                  )}
                  {invoices.map(inv => {
                    const issueCount = (inv.items||[]).filter(i=>i.issue&&i.issue!=="none"&&i.issue!=="").length;
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.excelHeader?.reference || inv.invoiceNo} | {inv.excelHeader?.supplier || inv.vendor} | {issueCount} issue{issueCount!==1?"s":""}
                      </option>
                    );
                  })}
                </select>
                {invoices.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <FiAlertTriangle size={12}/> No invoices with damage/shortage found
                  </p>
                )}
              </div>

              {/* Vendor & PO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Vendor</label>
                  <input value={form.vendorName} onChange={e => setForm(f=>({...f,vendorName:e.target.value}))}
                    placeholder="Auto-filled from invoice"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Linked PO #</label>
                  <input value={form.linkedPoNo} readOnly
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"/>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Reason <span className="normal-case font-normal text-emerald-500 text-[10px]">✓ Auto-set from issue</span>
                </label>
                <select value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                  {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Issue Items */}
              {form.items[0]?.itemName && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Items</label>
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Auto-filled from invoice</span>
                  </div>
                  <div className="border border-orange-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-gradient-to-r from-orange-50 to-red-50">
                        <tr>
                          {["Item Name","Part No","Issue","PO Ordered","Damage/Short","OK","Pending"].map(h => (
                            <th key={h} className="px-2.5 py-2 text-left font-bold text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {form.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-orange-50/30">
                            <td className="px-2.5 py-2.5 font-medium text-slate-700 max-w-[140px]"><span className="truncate block">{item.itemName}</span></td>
                            <td className="px-2.5 py-2.5"><span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.partNo || "—"}</span></td>
                            <td className="px-2.5 py-2.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${
                                item.issue === "damage"     ? "bg-red-100 text-red-700" :
                                item.issue === "shortage"   ? "bg-orange-100 text-orange-700" :
                                item.issue === "wrong_item" ? "bg-purple-100 text-purple-700" :
                                "bg-slate-100 text-slate-600"
                              }`}>{item.issue || "—"}</span>
                            </td>
                            <td className="px-2.5 py-2.5 font-semibold text-slate-600 text-center">{item.orderedQty || "—"}</td>
                            <td className="px-2.5 py-2.5 font-bold text-red-600 text-center">{item.quantity || "—"}</td>
                            <td className="px-2.5 py-2.5 font-bold text-emerald-600 text-center">{item.okQty || "—"}</td>
                            <td className="px-2.5 py-2.5 text-center"><span className="font-bold text-amber-600">{item.pendingQty || "—"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Challan Match Result Table */}
              {challanParsed && challanParsed.items?.length > 0 && form.items[0]?.itemName && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Challan Match Result</label>
                    <span className="text-[10px] text-slate-400">Replacement challan vs issue items</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Item","Part No","Needed","In Challan","Status"].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {form.items.map((ni, i) => {
                          const needed = parseFloat(ni.quantity) || 0;
                          const niLow  = ni.itemName.toLowerCase();
                          // Smart match: partNo > description fuzzy > single item auto-match
                          let challanMatch = null;
                          if (ni.partNo) {
                            challanMatch = challanParsed.items.find(ci =>
                              ci.partNo && ci.partNo.toLowerCase().trim() === ni.partNo.toLowerCase().trim()
                            );
                          }
                          if (!challanMatch) {
                            challanMatch = challanParsed.items.find(ci => {
                              const ciLow = ci.itemName.toLowerCase();
                              return ciLow.includes(niLow.split(" ").slice(0,3).join(" ")) ||
                                     niLow.includes(ciLow.split(" ").slice(0,3).join(" "));
                            });
                          }
                          // Single item auto-match
                          if (!challanMatch && form.items.length === 1 && challanParsed.items.length === 1) {
                            challanMatch = challanParsed.items[0];
                          }
                          const received = challanMatch ? parseFloat(challanMatch.quantity) || 0 : 0;
                          const status   = received === 0 ? "missing" : received >= needed ? "complete" : "partial";
                          return (
                            <tr key={i} className={
                              status === "complete" ? "bg-emerald-50/40" :
                              status === "partial"  ? "bg-amber-50/40"   : "bg-red-50/30"
                            }>
                              <td className="px-3 py-2.5 font-medium text-slate-700 max-w-[130px] truncate">{ni.itemName}</td>
                              <td className="px-3 py-2.5">
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{ni.partNo || "—"}</span>
                              </td>
                              <td className="px-3 py-2.5 font-bold text-red-500 text-center">{needed}</td>
                              <td className="px-3 py-2.5 font-bold text-center">
                                <span className={status==="complete"?"text-emerald-600":status==="partial"?"text-amber-600":"text-slate-400"}>
                                  {received || "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                {status==="complete" && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✅ Match</span>}
                                {status==="partial"  && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">⚠️ Partial</span>}
                                {status==="missing"  && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">❌ Not Found</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Summary banner */}
                  {(() => {
                    const results = form.items.map(ni => {
                      const needed = parseFloat(ni.quantity) || 0;
                      const niLow  = ni.itemName.toLowerCase();
                      let m = null;
                      if (ni.partNo) m = challanParsed.items.find(ci => ci.partNo?.toLowerCase().trim() === ni.partNo.toLowerCase().trim());
                      if (!m) m = challanParsed.items.find(ci => {
                        const ciLow = ci.itemName.toLowerCase();
                        return ciLow.includes(niLow.split(" ").slice(0,3).join(" ")) || niLow.includes(ciLow.split(" ").slice(0,3).join(" "));
                      });
                      if (!m && form.items.length === 1 && challanParsed.items.length === 1) m = challanParsed.items[0];
                      const r = m ? parseFloat(m.quantity)||0 : 0;
                      return r===0?"missing":r>=needed?"complete":"partial";
                    });
                    const allDone = results.every(r=>r==="complete");
                    const anyHit  = results.some(r=>r!=="missing");
                    return (
                      <div className={`mt-2 rounded-xl p-2.5 text-xs font-semibold border flex items-center gap-2 ${
                        allDone?"bg-emerald-50 border-emerald-200 text-emerald-700":
                        anyHit ?"bg-amber-50 border-amber-200 text-amber-700":
                                "bg-red-50 border-red-200 text-red-700"
                      }`}>
                        {allDone?"✅ All items match — stock will update on settlement":
                         anyHit ?"⚠️ Partial match — matched items will be added to stock on settlement":
                                 "❌ No items matched — please verify the uploaded file"}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Remarks</label>
                <textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))}
                  rows={2} placeholder="Additional notes..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"/>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => { setShowForm(false); setEditingNoteId(null); setChallanFile(null); setChallanParsed(null); setChallanMismatch(null); }}
                className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-6 py-2 text-sm bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 font-semibold disabled:opacity-50 shadow-sm transition-all flex items-center gap-2">
                {submitting ? <><FiRefreshCw size={13} className="animate-spin"/> Submitting...</> : editingNoteId ? <><FiSend size={13}/> Update & Submit</> : <><FiSend size={13}/> Submit Note</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Note Modal */}
      {viewNote && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <p className="text-xs text-slate-400 font-mono">{viewNote.noteNumber}</p>
                <h2 className="text-lg font-bold text-slate-800 capitalize">{viewNote.type} Note</h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip status={viewNote.status} />
                <button onClick={() => { setViewNote(null); setShowReplacement(false); }}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><FiX/></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Vendor",    viewNote.vendorName],
                  ["Invoice #", viewNote.linkedInvoiceNo||"—"],
                  ["PO #",      viewNote.linkedPoNo||"—"],
                  ["Reason",    REASONS.find(r=>r.value===viewNote.reason)?.label?.split("—")[0]||viewNote.reason],
                ].map(([k,v])=>(
                  <div key={k} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">{k}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{v}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Issue Items</p>
                <div className="border border-orange-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-orange-50">
                      <tr>{["Item","Issue","Qty"].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-bold text-slate-500">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(viewNote.items||[]).map((item,i)=>(
                        <tr key={i}>
                          <td className="px-3 py-2.5 text-slate-700 font-medium">{item.itemName}</td>
                          <td className="px-3 py-2.5"><span className="text-orange-600 font-semibold capitalize">{item.issue||"—"}</span></td>
                          <td className="px-3 py-2.5 font-bold text-slate-700">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewNote.status !== "settled" && viewNote.status !== "rejected" && (
                <div className="border-2 border-dashed border-indigo-200 rounded-xl overflow-hidden">
                  <button onClick={() => setShowReplacement(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <FiUpload size={15} className="text-indigo-600" />
                      <span className="text-sm font-bold text-indigo-700">
                        {viewNote.replacementStatus === "partial" ? "Upload Remaining Replacement Challan" : "Upload Replacement Challan"}
                      </span>
                    </div>
                    <FiChevronDown size={15} className={`text-indigo-400 transition-transform ${showReplacement ? "rotate-180":""}`} />
                  </button>
                  {showReplacement && (
                    <div className="p-4">
                      <ReplacementUpload note={viewNote} currentUser={currentUser}
                        onDone={(newStatus, repStatus) => {
                          setViewNote(v => ({ ...v, status: newStatus, replacementStatus: repStatus }));
                          setShowReplacement(false);
                          fetchAll();
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {viewNote.remarks && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Remarks</p>
                  <p className="text-sm text-slate-700">{viewNote.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}