import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

const getItemStatus = (ordered, received) => {
  if (received === 0) return "ordered";
  if (received < ordered) return "partial";
  if (received === ordered) return "complete";
  return "excess";
};

export default function StoreInvoiceApproval() {
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [qualityCheck, setQualityCheck] = useState("passed");
  const [remarks, setRemarks] = useState("");
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "excelupload"),
            where("type", "==", "INVOICE"),
            where("approvalStatus", "==", "pending"),
          ),
        );
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setPendingInvoices(data);
        if (data.length > 0) selectInvoice(data[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  const selectInvoice = (inv) => {
    setSelectedInvoice(inv);
    setEditedItems((inv.items || []).map((item) => ({ ...item })));
    setQualityCheck("passed");
    setRemarks("");
  };

  const updateQty = (idx, val) => {
    setEditedItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, newReceived: parseFloat(val) || 0 } : item,
      ),
    );
  };

  const getTotalReceiving = () =>
    editedItems.reduce((s, i) => s + (i.newReceived || 0), 0);

  const getTotalShortage = () =>
    editedItems.reduce(
      (s, i) =>
        s +
        Math.max(
          0,
          (i.orderedQty || 0) - (i.alreadyReceived || 0) - (i.newReceived || 0),
        ),
      0,
    );

  const getTotalExcess = () =>
    editedItems.reduce(
      (s, i) =>
        s +
        Math.max(
          0,
          (i.alreadyReceived || 0) + (i.newReceived || 0) - (i.orderedQty || 0),
        ),
      0,
    );

  const getPoStatusAfter = () => {
    const shortage = getTotalShortage();
    const totalReceived = editedItems.reduce(
      (s, i) => s + (i.alreadyReceived || 0) + (i.newReceived || 0),
      0,
    );
    if (shortage === 0) return "COMPLETE";
    if (totalReceived > 0) return "PARTIAL";
    return "ORDERED";
  };

  const addToStock = async (items, poNumber, vendor) => {
    const now = new Date().toISOString();
    for (const item of items) {
      const qty = item.newReceived || 0;
      if (qty <= 0) continue;
      const key = (item.productCode || "").toString().trim();
      if (!key) continue;

      const q = query(collection(db, "stock"), where("productCode", "==", key));
      const snap = await getDocs(q);

      if (snap.empty) {
        await addDoc(collection(db, "stock"), {
          productCode: key,
          description: item.description || "",
          hsnSac: item.hsnSac || "",
          unit: item.unit || "pcs",
          available: qty,
          reserved: 0,
          backorder: 0,
          excess: 0,
          minLevel: 0,
          lastUpdated: now,
          ledger: [
            {
              type: "IN",
              qty,
              ref: poNumber,
              by: vendor,
              balance: qty,
              date: now,
            },
          ],
        });
      } else {
        const sd = snap.docs[0];
        const sdata = sd.data();
        const existBackorder = sdata.backorder || 0;
        const currentAvail = sdata.available || 0;
        const clearedBackorder = Math.min(existBackorder, qty);
        const remainingBackorder = Math.max(0, existBackorder - qty);
        const netAvail = currentAvail + qty - clearedBackorder;

        await updateDoc(doc(db, "stock", sd.id), {
          available: Math.max(0, netAvail),
          backorder: remainingBackorder,
          lastUpdated: now,
          ledger: [
            ...(sdata.ledger || []),
            {
              type: "IN",
              qty,
              ref: poNumber,
              by: vendor,
              balance: Math.max(0, netAvail),
              date: now,
            },
          ],
        });
      }
    }
  };

  const handleApprove = async () => {
    if (!selectedInvoice) return;
    setApproving(selectedInvoice.id);
    try {
      const now = new Date().toISOString();
      const poStatus = getPoStatusAfter();

      // Build final items with store-edited quantities
      const finalItems = editedItems.map((item) => ({
        ...item,
        totalReceived: (item.alreadyReceived || 0) + (item.newReceived || 0),
        status: getItemStatus(
          item.orderedQty || 0,
          (item.alreadyReceived || 0) + (item.newReceived || 0),
        ),
      }));
      await addToStock(
        finalItems,
        selectedInvoice.linkedPoNo,
        selectedInvoice.vendor,
      );
      await updateDoc(doc(db, "excelupload", selectedInvoice.id), {
        approvalStatus: "approved",
        approvedAt: now,
        approvedBy: "Store Manager",
        qualityCheck,
        remarks,
        items: finalItems,
      });
      await updateDoc(doc(db, "excelupload", selectedInvoice.linkedPoId), {
        poStatus,
        pendingApproval: false,
      });
      const updated = pendingInvoices.filter(
        (i) => i.id !== selectedInvoice.id,
      );
      setPendingInvoices(updated);
      setSelectedInvoice(updated.length > 0 ? updated[0] : null);
      if (updated.length > 0) selectInvoice(updated[0]);
    } catch (err) {
      console.error("Approve error:", err);
      alert("Error approving: " + err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async () => {
    if (!selectedInvoice) return;
    if (!window.confirm("Reject this invoice? Stock will NOT be updated."))
      return;
    setRejecting(selectedInvoice.id);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "excelupload", selectedInvoice.id), {
        approvalStatus: "rejected",
        rejectedAt: now,
        rejectedBy: "Store Manager",
        remarks,
      });
      await updateDoc(doc(db, "excelupload", selectedInvoice.linkedPoId), {
        pendingApproval: false,
      });
      const updated = pendingInvoices.filter(
        (i) => i.id !== selectedInvoice.id,
      );
      setPendingInvoices(updated);
      setSelectedInvoice(updated.length > 0 ? updated[0] : null);
      if (updated.length > 0) selectInvoice(updated[0]);
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setRejecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-semibold">
            Loading invoices...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800">
          Invoice Approvals
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Verify quantities and approve vendor invoices to update stock
        </p>
      </div>
      {pendingInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">All Clear!</h3>
          <p className="text-sm text-slate-400">
            No invoices pending approval.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-700">
                Pending ({pendingInvoices.length})
              </h3>
            </div>
            {pendingInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => selectInvoice(inv)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedInvoice?.id === inv.id
                    ? "border-indigo-400 bg-indigo-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                }`}
              >
                <p className="font-black text-slate-800 text-sm">
                  {inv.linkedPoNo}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {inv.vendor?.slice(0, 35)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Invoice: {inv.invoiceNo}
                </p>
                <p className="text-xs text-slate-400">{inv.invoiceDate}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-amber-700 uppercase">
                    Pending Approval
                  </span>
                </div>
              </button>
            ))}
          </div>
          {selectedInvoice && (
            <div className="lg:col-span-3 space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      {selectedInvoice.linkedPoNo}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedInvoice.vendor}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full border border-amber-200 uppercase">
                    Awaiting Your Approval
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold">Invoice No</p>
                    <p className="font-black text-slate-800 mt-1 text-sm">
                      {selectedInvoice.invoiceNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Invoice Date</p>
                    <p className="font-bold text-slate-700 mt-1">
                      {selectedInvoice.invoiceDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Total Items</p>
                    <p className="font-bold text-slate-700 mt-1">
                      {(selectedInvoice.items || []).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">
                      Expected PO Status
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                        selectedInvoice.poStatus === "COMPLETE"
                          ? "bg-green-100 text-green-700"
                          : selectedInvoice.poStatus === "PARTIAL"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {selectedInvoice.poStatus || "ORDERED"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Verify Quantities (Store editable) ────────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-800">
                      Verify Quantities
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {getTotalReceiving()} units this invoice — adjust if
                      actual receipt differs
                    </p>
                  </div>
                  {getTotalShortage() === 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                      <svg
                        className="w-3.5 h-3.5 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-xs font-bold text-green-700">
                        All matched
                      </span>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Product
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Ordered
                        </th>
                        {/* <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Prior Recv</th> */}
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">
                          This Invoice
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-red-500 uppercase tracking-wide">
                          Shortage
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-purple-500 uppercase tracking-wide">
                          Excess
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editedItems.map((item, idx) => {
                        const ordered = item.orderedQty || 0;
                        const already = item.alreadyReceived || 0;
                        const thisInv = item.newReceived || 0;
                        const total = already + thisInv;
                        const shortage = Math.max(0, ordered - total);
                        const excess = Math.max(0, total - ordered);
                        const status = getItemStatus(ordered, total);
                        const pct =
                          ordered > 0
                            ? Math.min(100, (total / ordered) * 100)
                            : 0;
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 ${
                              shortage > 0
                                ? "bg-red-50/40"
                                : excess > 0
                                  ? "bg-purple-50/40"
                                  : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <p className="font-mono font-bold text-slate-800 text-xs">
                                {item.productCode}
                              </p>
                              <p className="text-xs text-slate-400 truncate max-w-[160px] mt-0.5">
                                {item.description}
                              </p>
                              {/* Progress bar */}
                              <div className="mt-1.5 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    status === "complete"
                                      ? "bg-green-500"
                                      : status === "excess"
                                        ? "bg-purple-500"
                                        : "bg-indigo-400"
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {total}/{ordered} {item.unit || "nos"} ·{" "}
                                {pct.toFixed(0)}%
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                              {ordered}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                              {already}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {/* Editable quantity */}
                              <input
                                type="number"
                                min={0}
                                value={thisInv ?? ""}
                                onChange={(e) => updateQty(idx, e.target.value)}
                                className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 text-right focus:ring-2 focus:ring-indigo-400 outline-none hover:border-indigo-300 transition"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                                  status === "complete"
                                    ? "bg-green-100 text-green-700"
                                    : status === "partial"
                                      ? "bg-orange-100 text-orange-700"
                                      : status === "excess"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-red-600 text-sm">
                              {shortage > 0 ? `-${shortage}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-purple-600 text-sm">
                              {excess > 0 ? `+${excess}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Summary Cards ─────────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-green-200 p-4 text-center shadow-sm">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide">
                    Adding to Stock
                  </p>
                  <p className="text-3xl font-black text-green-700 mt-2">
                    {getTotalReceiving()}
                  </p>
                  <p className="text-xs text-green-500 mt-1">units</p>
                </div>
                <div
                  className={`bg-white rounded-2xl border p-4 text-center shadow-sm ${
                    getTotalShortage() > 0
                      ? "border-red-200"
                      : "border-slate-200"
                  }`}
                >
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
                    Shortage
                  </p>
                  <p
                    className={`text-3xl font-black mt-2 ${getTotalShortage() > 0 ? "text-red-600" : "text-slate-400"}`}
                  >
                    {getTotalShortage()}
                  </p>
                  <p className="text-xs text-red-400 mt-1">units short</p>
                </div>
                <div
                  className={`bg-white rounded-2xl border p-4 text-center shadow-sm ${
                    getTotalExcess() > 0
                      ? "border-purple-200"
                      : "border-slate-200"
                  }`}
                >
                  <p className="text-xs font-bold text-purple-500 uppercase tracking-wide">
                    Excess
                  </p>
                  <p
                    className={`text-3xl font-black mt-2 ${getTotalExcess() > 0 ? "text-purple-600" : "text-slate-400"}`}
                  >
                    {getTotalExcess()}
                  </p>
                  <p className="text-xs text-purple-400 mt-1">units excess</p>
                </div>
              </div>

              {/* PO Status After */}
              <div
                className={`flex items-center gap-3 p-4 rounded-2xl border ${
                  getPoStatusAfter() === "COMPLETE"
                    ? "bg-green-50 border-green-200"
                    : "bg-orange-50 border-orange-200"
                }`}
              >
                <svg
                  className={`w-5 h-5 flex-shrink-0 ${getPoStatusAfter() === "COMPLETE" ? "text-green-600" : "text-orange-500"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      getPoStatusAfter() === "COMPLETE"
                        ? "M5 13l4 4L19 7"
                        : "M12 9v2m0 4h.01"
                    }
                  />
                </svg>
                <p
                  className={`text-sm font-bold ${getPoStatusAfter() === "COMPLETE" ? "text-green-700" : "text-orange-700"}`}
                >
                  {getPoStatusAfter() === "COMPLETE"
                    ? "All matched — PO will be: COMPLETE"
                    : `PO will be: ${getPoStatusAfter()} (${getTotalShortage()} units still pending)`}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h4 className="font-black text-slate-800 mb-4">
                  Quality Check
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">
                      Quality Check Result
                    </label>
                    <select
                      value={qualityCheck}
                      onChange={(e) => setQualityCheck(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 outline-none"
                    >
                      <option value="passed">✓ Passed — All items good</option>
                      <option value="partial">
                        ⚠ Partial — Some items have issues
                      </option>
                      <option value="failed">✗ Failed — Issues found</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">
                      Remarks (optional)
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Any damage or quality issues..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={!!rejecting}
                  className="flex-1 px-4 py-3.5 border-2 border-red-200 text-red-600 rounded-xl text-sm font-black hover:bg-red-50 transition disabled:opacity-50"
                >
                  {rejecting ? "Rejecting..." : "✗ Reject — Don't Update Stock"}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!!approving}
                  className="flex-[2] px-6 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {approving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Approve &amp; Update Stock
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
