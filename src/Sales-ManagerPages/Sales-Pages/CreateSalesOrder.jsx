// src/Sales-ManagerPages/Sales-Pages/CreateSalesOrder.jsx
import { useState, useEffect } from "react";
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
import { CUSTOMERS, PRIORITIES } from "../data/salesData";
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

// ─── Auto WO Number ───────────────────────────────────────────────────────────
async function generateWONumber() {
  const snap = await getDocs(collection(db, "salesorders"));
  const count = snap.size + 1;
  return `WO-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
}

export default function CreateSalesOrder() {
  const navigate = useNavigate();
  const [skuList, setSkuList] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    woNumber: "",
    date: new Date().toISOString().split("T")[0],
    customer: "",
    customerContact: "",
    salesPerson: "Current User",
    priority: "normal",
    deliveryDate: "",
    approvalRequired: true,
    specialInstructions: "",
    technicalNotes: "",
    attachment: null,
  });

  const [items, setItems] = useState([
    {
      stockDocId: "",
      sku: "",
      description: "",
      qty: 0,
      unit: "",
      stock: 0,
      remarks: "",
    },
  ]);

  // ── Load stock + WO number ────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const snap = await getDocs(collection(db, "stock"));
        const stocks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSkuList(stocks);

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

  // ── SKU select ────────────────────────────────────────────────────────────
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

  const addRow = () =>
    setItems([
      ...items,
      {
        stockDocId: "",
        sku: "",
        description: "",
        qty: 0,
        unit: "",
        stock: 0,
        remarks: "",
      },
    ]);
  const removeRow = (idx) => setItems(items.filter((_, i) => i !== idx));

  // ── Submit — Firebase ma save with history array ───────────────────────────
  const handleSubmit = async (isDraft) => {
    if (!form.customer) return alert("Please select a customer!");
    if (!isDraft && !form.deliveryDate)
      return alert("Please set an expected delivery date!");

    const status = isDraft
      ? "draft"
      : form.approvalRequired
        ? "pending_approval"
        : "approved";

    const now = new Date().toISOString();

    setSubmitting(true);
    try {
      await addDoc(collection(db, "salesorders"), {
        woNumber: form.woNumber,
        date: form.date,
        customer: form.customer,
        customerContact: form.customerContact,
        salesPerson: form.salesPerson,
        priority: form.priority,
        deliveryDate: form.deliveryDate,
        approvalRequired: form.approvalRequired,
        specialInstructions: form.specialInstructions,
        technicalNotes: form.technicalNotes,
        mode: "manual",
        status,
        items,
        createdAt: serverTimestamp(),
        createdBy: form.salesPerson,
        // ← Log history document ni ANDAR j
        history: [
          {
            action: "CREATED",
            by: form.salesPerson,
            time: now,
            description: `Order created with status: ${status}`,
          },
        ],
      });
      await addDoc(collection(db, "notifications"), {
        type: "so_qc_pending",
        source: "so",
        target: "store",
        refNo: form.woNumber,
        invoiceNo: "",
        productCode: "",
        message: `🚚 New SO waiting for QC — ${form.woNumber} · ${form.customer}`,
        isRead: false,
        isResolved: false,
        createdAt: now,
        resolvedAt: null,
      });
      if (!isDraft) {
        for (const item of items) {
          if (!item.stockDocId || !item.qty) continue;

          const stockRef = doc(db, "stock", item.stockDocId);
          await updateDoc(stockRef, {
            available: increment(-item.qty),
            reserved: increment(item.qty),
            lastUpdated: now,
          });
        }
      }
      alert(
        isDraft
          ? "Draft saved successfully!"
          : "Sales Order submitted successfully!",
      );
      // navigate("/sales/sales-orders/List");
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
          <h2 className="text-xl font-black text-slate-800">
            Create Sales Order
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manual Entry</p>
        </div>
        <button
          onClick={() => navigate("/sales/sales-orders")}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* SECTION 1 */}
      <FormSection title="1. Basic Details">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Sales Order No" value={form.woNumber} readOnly />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Customer"
            required
            value={form.customer}
            onChange={(e) => {
              const cust = CUSTOMERS.find((c) => c.name === e.target.value);
              setForm({
                ...form,
                customer: e.target.value,
                customerContact: cust?.contact || "",
              });
            }}
            options={[
              { value: "", label: "-- Select Customer --" },
              ...CUSTOMERS.map((c) => ({ value: c.name, label: c.name })),
            ]}
          />
          <Input
            label="Customer Contact"
            value={form.customerContact}
            readOnly
          />
        </div>
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
          <Input
            label="Expected Delivery"
            type="date"
            required
            value={form.deliveryDate}
            onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
          />
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

      {/* SECTION 2 */}
      <FormSection title="2. Product Details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                <th className="px-3 py-2 text-left border border-slate-200">
                  SKU
                </th>
                <th className="px-3 py-2 text-left border border-slate-200">
                  Description
                </th>
                <th className="px-3 py-2 text-center border border-slate-200">
                  Available Stock
                </th>
                <th className="px-3 py-2 text-center border border-slate-200 w-24">
                  Required Qty
                </th>
                <th className="px-3 py-2 text-center border border-slate-200">
                  Unit
                </th>
                <th className="px-3 py-2 text-left border border-slate-200">
                  Remarks
                </th>
                <th className="px-3 py-2 text-center border border-slate-200 w-16">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-2 border border-slate-200">
                    <select
                      className="w-full text-xs border-none focus:ring-1 focus:ring-indigo-500 rounded"
                      value={item.sku}
                      onChange={(e) => handleSKUChange(idx, e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {skuList.map((s) => (
                        <option key={s.id} value={s.productCode}>
                          {s.productCode}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 border border-slate-200 text-xs text-slate-600">
                    {item.description || "—"}
                  </td>
                  <td
                    className={`px-2 py-2 border border-slate-200 text-center text-xs font-bold ${item.stock < item.qty ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {item.stock ?? "—"}
                  </td>
                  <td className="px-2 py-2 border border-slate-200">
                    <input
                      type="number"
                      min="1"
                      className="w-full text-xs text-center border-none focus:ring-1 focus:ring-indigo-500 rounded"
                      value={item.qty}
                      onChange={(e) => {
                        const n = [...items];
                        n[idx].qty = +e.target.value;
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="px-2 py-2 border border-slate-200 text-xs text-center">
                    {item.unit || "—"}
                  </td>
                  <td className="px-2 py-2 border border-slate-200">
                    <input
                      type="text"
                      className="w-full text-xs border-none focus:ring-1 focus:ring-indigo-500 rounded"
                      value={item.remarks}
                      onChange={(e) => {
                        const n = [...items];
                        n[idx].remarks = e.target.value;
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="px-2 py-2 border border-slate-200 text-center">
                    {items.length > 1 && (
                      <button
                        onClick={() => removeRow(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
        >
          <FiPlus size={12} /> Add Row
        </button>
      </FormSection>

      {/* SECTION 3 */}
      <FormSection title="3. Additional Details">
        <Textarea
          label="Special Instructions"
          value={form.specialInstructions}
          onChange={(e) =>
            setForm({ ...form, specialInstructions: e.target.value })
          }
          placeholder="Any special delivery or handling instructions..."
        />
        <Textarea
          label="Notes for Technical Team"
          value={form.technicalNotes}
          onChange={(e) => setForm({ ...form, technicalNotes: e.target.value })}
          placeholder="Technical specifications, quality requirements, etc..."
        />
        <FileUpload
          label="Attachment (Optional)"
          file={form.attachment}
          onChange={(e) => setForm({ ...form, attachment: e.target.files[0] })}
          onRemove={() => setForm({ ...form, attachment: null })}
        />
      </FormSection>

      {/* Buttons */}
      <div className="flex items-center gap-3 justify-end sticky bottom-0 bg-white p-4 border-t border-slate-200 rounded-xl shadow-lg">
        <BtnSecondary
          onClick={() => navigate("/sales/sales-orders/list")}
          disabled={submitting}
        >
          <FiX size={14} /> Cancel
        </BtnSecondary>
        <BtnSecondary onClick={() => handleSubmit(true)} disabled={submitting}>
          <FiSave size={14} /> {submitting ? "Saving..." : "Save as Draft"}
        </BtnSecondary>
        <BtnPrimary onClick={() => handleSubmit(false)} disabled={submitting}>
          <FiSend size={14} />{" "}
          {submitting ? "Submitting..." : "Submit Sales Order"}
        </BtnPrimary>
      </div>
    </div>
  );
}
