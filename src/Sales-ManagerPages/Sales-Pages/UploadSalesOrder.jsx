import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiClock, FiShield } from "react-icons/fi";
import {
  Card, CardHeader, BtnPrimary, BtnSecondary,
  Alert, FileUpload,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
// import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

function detectUnit(description = "", productCode = "") {
  const d = description.toLowerCase();
  const p = productCode.toLowerCase();
  if (d.includes("pipe") || p.includes("pipe") || p.startsWith("ppr") || p.startsWith("pch") || p.startsWith("pcr"))
    return "mtr";
  if (d.includes("cable") || d.includes("wire") || d.includes("rod") || d.includes("bar"))
    return "mtr";
  if (d.includes("sheet") || d.includes("plate")) return "sqm";
  return "nos";
}

function StepBar({ step }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {[
          { num: 1, label: "Upload Excel" },
          { num: 2, label: "Review & Verify" },
          { num: 3, label: "Confirmation" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                ${step >= s.num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                {step > s.num ? <FiCheck size={20} /> : s.num}
              </div>
              <p className={`text-xs font-bold ${step >= s.num ? "text-slate-800" : "text-slate-400"}`}>
                {s.label}
              </p>
            </div>
            {idx < 2 && (
              <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? "bg-indigo-600" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}

function HeaderGrid({ header }) {
  const fields = [
    { label: "ADDRESS",       val: header.address      },
    { label: "CONSIGNEE",     val: header.consignee    },
    { label: "BUYER",         val: header.buyer        },
    { label: "REFERENCE",     val: header.reference    },
    { label: "DATED",         val: header.dated        },
    { label: "GSTIN",         val: header.gstin        },
    { label: "DESTINATION",   val: header.destination  },
    { label: "PAYMENT TERMS", val: header.paymentTerms },
    { label: "VOUCHER NO",    val: header.voucherNo    },
    { label: "STATE",         val: header.state        },
    { label: "EMAIL",         val: header.email        },
    { label: "MSME NO",       val: header.msme         },
  ].filter((f) => f.val && f.val.trim() !== "");

  return (
    <div className="grid grid-cols-2 gap-3 p-6">
      {fields.map(({ label, val }) => (
        <div key={label} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">{label}</p>
          <p className="text-sm font-medium text-slate-800">{val}</p>
        </div>
      ))}
    </div>
  );
}

function StockBadge({ status }) {
  const map = {
    sufficient: { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  label: "✓ Sufficient"   },
    partial:    { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "⚠ Partial"      },
    out:        { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    label: "✗ Out of Stock" },
    unknown:    { bg: "bg-slate-50",  text: "text-slate-500",  border: "border-slate-200",  label: "—"              },
  };
  const s = map[status] || map.unknown;
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

export default function UploadSalesOrder() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(1);
  const [excelFile, setExcelFile]   = useState(null);
  const [header, setHeader]         = useState(null);
  const [items, setItems]           = useState([]);
  const [stockCheck, setStockCheck] = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [checking, setChecking]     = useState(false);
  const [parseError, setParseError] = useState("");

  const getCell = (raw, rowIdx, colIdx) => {
    const row = raw[rowIdx];
    if (!row) return "";
    const val = row[colIdx];
    return val !== null && val !== undefined ? String(val).trim() : "";
  };

  const findAfter = (raw, colIdx, keyword) => {
    for (let i = 0; i < raw.length; i++) {
      const row = raw[i];
      if (!row) continue;
      const cell = String(row[colIdx] || "").toLowerCase();
      if (cell.includes(keyword.toLowerCase())) {
        return String(raw[i + 1]?.[colIdx] || "").trim();
      }
    }
    return "";
  };

  const parseExcel = (file) => {
    setUploading(true);
    setParseError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const ws       = workbook.Sheets[workbook.SheetNames[0]];
        const raw      = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

        let tableHeaderRow = -1;
        for (let i = 0; i < raw.length; i++) {
          const row = raw[i];
          if (!row) continue;
          const rowStr = row.map((c) => String(c || "").toLowerCase()).join(" ");
          if (rowStr.includes("description of goods") ||
             (rowStr.includes("sl") && rowStr.includes("quantity"))) {
            tableHeaderRow = i; break;
          }
        }
        if (tableHeaderRow === -1) throw new Error("Could not find item table in Excel. Please check the format.");

        let consigneeName = "", buyerName = "";
        for (let i = 0; i < raw.length; i++) {
          const row = raw[i];
          if (!row) continue;
          const first = String(row[0] || "").toLowerCase();
          if (first.includes("consignee") && first.includes("ship")) {
            for (let j = i + 1; j < Math.min(i + 5, raw.length); j++) {
              const v = String(raw[j]?.[0] || "").trim();
              if (v && !v.toLowerCase().includes("gstin") && !v.toLowerCase().includes("state")) { consigneeName = v; break; }
            }
          }
          if (first.includes("buyer") && first.includes("bill")) {
            for (let j = i + 1; j < Math.min(i + 5, raw.length); j++) {
              const v = String(raw[j]?.[0] || "").trim();
              if (v && !v.toLowerCase().includes("gstin") && !v.toLowerCase().includes("state")) { buyerName = v; break; }
            }
          }
        }

        const thRow = raw[tableHeaderRow];
        let descCol = -1, hsnCol = -1, partCol = -1, qtyCol = -1;
        thRow.forEach((cell, colIdx) => {
          const v = String(cell || "").toLowerCase();
          if (v.includes("description"))                   descCol = colIdx;
          if (v.includes("hsn"))                           hsnCol  = colIdx;
          if (v.includes("part"))                          partCol = colIdx;
          if (v.includes("qty") || v.includes("quantity")) qtyCol  = colIdx;
        });

        const parsedItems = [];
        for (let i = tableHeaderRow + 2; i < raw.length; i++) {
          const row = raw[i];
          if (!row) break;
          const slNo = row[0];
          if (slNo === null || slNo === undefined || slNo === "") break;
          if (isNaN(Number(slNo))) break;
          const description = String(row[descCol] || "").trim();
          const productCode = partCol >= 0 ? String(row[partCol] || "").trim() : "";
          const quantity    = qtyCol  >= 0 ? parseFloat(row[qtyCol] || 0) : 0;
          const hsnSac      = hsnCol  >= 0 ? String(row[hsnCol] || "").trim() : "";
          if (!description) continue;
          parsedItems.push({ slNo: Number(slNo), description, productCode, quantity, hsnSac, unit: detectUnit(description, productCode) });
        }

        if (parsedItems.length === 0) throw new Error("No items found in Excel. Please check the format.");

        const address = [getCell(raw, 3, 0), getCell(raw, 4, 0), getCell(raw, 5, 0)]
          .filter((v) => v && !v.toUpperCase().includes("MSME") && !v.includes("FIB 2 FAB")).join(", ");

        let state = "";
        for (let i = 0; i < raw.length; i++) {
          const col0 = String(raw[i]?.[0] || "").trim();
          if (col0.toLowerCase().startsWith("state name")) { state = col0.replace(/^state name\s*:?\s*/i, "").trim() || String(raw[i]?.[2] || "").trim(); break; }
        }
        let email = "";
        for (let i = 0; i < raw.length; i++) {
          const col0 = String(raw[i]?.[0] || "").trim();
          if (col0.toLowerCase().includes("e-mail") || col0.toLowerCase().includes("email")) { email = col0.replace(/^e-mail\s*:\s*/i, "").trim(); break; }
        }
        let msme = "";
        for (let i = 0; i < raw.length; i++) {
          const col0 = String(raw[i]?.[0] || "").trim();
          if (col0.toUpperCase().includes("MSME")) { msme = col0.replace(/^MSME\s*NO\s*:?\s*/i, "").trim(); break; }
        }
        let gstin = "";
        for (let i = 0; i < raw.length; i++) {
          const col0 = String(raw[i]?.[0] || "").trim().toLowerCase();
          if (col0 === "gstin/uin:" || col0 === "gstin:") { const val = String(raw[i]?.[3] || "").trim(); if (val && val.length >= 10) { gstin = val; break; } }
        }

        const parsedHeader = {
          address, consignee: consigneeName, buyer: buyerName,
          reference: findAfter(raw, 6, "buyer"), dated: findAfter(raw, 8, "dated"),
          paymentTerms: findAfter(raw, 8, "mode") || findAfter(raw, 8, "terms of payment"),
          destination: findAfter(raw, 8, "destination"), voucherNo: findAfter(raw, 6, "voucher no"),
          gstin, state, email, msme,
        };

        setHeader(parsedHeader);
        setItems(parsedItems);
        setUploading(false);
        setStep(2);
        checkStock(parsedItems);
      } catch (err) {
        console.error("Parse error:", err);
        setParseError(err.message || "Error parsing Excel.");
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);
    parseExcel(file);
  };

  const checkStock = async (parsedItems) => {
    setChecking(true);
    try {
      const results = [];
      for (const item of parsedItems) {
        if (!item.productCode) { results.push({ ...item, available: 0, status: "unknown" }); continue; }
        const q    = query(collection(db, "stock"), where("productCode", "==", item.productCode));
        const snap = await getDocs(q);
        let available = 0;
        if (!snap.empty) { const d = snap.docs[0].data(); available = d.available || d.currentStock || d.quantity || 0; }
        const status = available === 0 ? "out" : available < item.quantity ? "partial" : "sufficient";
        results.push({ ...item, available, status });
      }
      setStockCheck(results);
    } catch (err) {
      console.error("Stock check error:", err);
    } finally {
      setChecking(false);
    }
  };
  // const handleCreate = async () => {
  //   setUploading(true);
  //   try {
  //     const hasShortage = stockCheck.some((i) => i.status === "out" || i.status === "partial");
  //     const customer    = header.consignee || header.buyer || "";
  //     const soNumber    = header.voucherNo || "";

  //     await addDoc(collection(db, "excelupload"), {
  //       type:         "so",                  // ✅ isSalesOrder() filter match thase
  //       soStatus:     "waiting_for_qc",      // ✅ Store QC list ma show thase
  //       excelHeader:  header,
  //       items: items.map((item) => {
  //         const sc = stockCheck.find((s) => s.productCode === item.productCode);
  //         return {
  //           ...item,
  //           orderedQty:   item.quantity,
  //           invoicedQty:  0,
  //           availableQty: sc?.available || 0,
  //           stockStatus:  sc?.status    || "unknown",
  //           itemStatus:   "pending",
  //         };
  //       }),
  //       totalItems:   items.length,
  //       orderStatus:  "pending",
  //       hasShortage,
  //       customer,
  //       createdAt:    new Date().toISOString(),
  //       woNumber:     soNumber,
  //       invoiceCount: 0,
  //       invoiceNos:   [],
  //     });

  //     setUploading(false);
  //     setStep(3);
  //   } catch (err) {
  //     alert("Error saving: " + err.message);
  //     setUploading(false);
  //   }
  // };


  const handleCreate = async () => {
    setUploading(true);
    try {
      const hasShortage = stockCheck.some((i) => i.status === "out" || i.status === "partial");
      const customer    = header.consignee || header.buyer || "";
      const soRef       = header.voucherNo || header.reference || "";

      if (soRef) {
        // ── Overwrite Logic ──
        const q = query(
          collection(db, "excelupload"),
          where("type", "==", "so"),
          where("excelHeader.voucherNo", "==", soRef)
        );
        const snap = await getDocs(q);

        for (const oldDoc of snap.docs) {
          const data = oldDoc.data();
          const existingStatus = data.soStatus || "";

          // If storeQcStatus is NOT "approved" (or equivalent finalized status), we overwrite
          if (
            existingStatus !== "approved" &&
            existingStatus !== "ready_for_dispatch" &&
            existingStatus !== "complete" &&
            existingStatus !== "dispatched"
          ) {
            console.log(`Overwriting SO ${soRef}: deleting old record ${oldDoc.id}`);
            await deleteDoc(doc(db, "excelupload", oldDoc.id));
          } else {
            // If it IS approved/finalized, we don't overwrite (per user requirement)
            console.log(`SO ${soRef} is already QC Approved/Processed. Adding as new entry.`);
          }
        }
      }

      // Create new document (fresh or replaced)
      await addDoc(collection(db, "excelupload"), {
        type:         "so",
        soStatus:     "waiting_for_qc",
        excelHeader:  header,
        items: items.map((item) => {
          const sc = stockCheck.find((s) => s.productCode === item.productCode);
          return {
            ...item,
            orderedQty:   item.quantity,
            invoicedQty:  0,
            availableQty: sc?.available || 0,
            stockStatus:  sc?.status    || "unknown",
            itemStatus:   "pending",
          };
        }),
        totalItems:   items.length,
        orderStatus:  "pending",
        hasShortage,
        customer,
        createdAt:    new Date().toISOString(),
        woNumber:     soRef,
        invoiceCount: 0,
        invoiceNos:   [],
      });

      setUploading(false);
      setStep(3);
    } catch (err) {
      alert("Error saving: " + err.message);
      setUploading(false);
    }
  };
  const shortageCount = stockCheck.filter((i) => i.status === "out").length;
  const partialCount  = stockCheck.filter((i) => i.status === "partial").length;

  const resetAll = () => { setStep(1); setExcelFile(null); setItems([]); setHeader(null); setStockCheck([]); };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Upload Sales Order</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload Excel → Sent for Store QC Approval</p>
        </div>
        <BtnSecondary onClick={() => navigate("/sales/orders")}>Cancel</BtnSecondary>
      </div>

      <StepBar step={step} />

      {step === 1 && (
        <Card>
          <CardHeader title="Upload Excel File" subtitle="Sales Order Excel (Tally format)" />
          <div className="p-6 space-y-4">
            <FileUpload label="Select Excel File" accept=".xlsx,.xls" file={excelFile} onChange={handleFileChange} />
            {uploading && (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">Parsing Excel file...</p>
              </div>
            )}
            {parseError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-bold">⚠ {parseError}</p>
              </div>
            )}
            {!excelFile && !uploading && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-bold text-blue-900 mb-2">📋 Expected Excel Format:</p>
                <p className="text-xs text-blue-700">Tally Sales Order with Header + Items table</p>
                <p className="text-xs text-slate-400 mt-2 font-mono">Columns: Sl | Description | HSN/SAC | Part No. | Quantity</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {step === 2 && header && (
        <div className="space-y-6">
          {(shortageCount > 0 || partialCount > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
              <FiAlertTriangle size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-yellow-800">Low Stock Warning</p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  {shortageCount > 0 && `${shortageCount} items out of stock`}
                  {shortageCount > 0 && partialCount > 0 && " · "}
                  {partialCount  > 0 && `${partialCount} items partially available`}
                  {" — order can still be created"}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-indigo-600">
              <h3 className="font-bold text-white text-base">SALES ORDER</h3>
              <p className="text-indigo-200 text-xs mt-0.5">{items.length} items found</p>
            </div>
            <div className="px-6 pt-5 pb-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Header Information</p>
            </div>
            <HeaderGrid header={header} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">Items Preview</p>
                <p className="text-xs text-slate-400 mt-0.5">{items.length} items parsed from Excel</p>
              </div>
              {checking && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FiRefreshCw size={12} className="animate-spin" /> Checking stock...
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3 text-left w-10">Sl</th>
                    <th className="px-4 py-3 text-left">Part No.</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-center">HSN/SAC</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-center">Unit</th>
                    <th className="px-4 py-3 text-center">Available</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item, idx) => {
                    const sc = stockCheck.find((s) => s.productCode === item.productCode);
                    return (
                      <tr key={idx} className={`hover:bg-slate-50/60 transition-colors ${
                        sc?.status === "out" ? "bg-red-50/30" : sc?.status === "partial" ? "bg-yellow-50/30" : ""
                      }`}>
                        <td className="px-4 py-3 text-xs text-slate-400 font-semibold">{item.slNo}</td>
                        <td className="px-4 py-3"><span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{item.productCode || "—"}</span></td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">{item.description}</td>
                        <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">{item.hsnSac || "—"}</td>
                        <td className="px-4 py-3 text-center font-black text-slate-800">{item.quantity}</td>
                        <td className="px-4 py-3 text-center text-xs text-slate-400 uppercase">{item.unit}</td>
                        <td className="px-4 py-3 text-center font-bold">
                          {checking ? <span className="text-slate-300 text-xs">—</span> : (
                            <span className={sc?.status === "out" ? "text-red-600" : sc?.status === "partial" ? "text-yellow-600" : "text-green-600"}>
                              {sc?.available ?? "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{!checking && sc && <StockBadge status={sc.status} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs text-slate-500">SO will be sent to Store for QC approval after creation</p>
              <div className="flex gap-3">
                <BtnSecondary onClick={resetAll}>← Back</BtnSecondary>
                <BtnPrimary onClick={handleCreate} disabled={uploading}>
                  {uploading ? "Saving..." : "Create & Send for QC →"}
                </BtnPrimary>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Waiting for Store QC Approval ── */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Steps bar — 4 steps */}
          <Card className="p-5">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { num: 1, label: "Create SO" },
                { num: 2, label: "Review Items" },
                { num: 3, label: "QC Approval" },
                { num: 4, label: "Dispatch" },
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      s.num < 3 ? "bg-indigo-600 text-white"
                      : s.num === 3 ? "bg-violet-600 text-white ring-4 ring-violet-100"
                      : "bg-slate-200 text-slate-400"
                    }`}>
                      {s.num < 3 ? <FiCheck size={16} /> : s.num === 3 ? <FiClock size={15} /> : s.num}
                    </div>
                    <p className={`text-[10px] font-bold whitespace-nowrap ${s.num <= 3 ? "text-slate-700" : "text-slate-400"}`}>
                      {s.label}
                    </p>
                  </div>
                  {idx < 3 && (
                    <div className={`flex-1 h-0.5 mx-1 ${s.num < 3 ? "bg-indigo-600" : "bg-slate-200"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </Card>

          {/* Main waiting card */}
          <Card>
            <div className="p-10 text-center">
              {/* Animated shield */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-violet-100 animate-ping opacity-30" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center shadow-lg shadow-violet-100">
                  <FiShield size={40} className="text-violet-600" />
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-800 mb-2">
                Waiting for Store QC Approval
              </h3>
              <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
                The store team will verify stock availability and quality.
                This page will <strong>automatically unlock</strong> once they approve — no need to refresh.
              </p>

              {/* SO info chips */}
              <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">SO</span>
                  <span className="text-xs font-black text-slate-800">{header?.voucherNo || "—"}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Customer</span>
                  <span className="text-xs font-black text-slate-800 max-w-[180px] truncate">{header?.consignee || header?.buyer || "—"}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Items</span>
                  <span className="text-xs font-black text-slate-800">{items.length}</span>
                </div>
              </div>

              {/* Progress checklist */}
              <div className="max-w-sm mx-auto text-left space-y-3 mb-8">
                {[
                  { done: true,    active: false, label: "Sales Order created",           sub: `${items.length} items · ${header?.voucherNo || ""}` },
                  { done: true,    active: false, label: "Store team notified for QC",    sub: "Notification sent to Store Manager" },
                  { done: false,   active: true,  label: "Store QC inspection in progress", sub: "Store team is verifying stock & quality" },
                  { done: false,   active: false, label: "QC Approved — Ready for Dispatch", sub: "Will appear in Ready for Dispatch" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                    item.active ? "bg-violet-50 border border-violet-200" : "bg-slate-50"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.done   ? "bg-emerald-500"
                      : item.active ? "bg-violet-500 animate-pulse"
                      : "bg-slate-200"
                    }`}>
                      {item.done
                        ? <FiCheck size={12} className="text-white" />
                        : item.active
                        ? <FiClock size={11} className="text-white" />
                        : <span className="w-2 h-2 rounded-full bg-slate-400" />
                      }
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${
                        item.done   ? "text-slate-700"
                        : item.active ? "text-violet-700"
                        : "text-slate-400"
                      }`}>{item.label}</p>
                      <p className={`text-[11px] mt-0.5 ${item.active ? "text-violet-500" : "text-slate-400"}`}>{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stock warning if any */}
              {shortageCount > 0 && (
                <div className="max-w-sm mx-auto mb-6 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <FiAlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    <strong>{shortageCount} items</strong> are currently low/out of stock.
                    Store QC will note shortage — items will be fulfilled when stock arrives.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <BtnSecondary onClick={resetAll}>Upload Another SO</BtnSecondary>
                <BtnPrimary onClick={() => navigate("/sales/sales-orders/List")}>
                  View Sales Orders →
                </BtnPrimary>
              </div>
            </div>
          </Card>

          {/* Info note */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-700 text-xs font-black">i</span>
            </div>
            <p className="text-xs text-blue-700">
              <strong>Store team</strong> will review and approve from their panel.
              Once they mark it <strong>Approved</strong>, the SO will automatically
              move to <strong>Ready for Dispatch</strong> — no need to refresh.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}