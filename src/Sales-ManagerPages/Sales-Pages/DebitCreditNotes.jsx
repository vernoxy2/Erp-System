import React, { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp, getDoc, where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import {
  FiPlus, FiFileText, FiCheckCircle, FiXCircle,
  FiClock, FiAlertTriangle, FiEye, FiX,
  FiSend, FiRefreshCw
} from "react-icons/fi";

const DB = {
  EXCEL: "excelupload",
  STOCK: "stock",
  NOTES: "debitCreditNotes",
  USER:  "user",
};

const STATUS = {
  draft:    { label: "Draft",    color: "bg-slate-100 text-slate-600",     icon: FiFileText },
  sent:     { label: "Sent",     color: "bg-blue-100 text-blue-600",       icon: FiSend },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-600", icon: FiCheckCircle },
  settled:  { label: "Settled",  color: "bg-indigo-100 text-indigo-600",   icon: FiRefreshCw },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-600",         icon: FiXCircle },
};

const REASONS = [
  { value: "short_supply", label: "Short Supply — Less material received" },
  { value: "damage",       label: "Damaged Goods — Material received damaged" },
  { value: "wrong_item",   label: "Wrong Item — Incorrect material received" },
  { value: "overcharge",   label: "Overcharge — Excess amount charged" },
  { value: "return",       label: "Return to Vendor" },
];

const emptyItem = () => ({ itemName: "", quantity: "", rate: "", amount: 0 });

export default function DebitCreditNotes() {
  const [notes,        setNotes]        = useState([]);
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [viewNote,     setViewNote]     = useState(null);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [userRole,     setUserRole]     = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    type:            "debit",
    linkedInvoiceId: "",
    linkedInvoiceNo: "",
    linkedPoNo:      "",
    vendorName:      "",
    reason:          "short_supply",
    items:           [emptyItem()],
    stockImpact:     false,
    remarks:         "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const snap = await getDoc(doc(db, DB.USER, user.uid));
        if (snap.exists()) setUserRole(snap.data().role || "user");
        fetchAll();
      }
    });
    return () => unsub();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const notesSnap = await getDocs(
      query(collection(db, DB.NOTES), orderBy("createdAt", "desc"))
    );
    setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const invSnap = await getDocs(
      query(
        collection(db, DB.EXCEL),
        where("type", "==", "INVOICE"),
        where("storeQcStatus", "==", "approved")
      )
    );
    setInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleInvoiceSelect = (invoiceId) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    setForm(f => ({
      ...f,
      linkedInvoiceId: invoiceId,
      linkedInvoiceNo: inv.invoiceNo || "",
      linkedPoNo:      inv.linkedPoNo || "",
      vendorName:      inv.vendor || inv.supplier || inv.consignee || "",
      items: Array.isArray(inv.items) && inv.items.length > 0
        ? inv.items.map(item => ({
            itemName: item.description || item.itemName || "",
            quantity: "",
            rate:     item.rate || item.unitPrice || "",
            amount:   0,
          }))
        : [emptyItem()],
    }));
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...form.items];
    updated[idx][field] = value;
    if (field === "quantity" || field === "rate") {
      updated[idx].amount =
        (parseFloat(updated[idx].quantity) || 0) *
        (parseFloat(updated[idx].rate) || 0);
    }
    setForm(f => ({ ...f, items: updated }));
  };

  const totalAmount = form.items.reduce((s, i) => s + (i.amount || 0), 0);

  const generateNoteNumber = (type) => {
    const prefix = type === "debit" ? "DN" : "CN";
    return `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
  };

  const handleSubmit = async () => {
    if (!form.vendorName || !form.items[0].itemName) {
      alert("Please enter vendor name and at least one item.");
      return;
    }
    setSubmitting(true);
    await addDoc(collection(db, DB.NOTES), {
      ...form,
      noteNumber:    generateNoteNumber(form.type),
      totalAmount,
      status:        "draft",
      createdBy:     currentUser.uid,
      createdAt:     serverTimestamp(),
      approvedBy:    null,
      approvedAt:    null,
      stockAdjusted: false,
    });
    setForm({
      type: "debit", linkedInvoiceId: "", linkedInvoiceNo: "",
      linkedPoNo: "", vendorName: "", reason: "short_supply",
      items: [emptyItem()], stockImpact: false, remarks: "",
    });
    setShowForm(false);
    fetchAll();
    setSubmitting(false);
  };

  const updateStatus = async (noteId, newStatus, note) => {
    const updateData = { status: newStatus };
    if (newStatus === "accepted") {
      updateData.approvedBy = currentUser.uid;
      updateData.approvedAt = serverTimestamp();
      if (note.stockImpact && note.reason === "return") {
        const stockSnap = await getDocs(collection(db, DB.STOCK));
        for (const item of note.items) {
          if (!item.itemName) continue;
          for (const stockDoc of stockSnap.docs) {
            const sd = stockDoc.data();
            if (sd.itemName?.toLowerCase() === item.itemName.toLowerCase()) {
              await updateDoc(doc(db, DB.STOCK, stockDoc.id), {
                quantity: Math.max(
                  0,
                  (parseFloat(sd.quantity) || 0) - (parseFloat(item.quantity) || 0)
                ),
              });
            }
          }
        }
        updateData.stockAdjusted = true;
      }
    }
    await updateDoc(doc(db, DB.NOTES, noteId), updateData);
    fetchAll();
    if (viewNote?.id === noteId) setViewNote(v => ({ ...v, status: newStatus }));
  };

  const filtered = notes.filter(n => {
    if (filterType   !== "all" && n.type   !== filterType)   return false;
    if (filterStatus !== "all" && n.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    debit:   notes.filter(n => n.type === "debit").length,
    credit:  notes.filter(n => n.type === "credit").length,
    pending: notes.filter(n => ["draft","sent"].includes(n.status)).length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Debit / Credit Notes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vendor disputes, returns and amount adjustments</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <FiPlus size={16} /> New Note
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Debit Notes",    val: counts.debit,   bg: "bg-red-50 border-red-200",         text: "text-red-600",     Icon: FiAlertTriangle },
          { label: "Credit Notes",   val: counts.credit,  bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-600", Icon: FiCheckCircle },
          { label: "Pending Action", val: counts.pending, bg: "bg-amber-50 border-amber-200",     text: "text-amber-600",   Icon: FiClock },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 ${c.bg} flex items-center gap-4`}>
            <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${c.text}`}>
              <c.Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className={`text-2xl font-bold ${c.text}`}>{c.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{v:"all",l:"All"},{v:"debit",l:"Debit"},{v:"credit",l:"Credit"}].map(b => (
          <button key={b.v} onClick={() => setFilterType(b.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
              ${filterType===b.v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
            {b.l}
          </button>
        ))}
        <div className="w-px bg-slate-200 mx-1" />
        {Object.entries(STATUS).map(([key, val]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus===key ? "all" : key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
              ${filterStatus===key ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
            {val.label}
          </button>
        ))}
      </div>

      {/* Notes Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FiFileText size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No notes found</p>
            <p className="text-slate-400 text-sm mt-1">Create your first note</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Note #","Type","Vendor","Invoice #","PO #","Reason","Amount","Status","Stock","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(note => {
                  const s = STATUS[note.status] || STATUS.draft;
                  return (
                    <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{note.noteNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${note.type==="debit" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                          {note.type==="debit" ? "Debit" : "Credit"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{note.vendorName}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{note.linkedInvoiceNo || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-indigo-600">{note.linkedPoNo || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{REASONS.find(r=>r.value===note.reason)?.label?.split("—")[0] || note.reason}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">₹{Number(note.totalAmount||0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${s.color}`}>
                          <s.icon size={11}/> {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {note.stockImpact
                          ? <span className={`text-xs font-bold ${note.stockAdjusted ? "text-emerald-600":"text-amber-600"}`}>
                              {note.stockAdjusted ? "✅ Done" : "⏳ Pending"}
                            </span>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => setViewNote(note)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <FiEye size={15}/>
                          </button>
                          {note.status==="draft" && (
                            <button onClick={() => updateStatus(note.id,"sent",note)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-semibold">Send</button>
                          )}
                          {note.status==="sent" && ["store_manager","admin"].includes(userRole) && (
                            <>
                              <button onClick={() => updateStatus(note.id,"accepted",note)}
                                className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 font-semibold">Accept</button>
                              <button onClick={() => updateStatus(note.id,"rejected",note)}
                                className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold">Reject</button>
                            </>
                          )}
                          {note.status==="accepted" && (
                            <button onClick={() => updateStatus(note.id,"settled",note)}
                              className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-semibold">Settle</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Note Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New Debit / Credit Note</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select an approved invoice → fill in issue details</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><FiX/></button>
            </div>

            <div className="p-6 space-y-5">

              {/* Note Type */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Note Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value:"debit",  label:"Debit Note",  desc:"Raised against vendor for loss or dispute", color:"text-red-600",     active:"border-red-400 bg-red-50" },
                    { value:"credit", label:"Credit Note", desc:"Credit received from vendor",               color:"text-emerald-600", active:"border-emerald-400 bg-emerald-50" },
                  ].map(t => (
                    <button key={t.value} onClick={() => setForm(f=>({...f,type:t.value}))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${form.type===t.value ? t.active : "border-slate-200 hover:border-slate-300"}`}>
                      <p className={`text-sm font-bold ${t.color}`}>{t.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Linked Invoice */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Linked Invoice *</label>
                <select value={form.linkedInvoiceId} onChange={e => handleInvoiceSelect(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                  <option value="">— Select an invoice —</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      Invoice #{inv.invoiceNo} | PO: {inv.linkedPoNo||"—"} | {inv.vendor||inv.supplier||inv.consignee}
                    </option>
                  ))}
                </select>
                {invoices.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <FiAlertTriangle size={12}/> No approved invoices found — get Store Manager approval first
                  </p>
                )}
              </div>

              {/* Vendor & PO */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Vendor</label>
                  <input value={form.vendorName} onChange={e => setForm(f=>({...f,vendorName:e.target.value}))}
                    placeholder="Auto-filled from invoice"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Linked PO #</label>
                  <input value={form.linkedPoNo} readOnly
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"/>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Reason *</label>
                <select value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                  {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items *</label>
                  <button onClick={() => setForm(f=>({...f,items:[...f.items,emptyItem()]}))}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                    <FiPlus size={12}/> Add Row
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Item Name","Qty","Rate (₹)","Amount",""].map(h=>(
                          <th key={h} className="px-3 py-2 text-left text-xs font-bold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2">
                            <input value={item.itemName} onChange={e=>handleItemChange(idx,"itemName",e.target.value)}
                              placeholder="Item name"
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400"/>
                          </td>
                          <td className="px-2 py-2 w-20">
                            <input type="number" value={item.quantity} onChange={e=>handleItemChange(idx,"quantity",e.target.value)}
                              placeholder="0"
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400"/>
                          </td>
                          <td className="px-2 py-2 w-24">
                            <input type="number" value={item.rate} onChange={e=>handleItemChange(idx,"rate",e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400"/>
                          </td>
                          {/* <td className="px-2 py-2 w-24 font-bold text-slate-700 text-xs">₹{(item.amount||0).toFixed(2)}</td> */}
                          <td className="px-2 py-2 w-8">
                            {form.items.length>1 && (
                              <button onClick={()=>setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}))}
                                className="text-red-400 hover:text-red-600"><FiX size={14}/></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  
                  </table>
                </div>
              </div>

              {/* Stock Impact Toggle */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-colors
                ${form.stockImpact ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}>
                <div>
                  <p className="text-sm font-bold text-slate-800">Stock Impact?</p>
                  <p className="text-xs text-slate-500 mt-0.5">For return cases — quantity will be automatically deducted from stock once accepted</p>
                </div>
                <button onClick={()=>setForm(f=>({...f,stockImpact:!f.stockImpact}))}
                  className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.stockImpact ? "bg-amber-500":"bg-slate-300"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.stockImpact?"translate-x-6":"translate-x-0.5"}`}/>
                </button>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Remarks</label>
                <textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))}
                  rows={2} placeholder="Additional notes..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"/>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button onClick={()=>setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50">
                {submitting ? "Saving..." : "Create Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Note Modal */}
      {viewNote && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-400 font-mono">{viewNote.noteNumber}</p>
                <h2 className="text-lg font-bold text-slate-800 capitalize">{viewNote.type} Note</h2>
              </div>
              <div className="flex items-center gap-3">
                {(()=>{ const s=STATUS[viewNote.status]; return (
                  <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${s.color}`}>
                    <s.icon size={12}/> {s.label}
                  </span>
                ); })()}
                <button onClick={()=>setViewNote(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><FiX/></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Vendor",    viewNote.vendorName],
                  ["Invoice #", viewNote.linkedInvoiceNo||"—"],
                  ["PO #",      viewNote.linkedPoNo||"—"],
                  ["Reason",    REASONS.find(r=>r.value===viewNote.reason)?.label?.split("—")[0]||viewNote.reason],
                  ["Total",     `₹${Number(viewNote.totalAmount||0).toLocaleString()}`],
                  ["Stock",     viewNote.stockImpact?(viewNote.stockAdjusted?"✅ Adjusted":"⏳ Pending"):"No impact"],
                ].map(([k,v])=>(
                  <div key={k} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">{k}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{v}</p>
                  </div>
                ))}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>{["Item","Qty","Rate","Amount"].map(h=>(
                      <th key={h} className="px-3 py-2 text-left text-xs font-bold text-slate-500">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewNote.items||[]).map((item,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-700">{item.itemName}</td>
                        <td className="px-3 py-2 text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-slate-600">₹{item.rate}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">₹{Number(item.amount||0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold text-slate-600">Total:</td>
                      <td className="px-3 py-2 font-bold text-indigo-700">₹{Number(viewNote.totalAmount||0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {viewNote.remarks && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Remarks</p>
                  <p className="text-sm text-slate-700">{viewNote.remarks}</p>
                </div>
              )}

              {/* Status Timeline */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Status Timeline</p>
                <div className="flex items-center gap-1">
                  {["draft","sent","accepted","settled"].map((s,i)=>{
                    const order=["draft","sent","accepted","settled"];
                    const curIdx=order.indexOf(viewNote.status);
                    const stepIdx=order.indexOf(s);
                    const isDone=viewNote.status!=="rejected" && curIdx>=stepIdx;
                    const cfg=STATUS[s];
                    return (
                      <React.Fragment key={s}>
                        <div className={`flex flex-col items-center ${isDone?"opacity-100":"opacity-35"}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDone?"bg-indigo-600":"bg-slate-200"}`}>
                            <cfg.icon size={13} className={isDone?"text-white":"text-slate-400"}/>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1">{cfg.label}</span>
                        </div>
                        {i<3 && <div className={`flex-1 h-0.5 mb-4 ${isDone&&curIdx>stepIdx?"bg-indigo-400":"bg-slate-200"}`}/>}
                      </React.Fragment>
                    );
                  })}
                </div>
                {viewNote.status==="rejected" && (
                  <p className="text-xs text-red-500 font-semibold mt-2 text-center">❌ This note has been rejected</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}