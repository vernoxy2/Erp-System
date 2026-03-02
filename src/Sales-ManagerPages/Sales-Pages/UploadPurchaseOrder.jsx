import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiDownload } from "react-icons/fi";
import {
  Card,
  CardHeader,
  Input,
  Select,
  Textarea,
  BtnPrimary,
  BtnSecondary,
  Alert,
  Table,
  StatusBadge,
  FileUpload,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

function detectUnit(description, productCode) {
  const desc = (description || "").toLowerCase();
  const part = (productCode || "").toLowerCase();
  if (desc.includes("pipe") || part.includes("pipe")) return "mtr";
  if (desc.includes("cable") || desc.includes("wire")) return "mtr";
  if (desc.includes("rod") || desc.includes("bar")) return "mtr";
  if (desc.includes("sheet") || desc.includes("plate")) return "sqm";
  return "pcs";
}
export default function UploadPurchaseOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [excelFile, setExcelFile] = useState(null);
  const [workOrder, setWorkOrder] = useState({
    woNumber: "",
    customer: "",
    customerContact: "",
    customerPhone: "",
    deliveryDate: "",
    priority: "Medium",
    notes: "",
  });

  const [excelHeader, setExcelHeader] = useState(null);
  const [items, setItems] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        const findVal = (keywords) => {
          for (let row = 0; row <= Math.min(40, range.e.r); row++) {
            for (let col = 0; col <= range.e.c; col++) {
              const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
              if (cell && cell.v) {
                const val = String(cell.v).toLowerCase();
                for (const kw of keywords) {
                  if (val.includes(kw.toLowerCase())) {
                    const right =
                      sheet[XLSX.utils.encode_cell({ r: row, c: col + 1 })];
                    const below =
                      sheet[XLSX.utils.encode_cell({ r: row + 1, c: col })];
                    if (right && right.v) return String(right.v);
                    if (below && below.v) return String(below.v);
                  }
                }
              }
            }
          }
          return "";
        };

        // ── Header info extract ──
        const header = {
          companyName: findVal(["FIB 2 FAB", "FIB2FAB", "fib2fab"]),
          address: findVal(["FLOOR", "TOWER", "SURVEY"]),
          gstin: findVal(["GSTIN/UIN", "GSTIN"]),
          state: findVal(["State Name", "State"]),
          email: findVal(["E-Mail", "Email"]),
          voucherNo: findVal(["Voucher No", "Voucher"]),
          dated: findVal(["Dated", "Date"]),
          paymentTerms: findVal(["Mode/Terms", "45 DAYS", "DAYS", "Payment"]),
          destination: findVal(["Destination"]),
          consignee: findVal(["Consignee", "Ship to"]),
          buyer: findVal(["Buyer", "Bill to"]),
          reference: findVal(["Reference", "Order No", "EVFN"]),
        };
        setExcelHeader(header);

        let tableStartRow = -1;
        for (let row = 0; row <= range.e.r; row++) {
          for (let col = 0; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
            if (cell && cell.v) {
              const val = String(cell.v).toLowerCase();
              if (
                val.includes("description of goods") ||
                val === "sl" ||
                val === "si" ||
                val.includes("description")
              ) {
                tableStartRow = row;
                break;
              }
            }
          }
          if (tableStartRow !== -1) break;
        }

        if (tableStartRow === -1) {
          alert(
            "Table header not found. Expected 'Sl' or 'Description of Goods' column.",
          );
          setUploading(false);
          return;
        }

        let descCol = -1,
          hsnCol = -1,
          partCol = -1,
          qtyCol = -1;
        for (let col = 0; col <= range.e.c; col++) {
          const cell =
            sheet[XLSX.utils.encode_cell({ r: tableStartRow, c: col })];
          if (cell && cell.v) {
            const val = String(cell.v).toLowerCase();
            if (val.includes("description")) descCol = col;
            if (val.includes("hsn")) hsnCol = col;
            if (val.includes("part")) partCol = col;
            if (val.includes("quantity")) qtyCol = col;
          }
        }

        // ── Items parse ──
        const parsedItems = [];
        for (let row = tableStartRow + 2; row <= range.e.r; row++) {
          const descCell =
            sheet[XLSX.utils.encode_cell({ r: row, c: descCol })];
          if (!descCell || !descCell.v) break;

          parsedItems.push({
            slNo:
              sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]?.v ||
              parsedItems.length + 1,
            productCode:
              partCol >= 0
                ? sheet[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v || ""
                : "",
            description: String(descCell.v),
            quantity:
              qtyCol >= 0
                ? parseFloat(
                    sheet[XLSX.utils.encode_cell({ r: row, c: qtyCol })]?.v ||
                      0,
                  )
                : 0,
            // unit: "pcs",
            unit: detectUnit(
              String(descCell.v),
              partCol >= 0
                ? String(
                    sheet[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v ||
                      "",
                  )
                : "",
            ),
            hsnSac:
              hsnCol >= 0
                ? sheet[XLSX.utils.encode_cell({ r: row, c: hsnCol })]?.v || ""
                : "",
            available: 0,
            status: "ok",
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

  // ── Firebase Save ──
  const handleSubmit = async () => {
    setUploading(true);
    try {
      await addDoc(collection(db, "excelupload"), {
        woNumber: workOrder.woNumber,
        customer: workOrder.customer,
        customerContact: workOrder.customerContact,
        customerPhone: workOrder.customerPhone,
        deliveryDate: workOrder.deliveryDate,
        priority: workOrder.priority,
        notes: workOrder.notes,
        excelHeader: excelHeader || {},
        stockAlerts: stockAlerts,
        totalItems: items.length,
        hasShortage: stockAlerts.length > 0,
        createdAt: new Date().toISOString(),
        type: "PO",
        poStatus: "ordered",
        items: items.map((item) => ({
          ...item,
          orderedQty: item.quantity,
          totalReceivedQty: 0,
          itemStatus: "ordered",
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

  const handleConfirm = () => {
    navigate("/sales/viewExcelSheet");
  };

  // const addToStock = async (parsedItems, poNumber, vendor) => {
  //   const now = new Date().toISOString();
  //   for (const item of parsedItems) {
  //     const key =
  //       item.productCode?.toString().trim() || item.description?.trim();
  //     if (!key) continue;

  //     const q = query(collection(db, "stock"), where("productCode", "==", key));
  //     const snap = await getDocs(q);

  //     if (snap.empty) {
  //       // Navin item → create karo
  //       await addDoc(collection(db, "stock"), {
  //         productCode: key,
  //         description: item.description,
  //         hsnSac: item.hsnSac || "",
  //         unit: item.unit || "pcs",
  //         available: item.quantity,
  //         reserved: 0,
  //         minLevel: 0,
  //         lastUpdated: now,
  //         ledger: [
  //           {
  //             type: "IN",
  //             qty: item.quantity,
  //             ref: poNumber,
  //             by: vendor,
  //             balance: item.quantity,
  //             date: now,
  //           },
  //         ],
  //       });
  //     } else {
  //       // Already che → quantity add karo
  //       const stockDoc = snap.docs[0];
  //       const stockData = stockDoc.data();
  //       const newAvailable = (stockData.available || 0) + item.quantity;
  //       await updateDoc(doc(db, "stock", stockDoc.id), {
  //         available: newAvailable,
  //         lastUpdated: now,
  //         ledger: [
  //           ...(stockData.ledger || []),
  //           {
  //             type: "IN",
  //             qty: item.quantity,
  //             ref: poNumber,
  //             by: vendor,
  //             balance: newAvailable,
  //             date: now,
  //           },
  //         ],
  //       });
  //     }
  //   }
  // };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            Upload Purchase Order
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload Excel file to create purchase order and reserve stock
          </p>
        </div>
        <BtnSecondary onClick={() => navigate("/sales/Purchase-orders")}>
          Cancel
        </BtnSecondary>
      </div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { num: 1, label: "Upload Excel" },
            { num: 2, label: "Review & Verify" },
            { num: 3, label: "Confirmation" },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${step >= s.num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}
                >
                  {step > s.num ? <FiCheck size={20} /> : s.num}
                </div>
                <p
                  className={`text-xs font-bold ${step >= s.num ? "text-slate-800" : "text-slate-400"}`}
                >
                  {s.label}
                </p>
              </div>
              {idx < 2 && (
                <div
                  className={`flex-1 h-0.5 ${step > s.num ? "bg-indigo-600" : "bg-slate-200"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="grid grid-cols-1  gap-6">
          {/* <Card> */}
            {/* <CardHeader title="Purchase Order Details" /> */}
            {/* <div className="p-6 space-y-4">
              <Input
                label="PO Number"
                value={workOrder.woNumber}
                onChange={(e) =>
                  setWorkOrder({ ...workOrder, woNumber: e.target.value })
                }
                placeholder="WO-2024-001"
                required
              />
              <Input
                label="Customer Name"
                value={workOrder.customer}
                onChange={(e) =>
                  setWorkOrder({ ...workOrder, customer: e.target.value })
                }
                placeholder="ABC Industries Ltd"
                required
              />
              <Input
                label="Customer Contact"
                value={workOrder.customerContact}
                onChange={(e) =>
                  setWorkOrder({
                    ...workOrder,
                    customerContact: e.target.value,
                  })
                }
                placeholder="John Smith"
              />
              <Input
                label="Contact Phone"
                value={workOrder.customerPhone}
                onChange={(e) =>
                  setWorkOrder({ ...workOrder, customerPhone: e.target.value })
                }
                placeholder="+91 98765 43210"
              />
              <Input
                label="Delivery Date"
                type="date"
                value={workOrder.deliveryDate}
                onChange={(e) =>
                  setWorkOrder({ ...workOrder, deliveryDate: e.target.value })
                }
                required
              />
              <Select
                label="Priority"
                value={workOrder.priority}
                onChange={(e) =>
                  setWorkOrder({ ...workOrder, priority: e.target.value })
                }
                options={[
                  { value: "Low", label: "Low" },
                  { value: "Medium", label: "Medium" },
                  { value: "High", label: "High" },
                ]}
              />
              <Textarea
                label="Notes"
                value={workOrder.notes}
                onChange={(e) =>
                  setWorkOrder({ ...workOrder, notes: e.target.value })
                }
                placeholder="Any special instructions..."
              />
            </div> */}
          {/* </Card> */}

          <Card>
            <CardHeader
              title="Upload Excel File"
              subtitle="Sales Order / Purchase Order Excel"
            />
            <div className="p-6 space-y-4">
              <FileUpload
                label="Select Excel File"
                accept=".xlsx,.xls"
                file={excelFile}
                onChange={handleFileUpload}
              />
              {uploading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-600">
                    Parsing Excel file...
                  </p>
                </div>
              )}
              {!excelFile && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-blue-900 mb-2">
                    📋 Supported Excel Format:
                  </p>
                  <div className="text-xs text-blue-700 font-mono space-y-1">
                    <p>Sales Order / Purchase Order / Tax Invoice</p>
                    <p className="text-blue-500">
                      Auto-detects: Header info + Item table
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 2: Review ── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Excel Header Info Card */}
          {excelHeader && (
            <Card>
              <div className="px-6 py-4 bg-indigo-600 rounded-t-xl">
                <h3 className="font-bold text-white text-base">SALES ORDER</h3>
                <p className="text-indigo-200 text-xs">
                  {items.length} items found
                </p>
              </div>
              <div className="p-6">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-4">
                  Header Information
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "COMPANYNAME", val: excelHeader.companyName },
                    { label: "ADDRESS", val: excelHeader.address },
                    { label: "GSTIN", val: excelHeader.gstin },
                    { label: "STATE", val: excelHeader.state },
                    { label: "EMAIL", val: excelHeader.email },
                    { label: "VOUCHERNO", val: excelHeader.voucherNo },
                    { label: "DATED", val: excelHeader.dated },
                    { label: "PAYMENTTERMS", val: excelHeader.paymentTerms },
                    { label: "DESTINATION", val: excelHeader.destination },
                    { label: "CONSIGNEE", val: excelHeader.consignee },
                    { label: "BUYER", val: excelHeader.buyer },
                    { label: "REFERENCE", val: excelHeader.reference },
                    { lable: "MSME NO.", val: excelHeader.msmeNo },
                  ]
                    .filter((f) => f.val)
                    .map(({ label, val }) => (
                      <div
                        key={label}
                        className="bg-slate-50 p-3 rounded-lg border border-slate-100"
                      >
                        <p className="text-xs text-slate-400 uppercase font-semibold mb-1">
                          {label}
                        </p>
                        <p className="text-sm font-medium text-slate-800">
                          {val}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          )}

          {/* Stock Alerts */}
          {stockAlerts.length > 0 && (
            <Alert type="warning">
              <p className="font-bold">⚠️ Stock Shortage Detected:</p>
              {stockAlerts.map((a) => (
                <p key={a.productCode}>
                  • {a.productCode}: Need {a.needed}, Available {a.available}{" "}
                  (Short: {a.shortage})
                </p>
              ))}
            </Alert>
          )}

          {/* Items Table */}
          <Card>
            <CardHeader
              title="Items Preview"
              subtitle={`${items.length} items parsed from Excel`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {[
                      "Sl",
                      "Part No.",
                      "Description",
                      "HSN/SAC",
                      "Quantity",
                      "Unit",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {item.slNo}
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-slate-800">
                        {item.productCode}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {item.hsnSac}
                      </td>
                      <td className="px-4 py-3 font-bold text-center">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-center">
                        {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <BtnSecondary onClick={() => setStep(1)}>← Back</BtnSecondary>
            <BtnPrimary onClick={handleSubmit} disabled={uploading}>
              {uploading ? "Saving to Firebase..." : "Create Purchase Order →"}
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
            <h3 className="text-lg font-black text-slate-800 mb-2">
              Purchase Order Created Successfully!
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {workOrder.woNumber} for {workOrder.customer}
            </p>
            <div className="space-y-2 text-sm text-slate-600 mb-8">
              <p>✅ {items.length} items saved to Firebase</p>
              <p>✅ Header info saved</p>
              <p>✅ Data stored in excelupload collection</p>
              {stockAlerts.length > 0 && (
                <p className="text-amber-600">
                  ⚠️ {stockAlerts.length} items have shortage
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <BtnSecondary
                onClick={() => {
                  setStep(1);
                  setExcelFile(null);
                  setItems([]);
                  setExcelHeader(null);
                }}
              >
                Create Another
              </BtnSecondary>
              <BtnPrimary onClick={handleConfirm}>View Records</BtnPrimary>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
