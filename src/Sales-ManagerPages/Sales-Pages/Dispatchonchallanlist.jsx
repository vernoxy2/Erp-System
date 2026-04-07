import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import {
  FiArrowLeft,
  FiX,
  FiClipboard,
  FiFileText,
  FiDownload,
  FiPlus,
} from "react-icons/fi";

const DRAFT_KEY = "dispatch_challan_draft";
function loadDraft(initial) {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? { ...initial, ...JSON.parse(saved) } : initial;
  } catch { return initial; }
}
function saveDraft(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

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
    <div class="g3">
      <div class="cell"><div class="cl">Party Code</div><div class="cv">${header.partyCode || "—"}</div></div>
      <div class="cell"><div class="cl">Customer</div><div class="cv">${header.customer || ""}</div></div>
      <div class="cell"><div class="cl">GST No</div><div class="cv">${header.gstNo || "—"}</div></div>
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
    <td style="text-align:right">${rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0)}</td>
    <td colspan="2"></td>
  </tr></tfoot></table>
  <div class="sbox"><div class="sc">Prepared By</div><div class="sc">Checked By</div><div class="sc">Authorised Signatory</div></div>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  w.document.write(html); w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

function exportCSV(header, rows, challanNo) {
  const lines = [
    ["DELIVERY CHALLAN"], ["Challan No", challanNo], ["Date", header.challanDate], [""],
    ["Party Code", header.partyCode], ["Customer", header.customer],
    ["GST No", header.gstNo], ["Email", header.email],
    ["Company", header.companyName], ["Address", header.address],
    ["State", header.stateName], ["Destination", header.destination],
    ["Consignee", header.consignee], ["SO Reference", header.soReference],
    ["Vehicle No", header.vehicleNo], ["Driver", header.driverName],
    ["Driver Contact", header.driverContact], [""],
    ["SL", "Part No", "Description", "HSN/SAC", "Dispatch Qty", "Unit", "Remarks"],
    ...rows.map((r, i) => [i + 1, r.productCode, r.description, r.hsn, r.dispatchQty, r.unit, r.remarks || ""]),
  ];
  const csv = lines.map((r) => r.map((c) => `"${c ?? ""}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${challanNo}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function Field({ label, value, onChange, placeholder, required, type = "text", readOnly = false, mono = false }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} readOnly={readOnly}
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

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) { setSuggestions([]); setShowDrop(false); onSelect(null); return; }
    const lower = val.toLowerCase();
    const filtered = customers.filter((c) =>
      c.name?.toLowerCase().includes(lower) ||
      c.companyName?.toLowerCase().includes(lower) ||
      c.gstNo?.toLowerCase().includes(lower) ||
      c.partyCode?.toLowerCase().includes(lower) ||
      c.destination?.toLowerCase().includes(lower) ||
      c.email?.toLowerCase().includes(lower) ||
      c.phone?.toLowerCase().includes(lower)
    ).slice(0, 8);
    setSuggestions(filtered);
    setShowDrop(true);
  };

  const handleSelect = (cust) => {
    setQuery(cust.name); setShowDrop(false); setSuggestions([]); onSelect(cust);
  };

  const handleClear = () => {
    setQuery(""); setSuggestions([]); setShowDrop(false); onSelect(null);
  };

  const highlight = (text, q) => {
    if (!text || !q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-black text-indigo-600 bg-indigo-50 rounded px-0.5">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
        Customer / Buyer {required && <span className="text-red-400">*</span>}
      </label>
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg bg-white transition-all
        ${focused ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-300"}`}>
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text" value={query} onChange={handleInput}
          onFocus={() => { setFocused(true); if (query.trim().length >= 1) setShowDrop(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Search by name, party code, GST, email..."
          className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
        />
        {query && (
          <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600">
            <FiX size={14} />
          </button>
        )}
      </div>
      {showDrop && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {suggestions.length > 0 ? `${suggestions.length} customer${suggestions.length !== 1 ? "s" : ""} found` : "No results"}
            </p>
            <p className="text-[10px] text-slate-400">click to select & auto-fill</p>
          </div>
          {suggestions.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-slate-500">No customer found for "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try name, party code, GST or email</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((c) => (
                <div key={c.id} onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelect(c)}
                  className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-none group transition-colors">
                  <p className="text-sm text-slate-800 font-semibold group-hover:text-indigo-700">{highlight(c.name, query)}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {c.partyCode && <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">{highlight(c.partyCode, query)}</span>}
                    {c.gstNo && <span className="text-[11px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono">{highlight(c.gstNo, query)}</span>}
                    {c.destination && <span className="text-[11px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">{highlight(c.destination, query)}</span>}
                    {c.email && <span className="text-[11px] text-slate-400">{highlight(c.email, query)}</span>}
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
      .filter((s) =>
        (s.description || s.productName || "").toLowerCase().includes(val) ||
        (s.productCode || "").toLowerCase().includes(val)
      )
      .slice(0, 15)
      .map((s) => ({
        description: s.description || s.productName || "",
        productCode: s.productCode || "",
        hsn:         s.hsnSac || s.hsnCode || "",
        unit:        s.unit || "NOS",
        stock:       s.available ?? s.quantity ?? 0,
      }));

  const updatePos = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 340) });
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
          ${row.stockChecked && row.stockAvailable
            ? "border-green-400 bg-green-50 text-green-800"
            : row.stockChecked && !row.stockAvailable
            ? "border-red-300 bg-red-50 text-red-800"
            : "border-slate-300 bg-white"}`}
      />

      {/* ✅ Portal — attached to dropRef so outside click handler knows about it */}
      {open && items.length > 0 && ReactDOM.createPortal(
        <div
          ref={dropRef}
          style={{
            position:     "fixed",
            top:          pos.top,
            left:         pos.left,
            width:        pos.width,
            zIndex:       99999,
            background:   "white",
            border:       "1px solid #e2e8f0",
            borderRadius: "10px",
            boxShadow:    "0 10px 40px rgba(0,0,0,0.18)",
            maxHeight:    "260px",
            overflowY:    "auto",
          }}
        >
          <div style={{
            padding:      "6px 12px",
            background:   "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
            position:     "sticky",
            top:          0,
            zIndex:       1,
          }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {items.length} items found — click to select
            </p>
          </div>

          {items.map((s, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f8fafc" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#eef2ff"}
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
            >
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
                {s.description}
              </p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                {s.productCode && (
                  <span style={{ fontSize: "10px", background: "#eef2ff", color: "#4f46e5", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace", fontWeight: 700 }}>
                    {s.productCode}
                  </span>
                )}
                {s.hsn && (
                  <span style={{ fontSize: "10px", background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace" }}>
                    HSN: {s.hsn}
                  </span>
                )}
                {s.unit && (
                  <span style={{ fontSize: "10px", background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: "4px" }}>
                    {s.unit}
                  </span>
                )}
                <span style={{
                  fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, marginLeft: "auto",
                  background: s.stock > 0 ? "#f0fdf4" : "#fef2f2",
                  color:      s.stock > 0 ? "#16a34a" : "#dc2626",
                }}>
                  Stock: {s.stock}
                </span>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}

      {row.stockChecked && row.stockAvailable && (
        <p className="text-[10px] text-green-600 mt-1 font-semibold">✅ Available ({row.stock} units)</p>
      )}
      {row.stockChecked && !row.stockAvailable && (
        <p className="text-[10px] text-red-500 mt-1 font-semibold">⚠ Not available in stock</p>
      )}
    </div>
  );
}

function todayISO() { return new Date().toISOString().split("T")[0]; }

const EMPTY_ROW = () => ({
  productCode: "", description: "", hsn: "", unit: "",
  dispatchQty: 0, stock: 0, remarks: "",
  stockChecked: false, stockAvailable: null,
});

const FORM_DEFAULTS = {
  challanNo: "", challanDate: todayISO(), soReference: "",
  customer: "", partyCode: "", gstNo: "", email: "",
  companyName: "", address: "", stateName: "",
  consignee: "", destination: "", invoiceNos: "",
  approxInvoiceDate: "", vehicleNo: "", driverName: "",
  driverContact: "", deliveryNote: "",
  rows: [EMPTY_ROW()],
};

export default function DispatchOnChallan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [form, setFormRaw] = useState(() => loadDraft(FORM_DEFAULTS));

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

  const setForm = (updater) => {
    setFormRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveDraft(next);
      return next;
    });
  };

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleCustomerSelect = (cust) => {
    if (!cust) {
      setForm((p) => ({
        ...p,
        customer: "", partyCode: "", gstNo: "", email: "",
        companyName: "", address: "", stateName: "", consignee: "", destination: "",
      }));
      return;
    }
    setForm((p) => ({
      ...p,
      customer:    cust.name        || "",
      partyCode:   cust.partyCode   || "",
      gstNo:       cust.gstNo       || "",
      email:       cust.email       || "",
      companyName: cust.companyName || "",
      address:     cust.address     || "",
      stateName:   cust.state       || "",
      consignee:   cust.consignee   || "",
      destination: cust.destination || "",
    }));
  };

  const {
    challanNo, challanDate, soReference,
    customer, partyCode, gstNo, email,
    companyName, address, stateName,
    consignee, destination, invoiceNos,
    approxInvoiceDate, vehicleNo, driverName, driverContact, deliveryNote, rows,
  } = form;

  const setRows = (updater) =>
    setForm((p) => ({ ...p, rows: typeof updater === "function" ? updater(p.rows) : updater }));

  const addRow = () => setRows((p) => [...p, EMPTY_ROW()]);
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));

  const handleDescriptionChange = (i, value) => {
    setRows((p) => {
      const n = [...p];
      n[i] = {
        ...n[i],
        description:    value,
        productCode:    "",
        hsn:            "",
        unit:           "",
        stock:          0,
        stockChecked:   false,
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
        description:    item.description,
        productCode:    item.productCode,
        hsn:            item.hsn,
        unit:           item.unit,
        stock:          item.stock,
        stockChecked:   true,
        stockAvailable: item.stock > 0,
      };
      return n;
    });
  };

  const updateRowField = (i, field, value) => {
    setRows((p) => { const n = [...p]; n[i] = { ...n[i], [field]: value }; return n; });
  };

  const getHeader = () => ({
    challanDate, soReference,
    customer, partyCode, gstNo, email,
    companyName, address, stateName,
    consignee, destination, invoiceNos,
    approxInvoiceDate, vehicleNo, driverName, driverContact, deliveryNote,
  });

  const canSave = challanNo.trim() && challanDate && approxInvoiceDate && rows.some((r) => r.description && r.dispatchQty > 0);

  const handleBack = () => { clearDraft(); navigate("/sales/unbilled-challans"); };
  const handleCancel = () => { clearDraft(); navigate("/sales/unbilled-challans"); };

  const handleSave = async () => {
    try {
      setSaving(true);
      await addDoc(collection(db, "dispatchChallans"), {
        challanNo, createdAt: serverTimestamp(),
        header: getHeader(),
        items: rows.filter((r) => r.description),
        status: "dispatched", soReference,
      });
      clearDraft(); setStep(2);
    } catch (e) {
      console.error(e); alert("Error saving challan: " + e.message);
    } finally { setSaving(false); }
  };

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
              <h3 className="text-lg font-black text-white">Challan Created Successfully!</h3>
              <p className="text-sm text-white opacity-80 mt-0.5">{challanNo} • Saved to Firebase</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Challan No", challanNo], ["Customer", customer || "—"],
                ["Party Code", partyCode || "—"], ["GST No", gstNo || "—"],
                ["Company", companyName || "—"], ["Email", email || "—"],
                ["Address", address || "—"], ["State", stateName || "—"],
                ["Destination", destination || "—"], ["Consignee", consignee || "—"],
                ["SO Reference", soReference || "—"], ["Approx Invoice Date", approxInvoiceDate],
                ["Vehicle No", vehicleNo || "—"], ["Driver Contact", driverContact || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400 font-semibold">{label}</p>
                  <p className="text-sm text-slate-800 font-bold mt-0.5 break-words">{val}</p>
                </div>
              ))}
            </div>
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
              <thead>
                <tr className="bg-slate-100">
                  {["SL", "Part No", "Description", "HSN/SAC", "Dispatch Qty", "Unit"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filledRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-700">{r.productCode || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{r.description}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">{r.hsn}</td>
                    <td className="px-4 py-2.5 font-bold text-right">{r.dispatchQty}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
              <p className="text-sm font-bold text-slate-700 mb-3">Download Challan</p>
              <div className="flex gap-3">
                <button onClick={() => exportPDF(header, filledRows, challanNo)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow">
                  <FiFileText size={18} />
                  <div><p className="font-bold leading-tight">Download PDF</p><p className="text-xs text-red-200">Print ready</p></div>
                </button>
                <button onClick={() => exportCSV(header, filledRows, challanNo)}
                  className="flex items-center gap-2.5 px-5 py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-bold rounded-xl shadow">
                  <FiDownload size={18} />
                  <div><p className="font-bold leading-tight">Download Excel</p><p className="text-xs text-green-200">CSV format</p></div>
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setFormRaw(FORM_DEFAULTS); }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2">
                <FiPlus size={14} /> New Challan
              </button>
              <button onClick={() => navigate("/sales/dispatch-on-challan")}
                className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <FiArrowLeft size={14} /> View All Challans
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
        <button onClick={handleBack}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shadow-sm">
          <FiArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Create Delivery Challan</h2>
          <p className="text-sm text-slate-500 mt-0.5">Fill in the details to create a new challan</p>
        </div>
      </div>

      {/* Section 1 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-indigo-600">
          <h3 className="text-sm font-bold text-white">1. Challan Details</h3>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          <Field label="Challan No" value={challanNo} onChange={set("challanNo")} placeholder="e.g. CH-2526-001" required mono />
          <Field label="Challan Date" value={challanDate} onChange={set("challanDate")} type="date" required />
          <Field label="SO / PO Reference" value={soReference} onChange={set("soReference")} placeholder="e.g. EVFN/2526/02790" />
          <div className="col-span-3">
            <CustomerSearchInput customers={customers} value={customer} required onSelect={handleCustomerSelect} />
          </div>
          <Field label="Party Code"  value={partyCode}    onChange={set("partyCode")}    placeholder="e.g. SD0006"          mono />
          <Field label="GST Number"  value={gstNo}        onChange={set("gstNo")}        placeholder="e.g. 26AAPFA5117M1Z6" mono />
          <Field label="Email"       value={email}        onChange={set("email")}        placeholder="e.g. info@company.com"     />
          <div className="col-span-2">
            <Field label="Company Name" value={companyName} onChange={set("companyName")} placeholder="e.g. ADITY TECH MECH" />
          </div>
          <Field label="State" value={stateName} onChange={set("stateName")} placeholder="e.g. Gujarat" />
          <div className="col-span-2">
            <Field label="Address" value={address} onChange={set("address")} placeholder="e.g. Amli Industrial Estate, DADRA AND NAGAR HAVELI, Phase 2 GIE, Silvassa - 396240" />
          </div>
          <Field label="Destination" value={destination} onChange={set("destination")} placeholder="e.g. VALSAD" />
          <div className="col-span-2">
            <Field label="Consignee (Ship To)" value={consignee} onChange={set("consignee")} placeholder="e.g. ADITY TECH MECH, Silvassa Plant" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Invoice Nos (Unbilled)</label>
            <input value={invoiceNos} onChange={set("invoiceNos")} placeholder="e.g. F/0716/25-26"
              className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg bg-amber-50 text-amber-800 font-mono focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <div className="col-span-3">
            <Field label="Approx. Invoice Date" value={approxInvoiceDate} onChange={set("approxInvoiceDate")} type="date" required />
          </div>
        </div>
      </div>

      {/* Section 2: Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm" style={{ overflow: "visible" }}>
        <div className="px-5 py-3 bg-green-700 flex items-center justify-between rounded-t-xl">
          <h3 className="text-sm font-bold text-white">2. Items / Products</h3>
          <span className="text-xs text-green-200">{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ overflowX: "auto", overflowY: "visible" }}>
          <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse" }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase w-8">SL</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase" style={{ minWidth: "280px" }}>
                  Description <span className="text-indigo-400 normal-case font-normal">(type to search)</span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">Part No</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">HSN/SAC</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">Unit</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">Stock</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">Dispatch Qty <span className="text-red-400">*</span></th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">Remarks</th>
                <th className="px-3 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                  className={`transition-colors hover:bg-slate-50/50 ${row.stockChecked && row.stockAvailable ? "bg-green-50/30" : ""}`}
                >
                  <td className="px-3 py-2.5 text-sm text-slate-400 text-center">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <DescriptionCell
                      row={row}
                      rowIdx={i}
                      stockItems={stockItems}
                      onSelect={handleSelectSuggestion}
                      onChange={handleDescriptionChange}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={row.productCode} onChange={(e) => updateRowField(i, "productCode", e.target.value)} placeholder="Part No"
                      className="w-28 px-2 py-1.5 text-xs border border-slate-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={row.hsn} onChange={(e) => updateRowField(i, "hsn", e.target.value)} placeholder="HSN"
                      className={`w-24 px-2 py-1.5 text-xs border rounded font-mono focus:outline-none ${row.stockChecked ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={row.unit} onChange={(e) => updateRowField(i, "unit", e.target.value)} placeholder="pcs"
                      className={`w-16 px-2 py-1.5 text-xs border rounded text-center focus:outline-none ${row.stockChecked ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50"}`} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.stockChecked
                      ? <span className={`text-sm font-bold ${row.stock > 0 ? "text-green-600" : "text-red-500"}`}>{row.stock}</span>
                      : <span className="text-slate-300 text-sm">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="number" min={0} value={row.dispatchQty || ""} onChange={(e) => updateRowField(i, "dispatchQty", Number(e.target.value))} placeholder="0"
                      className="w-20 px-2 py-1.5 text-sm border border-indigo-300 rounded text-center font-bold text-indigo-700 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={row.remarks} onChange={(e) => updateRowField(i, "remarks", e.target.value)} placeholder="Optional"
                      className="w-28 px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none" />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(i)} className="text-red-300 hover:text-red-500 transition-colors">
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
          <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
            <FiPlus size={14} /> Add Row
          </button>
          <span className="text-sm text-slate-500">
            Total Qty: <span className="font-black text-slate-800 text-base">{rows.reduce((s, r) => s + (Number(r.dispatchQty) || 0), 0)}</span>
          </span>
        </div>
      </div>

      {/* Section 3: Transport */}
      <details className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
        <summary className="px-5 py-3 bg-slate-700 cursor-pointer list-none flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">3. Transport Details <span className="text-slate-400 font-normal text-xs ml-2">(optional)</span></h3>
          <span className="text-white text-xs opacity-60 group-open:hidden">▼ Click to expand</span>
          <span className="text-white text-xs opacity-60 hidden group-open:inline">▲ Click to collapse</span>
        </summary>
        <div className="p-5 grid grid-cols-3 gap-4">
          <Field label="Vehicle No" value={vehicleNo} onChange={set("vehicleNo")} placeholder="e.g. GJ-06-AB-1234" />
          <Field label="Driver Name" value={driverName} onChange={set("driverName")} placeholder="e.g. Ramesh Patel" />
          <Field label="Driver Contact No" value={driverContact} onChange={set("driverContact")} placeholder="e.g. 98765 43210" mono />
          <div className="col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Delivery Note</label>
            <textarea value={deliveryNote} onChange={set("deliveryNote")} rows={2} placeholder="Special instructions..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
        </div>
      </details>

      {/* Save bar */}
      <div className="flex items-center justify-between pt-1 pb-6">
        <button onClick={handleCancel}
          className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
          <FiArrowLeft size={14} /> Cancel
        </button>
        <button onClick={handleSave} disabled={!canSave || saving}
          className={`px-6 py-2.5 text-sm font-bold rounded-lg shadow transition-all flex items-center gap-2
            ${canSave && !saving ? "bg-green-600 hover:bg-green-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
          <FiClipboard size={14} />
          {saving ? "Saving..." : "Create Challan"}
        </button>
      </div>
    </div>
  );
}