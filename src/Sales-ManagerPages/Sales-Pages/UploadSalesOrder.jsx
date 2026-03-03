import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck } from "react-icons/fi";
import {
  Card, CardHeader, BtnPrimary, BtnSecondary, Alert, FileUpload,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, query, where,
  updateDoc, doc, serverTimestamp, runTransaction,
} from "firebase/firestore";
import * as XLSX from "xlsx";

export default function UploadSalesOrder() {
  const navigate = useNavigate();
  const [step, setStep]               = useState(1);
  const [excelFile, setExcelFile]     = useState(null);
  const [excelHeader, setExcelHeader] = useState(null);
  const [items, setItems]             = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [savedSoId, setSavedSoId]     = useState(null);

  // ── Excel Parse ───────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data     = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const range    = XLSX.utils.decode_range(sheet["!ref"]);

        const findVal = (keywords) => {
          for (let r = 0; r <= Math.min(40, range.e.r); r++) {
            for (let c = 0; c <= range.e.c; c++) {
              const cell = sheet[XLSX.utils.encode_cell({ r, c })];
              if (cell?.v) {
                const val = String(cell.v).toLowerCase();
                for (const kw of keywords) {
                  if (val.includes(kw.toLowerCase())) {
                    const right = sheet[XLSX.utils.encode_cell({ r, c: c + 1 })];
                    const below = sheet[XLSX.utils.encode_cell({ r: r + 1, c })];
                    if (right?.v) return String(right.v);
                    if (below?.v) return String(below.v);
                  }
                }
              }
            }
          }
          return "";
        };

        const header = {
          companyName  : findVal(["FIB 2 FAB", "FIB2FAB"]),
          address      : findVal(["FLOOR", "TOWER", "SURVEY"]),
          gstin        : findVal(["GSTIN/UIN", "GSTIN"]),
          state        : findVal(["State Name", "State"]),
          email        : findVal(["E-Mail", "Email"]),
          voucherNo    : findVal(["Voucher No", "Voucher"]),
          dated        : findVal(["Dated", "Date"]),
          paymentTerms : findVal(["Mode/Terms", "45 DAYS", "DAYS", "Payment"]),
          destination  : findVal(["Destination"]),
          consignee    : findVal(["Consignee", "Ship to"]),
          buyer        : findVal(["Buyer", "Bill to"]),
          reference    : findVal(["Reference", "Order No", "EVFN"]),
        };
        setExcelHeader(header);

        // Find table start row
        let tableStartRow = -1;
        for (let r = 0; r <= range.e.r; r++) {
          for (let c = 0; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            if (cell?.v) {
              const val = String(cell.v).toLowerCase();
              if (val.includes("description of goods") || val === "sl" || val === "si" || val.includes("description")) {
                tableStartRow = r;
                break;
              }
            }
          }
          if (tableStartRow !== -1) break;
        }

        if (tableStartRow === -1) {
          alert("Table header not found.");
          setUploading(false);
          return;
        }

        let descCol = -1, hsnCol = -1, partCol = -1, qtyCol = -1;
        for (let c = 0; c <= range.e.c; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r: tableStartRow, c })];
          if (cell?.v) {
            const val = String(cell.v).toLowerCase();
            if (val.includes("description")) descCol = c;
            if (val.includes("hsn"))         hsnCol  = c;
            if (val.includes("part"))        partCol = c;
            if (val.includes("quantity"))    qtyCol  = c;
          }
        }

        const parsedItems = [];
        for (let r = tableStartRow + 2; r <= range.e.r; r++) {
          const descCell = sheet[XLSX.utils.encode_cell({ r, c: descCol })];
          if (!descCell?.v) break;
          parsedItems.push({
            slNo        : sheet[XLSX.utils.encode_cell({ r, c: 0 })]?.v || parsedItems.length + 1,
            productCode : partCol >= 0 ? sheet[XLSX.utils.encode_cell({ r, c: partCol })]?.v || "" : "",
            description : String(descCell.v),
            quantity    : qtyCol >= 0 ? parseFloat(sheet[XLSX.utils.encode_cell({ r, c: qtyCol })]?.v || 0) : 0,
            unit        : "pcs",
            hsnSac      : hsnCol >= 0 ? sheet[XLSX.utils.encode_cell({ r, c: hsnCol })]?.v || "" : "",
          });
        }

        setItems(parsedItems);
        setStockAlerts([]);
        setUploading(false);
        setStep(2);
      } catch (err) {
        console.error("Excel parse error:", err);
        setUploading(false);
        alert("Error parsing Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── ✅ Reserve Stock on SO Upload ─────────────────────────────────────────
  // available ↓  |  reserved ↑  |  ledger entry RESERVE
  const reserveStock = async (parsedItems, soNumber, customer) => {
    const alerts = [];
    const now    = new Date().toISOString();

    for (const item of parsedItems) {
      const qtyNeeded = Number(item.quantity || 0);
      if (!qtyNeeded) continue;

      const key = (item.productCode || "").toString().trim();
      const desc = (item.description || "").trim();
      if (!key && !desc) continue;

      try {
        // Find stock doc by productCode, fallback description
        let stockSnap = null;
        if (key) {
          const q = query(collection(db, "stock"), where("productCode", "==", key));
          const s = await getDocs(q);
          if (!s.empty) stockSnap = s.docs[0];
        }
        if (!stockSnap && desc) {
          const q = query(collection(db, "stock"), where("description", "==", desc));
          const s = await getDocs(q);
          if (!s.empty) stockSnap = s.docs[0];
        }

        if (!stockSnap) {
          // ── Stock item does not exist → create with negative available ──
          await addDoc(collection(db, "stock"), {
            productCode : key,
            description : desc,
            hsnSac      : item.hsnSac || "",
            unit        : item.unit || "pcs",
            available   : 0,
            reserved    : qtyNeeded,
            backorder   : qtyNeeded,   // fully backordered
            minLevel    : 0,
            ledger      : [{
              type    : "RESERVE",
              qty     : qtyNeeded,
              ref     : soNumber,
              by      : customer,
              balance : 0,
              date    : now,
              note    : `Backorder ${qtyNeeded} — no stock`,
            }],
            updatedAt   : now,
          });
          alerts.push({ productCode: key || desc, needed: qtyNeeded, available: 0, shortage: qtyNeeded });
          continue;
        }

        // ── Stock exists → atomic transaction ─────────────────────────────
        const stockRef = doc(db, "stock", stockSnap.id);
        await runTransaction(db, async (tx) => {
          const snap      = await tx.get(stockRef);
          const data      = snap.data();
          const available = data.available || 0;
          const canReserve   = Math.min(qtyNeeded, Math.max(0, available));
          const needBackorder = qtyNeeded - canReserve;

          const ledgerEntry = {
            type    : "RESERVE",
            qty     : canReserve,
            ref     : soNumber,
            by      : customer,
            balance : available - canReserve,
            date    : now,
            note    : needBackorder > 0
              ? `Reserved ${canReserve}, Backorder ${needBackorder}`
              : `Reserved ${canReserve} for SO`,
          };

          tx.update(stockRef, {
            available : available - canReserve,
            reserved  : (data.reserved  || 0) + canReserve,
            backorder : (data.backorder || 0) + needBackorder,
            ledger    : [...(data.ledger || []), ledgerEntry],
            updatedAt : now,
          });

          if (needBackorder > 0) {
            alerts.push({
              productCode : key || desc,
              needed      : qtyNeeded,
              available   : available,
              shortage    : needBackorder,
            });
          }
        });

      } catch (err) {
        console.error(`Reserve error for ${key || desc}:`, err);
        alerts.push({ productCode: key || desc, needed: qtyNeeded, available: 0, shortage: qtyNeeded });
      }
    }

    return alerts;
  };

  // ── Firebase Save + Stock Reserve ────────────────────────────────────────
  const handleSubmit = async () => {
    setUploading(true);
    try {
      const soNumber = excelHeader?.reference || `SO-${Date.now()}`;
      const customer = excelHeader?.consignee || excelHeader?.buyer || "Unknown";

      // ✅ Step 1: Reserve stock FIRST
      const alerts = await reserveStock(items, soNumber, customer);
      setStockAlerts(alerts);

      // ✅ Step 2: Save SO to Firestore
      const docRef = await addDoc(collection(db, "excelupload"), {
        woNumber     : soNumber,
        customer     : customer,
        deliveryDate : excelHeader?.dated || "",
        priority     : "Medium",
        notes        : "",
        excelHeader  : excelHeader || {},
        items        : items.map((item) => ({
          ...item,
          orderedQty  : item.quantity,
          invoicedQty : 0,
          itemStatus  : "reserved",
        })),
        soStatus      : "reserved",
        stockAlerts   : alerts,
        totalItems    : items.length,
        hasShortage   : alerts.length > 0,
        createdAt     : new Date().toISOString(),
        type          : "SALES_ORDER",
      });

      setSavedSoId(docRef.id);
      setUploading(false);
      setStep(3);
    } catch (err) {
      console.error("Save error:", err);
      setUploading(false);
      alert("Error saving: " + err.message);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Upload Sales Order</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload Excel → Stock auto-reserved</p>
        </div>
        <BtnSecondary onClick={() => navigate("/sales/sales-orders")}>Cancel</BtnSecondary>
      </div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[{ num: 1, label: "Upload Excel" }, { num: 2, label: "Review & Verify" }, { num: 3, label: "Confirmation" }].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${step >= s.num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                  {step > s.num ? <FiCheck size={20} /> : s.num}
                </div>
                <p className={`text-xs font-bold ${step >= s.num ? "text-slate-800" : "text-slate-400"}`}>{s.label}</p>
              </div>
              {idx < 2 && <div className={`flex-1 h-0.5 ${step > s.num ? "bg-indigo-600" : "bg-slate-200"}`} />}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <Card>
          <CardHeader title="Upload Excel File" subtitle="Sales Order Excel" />
          <div className="p-6 space-y-4">
            <FileUpload label="Select Excel File" accept=".xlsx,.xls" file={excelFile} onChange={handleFileUpload} />
            {uploading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">Parsing Excel file...</p>
              </div>
            )}
            {!excelFile && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-bold text-blue-900 mb-2">📋 Supported Excel Format:</p>
                <div className="text-xs text-blue-700 font-mono space-y-1">
                  <p>Sales Order / Purchase Order / Tax Invoice</p>
                  <p className="text-blue-500">Auto-detects: Header info + Item table</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── STEP 2: Review ── */}
      {step === 2 && (
        <div className="space-y-6">
          {excelHeader && (
            <Card>
              <div className="px-6 py-4 bg-indigo-600 rounded-t-xl">
                <h3 className="font-bold text-white text-base">SALES ORDER</h3>
                <p className="text-indigo-200 text-xs">{items.length} items found</p>
              </div>
              <div className="p-6">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-4">Header Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "CONSIGNEE",    val: excelHeader.consignee    },
                    { label: "BUYER",        val: excelHeader.buyer        },
                    { label: "REFERENCE",    val: excelHeader.reference    },
                    { label: "DATED",        val: excelHeader.dated        },
                    { label: "GSTIN",        val: excelHeader.gstin        },
                    { label: "DESTINATION",  val: excelHeader.destination  },
                    { label: "PAYMENT TERMS",val: excelHeader.paymentTerms },
                    { label: "VOUCHER NO",   val: excelHeader.voucherNo    },
                  ].filter(f => f.val).map(({ label, val }) => (
                    <div key={label} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-400 uppercase font-semibold mb-1">{label}</p>
                      <p className="text-sm font-medium text-slate-800">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ✅ Stock preview - show current stock before confirming */}
          <Card>
            <CardHeader
              title="Items Preview"
              subtitle={`${items.length} items — Stock will be reserved on confirm`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {["Sl", "Part No.", "Description", "HSN/SAC", "Qty to Reserve", "Unit"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{item.slNo}</td>
                      <td className="px-4 py-3 font-bold font-mono text-slate-800">{item.productCode}</td>
                      <td className="px-4 py-3 text-slate-600">{item.description}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.hsnSac}</td>
                      <td className="px-4 py-3 font-bold text-center text-indigo-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-400 text-center">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <BtnSecondary onClick={() => setStep(1)}>← Back</BtnSecondary>
            <BtnPrimary onClick={handleSubmit} disabled={uploading}>
              {uploading ? "Saving & Reserving Stock..." : "✅ Confirm & Reserve Stock →"}
            </BtnPrimary>
          </div>
        </div>
      )}

      {/* ── STEP 3: Confirmation ── */}
      {step === 3 && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <FiCheck size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Sales Order Created!</h3>
            <p className="text-sm text-slate-500 mb-6">
              {excelHeader?.reference} · {items.length} items
            </p>

            <div className="space-y-2 text-sm text-slate-600 mb-8 max-w-sm mx-auto text-left">
              <p>✅ SO saved to Firebase</p>
              <p>✅ Stock reserved for {items.length} items</p>
              <p className="text-xs text-slate-400 font-mono">
                Stock: available ↓ · reserved ↑ · ledger entry added
              </p>

              {/* ✅ Backorder / shortage warnings */}
              {stockAlerts.length > 0 && (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-orange-700 font-bold text-xs mb-2">
                    ⚠️ {stockAlerts.length} item(s) have stock shortage — backorder created:
                  </p>
                  {stockAlerts.map((a, i) => (
                    <p key={i} className="text-orange-600 text-xs">
                      • {a.productCode}: Need {a.needed}, Available {a.available} (Short: {a.shortage})
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <BtnSecondary onClick={() => { setStep(1); setExcelFile(null); setItems([]); setExcelHeader(null); setStockAlerts([]); }}>
                Upload Another
              </BtnSecondary>
              <BtnPrimary onClick={() => navigate("/sales/sales-orders")}>
                View Sales Orders
              </BtnPrimary>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}