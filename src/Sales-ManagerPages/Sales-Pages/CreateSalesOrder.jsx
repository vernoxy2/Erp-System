import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiSend, FiX, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  FormSection,
  Input,
  Select,
  Textarea,
  Toggle,
  FileUpload,
  BtnPrimary,
  BtnSecondary,
} from "../SalesComponent/ui/index";
import { PRIORITIES } from "../data/salesData";
import { onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  increment,
  updateDoc,
  doc,
} from "firebase/firestore";

async function generateWONumber() {
  const snap = await getDocs(collection(db, "salesorders"));
  const count = snap.size + 1;
  return `WO-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
}

// ── Google-style Customer Search ──────────────────────────────────────────────
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
    setQuery(cust.name);
    setShowDrop(false);
    setSuggestions([]);
    onSelect(cust);
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
        <span className="font-black text-indigo-600 bg-indigo-50 rounded px-0.5">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        Customer {required && <span className="text-red-400">*</span>}
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
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
            <p className="text-[10px] text-slate-400">click to select & auto-fill</p>
          </div>
          {suggestions.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-slate-500">No customer found for</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">"{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try name, party code, GST or email</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((c) => (
                <div key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(c)}
                  className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-none group transition-colors">
                  <p className="text-sm text-slate-800 font-semibold group-hover:text-indigo-700">
                    {highlight(c.name, query)}
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function CreateSalesOrder() {
  const navigate = useNavigate();
  const [skuList, setSkuList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    woNumber: "",
    date: new Date().toISOString().split("T")[0],
    customer: "",
    partyCode: "",
    gstNo: "",
    email: "",
    address: "",
    companyName: "",
    state: "",
    destination: "",
    consignee: "",
    phone: "",
    salesPerson: "Current User",
    priority: "normal",
    deliveryDate: "",
    approvalRequired: true,
    specialInstructions: "",
    technicalNotes: "",
    attachment: null,
  });

  const [items, setItems] = useState([
    { stockDocId: "", sku: "", description: "", qty: 0, unit: "", stock: 0, remarks: "" },
  ]);

  useEffect(() => {
    async function init() {
      try {
        const snap = await getDocs(collection(db, "stock"));
        setSkuList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        const woNum = await generateWONumber();
        setForm((f) => ({ ...f, woNumber: woNum }));
      } catch (err) {
        console.error(err);
      } finally {
        setPageLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleCustomerSelect = (cust) => {
    if (!cust) {
      setForm((p) => ({
        ...p,
        customer: "", partyCode: "", gstNo: "", email: "",
        address: "", companyName: "", state: "", destination: "",
        consignee: "", phone: "",
      }));
      return;
    }
    setForm((p) => ({
      ...p,
      customer:    cust.name        || "",
      partyCode:   cust.partyCode   || "",
      gstNo:       cust.gstNo       || "",
      email:       cust.email       || "",
      address:     cust.address     || "",
      companyName: cust.companyName || "",
      state:       cust.state       || "",
      destination: cust.destination || "",
      consignee:   cust.consignee   || "",
      phone:       cust.phone       || "",
    }));
  };

  const handleSKUChange = (idx, productCode) => {
    const sku = skuList.find((s) => s.productCode === productCode);
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      stockDocId: sku?.id || "",
      sku: productCode,
      description: sku?.description || "",
      unit: sku?.unit || "",
      stock: sku?.available ?? 0,
    };
    setItems(newItems);
  };

  const addRow = () => setItems([...items, { stockDocId: "", sku: "", description: "", qty: 0, unit: "", stock: 0, remarks: "" }]);
  const removeRow = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async (isDraft) => {
    if (!form.customer) return alert("Please select a customer!");
    if (!isDraft && !form.deliveryDate) return alert("Please set an expected delivery date!");

    const status = isDraft ? "draft" : form.approvalRequired ? "pending_approval" : "approved";
    const now = new Date().toISOString();

    setSubmitting(true);
    try {
      await addDoc(collection(db, "salesorders"), {
        woNumber:             form.woNumber,
        date:                 form.date,
        customer:             form.customer,
        partyCode:            form.partyCode,
        gstNo:                form.gstNo,
        email:                form.email,
        address:              form.address,
        companyName:          form.companyName,
        state:                form.state,
        destination:          form.destination,
        consignee:            form.consignee,
        phone:                form.phone,
        salesPerson:          form.salesPerson,
        priority:             form.priority,
        deliveryDate:         form.deliveryDate,
        approvalRequired:     form.approvalRequired,
        specialInstructions:  form.specialInstructions,
        technicalNotes:       form.technicalNotes,
        mode: "manual",
        status,
        items,
        createdAt: serverTimestamp(),
        createdBy: form.salesPerson,
        history: [{
          action: "CREATED",
          by: form.salesPerson,
          time: now,
          description: `Order created with status: ${status}`,
        }],
      });
      await addDoc(collection(db, "notifications"), {
        type: "so_qc_pending",
        source: "so", target: "store",
        refNo: form.woNumber, invoiceNo: "", productCode: "",
        message: `🚚 New SO waiting for QC — ${form.woNumber} · ${form.customer}`,
        isRead: false, isResolved: false,
        createdAt: now, resolvedAt: null,
      });
      if (!isDraft) {
        for (const item of items) {
          if (!item.stockDocId || !item.qty) continue;
          await updateDoc(doc(db, "stock", item.stockDocId), {
            available: increment(-item.qty),
            reserved: increment(item.qty),
            lastUpdated: now,
          });
        }
      }
      alert(isDraft ? "Draft saved successfully!" : "Sales Order submitted successfully!");
      navigate("/sales/sales-orders/List");
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        <span className="text-slate-500 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Create Sales Order</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manual Entry</p>
        </div>
        <button onClick={() => navigate("/sales/sales-orders")} className="text-sm text-slate-500 hover:text-slate-700">
          <FiX size={20} />
        </button>
      </div>

      {/* SECTION 1: Basic Details */}
      <FormSection title="1. Basic Details">

        {/* Row 1: SO No + Date */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Sales Order No" value={form.woNumber} readOnly />
          <Input label="Date" type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>

        {/* Google-style Customer Search */}
        <CustomerSearchInput
          customers={customers}
          value={form.customer}
          required
          onSelect={handleCustomerSelect}
        />

        {/* Auto-filled: Party Code + GST No + Phone */}
        <div className="grid grid-cols-3 gap-4">
          <Input label="Party Code" value={form.partyCode}
            onChange={(e) => setForm({ ...form, partyCode: e.target.value })}
            placeholder="e.g. SD0006" />
          <Input label="GST Number" value={form.gstNo}
            onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
            placeholder="e.g. 26AAPFA5117M1Z6" />
          <Input label="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. 98765 43210" />
        </div>

        {/* Auto-filled: Email + Company */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. info@aditytech.com" />
          <Input label="Company Name" value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            placeholder="e.g. ADITY TECH MECH" />
        </div>

        {/* Auto-filled: Address + State */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input label="Address" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Amli Industrial Estate, DADRA AND NAGAR HAVELI, Phase 2 GIE, Silvassa - 396240" />
          </div>
          <Input label="State" value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            placeholder="e.g. Gujarat" />
        </div>

        {/* Auto-filled: Destination + Consignee */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Destination" value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            placeholder="e.g. VALSAD" />
          <Input label="Consignee (Ship To)" value={form.consignee}
            onChange={(e) => setForm({ ...form, consignee: e.target.value })}
            placeholder="e.g. ADITY TECH MECH, Silvassa Plant" />
        </div>

        {/* Sales Person + Priority + Delivery */}
        <div className="grid grid-cols-3 gap-4">
          <Input label="Sales Person" value={form.salesPerson} readOnly />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            options={PRIORITIES.map((p) => ({
              value: p,
              label: p.charAt(0).toUpperCase() + p.slice(1),
            }))}
          />
          <Input label="Expected Delivery" type="date" required
            value={form.deliveryDate}
            onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
        </div>

        <Toggle
          label="Approval Required?"
          checked={form.approvalRequired}
          onChange={(v) => setForm({ ...form, approvalRequired: v })}
        />
        {form.approvalRequired && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            ⚠ This sales order will be submitted to Technical Team for approval.
          </div>
        )}
      </FormSection>

      {/* SECTION 2: Product Details */}
      <FormSection title="2. Product Details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                <th className="px-3 py-2 text-left border border-slate-200">SKU</th>
                <th className="px-3 py-2 text-left border border-slate-200">Description</th>
                <th className="px-3 py-2 text-center border border-slate-200">Available Stock</th>
                <th className="px-3 py-2 text-center border border-slate-200 w-24">Required Qty</th>
                <th className="px-3 py-2 text-center border border-slate-200">Unit</th>
                <th className="px-3 py-2 text-left border border-slate-200">Remarks</th>
                <th className="px-3 py-2 text-center border border-slate-200 w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-2 border border-slate-200">
                    <select className="w-full text-xs border-none focus:ring-1 focus:ring-indigo-500 rounded"
                      value={item.sku} onChange={(e) => handleSKUChange(idx, e.target.value)}>
                      <option value="">-- Select --</option>
                      {skuList.map((s) => (
                        <option key={s.id} value={s.productCode}>{s.productCode}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 border border-slate-200 text-xs text-slate-600">
                    {item.description || "—"}
                  </td>
                  <td className={`px-2 py-2 border border-slate-200 text-center text-xs font-bold ${item.stock < item.qty ? "text-red-600" : "text-emerald-600"}`}>
                    {item.stock ?? "—"}
                  </td>
                  <td className="px-2 py-2 border border-slate-200">
                    <input type="number" min="1"
                      className="w-full text-xs text-center border-none focus:ring-1 focus:ring-indigo-500 rounded"
                      value={item.qty}
                      onChange={(e) => { const n = [...items]; n[idx].qty = +e.target.value; setItems(n); }}
                    />
                  </td>
                  <td className="px-2 py-2 border border-slate-200 text-xs text-center">{item.unit || "—"}</td>
                  <td className="px-2 py-2 border border-slate-200">
                    <input type="text"
                      className="w-full text-xs border-none focus:ring-1 focus:ring-indigo-500 rounded"
                      value={item.remarks}
                      onChange={(e) => { const n = [...items]; n[idx].remarks = e.target.value; setItems(n); }}
                    />
                  </td>
                  <td className="px-2 py-2 border border-slate-200 text-center">
                    {items.length > 1 && (
                      <button onClick={() => removeRow(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRow}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors">
          <FiPlus size={12} /> Add Row
        </button>
      </FormSection>

      {/* SECTION 3: Additional Details */}
      <FormSection title="3. Additional Details">
        <Textarea label="Special Instructions" value={form.specialInstructions}
          onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
          placeholder="Any special delivery or handling instructions..." />
        <Textarea label="Notes for Technical Team" value={form.technicalNotes}
          onChange={(e) => setForm({ ...form, technicalNotes: e.target.value })}
          placeholder="Technical specifications, quality requirements, etc..." />
        <FileUpload label="Attachment (Optional)" file={form.attachment}
          onChange={(e) => setForm({ ...form, attachment: e.target.files[0] })}
          onRemove={() => setForm({ ...form, attachment: null })} />
      </FormSection>

      {/* Buttons */}
      <div className="flex items-center gap-3 justify-end sticky bottom-0 bg-white p-4 border-t border-slate-200 rounded-xl shadow-lg">
        <BtnSecondary onClick={() => navigate("/sales/sales-orders/list")} disabled={submitting}>
          <FiX size={14} /> Cancel
        </BtnSecondary>
        <BtnSecondary onClick={() => handleSubmit(true)} disabled={submitting}>
          <FiSave size={14} /> {submitting ? "Saving..." : "Save as Draft"}
        </BtnSecondary>
        <BtnPrimary onClick={() => handleSubmit(false)} disabled={submitting}>
          <FiSend size={14} /> {submitting ? "Submitting..." : "Submit Sales Order"}
        </BtnPrimary>
      </div>
    </div>
  );
}