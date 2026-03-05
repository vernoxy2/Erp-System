import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiCheck, FiRefreshCw } from "react-icons/fi";
import {
  Card, CardHeader, BtnPrimary, BtnSecondary,
  Alert, FileUpload,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import {
  collection, addDoc, doc, getDoc, updateDoc, arrayUnion,
} from "firebase/firestore";
import * as XLSX from "xlsx";

function detectUnit(description, productCode) {
  const desc = (description || "").toLowerCase();
  const part = (productCode || "").toLowerCase();
  if (desc.includes("pipe") || part.includes("pipe")) return "mtr";
  if (desc.includes("cable") || desc.includes("wire")) return "mtr";
  if (desc.includes("rod")   || desc.includes("bar"))  return "mtr";
  if (desc.includes("sheet") || desc.includes("plate")) return "sqm";
  return "nos";
}

// ── Edit Mode Page ─────────────────────────────────────────────────────────────
function EditPOPage({ poId, onDone }) {
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [excelHeader, setExcelHeader] = useState(null);
  const [items, setItems]             = useState([]);
  const [originalItems, setOriginalItems] = useState([]);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const snap = await getDoc(doc(db, "excelupload", poId));
        if (snap.exists()) {
          const data = snap.data();
          setExcelHeader(data.excelHeader || null);
          const mapped = (data.items || []).map((item) => ({
            ...item,
            quantity: item.orderedQty ?? item.quantity ?? 0,
          }));
          setItems(mapped);
          setOriginalItems(
            (data.items || []).map((item) => ({
              productCode: item.productCode,
              originalQty: item.orderedQty ?? item.quantity ?? 0,
            }))
          );
        } else {
          alert("PO not found.");
          navigate("/sales/purchase-orders");
        }
      } catch (err) {
        alert("Error loading PO: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [poId]);

  const handleQtyChange = (idx, val) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, quantity: parseFloat(val) || 0 } : item
      )
    );
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      // Track which quantities changed
      const changes = items
        .map((item) => {
          const orig = originalItems.find((o) => o.productCode === item.productCode);
          const oldQty = orig ? orig.originalQty : item.quantity;
          const newQty = item.quantity;
          return oldQty !== newQty
            ? { productCode: item.productCode, oldQty, newQty }
            : null;
        })
        .filter(Boolean);

      await updateDoc(doc(db, "excelupload", poId), {
        items: items.map((item) => ({
          ...item,
          orderedQty: item.quantity,
          itemStatus: item.itemStatus || "ordered",
        })),
        totalItems: items.length,
        updatedAt: new Date().toISOString(),
        editHistory: arrayUnion({
          editedAt: new Date().toISOString(),
          changes: changes.length > 0 ? changes : [{ note: "No qty change" }],
        }),
      });

      navigate(`/sales/upload-vendor-invoice?poId=${poId}`);
    } catch (err) {
      alert("Error updating: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiRefreshCw size={28} className="animate-spin mx-auto text-indigo-500 mb-3"/>
          <p className="text-sm font-bold text-slate-500">Loading Purchase Order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Edit Purchase Order</h2>
          <p className="text-xs text-slate-400 mt-0.5">Only quantities can be modified</p>
        </div>
        <BtnSecondary onClick={() => navigate("/sales/purchase-orders")}>
          Cancel
        </BtnSecondary>
      </div>

      {/* Header Information */}
      {excelHeader && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-indigo-600">
            <h3 className="font-bold text-white text-base">PURCHASE ORDER</h3>
            <p className="text-indigo-200 text-xs mt-0.5">{items.length} items</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-4">
              Header Information
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "COMPANYNAME", val: excelHeader.companyName },
                { label: "ADDRESS",     val: excelHeader.address },
                { label: "GSTIN",       val: excelHeader.gstin },
                { label: "STATE",       val: excelHeader.state },
                { label: "EMAIL",       val: excelHeader.email },
                { label: "VOUCHERNO",   val: excelHeader.voucherNo },
                { label: "DATED",       val: excelHeader.dated },
                { label: "PAYMENTTERMS",val: excelHeader.paymentTerms },
                { label: "CONSIGNEE",   val: excelHeader.consignee },
                { label: "REFERENCE",   val: excelHeader.reference },
              ]
                .filter((f) => f.val)
                .map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-400 uppercase font-semibold mb-1">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{val}</p>
                  </div>
                ))}
            </div>

            {/* Edit notice */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-bold text-amber-700">
                ✏️ Edit Mode — Only quantities can be modified below
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Items Table — Quantity editable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-black text-slate-800">Items Preview</p>
          <p className="text-xs text-slate-400 mt-0.5">{items.length} items — edit quantities below</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-4 py-3 text-left">Sl</th>
                <th className="px-4 py-3 text-left">Part No.</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-center">HSN/SAC</th>
                <th className="px-4 py-3 text-center">Quantity ✏️</th>
                <th className="px-4 py-3 text-center">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const orig = originalItems.find((o) => o.productCode === item.productCode);
                const changed = orig && orig.originalQty !== item.quantity;
                return (
                  <tr key={idx} className={`hover:bg-slate-50/60 transition-colors ${changed ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-3 text-xs text-slate-400 font-semibold">
                      {item.slNo || idx+1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.productCode || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.description}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">{item.hsnSac}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className="w-24 text-center border border-indigo-300 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {changed && orig && (
                          <span className="text-[10px] text-amber-600 font-bold">
                            was: {orig.originalQty}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400 uppercase">{item.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Bottom: Update PO button ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {items.filter((item) => {
              const orig = originalItems.find((o) => o.productCode === item.productCode);
              return orig && orig.originalQty !== item.quantity;
            }).length > 0
              ? `⚠️ ${items.filter((item) => {
                  const orig = originalItems.find((o) => o.productCode === item.productCode);
                  return orig && orig.originalQty !== item.quantity;
                }).length} quantities changed`
              : "No changes yet"
            }
          </p>
          <div className="flex gap-3">
            <BtnSecondary onClick={() => navigate("/sales/purchase-orders")}>
              ← Back
            </BtnSecondary>
            <BtnPrimary onClick={handleUpdate} disabled={saving}>
              {saving ? "Updating..." : "Update PO →"}
            </BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Mode (Upload new PO) ───────────────────────────────────────────────
export default function UploadPurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const poId       = searchParams.get("poId");
  const isEditMode = searchParams.get("editMode") === "true";

  // ── If edit mode → show EditPOPage directly ──
  if (isEditMode && poId) {
    return <EditPOPage poId={poId}/>;
  }

  // ── Create mode ──
  const [step, setStep]               = useState(1);
  const [excelFile, setExcelFile]     = useState(null);
  const [excelHeader, setExcelHeader] = useState(null);
  const [items, setItems]             = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [uploading, setUploading]     = useState(false);

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
          for (let row = 0; row <= Math.min(40, range.e.r); row++) {
            for (let col = 0; col <= range.e.c; col++) {
              const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
              if (cell && cell.v) {
                const val = String(cell.v).toLowerCase();
                for (const kw of keywords) {
                  if (val.includes(kw.toLowerCase())) {
                    const right = sheet[XLSX.utils.encode_cell({ r: row, c: col+1 })];
                    const below = sheet[XLSX.utils.encode_cell({ r: row+1, c: col })];
                    if (right && right.v) return String(right.v);
                    if (below && below.v) return String(below.v);
                  }
                }
              }
            }
          }
          return "";
        };

        const header = {
          companyName:  findVal(["FIB 2 FAB","FIB2FAB","fib2fab"]),
          address:      findVal(["FLOOR","TOWER","SURVEY"]),
          gstin:        findVal(["GSTIN/UIN","GSTIN"]),
          state:        findVal(["State Name","State"]),
          email:        findVal(["E-Mail","Email"]),
          voucherNo:    findVal(["Voucher No","Voucher"]),
          dated:        findVal(["Dated","Date"]),
          paymentTerms: findVal(["Mode/Terms","45 DAYS","DAYS","Payment"]),
          destination:  findVal(["Destination"]),
          consignee:    findVal(["Consignee","Ship to"]),
          buyer:        findVal(["Buyer","Bill to"]),
          reference:    findVal(["Reference","Order No","EVFN"]),
        };
        setExcelHeader(header);

        let tableStartRow = -1;
        for (let row = 0; row <= range.e.r; row++) {
          for (let col = 0; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
            if (cell && cell.v) {
              const val = String(cell.v).toLowerCase();
              if (val.includes("description of goods") || val==="sl" || val==="si" || val.includes("description")) {
                tableStartRow = row; break;
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

        let descCol=-1, hsnCol=-1, partCol=-1, qtyCol=-1;
        for (let col = 0; col <= range.e.c; col++) {
          const cell = sheet[XLSX.utils.encode_cell({ r: tableStartRow, c: col })];
          if (cell && cell.v) {
            const val = String(cell.v).toLowerCase();
            if (val.includes("description")) descCol = col;
            if (val.includes("hsn"))         hsnCol  = col;
            if (val.includes("part"))        partCol = col;
            if (val.includes("quantity"))    qtyCol  = col;
          }
        }

        const parsedItems = [];
        for (let row = tableStartRow+2; row <= range.e.r; row++) {
          const descCell = sheet[XLSX.utils.encode_cell({ r: row, c: descCol })];
          if (!descCell || !descCell.v) break;
          parsedItems.push({
            slNo:        sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]?.v || parsedItems.length+1,
            productCode: partCol>=0 ? sheet[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v||"" : "",
            description: String(descCell.v),
            quantity:    qtyCol>=0 ? parseFloat(sheet[XLSX.utils.encode_cell({ r: row, c: qtyCol })]?.v||0) : 0,
            unit:        detectUnit(String(descCell.v), partCol>=0 ? String(sheet[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v||"") : ""),
            hsnSac:      hsnCol>=0 ? sheet[XLSX.utils.encode_cell({ r: row, c: hsnCol })]?.v||"" : "",
            available:   0,
            status:      "ok",
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

  const handleCreate = async () => {
    setUploading(true);
    try {
      await addDoc(collection(db, "excelupload"), {
        excelHeader:  excelHeader || {},
        stockAlerts:  stockAlerts,
        totalItems:   items.length,
        hasShortage:  stockAlerts.length > 0,
        createdAt:    new Date().toISOString(),
        type:         "PO",
        poStatus:     "ordered",
        items: items.map((item) => ({
          ...item,
          orderedQty:       item.quantity,
          totalReceivedQty: 0,
          itemStatus:       "ordered",
        })),
      });
      setUploading(false);
      setStep(3);
    } catch (err) {
      console.error("Firebase save error:", err);
      setUploading(false);
      alert("Error saving: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Upload Purchase Order</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload Excel file to create purchase order</p>
        </div>
        <BtnSecondary onClick={() => navigate("/sales/purchase-orders")}>Cancel</BtnSecondary>
      </div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { num:1, label:"Upload Excel" },
            { num:2, label:"Review & Verify" },
            { num:3, label:"Confirmation" },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${step>=s.num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                  {step>s.num ? <FiCheck size={20}/> : s.num}
                </div>
                <p className={`text-xs font-bold ${step>=s.num ? "text-slate-800" : "text-slate-400"}`}>{s.label}</p>
              </div>
              {idx<2 && <div className={`flex-1 h-0.5 ${step>s.num ? "bg-indigo-600" : "bg-slate-200"}`}/>}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader title="Upload Excel File" subtitle="Purchase Order Excel"/>
          <div className="p-6 space-y-4">
            <FileUpload label="Select Excel File" accept=".xlsx,.xls" file={excelFile} onChange={handleFileUpload}/>
            {uploading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3"/>
                <p className="text-sm font-bold text-slate-600">Parsing Excel file...</p>
              </div>
            )}
            {!excelFile && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-bold text-blue-900 mb-2">📋 Supported Excel Format:</p>
                <p className="text-xs text-blue-700 font-mono">Sales Order / Purchase Order / Tax Invoice</p>
                <p className="text-xs text-blue-500 mt-1">Auto-detects: Header info + Item table</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="space-y-6">
          {excelHeader && (
            <Card>
              <div className="px-6 py-4 bg-indigo-600 rounded-t-xl">
                <h3 className="font-bold text-white text-base">PURCHASE ORDER</h3>
                <p className="text-indigo-200 text-xs">{items.length} items found</p>
              </div>
              <div className="p-6">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-4">Header Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:"COMPANYNAME",  val: excelHeader.companyName },
                    { label:"ADDRESS",      val: excelHeader.address },
                    { label:"GSTIN",        val: excelHeader.gstin },
                    { label:"STATE",        val: excelHeader.state },
                    { label:"EMAIL",        val: excelHeader.email },
                    { label:"DATED",        val: excelHeader.dated },
                    { label:"CONSIGNEE",    val: excelHeader.consignee },
                    { label:"REFERENCE",    val: excelHeader.reference },
                  ].filter((f)=>f.val).map(({ label, val }) => (
                    <div key={label} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-400 uppercase font-semibold mb-1">{label}</p>
                      <p className="text-sm font-medium text-slate-800">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {stockAlerts.length > 0 && (
            <Alert type="warning">
              <p className="font-bold">⚠️ Stock Shortage Detected:</p>
              {stockAlerts.map((a) => (
                <p key={a.productCode}>• {a.productCode}: Need {a.needed}, Available {a.available}</p>
              ))}
            </Alert>
          )}

          <Card>
            <CardHeader title="Items Preview" subtitle={`${items.length} items parsed from Excel`}/>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {["Sl","Part No.","Description","HSN/SAC","Quantity","Unit"].map((h) => (
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
                      <td className="px-4 py-3 font-bold text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-400 text-center">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <BtnSecondary onClick={() => setStep(1)}>← Back</BtnSecondary>
            <BtnPrimary onClick={handleCreate} disabled={uploading}>
              {uploading ? "Saving to Firebase..." : "Create Purchase Order →"}
            </BtnPrimary>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <FiCheck size={32} className="text-emerald-600"/>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Purchase Order Created Successfully!</h3>
            <div className="space-y-2 text-sm text-slate-600 mb-8">
              <p>✅ {items.length} items saved to Firebase</p>
              <p>✅ Header info saved</p>
              {stockAlerts.length > 0 && <p className="text-amber-600">⚠️ {stockAlerts.length} items have shortage</p>}
            </div>
            <div className="flex items-center justify-center gap-3">
              <BtnSecondary onClick={() => { setStep(1); setExcelFile(null); setItems([]); setExcelHeader(null); }}>
                Create Another
              </BtnSecondary>
              <BtnPrimary onClick={() => navigate("/sales/purchase-orders")}>View Records</BtnPrimary>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}