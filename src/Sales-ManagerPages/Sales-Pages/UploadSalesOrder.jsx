import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiRefreshCw, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import {
  Card, CardHeader, BtnPrimary, BtnSecondary,
  Alert, FileUpload,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import * as XLSX from "xlsx";

// ── Unit detector ─────────────────────────────────────────────────────────────
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

// ── Step Bar ──────────────────────────────────────────────────────────────────
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

// ── Header Info Grid ──────────────────────────────────────────────────────────
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

// ── Stock Badge ───────────────────────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
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

  // ── Helper: safe get cell value ───────────────────────────────────────────
  const getCell = (raw, rowIdx, colIdx) => {
    const row = raw[rowIdx];
    if (!row) return "";
    const val = row[colIdx];
    return val !== null && val !== undefined ? String(val).trim() : "";
  };

  // ── Find value in column after keyword row ────────────────────────────────
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

  // ── Parse Excel ───────────────────────────────────────────────────────────
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

        // ── Find table header row ──────────────────────────────────────────
        let tableHeaderRow = -1;
        for (let i = 0; i < raw.length; i++) {
          const row = raw[i];
          if (!row) continue;
          const rowStr = row.map((c) => String(c || "").toLowerCase()).join(" ");
          if (rowStr.includes("description of goods") ||
             (rowStr.includes("sl") && rowStr.includes("quantity"))) {
            tableHeaderRow = i;
            break;
          }
        }
        if (tableHeaderRow === -1) {
          throw new Error("Could not find item table in Excel. Please check the format.");
        }

        // ── Find consignee + buyer names ───────────────────────────────────
        let consigneeName = "";
        let buyerName     = "";
        for (let i = 0; i < raw.length; i++) {
          const row = raw[i];
          if (!row) continue;
          const first = String(row[0] || "").toLowerCase();
          if (first.includes("consignee") && first.includes("ship")) {
            for (let j = i + 1; j < Math.min(i + 5, raw.length); j++) {
              const v = String(raw[j]?.[0] || "").trim();
              if (v && !v.toLowerCase().includes("gstin") && !v.toLowerCase().includes("state")) {
                consigneeName = v; break;
              }
            }
          }
          if (first.includes("buyer") && first.includes("bill")) {
            for (let j = i + 1; j < Math.min(i + 5, raw.length); j++) {
              const v = String(raw[j]?.[0] || "").trim();
              if (v && !v.toLowerCase().includes("gstin") && !v.toLowerCase().includes("state")) {
                buyerName = v; break;
              }
            }
          }
        }

        // ── Detect item table columns ──────────────────────────────────────
        const thRow = raw[tableHeaderRow];
        let descCol = -1, hsnCol = -1, partCol = -1, qtyCol = -1;
        thRow.forEach((cell, colIdx) => {
          const v = String(cell || "").toLowerCase();
          if (v.includes("description"))               descCol = colIdx;
          if (v.includes("hsn"))                       hsnCol  = colIdx;
          if (v.includes("part"))                      partCol = colIdx;
          if (v.includes("qty") || v.includes("quantity")) qtyCol = colIdx;
        });

        // ── Parse items ────────────────────────────────────────────────────
        const parsedItems = [];
        for (let i = tableHeaderRow + 2; i < raw.length; i++) {
          const row = raw[i];
          if (!row) break;
          const slNo = row[0];
          if (slNo === null || slNo === undefined || slNo === "") break;
          if (isNaN(Number(slNo))) break;

          const description = String(row[descCol] || "").trim();
          const productCode = partCol >= 0 ? String(row[partCol] || "").trim() : "";
          const quantity    = qtyCol  >= 0 ? parseFloat(row[qtyCol]  || 0)     : 0;
          const hsnSac      = hsnCol  >= 0 ? String(row[hsnCol]  || "").trim() : "";
          if (!description) continue;

          parsedItems.push({
            slNo:        Number(slNo),
            description,
            productCode,
            quantity,
            hsnSac,
            unit: detectUnit(description, productCode),
          });
        }

        if (parsedItems.length === 0) {
          throw new Error("No items found in Excel. Please check the format.");
        }

        // ── Build header ───────────────────────────────────────────────────
        // Address: Row 4 + Row 5 (skip company name, MSME rows)
        const address = [getCell(raw, 3, 0), getCell(raw, 4, 0), getCell(raw, 5, 0)]
          .filter((v) => v && !v.toUpperCase().includes("MSME") && !v.includes("FIB 2 FAB"))
          .join(", ");

        // State: find "State Name :" row in col0
        let state = "";
        for (let i = 0; i < raw.length; i++) {
          const col0 = String(raw[i]?.[0] || "").trim();
          if (col0.toLowerCase().startsWith("state name")) {
            state = col0.replace(/^state name\s*:?\s*/i, "").trim()
              || String(raw[i]?.[2] || "").trim();
            break;
          }
        }

        // Email: find "E-Mail :" row in col0
        let email = "";
        for (let i = 0; i < raw.length; i++) {
          const col0 = String(raw[i]?.[0] || "").trim();
          if (col0.toLowerCase().includes("e-mail") || col0.toLowerCase().includes("email")) {
            email = col0.replace(/^e-mail\s*:\s*/i, "").trim();
            break;
          }
        }

        // MSME: find "MSME NO:" row in col0
        let msme = "";
        for (let i = 0; i < raw.length; i++) {
          const col0 = String(raw[i]?.[0] || "").trim();
          if (col0.toUpperCase().includes("MSME")) {
            msme = col0.replace(/^MSME\s*NO\s*:?\s*/i, "").trim();
            break;
          }
        }

        // GSTIN: find row with col0 === "GSTIN/UIN:" and value in col3
        let gstin = "";
        for (let i = 0; i < raw.length; i++) {
          const col0 = String(raw[i]?.[0] || "").trim().toLowerCase();
          if (col0 === "gstin/uin:" || col0 === "gstin:") {
            const val = String(raw[i]?.[3] || "").trim();
            if (val && val.length >= 10) { gstin = val; break; }
          }
        }

        const parsedHeader = {
          address,
          consignee:    consigneeName,
          buyer:        buyerName,
          reference:    findAfter(raw, 6, "buyer"),
          dated:        findAfter(raw, 8, "dated"),
          paymentTerms: findAfter(raw, 8, "mode") || findAfter(raw, 8, "terms of payment"),
          destination:  findAfter(raw, 8, "destination"),
          voucherNo:    findAfter(raw, 6, "voucher no"),
          gstin,
          state,
          email,
          msme,
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

  // ── Stock Check ───────────────────────────────────────────────────────────
  const checkStock = async (parsedItems) => {
    setChecking(true);
    try {
      const results = [];
      for (const item of parsedItems) {
        if (!item.productCode) {
          results.push({ ...item, available: 0, status: "unknown" });
          continue;
        }
        const q    = query(collection(db, "stock"), where("productCode", "==", item.productCode));
        const snap = await getDocs(q);
        let available = 0;
        if (!snap.empty) {
          const d = snap.docs[0].data();
          available = d.currentStock || d.quantity || 0;
        }
        const status =
          available === 0           ? "out"       :
          available < item.quantity ? "partial"   : "sufficient";
        results.push({ ...item, available, status });
      }
      setStockCheck(results);
    } catch (err) {
      console.error("Stock check error:", err);
    } finally {
      setChecking(false);
    }
  };

  // ── Save to Firebase ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    setUploading(true);
    try {
      const hasShortage = stockCheck.some((i) => i.status === "out" || i.status === "partial");
      await addDoc(collection(db, "excelupload"), {
        type:        "SALES_ORDER",
        excelHeader: header,
        items: items.map((item) => {
          const sc = stockCheck.find((s) => s.productCode === item.productCode);
          return {
            ...item,
            orderedQty:   item.quantity,
            availableQty: sc?.available || 0,
            stockStatus:  sc?.status    || "unknown",
            itemStatus:   "pending",
          };
        }),
        totalItems:  items.length,
        orderStatus: "pending",
        hasShortage,
        customer:    header.consignee || header.buyer || "",
        createdAt:   new Date().toISOString(),
        woNumber:    header.voucherNo || "",
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

  const resetAll = () => {
    setStep(1); setExcelFile(null);
    setItems([]); setHeader(null); setStockCheck([]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Upload Sales Order</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload Excel → Stock auto-reserved</p>
        </div>
        <BtnSecondary onClick={() => navigate("/sales/orders")}>Cancel</BtnSecondary>
      </div>

      {/* Steps */}
      <StepBar step={step} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <Card>
          <CardHeader title="Upload Excel File" subtitle="Sales Order Excel (Tally format)" />
          <div className="p-6 space-y-4">
            <FileUpload
              label="Select Excel File"
              accept=".xlsx,.xls"
              file={excelFile}
              onChange={handleFileChange}
            />
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
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  Columns: Sl | Description | HSN/SAC | Part No. | Quantity
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Step 2: Review ── */}
      {step === 2 && header && (
        <div className="space-y-6">

          {/* Shortage Alert */}
          {(shortageCount > 0 || partialCount > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <FiAlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-800">Stock Shortage Detected</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {shortageCount > 0 && `${shortageCount} items out of stock`}
                  {shortageCount > 0 && partialCount > 0 && " · "}
                  {partialCount  > 0 && `${partialCount} items partially available`}
                </p>
              </div>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-indigo-600">
              <h3 className="font-bold text-white text-base">SALES ORDER</h3>
              <p className="text-indigo-200 text-xs mt-0.5">{items.length} items found</p>
            </div>
            <div className="px-6 pt-5 pb-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                Header Information
              </p>
            </div>
            <HeaderGrid header={header} />
          </div>

          {/* Items Table */}
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
                        sc?.status === "out"     ? "bg-red-50/30"    :
                        sc?.status === "partial" ? "bg-yellow-50/30" : ""
                      }`}>
                        <td className="px-4 py-3 text-xs text-slate-400 font-semibold">{item.slNo}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            {item.productCode || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">{item.description}</td>
                        <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">{item.hsnSac || "—"}</td>
                        <td className="px-4 py-3 text-center font-black text-slate-800">{item.quantity}</td>
                        <td className="px-4 py-3 text-center text-xs text-slate-400 uppercase">{item.unit}</td>
                        <td className="px-4 py-3 text-center font-bold">
                          {checking ? (
                            <span className="text-slate-300 text-xs">—</span>
                          ) : (
                            <span className={
                              sc?.status === "out"     ? "text-red-600"    :
                              sc?.status === "partial" ? "text-yellow-600" : "text-green-600"
                            }>
                              {sc?.available ?? "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!checking && sc && <StockBadge status={sc.status} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs">
                {shortageCount > 0 ? (
                  <span className="text-red-600 font-bold">
                    ⚠ {shortageCount} shortage items — order can still be created
                  </span>
                ) : (
                  <span className="text-green-600 font-bold">✓ Stock levels verified</span>
                )}
              </p>
              <div className="flex gap-3">
                <BtnSecondary onClick={resetAll}>← Back</BtnSecondary>
                <BtnPrimary onClick={handleCreate} disabled={uploading}>
                  {uploading ? "Saving..." : "Create Sales Order →"}
                </BtnPrimary>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">
              Sales Order Created Successfully!
            </h3>
            <div className="space-y-1.5 text-sm text-slate-600 mb-8">
              <p>✅ {items.length} items saved to Firebase</p>
              <p>✅ Customer: <strong>{header?.consignee || header?.buyer || "—"}</strong></p>
              <p>✅ Voucher No: <strong>{header?.voucherNo || "—"}</strong></p>
              {shortageCount > 0 && (
                <p className="text-amber-600 font-semibold">
                  ⚠ {shortageCount} items have stock shortage
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <BtnSecondary onClick={resetAll}>Upload Another</BtnSecondary>
              <BtnPrimary onClick={() => navigate("/sales/orders")}>
                View Sales Orders
              </BtnPrimary>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}