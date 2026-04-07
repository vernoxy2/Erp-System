import { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  FiPlus,
  FiTrash2,
  FiUser,
  FiHash,
  FiMail,
  FiPhone,
  FiMapPin,
  FiSave,
  FiX,
} from "react-icons/fi";

// ✅ Outside component — prevents remount on keystroke
const F = ({ label, field, placeholder, required, form, setForm, icon: Icon }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon size={14} />
        </span>
      )}
      <input
        value={form[field]}
        onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        className={`w-full py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white
          ${Icon ? "pl-9 pr-3" : "px-3"}`}
      />
    </div>
  </div>
);

export default function ManageCustomers() {
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const emptyForm = {
    name: "", partyCode: "", companyName: "", gstNo: "",
    email: "", phone: "", address: "", state: "", destination: "", consignee: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    return onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Customer name is required!");
    setSaving(true);
    try {
      await addDoc(collection(db, "customers"), {
        ...form,
        createdAt: serverTimestamp(),
      });
      setForm(emptyForm);
      setShowForm(false);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    await deleteDoc(doc(db, "customers", id));
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Manage Customers</h2>
          <p className="text-sm text-slate-500 mt-0.5">{customers.length} customers in database</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2"
        >
          <FiPlus size={15} /> Add Customer
        </button>
      </div>

      {/* ── Manual Add Form ── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-indigo-600 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FiUser size={14} /> New Customer Details
            </h3>
            <button onClick={() => setShowForm(false)} className="text-white opacity-70 hover:opacity-100">
              <FiX size={16} />
            </button>
          </div>
          <div className="p-5 grid grid-cols-3 gap-4">
            <F
              label="Customer Name"
              field="name"
              placeholder="e.g. ADITY TECH MECH"
              required
              icon={FiUser}
              form={form}
              setForm={setForm}
            />
            <F
              label="Party Code"
              field="partyCode"
              placeholder="e.g. SD0006"
              icon={FiHash}
              form={form}
              setForm={setForm}
            />
            <F
              label="GST Number"
              field="gstNo"
              placeholder="e.g. 26AAPFA5117M1Z6"
              icon={FiHash}
              form={form}
              setForm={setForm}
            />
            <F
              label="Email"
              field="email"
              placeholder="e.g. info@company.com"
              icon={FiMail}
              form={form}
              setForm={setForm}
            />
            <F
              label="Phone / Contact"
              field="phone"
              placeholder="e.g. 98765 43210"
              icon={FiPhone}
              form={form}
              setForm={setForm}
            />
            <F
              label="Company Name"
              field="companyName"
              placeholder="e.g. Adity Tech Mech Pvt Ltd"
              icon={FiUser}
              form={form}
              setForm={setForm}
            />
            <div className="col-span-2">
              <F
                label="Address"
                field="address"
                placeholder="e.g. Amli Industrial Estate, DADRA AND NAGAR HAVELI, Phase 2 GIE, Silvassa - 396240"
                icon={FiMapPin}
                form={form}
                setForm={setForm}
              />
            </div>
            <F
              label="State"
              field="state"
              placeholder="e.g. Gujarat"
              icon={FiMapPin}
              form={form}
              setForm={setForm}
            />
            <F
              label="Destination"
              field="destination"
              placeholder="e.g. VALSAD"
              icon={FiMapPin}
              form={form}
              setForm={setForm}
            />
            <div className="col-span-2">
              <F
                label="Consignee (Ship To)"
                field="consignee"
                placeholder="e.g. ADITY TECH MECH, Silvassa Plant"
                icon={FiMapPin}
                form={form}
                setForm={setForm}
              />
            </div>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
            >
              <FiX size={13} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              <FiSave size={13} /> {saving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </div>
      )}

      {/* ── Customer List ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["#", "Party Code", "Name", "GST No", "Email", "Address", "Action"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                  No customers yet. Click + Add Customer to begin.
                </td>
              </tr>
            )}
            {customers.map((c, idx) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{c.partyCode || "—"}</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{c.name}</td>
                <td className="px-4 py-2.5 font-mono text-slate-500 text-xs">{c.gstNo || "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 text-xs">{c.email || "—"}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[220px] truncate" title={c.address}>
                  {c.address || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="flex items-center gap-1 text-red-400 hover:text-red-600 text-xs font-semibold transition-colors"
                  >
                    <FiTrash2 size={12} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}