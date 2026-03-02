import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

function StatusBadge({ status }) {
  const map = {
    complete:          { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500", label: "Ready to Dispatch" },
    ready_to_dispatch: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500", label: "Ready to Dispatch" },
    partial:           { bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-300",  dot: "bg-orange-500",  label: "Partial" },
    excess:            { bg: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-300",  dot: "bg-purple-500",  label: "Excess" },
    reserved:          { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-300",    dot: "bg-blue-500",    label: "Reserved" },
  };
  const s = map[status?.toLowerCase()] || map.reserved;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function ItemStatusBadge({ status }) {
  const map = {
    complete: "bg-emerald-100 text-emerald-700",
    ok:       "bg-emerald-100 text-emerald-700",
    partial:  "bg-orange-100 text-orange-700",
    excess:   "bg-purple-100 text-purple-700",
    reserved: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${map[status?.toLowerCase()] || "bg-slate-100 text-slate-600"}`}>
      {status || "—"}
    </span>
  );
}

function InfoField({ label, value, mono, highlight }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-sm font-semibold break-words ${mono ? "font-mono" : ""} ${highlight ? "text-indigo-700" : "text-slate-800"} ${!value ? "text-slate-300 italic" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function Section({ title, icon, color = "bg-slate-800", children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`${color} px-5 py-3 flex items-center gap-2`}>
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function ReadyToDispatchDeatils() {
  const { soId } = useParams();
  const navigate = useNavigate();
  const [so, setSo] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [challanExists, setChallanExists] = useState(false); // ← key state

  useEffect(() => {
    if (!soId) return;
    fetchSODetail();
  }, [soId]);

  const fetchSODetail = async () => {
    try {
      setLoading(true);

      // 1. Fetch SO
      const soSnap = await getDoc(doc(db, "excelupload", soId));
      if (!soSnap.exists()) return;
      setSo({ id: soSnap.id, ...soSnap.data() });

      // 2. Fetch linked invoices
      const invSnap = await getDocs(
        query(collection(db, "excelupload"), where("linkedSoId", "==", soId))
      );
      setInvoices(
        invSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => d.type === "SALES_INVOICE")
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      );

      // 3. Check if challan already generated for this SO
      const challanSnap = await getDocs(
        query(collection(db, "challans"), where("soId", "==", soId))
      );
      setChallanExists(!challanSnap.empty);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500 font-medium">Loading SO details...</p>
        </div>
      </div>
    );
  }

  if (!so) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-slate-600 font-bold">Sales Order not found</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-indigo-600 underline">← Go Back</button>
        </div>
      </div>
    );
  }

  const h = so.excelHeader || {};
  const items = so.items || [];
  const totalOrdered  = items.reduce((s, i) => s + (i.orderedQty || i.quantity || 0), 0);
  const totalInvoiced = items.reduce((s, i) => s + (i.totalInvoicedQty || 0), 0);
  const totalPending  = Math.max(0, totalOrdered - totalInvoiced);
  const soNumber = so.soNumber || so.woNumber || h.voucherNo || so.id;

  // Navigate to challan form — create or edit
  const handleChallanAction = () => {
    if (challanExists) {
      navigate(`/sales/dispatch-on-challan?soId=${so.id}&edit=true`);
    } else {
      navigate(`/sales/dispatch-on-challan?soId=${so.id}`);
    }
  };

  return (
    <div className="space-y-5 pb-10">

      {/* ── Top Bar ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all shadow-sm"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-800">{soNumber}</h2>
              <StatusBadge status={so.soStatus} />
              {/* Challan status indicator */}
              {challanExists && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  ✅ Challan Generated
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {so.customer || h.buyer || "—"} • {items.length} items • {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* ── Conditional Action Button ── */}
        {/* {challanExists ? (
          <button
            onClick={handleChallanAction}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow transition-all"
          >
            ✏️ Edit Challan
          </button>
        ) : (
        )} */}
          {/* <button
            onClick={handleChallanAction}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow transition-all"
          >
            🚚 Create Dispatch Challan
          </button> */}
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Ordered",  value: totalOrdered,  icon: "📦", color: "bg-slate-700" },
          { label: "Total Invoiced", value: totalInvoiced, icon: "🧾", color: "bg-indigo-600" },
          { label: "Pending",        value: totalPending,  icon: "⏳", color: totalPending > 0 ? "bg-orange-500" : "bg-emerald-600" },
          { label: "Invoices",       value: invoices.length, icon: "📄", color: "bg-purple-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-black text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 1: Header Info ── */}
      <Section title="Header Information" icon="📋" color="bg-indigo-600">
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <InfoField label="SO Number"       value={soNumber}                                highlight />
          <InfoField label="Company Name"    value={h.companyName} />
          <InfoField label="Dated"           value={h.dated} />
          <InfoField label="Customer / Buyer" value={so.customer || h.buyer} />
          <InfoField label="Address"         value={h.address} />
          <InfoField label="GSTIN"           value={h.gstin}           mono />
          <InfoField label="State"           value={h.state || "Gujarat, Code: 24"} />
          <InfoField label="Email"           value={h.email} />
          <InfoField label="Voucher No / PO" value={h.voucherNo}       mono />
          <InfoField label="Payment Terms"   value={h.paymentTerms} />
          <InfoField label="Consignee"       value={h.consignee} />
          <InfoField label="Destination"     value={h.destination} />
          <InfoField label="Reference"       value={h.reference} />
          <InfoField label="SO Status"       value={so.soStatus?.toUpperCase()} />
          <InfoField label="Priority"        value={so.priority} />
          <InfoField label="Notes"           value={so.notes} />
          <InfoField label="Remarks"         value={so.remarks} />
          <InfoField label="Created At"      value={so.createdAt ? new Date(so.createdAt).toLocaleString("en-IN") : "—"} />
        </div>
      </Section>

      {/* ── Section 2: Invoice Info ── */}
      {(so.invoiceNo || so.invoiceNos?.length > 0) && (
        <Section title="Invoice Information" icon="🧾" color="bg-purple-600">
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <InfoField label="Invoice No(s)"      value={Array.isArray(so.invoiceNos) ? so.invoiceNos.join(", ") : so.invoiceNo} mono />
            <InfoField label="Invoice Date"       value={so.invoiceDate} />
            <InfoField label="Invoice Count"      value={so.invoiceCount} />
            <InfoField label="Last Invoice At"    value={so.lastInvoiceAt ? new Date(so.lastInvoiceAt).toLocaleString("en-IN") : "—"} />
            <InfoField label="Total Invoiced Qty" value={so.totalInvoicedQty} />
          </div>
        </Section>
      )}

      {/* ── Section 3: Items Table ── */}
      <Section title={`Items / Products (${items.length})`} icon="📦" color="bg-green-700">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "44px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "70px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "110px" }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                {[
                  { label: "SL",           align: "text-left"   },
                  { label: "Part No",      align: "text-left"   },
                  { label: "Description",  align: "text-left"   },
                  { label: "HSN/SAC",      align: "text-left"   },
                  { label: "Unit",         align: "text-center" },
                  { label: "Ordered Qty",  align: "text-right"  },
                  { label: "Invoiced Qty", align: "text-right"  },
                  { label: "Shortage",     align: "text-right"  },
                  { label: "Status",       align: "text-center" },
                ].map((col) => (
                  <th key={col.label} className={`px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${col.align}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => {
                const ordered  = item.orderedQty || item.quantity || 0;
                const invoiced = item.totalInvoicedQty || 0;
                const shortage = Math.max(0, ordered - invoiced);
                const pct      = ordered > 0 ? Math.min(100, Math.round((invoiced / ordered) * 100)) : 0;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-xs text-slate-400 text-left">{item.slNo || i + 1}</td>
                    <td className="px-3 py-3 text-left">
                      <span className="font-mono font-bold text-indigo-700 text-sm">{item.productCode || "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700 text-left">
                      <p className="truncate">{item.description || "—"}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500 text-left">{item.hsnSac || item.hsn || "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-500 text-center">{item.unit || "—"}</td>
                    <td className="px-3 py-3 text-sm font-bold text-slate-700 text-right">{ordered}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-bold text-indigo-600">{invoiced}</span>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-orange-400" : "bg-slate-300"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-sm font-bold ${shortage > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                        {shortage > 0 ? `-${shortage}` : "✓"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ItemStatusBadge status={item.itemStatus || item.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={5} className="px-3 py-3 text-xs font-bold text-slate-500 text-right">TOTAL</td>
                <td className="px-3 py-3 text-sm font-black text-slate-800 text-right">{totalOrdered}</td>
                <td className="px-3 py-3 text-sm font-black text-indigo-700 text-right">{totalInvoiced}</td>
                <td className="px-3 py-3 text-sm font-black text-right">
                  <span className={totalPending > 0 ? "text-orange-600" : "text-emerald-600"}>
                    {totalPending > 0 ? `-${totalPending}` : "✓"}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      {/* ── Section 4: Invoice History ── */}
      {/* <Section title={`Invoice History (${invoices.length})`} icon="🕐" color="bg-slate-700">
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No invoices uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv, i) => {
              const invItems = inv.items || [];
              const invQty = invItems.reduce((s, it) => s + (it.newInvoiced || 0), 0);
              return (
                <div key={inv.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">{i + 1}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 font-mono">{inv.invoiceNo || "—"}</p>
                        <p className="text-xs text-slate-400">{inv.invoiceDate || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-600">{invQty} units</span>
                      <StatusBadge status={inv.soStatus} />
                    </div>
                  </div>
                  {invItems.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: "100px" }} /><col style={{ width: "auto" }} />
                          <col style={{ width: "80px" }} /><col style={{ width: "90px" }} />
                          <col style={{ width: "110px" }} /><col style={{ width: "80px" }} />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-slate-100">
                            {[
                              { label: "Part No", align: "text-left" }, { label: "Description", align: "text-left" },
                              { label: "Ordered", align: "text-right" }, { label: "This Invoice", align: "text-right" },
                              { label: "Total Invoiced", align: "text-right" }, { label: "Shortage", align: "text-right" },
                            ].map((col) => (
                              <th key={col.label} className={`px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase ${col.align}`}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {invItems.map((it, j) => (
                            <tr key={j}>
                              <td className="px-2 py-1.5 font-mono font-bold text-indigo-700">{it.productCode}</td>
                              <td className="px-2 py-1.5 text-slate-600 truncate">{it.description}</td>
                              <td className="px-2 py-1.5 text-right text-slate-700">{it.orderedQty}</td>
                              <td className="px-2 py-1.5 text-right font-bold text-indigo-600">{it.newInvoiced}</td>
                              <td className="px-2 py-1.5 text-right text-slate-700">{it.totalInvoicedQty}</td>
                              <td className="px-2 py-1.5 text-right">
                                <span className={`font-bold ${it.shortage > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                                  {it.shortage > 0 ? `-${it.shortage}` : "✓"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {inv.remarks && <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">📝 {inv.remarks}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Section> */}

      {/* ── Bottom Action ── */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => navigate(-1)}
          className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all">
          ← Back to List
        </button>
        {/* {challanExists ? (
          <button onClick={handleChallanAction}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow transition-all">
            ✏️ Edit Challan
          </button>
        ) : (
          <button onClick={handleChallanAction}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow transition-all">
            🚚 Create Dispatch Challan
          </button>
        )} */}
      </div>
    </div>
  );
}