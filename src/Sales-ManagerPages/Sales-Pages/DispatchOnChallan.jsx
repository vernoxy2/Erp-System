import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import logo from "../../assets/logo.svg";
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
const DRAFT_VERSION = 2;

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

// ── PDF Export ────────────────────────────────────────────────────────────────
// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF(header, rows, challanNo) {
  const totalQty = rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0);
  const logoUrl = window.location.origin + logo;

  const makeFullHTML = (copyLabel) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Delivery Challan - ${challanNo} - ${copyLabel}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
  .challan { width: 100%; padding: 16px 20px; }
  .co-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 2px solid #111; border-bottom: none; padding: 10px 14px; background: #f8fafc; }
  .co-logo-name { display: flex; align-items: center; gap: 12px; }
  .co-logo { height: 50px; width: auto; }
  .co-name { font-size: 26px; font-weight: 900; color: #1e3a5f; letter-spacing: 1px; text-transform: uppercase; }
  .co-tagline { font-size: 9px; color: #64748b; letter-spacing: 0.5px; margin-top: 2px; }
  .co-address { text-align: right; font-size: 9.5px; color: #374151; line-height: 1.6; }
  .dc-title { text-align: center; font-size: 14px; font-weight: bold; text-decoration: underline; padding: 7px; border: 2px solid #111; border-top: none; border-bottom: none; background: #fff; letter-spacing: 1px; }
  .copy-label { font-size: 10px; font-weight: normal; text-decoration: none; color: #555; border: 1px solid #999; padding: 1px 6px; border-radius: 3px; vertical-align: middle; }
  .g2 { display: grid; grid-template-columns: 1fr 1fr; border-left: 2px solid #111; border-right: 2px solid #111; border-bottom: 1px solid #111; }
  .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; border-left: 2px solid #111; border-right: 2px solid #111; border-bottom: 1px solid #111; }
  .cell { padding: 4px 8px; border-right: 1px solid #111; }
  .cell:last-child { border-right: none; }
  .cl { font-size: 8px; color: #555; font-weight: bold; text-transform: uppercase; }
  .cv { font-size: 10.5px; font-weight: bold; margin-top: 1px; word-break: break-word; }
  .stitle { background: #1e293b; color: white; padding: 4px 8px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; border-left: 2px solid #111; border-right: 2px solid #111; }
  table { width: 100%; border-collapse: collapse; border-left: 2px solid #111; border-right: 2px solid #111; }
  th { background: #f1f5f9; padding: 5px 7px; text-align: left; font-size: 9.5px; font-weight: bold; border: 1px solid #111; text-transform: uppercase; }
  td { padding: 4px 7px; border: 1px solid #ccc; font-size: 10.5px; }
  tfoot td { font-weight: bold; background: #f1f5f9; border-top: 2px solid #111; border-bottom: 2px solid #111; }
  .sbox { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 2px solid #111; border-top: none; }
  .sc { padding: 28px 10px 8px; border-right: 1px solid #111; text-align: center; font-size: 9.5px; font-weight: bold; }
  .sc:last-child { border-right: none; }
</style>
</head>
<body>
<div class="challan">
  <div class="co-header">
    <div class="co-logo-name">
      <img src="${logoUrl}" alt="Logo" class="co-logo" onerror="this.style.display='none'" />
      <div class="co-name-block">
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
  <div class="dc-title">DELIVERY CHALLAN &nbsp;&nbsp;<span class="copy-label">${copyLabel}</span></div>
  <div class="g3">
    <div class="cell"><div class="cl">Challan No</div><div class="cv">${challanNo}</div></div>
    <div class="cell"><div class="cl">Date</div><div class="cv">${header.challanDate || ""}</div></div>
    <div class="cell"><div class="cl">SO Reference</div><div class="cv">${header.soReference || ""}</div></div>
  </div>
  <div class="g3">
    <div class="cell"><div class="cl">Party Code</div><div class="cv">${header.customer || ""}</div></div>
    <div class="cell"><div class="cl">Customer</div><div class="cv">${header.companyName || ""}</div></div>
    <div class="cell"><div class="cl">E-Way Bill No</div><div class="cv">${header.ewayBillNo || "—"}</div></div>
  </div>
  <div class="g2">
    <div class="cell"><div class="cl">Company</div><div class="cv">${header.companyName || ""}</div></div>
    <div class="cell"><div class="cl">Email</div><div class="cv">&nbsp;</div></div>
  </div>
  <div class="g2">
    <div class="cell"><div class="cl">Address</div><div class="cv">${header.address || ""}</div></div>
    <div class="cell"><div class="cl">State</div><div class="cv">${header.stateName || ""}</div></div>
  </div>
  <div class="g2">
    <div class="cell"><div class="cl">Consignee</div><div class="cv">${header.consignee || ""}</div></div>
    <div class="cell"><div class="cl">Destination</div><div class="cv">${header.destination || ""}</div></div>
  </div>
  <div class="g2">
    <div class="cell"><div class="cl">Approx Invoice Date</div><div class="cv">${header.approxInvoiceDate || ""}</div></div>
    <div class="cell"><div class="cl">Invoice Nos</div><div class="cv">${header.invoiceNos || ""}</div></div>
  </div>
  <div class="g3">
    <div class="cell"><div class="cl">Vehicle No</div><div class="cv">${header.vehicleNo || "—"}</div></div>
    <div class="cell"><div class="cl">Driver</div><div class="cv">${header.driverName || "—"}</div></div>
    <div class="cell"><div class="cl">Driver Contact</div><div class="cv">${header.driverContact || "—"}</div></div>
  </div>
  <div class="stitle">ITEMS / PRODUCTS</div>
  <table>
    <thead>
      <tr>
        <th style="width:28px">SL</th>
        <th>Part No</th>
        <th>Description</th>
        <th>HSN/SAC</th>
        <th style="text-align:right">Qty</th>
        <th>Unit</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><b>${r.productCode || ""}</b></td>
          <td>${r.description || ""}</td>
          <td>${r.hsn || ""}</td>
          <td style="text-align:right"><b>${r.dispatchQty || 0}</b></td>
          <td>${r.unit || ""}</td>
          <td>${r.remarks || ""}</td>
        </tr>`).join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right">TOTAL</td>
        <td style="text-align:right">${totalQty}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>
  <div class="sbox">
    <div class="sc">Prepared By</div>
    <div class="sc">Checked By</div>
    <div class="sc">Authorised Signatory</div>
  </div>
</div>
</body>
</html>`;

  // ── 3 અલગ tabs ખોલો — દરેકમાં 1 copy ──
  const copies = ["ORIGINAL COPY", "TRANSPORTER COPY", "OFFICE COPY"];
  copies.forEach((label, index) => {
    setTimeout(() => {
      const w = window.open("", "_blank");
      if (!w) {
        alert("❌ Popup blocked! Please allow popups for this site.");
        return;
      }
      w.document.open();
      w.document.write(makeFullHTML(label));
      w.document.close();
      w.onload = () => {
        setTimeout(() => {
          w.focus();
          w.print();
        }, 400);
      };
    }, index * 600);
  });
}
function exportCSV(header, rows, challanNo) {
  const lines = [
    ["DELIVERY CHALLAN"],
    ["Challan No", challanNo],
    ["Date", header.challanDate],
    ["E-Way Bill No", header.ewayBillNo],
    [""],
    ["Customer", header.customer],
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

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const FORM_DEFAULTS = {
  challanNo: "",
  challanDate: todayISO(),
  soReference: "",
  ewayBillNo: "",
  customer: "",
  companyName: "",
  address: "",
  stateName: "",
  consignee: "",
  destination: "",
  invoiceNos: "",
  approxInvoiceDate: "",
  vehicleNo: "",
  driverName: "",
  driverContact: "",
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

function PreviewModal({
  open,
  onClose,
  header,
  rows,
  challanNo,
  onSave,
  saving,
  onDownloadPDF,
}) {
  if (!open) return null;
  const totalQty = rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0);
  const filledRows = rows.filter((r) => r.description || r.productCode);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "24px 16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "860px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "#1e293b",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                color: "white",
                fontWeight: 800,
                fontSize: "16px",
                margin: 0,
              }}
            >
              📋 Challan Preview
            </p>
            <p
              style={{ color: "#94a3b8", fontSize: "12px", margin: "2px 0 0" }}
            >
              Review before creating — exactly how PDF will look
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              borderRadius: "8px",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Challan Preview Body */}
        <div style={{ padding: "24px", background: "#f8fafc" }}>
          <div
            style={{
              background: "white",
              border: "2px solid #111",
              fontFamily: "Arial, sans-serif",
              fontSize: "11px",
              color: "#111",
            }}
          >
            {/* Company Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "#1e3a5f",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  FIB2FAB
                </div>
                <div style={{ fontSize: "9px", color: "#64748b" }}>
                  Quality Piping Solutions
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: "9px",
                  color: "#374151",
                  lineHeight: "1.6",
                }}
              >
                506, 4th Floor, Tirupati Tower, GIDC Char Rasta
                <br />
                Vapi – 396195, Gujarat – India
                <br />
                +91-7096040970 | gujarat@fib2fabindia.com
              </div>
            </div>

            {/* Title */}
            <div
              style={{
                textAlign: "center",
                fontSize: "13px",
                fontWeight: "bold",
                textDecoration: "underline",
                padding: "7px",
                borderBottom: "1px solid #111",
                letterSpacing: "1px",
              }}
            >
              DELIVERY CHALLAN &nbsp;
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: "normal",
                  textDecoration: "none",
                  color: "#555",
                  border: "1px solid #999",
                  padding: "1px 6px",
                  borderRadius: "3px",
                }}
              >
                ORIGINAL COPY
              </span>
            </div>

            {/* Grid Rows */}
            {[
              [
                ["Challan No", challanNo || "—"],
                ["Date", header.challanDate || "—"],
                ["SO Reference", header.soReference || "—"],
              ],
              [
                ["Party Code", header.partyCode || "—"],
                ["Customer", header.customer || "—"],
                ["E-Way Bill No", header.ewayBillNo || "—"],
              ],
              [
                ["Company", header.companyName || "—"],
                ["Email", header.email || "—"],
              ],
              [
                ["Address", header.address || "—"],
                ["State", header.stateName || "—"],
              ],
              [
                ["Consignee", header.consignee || "—"],
                ["Destination", header.destination || "—"],
              ],
              [
                ["Approx Invoice Date", header.approxInvoiceDate || "—"],
                ["Invoice Nos", header.invoiceNos || "—"],
              ],
              [
                ["Vehicle No", header.vehicleNo || "—"],
                ["Driver", header.driverName || "—"],
                ["Driver Contact", header.driverContact || "—"],
              ],
            ].map((cells, ri) => (
              <div
                key={ri}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    cells.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
                  borderBottom: "1px solid #ccc",
                }}
              >
                {cells.map(([label, val], ci) => (
                  <div
                    key={ci}
                    style={{
                      padding: "4px 8px",
                      borderRight:
                        ci < cells.length - 1 ? "1px solid #ccc" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "8px",
                        color: "#555",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: "bold",
                        marginTop: "1px",
                        wordBreak: "break-word",
                        color: val === "—" ? "#bbb" : "#111",
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Items Table */}
            <div
              style={{
                background: "#1e293b",
                color: "white",
                padding: "4px 8px",
                fontSize: "9px",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              ITEMS / PRODUCTS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {[
                    "SL",
                    "Part No",
                    "Description",
                    "HSN/SAC",
                    "Qty",
                    "Unit",
                    "Remarks",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 7px",
                        textAlign: h === "Qty" ? "right" : "left",
                        fontSize: "9px",
                        fontWeight: "bold",
                        border: "1px solid #ccc",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filledRows.length > 0 ? (
                  filledRows.map((r, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          padding: "4px 7px",
                          border: "1px solid #e2e8f0",
                          fontSize: "10px",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td
                        style={{
                          padding: "4px 7px",
                          border: "1px solid #e2e8f0",
                          fontSize: "10px",
                          fontWeight: "bold",
                          color: "#4f46e5",
                          fontFamily: "monospace",
                        }}
                      >
                        {r.productCode || "—"}
                      </td>
                      <td
                        style={{
                          padding: "4px 7px",
                          border: "1px solid #e2e8f0",
                          fontSize: "10px",
                        }}
                      >
                        {r.description || "—"}
                      </td>
                      <td
                        style={{
                          padding: "4px 7px",
                          border: "1px solid #e2e8f0",
                          fontSize: "10px",
                          fontFamily: "monospace",
                        }}
                      >
                        {r.hsn || "—"}
                      </td>
                      <td
                        style={{
                          padding: "4px 7px",
                          border: "1px solid #e2e8f0",
                          fontSize: "10px",
                          fontWeight: "bold",
                          textAlign: "right",
                        }}
                      >
                        {r.dispatchQty || 0}
                      </td>
                      <td
                        style={{
                          padding: "4px 7px",
                          border: "1px solid #e2e8f0",
                          fontSize: "10px",
                        }}
                      >
                        {r.unit || "—"}
                      </td>
                      <td
                        style={{
                          padding: "4px 7px",
                          border: "1px solid #e2e8f0",
                          fontSize: "10px",
                          color: "#888",
                        }}
                      >
                        {r.remarks || ""}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "11px",
                      }}
                    >
                      No items added yet
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f1f5f9" }}>
                  <td
                    colSpan={4}
                    style={{
                      padding: "5px 7px",
                      textAlign: "right",
                      fontWeight: "bold",
                      fontSize: "10px",
                      border: "2px solid #111",
                      borderRight: "1px solid #ccc",
                    }}
                  >
                    TOTAL
                  </td>
                  <td
                    style={{
                      padding: "5px 7px",
                      fontWeight: "bold",
                      fontSize: "11px",
                      textAlign: "right",
                      border: "2px solid #111",
                      borderLeft: "none",
                    }}
                  >
                    {totalQty}
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      border: "2px solid #111",
                      borderLeft: "1px solid #ccc",
                    }}
                  ></td>
                </tr>
              </tfoot>
            </table>

            {/* Signature */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                borderTop: "1px solid #111",
              }}
            >
              {["Prepared By", "Checked By", "Authorised Signatory"].map(
                (label, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "28px 10px 8px",
                      borderRight: i < 2 ? "1px solid #111" : "none",
                      textAlign: "center",
                      fontSize: "9px",
                      fontWeight: "bold",
                    }}
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Copies note */}
          <p
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: "#64748b",
              marginTop: "12px",
            }}
          >
            📌 PDF download કરવાથી <strong>3 copies</strong> print થશે: Original
            · Transporter · Office
          </p>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "white",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: "white",
              color: "#64748b",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Edit Form
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onDownloadPDF}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                background: "#b91c1c",
                border: "none",
                color: "white",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📄 Download PDF
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                background: saving ? "#94a3b8" : "#16a34a",
                border: "none",
                color: "white",
                fontSize: "13px",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "⏳ Saving..." : "✅ Create Challan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function DispatchOnChallan() {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

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
    challanNo,
    challanDate,
    soReference,
    ewayBillNo,
    customer,
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
    ewayBillNo,
    customer,
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

  // const canSave =
  //   challanNo.trim() &&
  //   challanDate &&
  //   approxInvoiceDate &&
  //   rows.some((r) => r.productCode && r.dispatchQty > 0);

  // Replace with:
  const canPreview = challanNo.trim() && customer.trim();

  const canSave =
    canPreview &&
    challanDate &&
    approxInvoiceDate &&
    rows.some((r) => r.productCode && r.dispatchQty > 0);

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
      await addDoc(collection(db, "dispatchChallans"), {
        challanNo,
        createdAt: serverTimestamp(),
        header: getHeader(),
        items: rows.filter((r) => r.productCode),
        status: "dispatched",
        soReference,
      });
      clearDraft();
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
                ["E-Way Bill No", ewayBillNo || "—"],
                ["Approx Invoice Date", approxInvoiceDate],
                ["Vehicle No", vehicleNo || "—"],
                ["Driver Contact", driverContact || "—"],
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
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-indigo-100 border border-indigo-200 text-indigo-700 hover:bg-indigo-200 text-sm font-bold rounded-xl shadow-sm transition-all"
                >
                  <span className="text-lg">👁</span>
                  <div>
                    <p className="font-bold leading-tight">Preview PDF</p>
                    <p className="text-xs text-indigo-500 text-opacity-70">
                      Review on screen
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => exportPDF(header, filledRows, challanNo)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow"
                >
                  <span className="text-lg">📄</span>
                  <div>
                    <p className="font-bold leading-tight">Download PDF1</p>
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

        {/* Preview Modal for Step 2 */}
        <PreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          header={getHeader()}
          rows={rows}
          challanNo={challanNo}
          onSave={() => {
            setShowPreview(false);
            handleSave();
          }}
          saving={saving}
          onDownloadPDF={() =>
            exportPDF(
              getHeader(),
              rows.filter((r) => r.productCode),
              challanNo,
            )
          }
        />
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
      </div>

      {/* ── SECTION 1 ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-indigo-600">
          <h3 className="text-sm font-bold text-white">1. Challan Details</h3>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          {/* Challan No — manually editable */}
          <Field
            label="Challan No"
            value={challanNo}
            onChange={set("challanNo")}
            placeholder="e.g. CH-2526-001"
            required
            mono
          />

          {/* Challan Date — manually editable date picker */}
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
            label="State"
            value={stateName}
            onChange={set("stateName")}
            placeholder="e.g. Gujarat"
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
      <details
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group"
        open
      >
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
            label="E-Way Bill No"
            value={ewayBillNo}
            onChange={set("ewayBillNo")}
            placeholder="e.g. 1234 5678 9012"
          />
          <Field
            label="Driver Name"
            value={driverName}
            onChange={set("driverName")}
            placeholder="Driver name"
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
            className={`px-6 py-2.5 text-sm font-bold rounded-lg shadow transition-all
              ${canSave && !saving ? "bg-green-600 hover:bg-green-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
          >
            {saving ? "⏳ Saving..." : "📋 Create Challan"}
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
        onSave={() => {
          setShowPreview(false);
          handleSave();
        }}
        saving={saving}
        onDownloadPDF={() =>
          exportPDF(
            getHeader(),
            rows.filter((r) => r.description || r.productCode),
            challanNo,
          )
        }
      />
    </div>
  );
}
