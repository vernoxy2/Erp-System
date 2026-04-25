import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import logo from "../../assets/logo.svg";
import {
  collection,
  addDoc,
  setDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  where,
  arrayUnion,
} from "firebase/firestore";
import { useAuth } from "../authntication/Authcontext";
import {
  FiArrowLeft,
  FiX,
  FiClipboard,
  FiFileText,
  FiDownload,
  FiPlus,
  FiSave,
} from "react-icons/fi";

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
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

// ── Auto-generate Challan No ────────────────────────────────────────────────
async function generateChallanNo() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  // Fiscal year: April to March
  let fyStart, fyEnd;
  if (month >= 4) {
    fyStart = year % 100;
    fyEnd = (year + 1) % 100;
  } else {
    fyStart = (year - 1) % 100;
    fyEnd = year % 100;
  }
  const fyStr = `${fyStart}${fyEnd}`; // e.g., "2526"

  const prefix = `CH-${fyStr}-`;

  try {
    const q = query(
      collection(db, "dispatchChallans"),
      orderBy("challanNo", "desc"),
      limit(50), // Look at recent ones to find highest in current FY
    );
    const snap = await getDocs(q);
    let lastNum = 0;

    snap.docs.forEach((d) => {
      const cNo = d.data().challanNo || "";
      if (cNo.startsWith(prefix)) {
        const parts = cNo.split("-");
        const num = parseInt(parts[2]);
        if (!isNaN(num) && num > lastNum) lastNum = num;
      }
    });

    const nextNum = (lastNum + 1).toString().padStart(4, "0");
    return `${prefix}${nextNum}`;
  } catch (e) {
    console.error("Error generating challan no:", e);
    return `${prefix}0001`;
  }
}

// function exportPDF(header, rows, challanNo) {
//   const totalQty = rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0);
//   const logoUrl = logo.startsWith("http")
//     ? logo
//     : window.location.origin + (logo.startsWith("/") ? logo : "/" + logo);

//   const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
//   <title>Delivery Challan - ${challanNo}</title>
//   <style>
//     *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
//     .hbox{border:2px solid #111;padding:10px;border-bottom:none}.title{text-align:center;font-size:16px;font-weight:bold;text-decoration:underline;margin-bottom:8px}
//     .g2{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #111}
//     .g3{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #111}
//     .cell{padding:5px 8px;border-right:1px solid #111;border-bottom:1px solid #111}.cell:last-child{border-right:none}
//     .cl{font-size:9px;color:#555;font-weight:bold;text-transform:uppercase}.cv{font-size:11px;font-weight:bold;margin-top:2px;word-break:break-word}
//     .stitle{background:#1e293b;color:white;padding:5px 8px;font-size:10px;font-weight:bold;text-transform:uppercase;border:1px solid #111;border-top:none}
//     table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:10px;font-weight:bold;border:1px solid #111;text-transform:uppercase}
//     td{padding:5px 8px;border:1px solid #ccc;font-size:11px}tfoot td{font-weight:bold;background:#f1f5f9;border-top:2px solid #111}
//     .sbox{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #111;border-top:none}
//     .sc{padding:30px 10px 10px;border-right:1px solid #111;text-align:center;font-size:10px;font-weight:bold}.sc:last-child{border-right:none}
//     .co-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 2px solid #111; border-bottom: none; padding: 10px 14px; background: #f8fafc; }
//     .co-logo-name { display: flex; align-items: center; gap: 12px; }
//     .co-logo { height: 50px; width: auto; }
//     .co-name { font-size: 26px; font-weight: 900; color: #1e3a5f; letter-spacing: 1px; text-transform: uppercase; }
//     .co-tagline { font-size: 9px; color: #64748b; letter-spacing: 0.5px; margin-top: 2px; }
//     .co-address { text-align: right; font-size: 9.5px; color: #374151; line-height: 1.6; }
//   </style></head><body>
//   <div class="co-header">
//     <div class="co-logo-name">
//       <img src="${logoUrl}" alt="Logo" class="co-logo" onerror="this.style.display='none'" />
//       <div class="co-name-block">
//         <div class="co-name">fib2fab</div>
//         <div class="co-tagline">Quality Piping Solutions</div>
//       </div>
//     </div>
//     <div class="co-address">
//       506, 4th Floor, Tirupati Tower, GIDC Char Rasta<br/>
//       Vapi – 396195, Gujarat – India<br/>
//       +91-7096040970 &nbsp;|&nbsp; gujarat@fib2fabindia.com
//     </div>
//   </div>
//   <div class="hbox"><div class="title">DELIVERY CHALLAN</div>
//     <div class="g3">
//       <div class="cell"><div class="cl">Challan No</div><div class="cv">${challanNo}</div></div>
//       <div class="cell"><div class="cl">Date</div><div class="cv">${header.challanDate || ""}</div></div>
//       <div class="cell"><div class="cl">SO Reference</div><div class="cv">${header.soReference || ""}</div></div>
//     </div>
//     <div class="g3">
//       <div class="cell"><div class="cl">Party Code</div><div class="cv">${header.partyCode || "—"}</div></div>
//       <div class="cell"><div class="cl">Customer</div><div class="cv">${header.customer || ""}</div></div>
//       <div class="cell"><div class="cl">E-Way Bill No</div><div class="cv">${header.ewayBillNo || "—"}</div></div>
//     </div>
//     <div class="g2">
//       <div class="cell"><div class="cl">Company</div><div class="cv">${header.companyName || "—"}</div></div>
//       <div class="cell"><div class="cl">Email</div><div class="cv">${header.email || "—"}</div></div>
//     </div>
//     <div class="g2">
//       <div class="cell"><div class="cl">Address</div><div class="cv">${header.address || "—"}</div></div>
//       <div class="cell"><div class="cl">State</div><div class="cv">${header.stateName || "—"}</div></div>
//     </div>
//     <div class="g2">
//       <div class="cell"><div class="cl">Consignee</div><div class="cv">${header.consignee || "—"}</div></div>
//       <div class="cell"><div class="cl">Destination</div><div class="cv">${header.destination || "—"}</div></div>
//     </div>
//     <div class="g2">
//       <div class="cell"><div class="cl">Approx Invoice Date</div><div class="cv">${header.approxInvoiceDate || ""}</div></div>
//       <div class="cell"><div class="cl">Invoice Nos</div><div class="cv">${header.invoiceNos || "—"}</div></div>
//     </div>
//     <div class="g3">
//       <div class="cell"><div class="cl">Vehicle No</div><div class="cv">${header.vehicleNo || "—"}</div></div>
//       <div class="cell"><div class="cl">Driver</div><div class="cv">${header.driverName || "—"}</div></div>
//       <div class="cell"><div class="cl">Driver Contact</div><div class="cv">${header.driverContact || "—"}</div></div>
//     </div>
//   </div>
//   <div class="stitle">ITEMS / PRODUCTS</div>
//   <table><thead><tr>
//     <th style="width:30px">SL</th><th>Part No</th><th>Description</th><th>HSN/SAC</th>
//     <th style="text-align:right">Qty</th><th>Unit</th><th>Remarks</th>
//   </tr></thead><tbody>
//     ${rows.map((r, i) => `<tr><td>${i + 1}</td><td><b>${r.productCode || ""}</b></td><td>${r.description || ""}</td><td>${r.hsn || ""}</td><td style="text-align:right"><b>${r.dispatchQty || 0}</b></td><td>${r.unit || ""}</td><td>${r.remarks || ""}</td></tr>`).join("")}
//   </tbody><tfoot><tr>
//     <td colspan="4" style="text-align:right">TOTAL</td>
//     <td style="text-align:right">${totalQty}</td>
//     <td colspan="2"></td>
//   </tr></tfoot></table>
//   <div class="sbox"><div class="sc">Prepared By</div><div class="sc">Checked By</div><div class="sc">Authorised Signatory</div></div>
//   </body></html>`;
//   const w = window.open("", "_blank", "width=900,height=700");
//   w.document.write(html);
//   w.document.close();
//   w.onload = () => {
//     w.focus();
//     w.print();
//   };
// }

async function exportPDF(header, rows, challanNo) {
  const totalQty = rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0);

  // ✅ Logo to base64 so it works in print window
  let logoSrc = "";
  try {
    const res = await fetch(logo);
    const blob = await res.blob();
    logoSrc = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Logo load failed", e);
    logoSrc = "";
  }

  const copies = ["ORIGINAL COPY", "DUPLICATE COPY", "TRIPLICATE COPY"];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Delivery Challan - ${challanNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:0}
    .page{padding:20px; page-break-after: always; position: relative; min-height: 100vh;}
    .page:last-child { page-break-after: auto; }
    .hbox{border:2px solid #111;padding:10px;border-bottom:none}.title{text-align:center;font-size:16px;font-weight:bold;text-decoration:underline;margin-bottom:8px}
    .g2{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #111}
    .g3{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #111}
    .cell{padding:5px 8px;border-right:1px solid #111;border-bottom:1px solid #111}.cell:last-child{border-right:none}
    .cl{font-size:9px;color:#555;font-weight:bold;text-transform:uppercase}.cv{font-size:11px;font-weight:bold;margin-top:2px;word-break:break-word}
    .stitle{background:#1e293b;color:white;padding:5px 8px;font-size:10px;font-weight:bold;text-transform:uppercase;border:1px solid #111;border-top:none}
    table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:10px;font-weight:bold;border:1px solid #111;text-transform:uppercase}
    td{padding:5px 8px;border:1px solid #ccc;font-size:11px}tfoot td{font-weight:bold;background:#f1f5f9;border-top:2px solid #111}
    .sbox{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #111;border-top:none}
    .sc{padding:30px 10px 10px;border-right:1px solid #111;text-align:center;font-size:10px;font-weight:bold}.sc:last-child{border-right:none}
    .co-header{display:flex;align-items:center;justify-content:space-between;gap:14px;border:2px solid #111;border-bottom:none;padding:10px 14px;background:#f8fafc}
    .co-logo-name{display:flex;align-items:center;gap:12px}
    .co-logo{height:50px;width:auto}
    .co-name{font-size:26px;font-weight:900;color:#1e3a5f;letter-spacing:1px;text-transform:uppercase}
    .co-tagline{font-size:9px;color:#64748b;letter-spacing:0.5px;margin-top:2px}
    .co-address{text-align:right;font-size:9.5px;color:#374151;line-height:1.6}
    .copy-label{position: absolute; top: 10px; right: 20px; font-size: 10px; font-weight: bold; border: 1px solid #111; padding: 2px 8px; border-radius: 4px; background: #fff;}
  </style></head><body>
    ${copies.map((copyLabel) => `
    <div class="page">
      <div class="copy-label">${copyLabel}</div>
      <div class="co-header">
        <div class="co-logo-name">
          ${logoSrc ? `<img src="${logoSrc}" alt="Logo" class="co-logo" />` : ""}
          <div>
            <div class="co-name">fib2fab</div>
            <div class="co-tagline">Quality Piping Solutions</div>
          </div>
        </div>
        <div class="co-address">
          506, 4th Floor, Tirupati Tower, GIDC Char Rasta<br/>
          Vapi – 396195, Gujarat – India<br/>
          +91-7096040970 &nbsp;|&nbsp; gujarat@fib2fabindia.com
        </div>
      </div>
      <div class="hbox"><div class="title">DELIVERY CHALLAN</div>
        <div class="g3">
          <div class="cell"><div class="cl">Challan No</div><div class="cv">${challanNo}</div></div>
          <div class="cell"><div class="cl">Date</div><div class="cv">${header.challanDate || ""}</div></div>
          <div class="cell"><div class="cl">SO Reference</div><div class="cv">${header.soReference || ""}</div></div>
        </div>
        <div class="g3">
          <div class="cell"><div class="cl">Party Code</div><div class="cv">${header.partyCode || "—"}</div></div>
          <div class="cell"><div class="cl">Customer</div><div class="cv">${header.customer || ""}</div></div>
          <div class="cell"><div class="cl">E-Way Bill No</div><div class="cv">${header.ewayBillNo || "—"}</div></div>
        </div>
        <div class="g2">
          <div class="cell"><div class="cl">Company</div><div class="cv">${header.companyName || "—"}</div></div>
          <div class="cell"><div class="cl">Email</div><div class="cv">${header.email || "—"}</div></div>
        </div>
        <div class="g2">
          <div class="cell"><div class="cl">Address</div><div class="cv">${header.address || "—"}</div></div>
          <div class="cell"><div class="cl">State</div><div class="cv">${header.stateName || "—"}</div></div>
        </div>
        <div class="g2">
          <div class="cell"><div class="cl">Consignee</div><div class="cv">${header.consignee || "—"}</div></div>
          <div class="cell"><div class="cl">Destination</div><div class="cv">${header.destination || "—"}</div></div>
        </div>
        <div class="g2">
          <div class="cell"><div class="cl">Approx Invoice Date</div><div class="cv">${header.approxInvoiceDate || ""}</div></div>
          <div class="cell"><div class="cl">Invoice Nos</div><div class="cv">${header.invoiceNos || "—"}</div></div>
        </div>
        <div class="g3">
          <div class="cell"><div class="cl">Vehicle No</div><div class="cv">${header.vehicleNo || "—"}</div></div>
          <div class="cell"><div class="cl">Driver</div><div class="cv">${header.driverName || "—"}</div></div>
          <div class="cell"><div class="cl">Driver Contact</div><div class="cv">${header.driverContact || "—"}</div></div>
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
        <td style="text-align:right">${totalQty}</td>
        <td colspan="2"></td>
      </tr></tfoot></table>
      <div class="sbox"><div class="sc">Prepared By</div><div class="sc">Checked By</div><div class="sc">Authorised Signatory</div></div>
    </div>
    `).join("")}
  </body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.focus();
    w.print();
  };
}

function PreviewModal({ open, onClose, header, rows, challanNo, onSave, saving, onDownloadPDF }) {
  if (!open) return null;
  const filledRows = rows.filter((r) => r.description || r.productCode);
  const totalQty = filledRows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <FiFileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 leading-tight">Challan Preview</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{challanNo || "Draft Challan"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <FiX size={20} />
          </button>
        </div>

        {/* PDF Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
          <div className="bg-white mx-auto shadow-sm border border-slate-200 p-10 min-h-[1000px] w-full max-w-[800px] text-[11px] text-slate-800 font-sans leading-relaxed">
            {/* Business Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                  <img src={logo} alt="Logo" className="max-h-12 w-auto" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-indigo-900 tracking-tighter uppercase">fib2fab</h1>
                  <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Quality Piping Solutions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-700">506, 4th Floor, Tirupati Tower</p>
                <p className="text-slate-500">GIDC Char Rasta, Vapi – 396195</p>
                <p className="text-slate-500">Gujarat – India</p>
                <p className="font-bold text-indigo-600 mt-1">+91-7096040970</p>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-xl font-black text-slate-800 underline decoration-slate-300 underline-offset-8 uppercase tracking-widest">Delivery Challan</h2>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 border-2 border-slate-800 mb-6">
              <div className="border-r-2 border-slate-800">
                <div className="grid grid-cols-2 border-b border-slate-800">
                  <div className="p-3 border-r border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Challan No</p>
                    <p className="font-bold text-slate-800">{challanNo || "—"}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Date</p>
                    <p className="font-bold text-slate-800">{header.challanDate || "—"}</p>
                  </div>
                </div>
                <div className="p-3 border-b border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Customer / Party Code</p>
                  <p className="font-black text-slate-800 text-sm leading-tight">{header.customer || "—"}</p>
                  {header.partyCode && <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Code: {header.partyCode}</p>}
                  {header.companyName && <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">{header.companyName}</p>}
                  <p className="text-slate-500 mt-1 whitespace-pre-wrap">{header.address || ""}</p>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-200">
                  <div className="p-3 border-r border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">State</p>
                    <p className="font-bold text-slate-800">{header.stateName || "—"}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Destination</p>
                    <p className="font-bold text-slate-800">{header.destination || "—"}</p>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">GST Number</p>
                  <p className="font-bold text-slate-800 font-mono">{header.gstNo || "—"}</p>
                </div>
              </div>
              <div>
                <div className="grid grid-cols-2 border-b border-slate-800">
                  <div className="p-3 border-r border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">SO Reference</p>
                    <p className="font-bold text-slate-800">{header.soReference || "—"}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Invoice Date</p>
                    <p className="font-bold text-slate-800">{header.approxInvoiceDate || "—"}</p>
                  </div>
                </div>
                <div className="p-3 border-b border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Consignee (Ship To)</p>
                  <p className="font-bold text-slate-800">{header.consignee || "Same as Buyer"}</p>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-200">
                  <div className="p-3 border-r border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Vehicle No</p>
                    <p className="font-bold text-slate-800 font-mono">{header.vehicleNo || "—"}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">E-Way Bill</p>
                    <p className="font-bold text-slate-800 font-mono">{header.ewayBillNo || "—"}</p>
                  </div>
                </div>
                <div className="p-3 border-b border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Driver Info</p>
                  <p className="font-bold text-slate-800">{header.driverName || "—"}</p>
                  {header.driverContact && <p className="text-slate-500 font-mono">{header.driverContact}</p>}
                </div>
                <div className="p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Invoice Nos</p>
                  <p className="font-bold text-slate-800 font-mono">{header.invoiceNos || "—"}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-2 border-slate-800 mb-8">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-800">
                  <th className="p-3 border-r border-slate-800 text-left w-10">SL</th>
                  <th className="p-3 border-r border-slate-800 text-left">Description of Goods</th>
                  <th className="p-3 border-r border-slate-800 text-left w-24">HSN/SAC</th>
                  <th className="p-3 border-r border-slate-800 text-right w-20">Qty</th>
                  <th className="p-3 text-left w-20">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filledRows.length > 0 ? filledRows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-3 border-r border-slate-800 text-slate-400">{i + 1}</td>
                    <td className="p-3 border-r border-slate-800">
                      <p className="font-black text-slate-800">{r.description}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{r.productCode}</p>
                    </td>
                    <td className="p-3 border-r border-slate-800 font-mono">{r.hsn}</td>
                    <td className="p-3 border-r border-slate-800 text-right font-black">{r.dispatchQty}</td>
                    <td className="p-3">{r.unit || "NOS"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-slate-400 font-bold italic">No items added to this challan yet.</td>
                  </tr>
                )}
                {/* Empty rows to fill space */}
                {Array.from({ length: Math.max(0, 8 - filledRows.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-10">
                    <td className="p-3 border-r border-slate-800"></td>
                    <td className="p-3 border-r border-slate-800"></td>
                    <td className="p-3 border-r border-slate-800"></td>
                    <td className="p-3 border-r border-slate-800"></td>
                    <td className="p-3"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-800 font-black">
                  <td colSpan="3" className="p-3 border-r border-slate-800 text-right uppercase tracking-widest">Total Quantity</td>
                  <td className="p-3 border-r border-slate-800 text-right text-base text-indigo-700">{totalQty}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>

            {/* Footer Signatures */}
            <div className="grid grid-cols-3 gap-0 border-2 border-slate-800 mt-20">
              <div className="border-r-2 border-slate-800 p-4 h-32 flex flex-col justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase text-center">Prepared By</p>
                <div className="border-t border-slate-200 pt-2 text-center text-[10px] font-bold text-slate-800">Authorized Signatory</div>
              </div>
              <div className="border-r-2 border-slate-800 p-4 h-32 flex flex-col justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase text-center">Receiver's Signature</p>
                <div className="border-t border-slate-200 pt-2 text-center text-[10px] font-bold text-slate-800">Name & Designation</div>
              </div>
              <div className="p-4 h-32 flex flex-col justify-between bg-slate-50/50">
                <p className="text-[9px] font-black text-slate-400 uppercase text-center">For fib2fab</p>
                <div className="border-t border-slate-800 pt-2 text-center text-[10px] font-black text-slate-800">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            Back to Edit
          </button>
          <div className="flex gap-3">
            <button
              onClick={onDownloadPDF}
              className="px-5 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <FiDownload size={16} /> Download PDF
            </button>
            {onSave && (
              <button
                onClick={onSave}
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <FiSave size={16} /> {saving ? "Saving..." : "Confirm & Create"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function exportCSV(header, rows, challanNo) {
  const lines = [
    ["DELIVERY CHALLAN"],
    ["Challan No", challanNo],
    ["Date", header.challanDate],
    ["E-Way Bill No", header.ewayBillNo],
    [""],
    ["Party Code", header.partyCode],
    ["Customer", header.customer],
    ["GST No", header.gstNo],
    ["Email", header.email],
    ["Company", header.companyName],
    ["Address", header.address],
    ["State", header.stateName],
    ["Destination", header.destination],
    ["Consignee", header.consignee],
    ["SO Reference", header.soReference],
    ["Vehicle No", header.vehicleNo],
    ["Driver", header.driverName],
    ["Driver Contact", header.driverContact],
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

function CustomerSearchInput({ customers, value, onSelect, required }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  // ✅ Update query when external value changes (important for auto-fill/edit)
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    
    // ✅ Update parent state immediately with typed text
    // We pass an object that has the name so handleCustomerSelect can process it
    onSelect({ name: val, isManual: true });

    if (!val.trim()) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    const lower = val.toLowerCase();
    const filtered = customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(lower) ||
          c.companyName?.toLowerCase().includes(lower) ||
          c.gstNo?.toLowerCase().includes(lower) ||
          c.partyCode?.toLowerCase().includes(lower) ||
          c.destination?.toLowerCase().includes(lower) ||
          c.email?.toLowerCase().includes(lower) ||
          c.phone?.toLowerCase().includes(lower),
      )
      .slice(0, 8);
    setSuggestions(filtered);
    setShowDrop(true);
  };

  const handleSelect = (cust) => {
    const name = cust.name || cust.companyName || "";
    setQuery(name);
    setShowDrop(false);
    setSuggestions([]);
    onSelect(cust);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowDrop(false);
    onSelect(null);
  };

  const highlight = (text, q) => {
    if (!text || !q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-black text-indigo-600 bg-indigo-50 rounded px-0.5">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
        Customer / Buyer {required && <span className="text-red-400">*</span>}
      </label>
      <div
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg bg-white transition-all
        ${focused ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-300"}`}
      >
        <svg
          className="w-4 h-4 text-slate-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => {
            setFocused(true);
            if (query.trim().length >= 1) setShowDrop(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder="Search by name, party code, GST, email..."
          className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-slate-600"
          >
            <FiX size={14} />
          </button>
        )}
      </div>
      {showDrop && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {suggestions.length > 0
                ? `${suggestions.length} customer${suggestions.length !== 1 ? "s" : ""} found`
                : "No results"}
            </p>
            <p className="text-[10px] text-slate-400">
              click to select & auto-fill
            </p>
          </div>
          {suggestions.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-slate-500">
                No customer found for "{query}"
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try name, party code, GST or email
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((c) => (
                <div
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(c)}
                  className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-none group transition-colors"
                >
                  <p className="text-sm text-slate-800 font-semibold group-hover:text-indigo-700">
                    {highlight(c.name || c.companyName, query)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {c.partyCode && (
                      <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">
                        {highlight(c.partyCode, query)}
                      </span>
                    )}
                    {c.gstNo && (
                      <span className="text-[11px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono">
                        {highlight(c.gstNo, query)}
                      </span>
                    )}
                    {c.destination && (
                      <span className="text-[11px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">
                        {highlight(c.destination, query)}
                      </span>
                    )}
                    {c.email && (
                      <span className="text-[11px] text-slate-400">
                        {highlight(c.email, query)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ✅ Portal dropdown — each row manages its own open state
function DescriptionCell({ row, rowIdx, stockItems, onSelect, onChange }) {
  const inputRef = useRef(null);
  const dropRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 340 });

  const buildItems = (val) =>
    stockItems
      .filter(
        (s) =>
          (s.description || s.productName || "").toLowerCase().includes(val) ||
          (s.productCode || "").toLowerCase().includes(val),
      )
      .slice(0, 15)
      .map((s) => ({
        description: s.description || s.productName || "",
        productCode: s.productCode || "",
        hsn: s.hsnSac || s.hsnCode || "",
        unit: s.unit || "NOS",
        stock: s.available ?? s.quantity ?? 0,
      }));

  const updatePos = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 340),
    });
  };

  // ✅ Close on outside click — but NOT if clicking inside the portal dropdown
  useEffect(() => {
    const handler = (e) => {
      const clickedInput = inputRef.current?.contains(e.target);
      const clickedDrop = dropRef.current?.contains(e.target);
      if (!clickedInput && !clickedDrop) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    onChange(rowIdx, value);
    const val = value.toLowerCase().trim();
    if (val.length >= 2) {
      updatePos();
      setItems(buildItems(val));
      setOpen(true);
    } else {
      setItems([]);
      setOpen(false);
    }
  };

  const handleFocus = () => {
    const val = row.description.toLowerCase().trim();
    if (val.length >= 2) {
      updatePos();
      setItems(buildItems(val));
      setOpen(true);
    }
  };

  // ✅ Select — sets all fields, closes dropdown
  const handleSelect = (item) => {
    onSelect(rowIdx, item);
    setOpen(false);
    setItems([]);
  };

  return (
    <div>
      <input
        ref={inputRef}
        value={row.description}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="Type product name or part no..."
        className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-200
          ${
            row.stockChecked && row.stockAvailable
              ? "border-green-400 bg-green-50 text-green-800"
              : row.stockChecked && !row.stockAvailable
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-slate-300 bg-white"
          }`}
      />

      {/* ✅ Portal — attached to dropRef so outside click handler knows about it */}
      {open &&
        items.length > 0 &&
        ReactDOM.createPortal(
          <div
            ref={dropRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 99999,
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.18)",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                background: "#f8fafc",
                borderBottom: "1px solid #f1f5f9",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {items.length} items found — click to select
              </p>
            </div>

            {items.map((s, idx) => (
              <div
                key={idx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f8fafc",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#eef2ff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1e293b",
                    marginBottom: "4px",
                  }}
                >
                  {s.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {s.productCode && (
                    <span
                      style={{
                        fontSize: "10px",
                        background: "#eef2ff",
                        color: "#4f46e5",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      {s.productCode}
                    </span>
                  )}
                  {s.hsn && (
                    <span
                      style={{
                        fontSize: "10px",
                        background: "#f1f5f9",
                        color: "#64748b",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                      }}
                    >
                      HSN: {s.hsn}
                    </span>
                  )}
                  {s.unit && (
                    <span
                      style={{
                        fontSize: "10px",
                        background: "#f1f5f9",
                        color: "#64748b",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {s.unit}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      marginLeft: "auto",
                      background: s.stock > 0 ? "#f0fdf4" : "#fef2f2",
                      color: s.stock > 0 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    Stock: {s.stock}
                  </span>
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}

      {row.stockChecked && row.stockAvailable && (
        <p className="text-[10px] text-green-600 mt-1 font-semibold">
          ✅ Available ({row.stock} units)
        </p>
      )}
      {row.stockChecked && !row.stockAvailable && (
        <p className="text-[10px] text-red-500 mt-1 font-semibold">
          ⚠ Not available in stock
        </p>
      )}
    </div>
  );
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const EMPTY_ROW = () => ({
  productCode: "",
  description: "",
  hsn: "",
  unit: "",
  dispatchQty: 0,
  stock: 0,
  remarks: "",
  stockChecked: false,
  stockAvailable: null,
});

const FORM_DEFAULTS = {
  challanType: "inhouse", // "inhouse" or "handwrite"
  challanNo: "",
  challanDate: todayISO(),
  soReference: "",
  ewayBillNo: "",
  customer: "",
  partyCode: "",
  gstNo: "",
  email: "",
  companyName: "",
  address: "",
  stateName: "",
  consignee: "",
  destination: "",
  invoiceNos: "",
  approxInvoiceDate: todayISO(),
  vehicleNo: "",
  driverName: "",
  driverContact: "",
  deliveryNote: "",
  rows: [EMPTY_ROW()],
};

export default function DispatchOnChallan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { userInfo } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [form, setFormRaw] = useState(() => loadDraft(FORM_DEFAULTS));

  const [showPreview, setShowPreview] = useState(false);

  // ✅ Detect Edit Mode from state if passed from list
  const editData = location.state?.editChallan;

  useEffect(() => {
    return onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "stock"), (snap) => {
      setStockItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ✅ Auto-generate Challan No on Mount for NEW challan
  useEffect(() => {
    if (!id && !editData && !form.challanNo) {
      generateChallanNo().then((no) => {
        setForm((p) => ({ ...p, challanNo: no }));
      });
    }
  }, []);

  // ✅ Load data for Edit Mode
  useEffect(() => {
    if (editData) {
      // Data passed directly via navigate state
      const mappedRows = (editData.items || []).map((it) => ({
        ...it,
        stockChecked: editData.challanType === "inhouse",
        stockAvailable: editData.challanType === "inhouse",
      }));
      setFormRaw({
        ...FORM_DEFAULTS,
        ...editData.header,
        challanType: editData.challanType || "inhouse",
        challanNo: editData.challanNo || "",
        soReference: editData.soReference || editData.header?.soReference || "",
        ewayBillNo: editData.ewayBillNo || editData.header?.ewayBillNo || "",
        customer: editData.header?.customer || editData.header?.companyName || editData.customer || editData.companyName || "",
        partyCode: editData.header?.partyCode || editData.partyCode || "",
        gstNo: editData.header?.gstNo || editData.gstNo || "",
        email: editData.header?.email || editData.email || "",
        companyName: editData.header?.companyName || editData.companyName || "",
        address: editData.header?.address || editData.address || "",
        stateName: editData.header?.stateName || editData.stateName || "",
        consignee: editData.header?.consignee || editData.consignee || "",
        destination: editData.header?.destination || editData.destination || "",
        invoiceNos: editData.header?.invoiceNos || editData.invoiceNos || "",
        approxInvoiceDate: editData.header?.approxInvoiceDate || editData.approxInvoiceDate || "",
        vehicleNo: editData.header?.vehicleNo || editData.vehicleNo || "",
        driverName: editData.header?.driverName || editData.driverName || "",
        driverContact: editData.header?.driverContact || editData.driverContact || "",
        deliveryNote: editData.header?.deliveryNote || editData.deliveryNote || "",
        rows: mappedRows.length > 0 ? mappedRows : [EMPTY_ROW()],
      });
    } else if (id) {
      // Fetch from Firestore if ID is in URL
      setLoading(true);
      const fetch = async () => {
        try {
          const docRef = doc(db, "dispatchChallans", id);
          const s = await getDoc(docRef);
          if (s.exists()) {
            const d = s.data();
            const mappedRows = (d.items || []).map((it) => ({
              ...it,
              stockChecked: d.challanType === "inhouse",
              stockAvailable: d.challanType === "inhouse",
            }));
            setFormRaw({
              ...FORM_DEFAULTS,
              ...d.header,
              challanType: d.challanType || "inhouse",
              challanNo: d.challanNo || "",
              soReference: d.soReference || d.header?.soReference || "",
              customer: d.header?.customer || d.header?.companyName || d.customer || d.companyName || "",
              partyCode: d.header?.partyCode || d.partyCode || "",
              gstNo: d.header?.gstNo || d.gstNo || "",
              email: d.header?.email || d.email || "",
              companyName: d.header?.companyName || d.companyName || "",
              address: d.header?.address || d.address || "",
              stateName: d.header?.stateName || d.stateName || "",
              consignee: d.header?.consignee || d.consignee || "",
              destination: d.header?.destination || d.destination || "",
              invoiceNos: d.header?.invoiceNos || d.invoiceNos || "",
              approxInvoiceDate: d.header?.approxInvoiceDate || d.approxInvoiceDate || "",
              vehicleNo: d.header?.vehicleNo || d.vehicleNo || "",
              driverName: d.header?.driverName || d.driverName || "",
              driverContact: d.header?.driverContact || d.driverContact || "",
              deliveryNote: d.header?.deliveryNote || d.deliveryNote || "",
              rows: mappedRows.length > 0 ? mappedRows : [EMPTY_ROW()],
            });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetch();
    }
  }, [id, editData]);

  const setForm = (updater) => {
    setFormRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveDraft(next);
      return next;
    });
  };

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleCustomerSelect = (cust) => {
    if (!cust) {
      setForm((p) => ({
        ...p,
        customer: "",
        partyCode: "",
        gstNo: "",
        email: "",
        companyName: "",
        address: "",
        stateName: "",
        consignee: "",
        destination: "",
      }));
      return;
    }
    setForm((p) => ({
      ...p,
      customer: cust.name || cust.companyName || "",
      partyCode: cust.partyCode || "",
      gstNo: cust.gstNo || "",
      email: cust.email || "",
      companyName: cust.companyName || "",
      address: cust.address || "",
      stateName: cust.state || "",
      consignee: cust.consignee || "",
      destination: cust.destination || "",
    }));
  };

  const {
    challanType,
    challanNo,
    challanDate,
    soReference,
    ewayBillNo,    
    customer,
    partyCode,
    gstNo,
    email,
    companyName,
    address,
    stateName,
    consignee,
    destination,
    invoiceNos,
    approxInvoiceDate,
    vehicleNo,
    driverName,
    driverContact,
    deliveryNote,
    rows,
  } = form;

  const setRows = (updater) =>
    setForm((p) => ({
      ...p,
      rows: typeof updater === "function" ? updater(p.rows) : updater,
    }));

  const addRow = () => setRows((p) => [...p, EMPTY_ROW()]);
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));

  const handleDescriptionChange = (i, value) => {
    setRows((p) => {
      const n = [...p];
      n[i] = {
        ...n[i],
        description: value,
        productCode: "",
        hsn: "",
        unit: "",
        stock: 0,
        stockChecked: false,
        stockAvailable: null,
      };
      return n;
    });
  };

  // ✅ Sets ALL fields including description
  const handleSelectSuggestion = (rowIdx, item) => {
    setRows((p) => {
      const n = [...p];
      n[rowIdx] = {
        ...n[rowIdx],
        description: item.description,
        productCode: item.productCode,
        hsn: item.hsn,
        unit: item.unit,
        stock: item.stock,
        stockChecked: true,
        stockAvailable: item.stock > 0,
      };
      return n;
    });
  };

  const updateRowField = (i, field, value) => {
    setRows((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: value };
      return n;
    });
  };

  const getHeader = () => ({
    challanDate,
    soReference,
    ewayBillNo,
    customer,
    partyCode,
    gstNo,
    email,
    companyName,
    address,
    stateName,
    consignee,
    destination,
    invoiceNos,
    approxInvoiceDate,
    vehicleNo,
    driverName,
    driverContact,
    deliveryNote,
  });
const canPreview = true;
const canSave = true;

  const handleBack = () => {
    clearDraft();
    navigate("/sales/unbilled-challans");
  };
  const handleCancel = () => {
    clearDraft();
    navigate("/sales/unbilled-challans");
  };

  const adjustStock = async (items, multiplier, reasonPrefix) => {
    if (challanType === "handwrite") return; // Skip for handwrite
    for (const item of items) {
      if (!item.productCode) continue;
      try {
        const q = query(
          collection(db, "stock"),
          where("productCode", "==", item.productCode.trim().toUpperCase()),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const stockData = d.data();
          const currentQty =
            stockData.available ??
            stockData.quantity ??
            stockData.availableQty ??
            0;
          const qtyToAdjust =
            Number(item.dispatchQty) || Number(item.quantity) || 0;
          if (qtyToAdjust === 0) continue;

          const change = qtyToAdjust * multiplier;
          const newQty = currentQty + change;

          const ledgerEntry = {
            type: multiplier < 0 ? "CHALLAN_OUT" : "CHALLAN_IN",
            qty: Math.abs(change),
            balance: newQty,
            by: userInfo?.name || "Sales Manager",
            ref: challanNo,
            date: new Date().toISOString(),
            remarks: `${reasonPrefix}: ${item.description || ""}`,
          };

          await updateDoc(doc(db, "stock", d.id), {
            available: newQty,
            ledger: arrayUnion(ledgerEntry),
          });
        }
      } catch (err) {
        console.error("Stock adjustment failed for", item.productCode, err);
      }
    }
  };

  const handleSave = async () => {
    if (!challanNo.trim()) return alert("Please enter a Challan Number");
    if (!customer.trim()) return alert("Please select a Customer");
    if (!rows.some(r => (r.description || r.productCode) && Number(r.dispatchQty) > 0)) {
      return alert("Please add at least one item with a quantity");
    }

    try {
      setSaving(true);
      const data = {
        challanType,
        challanNo,
        updatedAt: serverTimestamp(),
        header: getHeader(),
        items: rows.filter((r) => r.description || r.productCode),
        status: "dispatched",
        soReference,
      };

      if (id || editData?.id) {
        // Update existing
        const docId = id || editData.id;

        // Fetch old items for stock reversal
        const oldDoc = await getDoc(doc(db, "dispatchChallans", docId));
        if (oldDoc.exists()) {
          const oldData = oldDoc.data();
          // ONLY revert if the OLD one was also inhouse
          if (oldData.items && oldData.challanType === "inhouse") {
            await adjustStock(oldData.items, 1, "Challan Edit - Revert Old");
          }
        }

        await setDoc(doc(db, "dispatchChallans", docId), data, { merge: true });
        // Also update 'challans' if it exists there for billing
        await setDoc(
          doc(db, "challans", docId),
          {
            ...data,
            totalAmount: rows.reduce(
              (s, r) => s + Number(r.dispatchQty) * Number(r.rate || 0),
              0,
            ),
          },
          { merge: true },
        );

        // Apply new stock deduction ONLY if current is inhouse
        if (challanType === "inhouse") {
          await adjustStock(data.items, -1, "Challan Edit - Apply New");
        }
      } else {
        // Create new
        data.createdAt = serverTimestamp();

        const totalAmount = rows.reduce(
          (s, r) => s + Number(r.dispatchQty) * Number(r.rate || 0),
          0,
        );

        const ref = await addDoc(collection(db, "dispatchChallans"), data);

        // Also save to 'challans' so Unbilled Challans page sees it
        await setDoc(doc(db, "challans", ref.id), {
          ...data,
          totalAmount,
          challanNo,
          partNo: rows[0]?.productCode || "",
        });

        // Deduct stock for new challan ONLY if inhouse
        if (challanType === "inhouse") {
          await adjustStock(data.items, -1, "Challan Created");
        }
      }

      clearDraft();
      setStep(2);
    } catch (e) {
      console.error(e);
      alert("Error saving challan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center font-bold text-slate-400">
        Loading challan data...
      </div>
    );

  // ── STEP 2 ────────────────────────────────────────────────────────────────
  if (step === 2) {
    const header = getHeader();
    const filledRows = rows.filter((r) => r.description);
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex items-center gap-4 bg-green-600">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <FiClipboard size={22} color="white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                Challan {id || editData ? "Updated" : "Created"} Successfully!
              </h3>
              <p className="text-sm text-white opacity-80 mt-0.5">
                {challanNo} • {challanType === "handwrite" ? "Handwrite Challan" : "Inhouse Challan"}
              </p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Challan Type", challanType === "handwrite" ? "Handwrite" : "Inhouse"],
                ["Challan No", challanNo],
                ["Customer", customer || "—"],
                ["Party Code", partyCode || "—"],
                ["GST No", gstNo || "—"],
                ["Company", companyName || "—"],
                ["Email", email || "—"],
                ["Address", address || "—"],
                ["State", stateName || "—"],
                ["Destination", destination || "—"],
                ["Consignee", consignee || "—"],
                ["SO Reference", soReference || "—"],
                ["Approx Invoice Date", approxInvoiceDate],
                ["Vehicle No", vehicleNo || "—"],
                ["Driver Contact", driverContact || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400 font-semibold">
                    {label}
                  </p>
                  <p className="text-sm text-slate-800 font-bold mt-0.5 break-words">
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
                      {r.productCode || "—"}
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
                Download Challan
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-indigo-100 border border-indigo-200 text-indigo-700 hover:bg-indigo-200 text-sm font-bold rounded-xl shadow-sm transition-all"
                >
                  <FiFileText size={18} />
                  <div>
                    <p className="font-bold leading-tight">Preview PDF</p>
                    <p className="text-xs text-indigo-500 text-opacity-70">Review on screen</p>
                  </div>
                </button>
                <button
                  onClick={async () => await exportPDF(header, filledRows, challanNo)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow"
                >
                  <FiFileText size={18} />
                  <div>
                    <p className="font-bold leading-tight">Download PDF</p>
                    <p className="text-xs text-red-200">Print ready</p>
                  </div>
                </button>
                <button
                  onClick={() => exportCSV(header, filledRows, challanNo)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-bold rounded-xl shadow"
                >
                  <FiDownload size={18} />
                  <div>
                    <p className="font-bold leading-tight">Download Excel</p>
                    <p className="text-xs text-green-200">CSV format</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep(1);
                  setFormRaw(FORM_DEFAULTS);
                  navigate("/sales/dispatch-on-challan");
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2"
              >
                <FiPlus size={14} /> New Challan
              </button>
              <button
                onClick={() => navigate("/sales/unbilled-challans")}
                className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-2"
              >
                <FiArrowLeft size={14} /> View Unbilled Challans
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1 ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
        >
          <FiArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800">
            {id || editData ? "Edit" : "Create"} Delivery Challan
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {challanType === "handwrite" ? "Handwrite Mode: No stock deduction" : "Inhouse Mode: Stock will be deducted"}
          </p>
        </div>
      </div>

      {/* Section 1 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-indigo-600">
          <h3 className="text-sm font-bold text-white">1. Challan Details</h3>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
              Challan Type <span className="text-red-400">*</span>
            </label>
            <select
              value={challanType}
              onChange={set("challanType")}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="inhouse">Inhouse Challan (Stock Deduct)</option>
              <option value="handwrite">Handwrite Challan (Manual - No Stock)</option>
            </select>
          </div>
          <Field
            label="Challan No"
            value={challanNo}
            onChange={set("challanNo")}
            placeholder="e.g. CH-2526-0001"
            required
            mono
            readOnly={!!(id || editData)}
          />
          <Field
            label="Challan Date"
            value={challanDate}
            onChange={set("challanDate")}
            type="date"
            required
          />
          <Field
            label="SO / PO Reference"
            value={soReference}
            onChange={set("soReference")}
            placeholder="e.g. EVFN/2526/02790"
          />
          <div className="col-span-2">
            <CustomerSearchInput
              customers={customers}
              value={customer}
              required
              onSelect={handleCustomerSelect}
            />
          </div>
          <Field
            label="Party Code"
            value={partyCode}
            onChange={set("partyCode")}
            placeholder="e.g. SD0006"
            mono
          />
          <Field
            label="GST Number"
            value={gstNo}
            onChange={set("gstNo")}
            placeholder="e.g. 26AAPFA5117M1Z6"
            mono
          />
          <Field
            label="Email"
            value={email}
            onChange={set("email")}
            placeholder="e.g. info@company.com"
          />
          <div className="col-span-2">
            <Field
              label="Company Name"
              value={companyName}
              onChange={set("companyName")}
              placeholder="e.g. ADITY TECH MECH"
            />
          </div>
          <Field
            label="State"
            value={stateName}
            onChange={set("stateName")}
            placeholder="e.g. Gujarat"
          />
          <div className="col-span-2">
            <Field
              label="Address"
              value={address}
              onChange={set("address")}
              placeholder="e.g. Amli Industrial Estate, DADRA AND NAGAR HAVELI, Phase 2 GIE, Silvassa - 396240"
            />
          </div>
          <Field
            label="Destination"
            value={destination}
            onChange={set("destination")}
            placeholder="e.g. VALSAD"
          />
          <div className="col-span-2">
            <Field
              label="Consignee (Ship To)"
              value={consignee}
              onChange={set("consignee")}
              placeholder="e.g. ADITY TECH MECH, Silvassa Plant"
            />
          </div>
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
          <div className="col-span-3">
            <Field
              label="Approx. Invoice Date"
              value={approxInvoiceDate}
              onChange={set("approxInvoiceDate")}
              type="date"
              required
            />
          </div>
        </div>
      </div>

      {/* Section 2: Items */}
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-sm"
        style={{ overflow: "visible" }}
      >
        <div className="px-5 py-3 bg-green-700 flex items-center justify-between rounded-t-xl">
          <h3 className="text-sm font-bold text-white">2. Items / Products</h3>
          <span className="text-xs text-green-200">
            {rows.length} row{rows.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ overflowX: "auto", overflowY: "visible" }}>
          <table
            style={{
              width: "100%",
              minWidth: "900px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase w-8">
                  SL
                </th>
                <th
                  className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase"
                  style={{ minWidth: "280px" }}
                >
                  Description{" "}
                  {challanType === "inhouse" && (
                    <span className="text-indigo-400 normal-case font-normal">
                      (type to search)
                    </span>
                  )}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">
                  Part No
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
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                  className={`transition-colors hover:bg-slate-50/50 ${row.stockChecked && row.stockAvailable ? "bg-green-50/30" : ""}`}
                >
                  <td className="px-3 py-2.5 text-sm text-slate-400 text-center">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    {challanType === "inhouse" ? (
                      <DescriptionCell
                        row={row}
                        rowIdx={i}
                        stockItems={stockItems}
                        onSelect={handleSelectSuggestion}
                        onChange={handleDescriptionChange}
                      />
                    ) : (
                      <input
                        value={row.description}
                        onChange={(e) => handleDescriptionChange(i, e.target.value)}
                        placeholder="Manual Description"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={row.productCode}
                      onChange={(e) =>
                        updateRowField(i, "productCode", e.target.value)
                      }
                      placeholder="Part No"
                      className="w-28 px-2 py-1.5 text-xs border border-slate-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={row.hsn}
                      onChange={(e) => updateRowField(i, "hsn", e.target.value)}
                      placeholder="HSN"
                      className={`w-24 px-2 py-1.5 text-xs border rounded font-mono focus:outline-none ${row.stockChecked ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={row.unit}
                      onChange={(e) =>
                        updateRowField(i, "unit", e.target.value)
                      }
                      placeholder="pcs"
                      className={`w-16 px-2 py-1.5 text-xs border rounded text-center focus:outline-none ${row.stockChecked ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {challanType === "inhouse" && row.stockChecked ? (
                      <span
                        className={`text-sm font-bold ${row.stock > 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {row.stock}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={row.dispatchQty || ""}
                      onChange={(e) =>
                        updateRowField(i, "dispatchQty", Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-20 px-2 py-1.5 text-sm border border-indigo-300 rounded text-center font-bold text-indigo-700 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={row.remarks}
                      onChange={(e) =>
                        updateRowField(i, "remarks", e.target.value)
                      }
                      placeholder="Optional"
                      className="w-28 px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(i)}
                        className="text-red-300 hover:text-red-500 transition-colors"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-xl">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            <FiPlus size={14} /> Add Row
          </button>
          <span className="text-sm text-slate-500">
            Total Qty:{" "}
            <span className="font-black text-slate-800 text-base">
              {rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0)}
            </span>
          </span>
        </div>
      </div>

      {/* Section 3: Transport */}
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
            placeholder="e.g. GJ-06-AB-1234"
          />
          <Field
            label="E-Way Bill No"
            value={ewayBillNo}
            onChange={set("ewayBillNo")}
            placeholder="e.g. 1234 5678 9012"
          />
          <Field
            label="Driver Name"
            value={driverName}
            onChange={set("driverName")}
            placeholder="e.g. Ramesh Patel"
          />
          <Field
            label="Driver Contact No"
            value={driverContact}
            onChange={set("driverContact")}
            placeholder="e.g. 98765 43210"
            mono
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

      {/* Save bar */}
      <div className="flex items-center justify-between pt-1 pb-6">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
        >
          <FiArrowLeft size={14} /> Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(true)}
            disabled={!canPreview}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg flex items-center gap-2 transition-all
              ${canPreview ? "bg-indigo-100 text-indigo-700 border border-indigo-300 hover:bg-indigo-200 shadow-sm" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"}`}
          >
            👁 Preview Challan
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`px-6 py-2.5 text-sm font-bold rounded-lg shadow transition-all flex items-center gap-2
              ${canSave && !saving ? "bg-green-600 hover:bg-green-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
          >
            <FiSave size={14} />
            {saving
              ? "Saving..."
              : id || editData
                ? "Update Challan"
                : "Create Challan"}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        header={getHeader()}
        rows={rows}
        challanNo={challanNo}
        onSave={() => { setShowPreview(false); handleSave(); }}
        saving={saving}
        onDownloadPDF={() => exportPDF(getHeader(), rows.filter(r => r.description || r.productCode), challanNo)}
      />

    </div>
  );
}
