import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// ── localStorage helpers (inline — no external file needed) ──────────────────
const DRAFT_KEY = "dispatch_challan_draft";

function loadDraft(initial) {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? { ...initial, ...JSON.parse(saved) } : initial;
  } catch {
    return initial;
  }
}

function saveDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem("dispatch_challan_draft");
  } catch {}
}

// ── Stock lookup ──────────────────────────────────────────────────────────────
async function lookupStock(productCode) {
  try {
    const q = query(
      collection(db, "stock"),
      where("productCode", "==", productCode.trim().toUpperCase()),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0].data();
      return {
        description: d.description || d.productName || "",
        hsn: d.hsnSac || d.hsnCode || "",
        unit: d.unit || "",
        stock: d.available ?? d.quantity ?? d.availableQty ?? 0,
        found: true,
      };
    }
  } catch (e) {
    console.error(e);
  }
  return { description: "", hsn: "", unit: "", stock: 0, found: false };
}

function generateChallanNo() {
  const d = new Date();
  return `CH-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF(header, rows, challanNo) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Delivery Challan - ${challanNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
    .hbox{border:2px solid #111;padding:10px}.title{text-align:center;font-size:16px;font-weight:bold;text-decoration:underline;margin-bottom:8px}
    .g2{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #111}
    .g3{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #111}
    .cell{padding:5px 8px;border-right:1px solid #111;border-bottom:1px solid #111}.cell:last-child{border-right:none}
    .cl{font-size:9px;color:#555;font-weight:bold;text-transform:uppercase}.cv{font-size:11px;font-weight:bold;margin-top:2px;word-break:break-word}
    .stitle{background:#1e293b;color:white;padding:5px 8px;font-size:10px;font-weight:bold;text-transform:uppercase;border:1px solid #111;border-top:none}
    table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:10px;font-weight:bold;border:1px solid #111;text-transform:uppercase}
    td{padding:5px 8px;border:1px solid #ccc;font-size:11px}tfoot td{font-weight:bold;background:#f1f5f9;border-top:2px solid #111}
    .sbox{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #111;border-top:none}
    .sc{padding:30px 10px 10px;border-right:1px solid #111;text-align:center;font-size:10px;font-weight:bold}.sc:last-child{border-right:none}
  </style></head><body>
  <div class="hbox"><div class="title">DELIVERY CHALLAN</div>
    <div class="g3">
      <div class="cell"><div class="cl">Challan No</div><div class="cv">${challanNo}</div></div>
      <div class="cell"><div class="cl">Date</div><div class="cv">${header.challanDate || ""}</div></div>
      <div class="cell"><div class="cl">SO Reference</div><div class="cv">${header.soReference || ""}</div></div>
    </div>
    <div class="g2">
      <div class="cell"><div class="cl">Customer</div><div class="cv">${header.customer || ""}</div></div>
      <div class="cell"><div class="cl">Consignee</div><div class="cv">${header.consignee || ""}</div></div>
    </div>
    <div class="g3">
      <div class="cell"><div class="cl">GSTIN</div><div class="cv">${header.gstin || ""}</div></div>
      <div class="cell"><div class="cl">Destination</div><div class="cv">${header.destination || ""}</div></div>
      <div class="cell"><div class="cl">Approx Invoice Date</div><div class="cv">${header.approxInvoiceDate || ""}</div></div>
    </div>
    <div class="g3">
      <div class="cell"><div class="cl">Vehicle No</div><div class="cv">${header.vehicleNo || "—"}</div></div>
      <div class="cell"><div class="cl">Driver</div><div class="cv">${header.driverName || "—"}</div></div>
      <div class="cell"><div class="cl">Transporter</div><div class="cv">${header.transporterName || "—"}</div></div>
    </div>
  </div>
  <div class="stitle">ITEMS / PRODUCTS</div>
  <table><thead><tr>
    <th style="width:30px">SL</th><th>Part No</th><th>Description</th><th>HSN/SAC</th>
    <th style="text-align:right">Qty</th><th>Unit</th><th>Remarks</th>
  </tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td>${i + 1}</td><td><b>${r.productCode || ""}</b></td><td>${r.description || ""}</td><td>${r.hsn || ""}</td><td style="text-align:right"><b>${r.dispatchQty || 0}</b></td><td>${r.unit || ""}</td><td>${r.remarks || ""}</td></tr>`).join("")}
  </tbody><tfoot><tr>
    <td colspan="4" style="text-align:right">TOTAL</td>
    <td style="text-align:right">${rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0)}</td>
    <td colspan="2"></td>
  </tr></tfoot></table>
  <div class="sbox"><div class="sc">Prepared By</div><div class="sc">Checked By</div><div class="sc">Authorised Signatory</div></div>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.focus();
    w.print();
  };
}

function exportCSV(header, rows, challanNo) {
  const lines = [
    ["DELIVERY CHALLAN"],
    ["Challan No", challanNo],
    ["Date", header.challanDate],
    [""],
    ["Customer", header.customer],
    ["SO Reference", header.soReference],
    ["Vehicle No", header.vehicleNo],
    ["Driver", header.driverName],
    ["Transporter", header.transporterName],
    [""],
    [
      "SL",
      "Part No",
      "Description",
      "HSN/SAC",
      "Dispatch Qty",
      "Unit",
      "Remarks",
    ],
    ...rows.map((r, i) => [
      i + 1,
      r.productCode,
      r.description,
      r.hsn,
      r.dispatchQty,
      r.unit,
      r.remarks || "",
    ]),
  ];
  const csv = lines
    .map((r) => r.map((c) => `"${c ?? ""}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${challanNo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Field Component ───────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  readOnly = false,
  mono = false,
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300
          ${readOnly ? "bg-slate-50 border-slate-200 text-slate-500" : "border-slate-300 bg-white text-slate-800"}
          ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

// ── Initial form state ────────────────────────────────────────────────────────
const FORM_DEFAULTS = {
  soReference: "",
  customer: "",
  companyName: "",
  address: "",
  gstin: "",
  stateName: "",
  email: "",
  voucherNo: "",
  paymentTerms: "",
  consignee: "",
  destination: "",
  invoiceNos: "",
  approxInvoiceDate: "",
  vehicleNo: "",
  driverName: "",
  transporterName: "",
  deliveryNote: "",
  rows: [
    {
      productCode: "",
      description: "",
      hsn: "",
      unit: "",
      dispatchQty: 0,
      stock: 0,
      remarks: "",
      lookingUp: false,
      found: false,
    },
  ],
};

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function DispatchOnChallan() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [challanNo] = useState(generateChallanNo());
  const [challanDate] = useState(new Date().toLocaleDateString("en-IN"));

  // Load from localStorage on first render, auto-save on every change
  const [form, setFormRaw] = useState(() => loadDraft(FORM_DEFAULTS));

  const setForm = (updater) => {
    setFormRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveDraft(next); 
      return next;
    });
  };

  // Shortcut setter for flat fields
  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const {
    soReference,
    customer,
    companyName,
    address,
    gstin,
    stateName,
    email,
    voucherNo,
    paymentTerms,
    consignee,
    destination,
    invoiceNos,
    approxInvoiceDate,
    vehicleNo,
    driverName,
    transporterName,
    deliveryNote,
    rows,
  } = form;

  // ── Row helpers ───────────────────────────────────────────────────────────
  const setRows = (updater) =>
    setForm((prev) => ({
      ...prev,
      rows: typeof updater === "function" ? updater(prev.rows) : updater,
    }));

  const addRow = () =>
    setRows((p) => [
      ...p,
      {
        productCode: "",
        description: "",
        hsn: "",
        unit: "",
        dispatchQty: 0,
        stock: 0,
        remarks: "",
        lookingUp: false,
        found: false,
      },
    ]);

  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));

  const updateRow = async (i, field, value) => {
    setRows((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: value };
      return n;
    });
    if (field === "productCode") {
      const trimmed = value.trim();
      if (trimmed.length >= 2) {
        setRows((p) => {
          const n = [...p];
          n[i] = { ...n[i], lookingUp: true };
          return n;
        });
        const info = await lookupStock(trimmed);
        setRows((p) => {
          const n = [...p];
          n[i] = {
            ...n[i],
            lookingUp: false,
            found: info.found,
            description: info.found ? info.description : n[i].description,
            hsn: info.found ? info.hsn : n[i].hsn,
            unit: info.found ? info.unit : n[i].unit,
            stock: info.found ? info.stock : 0,
          };
          return n;
        });
      } else {
        setRows((p) => {
          const n = [...p];
          n[i] = { ...n[i], found: false };
          return n;
        });
      }
    }
  };

  const getHeader = () => ({
    challanDate,
    soReference,
    customer,
    companyName,
    address,
    gstin,
    stateName,
    email,
    voucherNo,
    paymentTerms,
    consignee,
    destination,
    invoiceNos,
    approxInvoiceDate,
    vehicleNo,
    driverName,
    transporterName,
    deliveryNote,
  });

  const canSave =
    approxInvoiceDate && rows.some((r) => r.productCode && r.dispatchQty > 0);

  // ── Back / Cancel — clears draft ──────────────────────────────────────────
  const handleBack = () => {
    clearDraft();
    navigate("/sales/unbilled-challans");
  };

  const handleCancel = () => {
    clearDraft();
    navigate("/sales/unbilled-challans");
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      await addDoc(collection(db, "challans"), {
        challanNo,
        createdAt: serverTimestamp(),
        header: getHeader(),
        items: rows.filter((r) => r.productCode),
        status: "dispatched",
        soReference,
      });
      clearDraft(); // ✅ draft clear after successful save
      setStep(2);
    } catch (e) {
      console.error(e);
      alert("Error saving challan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── STEP 2: Success ────────────────────────────────────────────────────────
  if (step === 2) {
    const header = getHeader();
    const filledRows = rows.filter((r) => r.productCode);
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex items-center gap-4 bg-green-600">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                Challan Created Successfully!
              </h3>
              <p className="text-sm text-white opacity-80 mt-0.5">
                {challanNo} • Saved to Firebase
              </p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Challan No", challanNo],
                ["Customer", customer || "—"],
                ["SO Reference", soReference || "—"],
                ["Approx Invoice Date", approxInvoiceDate],
                ["Vehicle No", vehicleNo || "—"],
                ["Transporter", transporterName || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400 font-semibold">
                    {label}
                  </p>
                  <p className="text-sm text-slate-800 font-bold mt-0.5">
                    {val}
                  </p>
                </div>
              ))}
            </div>
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
              <thead>
                <tr className="bg-slate-100">
                  {[
                    "SL",
                    "Part No",
                    "Description",
                    "HSN/SAC",
                    "Dispatch Qty",
                    "Unit",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filledRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-700">
                      {r.productCode}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {r.description}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">
                      {r.hsn}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-right">
                      {r.dispatchQty}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
              <p className="text-sm font-bold text-slate-700 mb-3">
                📥 Download Challan
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => exportPDF(header, filledRows, challanNo)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow"
                >
                  <span className="text-lg">📄</span>
                  <div>
                    <p className="font-bold leading-tight">Download PDF</p>
                    <p className="text-xs text-red-200">Print ready</p>
                  </div>
                </button>
                <button
                  onClick={() => exportCSV(header, filledRows, challanNo)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-bold rounded-xl shadow"
                >
                  <span className="text-lg">📊</span>
                  <div>
                    <p className="font-bold leading-tight">Download Excel</p>
                    <p className="text-xs text-green-200">CSV format</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/sales/dispatch-on-challan/create")}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg"
              >
                + New Challan
              </button>
              <button
                onClick={() => navigate("/sales/dispatch-on-challan")}
                className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-2"
              >
                ← View All Challans
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1: Form ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
            title="Back to Challan List"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              Create Delivery Challan
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Fill in the details to create a new challan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
            {challanNo}
          </span>
          <span className="text-xs text-slate-400">{challanDate}</span>
        </div>
      </div>

      {/* ── SECTION 1 ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-indigo-600">
          <h3 className="text-sm font-bold text-white">1. Challan Details</h3>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Challan No
            </label>
            <input
              value={challanNo}
              readOnly
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 font-mono text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Challan Date
            </label>
            <input
              value={challanDate}
              readOnly
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>
          <Field
            label="SO / PO Reference"
            value={soReference}
            onChange={set("soReference")}
            placeholder="e.g. EVFN/2526/02790"
          />

          <Field
            label="Customer / Buyer"
            value={customer}
            onChange={set("customer")}
            placeholder="Customer / Buyer name"
            required
          />
          <div className="col-span-2">
            <Field
              label="Company Name"
              value={companyName}
              onChange={set("companyName")}
              placeholder="Company name"
            />
          </div>

          <div className="col-span-2">
            <Field
              label="Address"
              value={address}
              onChange={set("address")}
              placeholder="Full address"
            />
          </div>
          <Field
            label="GSTIN"
            value={gstin}
            onChange={set("gstin")}
            placeholder="e.g. 24XXXXX"
            mono
          />

          <Field
            label="State"
            value={stateName}
            onChange={set("stateName")}
            placeholder="e.g. Gujarat"
          />
          <Field
            label="Email"
            value={email}
            onChange={set("email")}
            placeholder="email@example.com"
          />
          <Field
            label="Payment Terms"
            value={paymentTerms}
            onChange={set("paymentTerms")}
            placeholder="e.g. 45 DAYS"
          />

          <Field
            label="PO / Voucher No"
            value={voucherNo}
            onChange={set("voucherNo")}
            placeholder="e.g. 272"
            mono
          />
          <div className="col-span-2">
            <Field
              label="Consignee (Ship To)"
              value={consignee}
              onChange={set("consignee")}
              placeholder="Consignee name & address"
            />
          </div>

          <Field
            label="Destination"
            value={destination}
            onChange={set("destination")}
            placeholder="e.g. VALSAD"
          />
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Invoice Nos (Unbilled)
            </label>
            <input
              value={invoiceNos}
              onChange={set("invoiceNos")}
              placeholder="e.g. F/0716/25-26"
              className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg bg-amber-50 text-amber-800 font-mono focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <Field
            label="Approx. Invoice Date"
            value={approxInvoiceDate}
            onChange={set("approxInvoiceDate")}
            type="date"
            required
          />
        </div>
      </div>

      {/* ── SECTION 2: Items ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-green-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">2. Items / Products</h3>
          <span className="text-xs text-green-200">
            {rows.length} row{rows.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase w-8">
                  SL
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                  Part No{" "}
                  <span className="text-indigo-400 normal-case font-normal">
                    (type to auto-fill)
                  </span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                  Description
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                  HSN/SAC
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                  Unit
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                  Stock
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                  Dispatch Qty <span className="text-red-400">*</span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                  Remarks
                </th>
                <th className="px-3 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={`${row.found ? "bg-green-50/30" : ""} hover:bg-slate-50/50 transition-colors`}
                >
                  <td className="px-3 py-2.5 text-sm text-slate-400 text-center">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="relative">
                      <input
                        value={row.productCode}
                        onChange={(e) =>
                          updateRow(i, "productCode", e.target.value)
                        }
                        placeholder="Part No"
                        className={`w-32 px-2 py-1.5 text-xs border rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200
                          ${row.found ? "border-green-400 bg-green-50 text-green-800" : "border-slate-300"}`}
                      />
                      {row.lookingUp && (
                        <div className="absolute right-1.5 top-1.5 w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      {row.found && !row.lookingUp && (
                        <span className="absolute right-1.5 top-1.5 text-green-500 text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={row.description}
                      onChange={(e) =>
                        updateRow(i, "description", e.target.value)
                      }
                      placeholder="Auto-filled from Part No"
                      className={`w-52 px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-200
                        ${row.found ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={row.hsn}
                      onChange={(e) => updateRow(i, "hsn", e.target.value)}
                      placeholder="HSN"
                      className={`w-24 px-2 py-1.5 text-xs border rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200
                        ${row.found ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={row.unit}
                      onChange={(e) => updateRow(i, "unit", e.target.value)}
                      placeholder="pcs"
                      className={`w-16 px-2 py-1.5 text-xs border rounded text-center focus:outline-none focus:ring-2 focus:ring-indigo-200
                        ${row.found ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`text-sm font-bold ${(row.stock ?? 0) > 0 ? "text-green-600" : "text-red-400"}`}
                    >
                      {row.found ? (row.stock ?? 0) : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={row.dispatchQty || ""}
                      onChange={(e) =>
                        updateRow(i, "dispatchQty", Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-20 px-2 py-1.5 text-sm border border-indigo-300 rounded text-center font-bold text-indigo-700 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={row.remarks}
                      onChange={(e) => updateRow(i, "remarks", e.target.value)}
                      placeholder="Optional"
                      className="w-28 px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(i)}
                        className="text-red-300 hover:text-red-500 text-xl leading-none transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
          >
            <span className="text-lg leading-none font-bold">+</span> Add Row
          </button>
          <span className="text-sm text-slate-500">
            Total Qty:{" "}
            <span className="font-black text-slate-800 text-base">
              {rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0)}
            </span>
          </span>
        </div>
      </div>

      {/* ── SECTION 3: Transport ── */}
      <details className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
        <summary className="px-5 py-3 bg-slate-700 cursor-pointer list-none flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            3. Transport Details{" "}
            <span className="text-slate-400 font-normal text-xs ml-2">
              (optional)
            </span>
          </h3>
          <span className="text-white text-xs opacity-60 group-open:hidden">
            ▼ Click to expand
          </span>
          <span className="text-white text-xs opacity-60 hidden group-open:inline">
            ▲ Click to collapse
          </span>
        </summary>
        <div className="p-5 grid grid-cols-3 gap-4">
          <Field
            label="Vehicle No"
            value={vehicleNo}
            onChange={set("vehicleNo")}
            placeholder="GJ-06-AB-1234"
          />
          <Field
            label="Driver Name"
            value={driverName}
            onChange={set("driverName")}
            placeholder="Driver name"
          />
          <Field
            label="Transporter"
            value={transporterName}
            onChange={set("transporterName")}
            placeholder="Transporter name"
          />
          <div className="col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Delivery Note
            </label>
            <textarea
              value={deliveryNote}
              onChange={set("deliveryNote")}
              rows={2}
              placeholder="Special instructions..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
        </div>
      </details>

      {/* ── Save Bar ── */}
      <div className="flex items-center justify-between pt-1 pb-6">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Cancel
        </button>
        <div className="flex items-center gap-3">
          {!approxInvoiceDate && (
            <p className="text-xs text-amber-600 font-semibold">
              ⚠ Set Approx. Invoice Date
            </p>
          )}
          {!rows.some((r) => r.productCode && r.dispatchQty > 0) && (
            <p className="text-xs text-amber-600 font-semibold">
              ⚠ Add at least 1 item
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`px-6 py-2.5 text-sm font-bold rounded-lg shadow transition-all
              ${canSave && !saving ? "bg-green-600 hover:bg-green-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
          >
            {saving ? "⏳ Saving..." : "📋 Create Challan"}
          </button>
        </div>
      </div>
    </div>
  );
}
