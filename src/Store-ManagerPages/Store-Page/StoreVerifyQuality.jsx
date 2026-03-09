import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiFileText,
  FiCheck,
  FiPackage,
  FiAlertTriangle,
  FiClock,
  FiAlertCircle,
  FiShield,
} from "react-icons/fi";
import {
  Card,
  CardHeader,
  Select,
  Textarea,
  BtnPrimary,
  BtnSecondary,
} from "../StoreComponent/ui/index";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

function StatusPill({ status }) {
  const map = {
    material_hold: "bg-blue-50 text-blue-700 border-blue-200",
    ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dispatched: "bg-slate-50 text-slate-700 border-slate-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-orange-50 text-orange-700 border-orange-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    unpaid: "bg-red-50 text-red-700 border-red-200",
    in_transit: "bg-blue-50 text-blue-700 border-blue-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ordered: "bg-blue-50 text-blue-700 border-blue-200",
    partial: "bg-orange-50 text-orange-700 border-orange-200",
    complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    excess: "bg-purple-50 text-purple-700 border-purple-200",
    received: "bg-teal-50 text-teal-700 border-teal-200",
    pending_qc: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const n = status?.toLowerCase().replace(" ", "_");
  return (
    <span
      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${map[n] || map.pending}`}
    >
      {n?.replace("_", " ")}
    </span>
  );
}

function getItemStatus(orderedQty, totalReceivedQty) {
  if (totalReceivedQty === 0) return "ordered";
  if (totalReceivedQty < orderedQty) return "partial";
  if (totalReceivedQty === orderedQty) return "complete";
  return "excess";
}

function calcPoStatus(items) {
  const statuses = items.map((i) =>
    getItemStatus(i.orderedQty || i.quantity || 0, i.totalReceivedQty || 0),
  );
  if (statuses.every((s) => s === "complete")) return "complete";
  if (statuses.some((s) => s === "excess")) return "excess";
  if (statuses.some((s) => s === "partial" || s === "complete"))
    return "partial";
  return "ordered";
}

async function addToStock(items, poNumber, vendor) {
  const now = new Date().toISOString();
  for (const item of items) {
    const damagedQty = item.issue === "damage" ? item.damagedQty || 0 : 0;
    const qty = (item.newReceived || 0) - damagedQty;
    if (qty <= 0) continue;
    const key = item.productCode?.toString().trim() || item.description?.trim();
    if (!key) continue;

    const remarksStr =
      damagedQty > 0
        ? `Damage: ${damagedQty} units — ${item.issueDetail || ""}`
        : "";

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
            remarks: remarksStr,
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
      const orderedQty = item.orderedQty || qty;
      const totalReceived = item.totalReceivedQty || 0;
      const excessQty =
        totalReceived > orderedQty ? totalReceived - orderedQty : 0;
      await updateDoc(doc(db, "stock", sd.id), {
        available: Math.max(0, netAvail),
        backorder: remainingBackorder,
        excess: excessQty,
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
            remarks: remarksStr,
          },
        ],
      });
    }
  }
}

export default function StoreVerifyQuality() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingPO, setLoadingPO] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [receivedItems, setReceivedItems] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [qualityCheck, setQualityCheck] = useState("passed");
  const [remarks, setRemarks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSelectInvoice = async (invoice) => {
    setLoadingPO(true);
    try {
      if (!invoice.linkedPoId) {
        alert("This invoice has no linked PO ID.");
        setLoadingPO(false);
        return;
      }
      const poSnap = await getDoc(doc(db, "excelupload", invoice.linkedPoId));
      if (!poSnap.exists()) {
        alert(`Linked PO not found: ${invoice.linkedPoId}`);
        setLoadingPO(false);
        return;
      }
      const poData = { id: poSnap.id, ...poSnap.data() };
      const po = {
        id: poData.id,
        poNumber:
          invoice.linkedPoNo ||
          poData.woNumber ||
          poData.excelHeader?.voucherNo ||
          poData.id.slice(0, 8).toUpperCase(),
        vendor:
          invoice.vendor ||
          poData.customer ||
          poData.excelHeader?.supplier ||
          "—",
        date: poData.excelHeader?.dated || "",
        status: poData.poStatus || "ordered",
        createdAt: poData.createdAt || null,
        items: (poData.items || []).map((item) => ({
          ...item,
          orderedQty: item.orderedQty || item.quantity || 0,
          totalReceivedQty: item.totalReceivedQty || 0,
          unit: item.unit || "pcs",
        })),
      };

      setSelectedPO(po);
      setSelectedInvoice(invoice);
      setInvoiceNo(invoice.invoiceNo || "");
      setInvoiceDate(invoice.invoiceDate || "");

      const invItems = invoice.items || [];
      const mapped = po.items.map((poItem) => {
        const invItem = invItems.find(
          (i) =>
            i.productCode?.toLowerCase().trim() ===
            poItem.productCode?.toLowerCase().trim(),
        );
        const alreadyReceived = poItem.totalReceivedQty || 0;
        const newReceived = invItem
          ? invItem.newReceived || invItem.invoiceQty || 0
          : 0;
        return {
          ...poItem,
          alreadyReceived,
          newReceived,
          matchedFromInvoice: !!invItem,
          physicalQty: newReceived,
          issue: "",
          issueDetail: "",
          damagedQty: 0,
        };
      });
      setReceivedItems(mapped);
      setCurrentPage(1);
      setQualityCheck("passed");
      setRemarks("");
      setStep(2);
    } catch (err) {
      console.error("Load PO error:", err);
      alert("Error loading PO: " + err.message);
    } finally {
      setLoadingPO(false);
    }
  };

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
        );
        const invoices = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (d) =>
              d.type === "INVOICE" &&
              d.storeQcStatus !== "approved" &&
              d.linkedPoId,
          );
        setPendingInvoices(invoices);
      } catch (err) {
        console.error("Fetch invoices error:", err);
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchPending();
  }, []);

  const updateItem = (productCode, changes) => {
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.productCode === productCode ? { ...item, ...changes } : item,
      ),
    );
  };

  const getTotalNewReceived = () =>
    receivedItems.reduce((s, i) => s + (i.newReceived || 0), 0);

  const getUsableQty = (item) => {
    const damaged = item.issue === "damage" ? item.damagedQty || 0 : 0;
    return (item.newReceived || 0) - damaged;
  };

  const getTotalShortage = () =>
    receivedItems.reduce((sum, item) => {
      const usable = getUsableQty(item);
      const total = (item.alreadyReceived || 0) + usable;
      return sum + Math.max(0, (item.orderedQty || 0) - total);
    }, 0);

  const livePoStatus = (() => {
    if (receivedItems.length === 0) return "ordered";
    const computed = calcPoStatus(
      receivedItems.map((i) => ({
        orderedQty: i.orderedQty || 0,
        totalReceivedQty: (i.alreadyReceived || 0) + getUsableQty(i),
      })),
    );
    if (computed === "partial" || computed === "complete") return "received";
    if (computed === "excess") return "excess";
    return computed;
  })();

  const totalPages = Math.ceil(receivedItems.length / itemsPerPage);
  const pagedItems = receivedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSubmit = async () => {
    setUploading(true);
    try {
      const now = new Date().toISOString();
      const hasDamage = receivedItems.some(
        (i) => i.issue === "damage" && (i.damagedQty || 0) > 0,
      );
      const updatedItems = receivedItems.map((item) => {
        const orderedQty = item.orderedQty || 0;
        const alreadyReceived = item.alreadyReceived || 0;
        const usable = getUsableQty(item);
        const totalReceivedQty = alreadyReceived + usable;
        const itemStatus = getItemStatus(orderedQty, totalReceivedQty);
        return {
          ...item,
          totalReceivedQty,
          orderedQty,
          quantity: orderedQty,
          shortage: Math.max(0, orderedQty - totalReceivedQty),
          itemStatus,
          physicalQty: item.physicalQty ?? item.newReceived,
          damagedQty: item.damagedQty || 0,
          issue: item.issue || "",
          issueDetail: item.issueDetail || "",
        };
      });
      const poStatus = calcPoStatus(
        updatedItems.map((i) => ({
          orderedQty: i.orderedQty,
          totalReceivedQty: i.totalReceivedQty,
        })),
      );
      const totalReceivedQty = updatedItems.reduce(
        (s, i) => s + i.totalReceivedQty,
        0,
      );
      const finalQcStatus =
        hasDamage && qualityCheck === "passed"
          ? "passed_with_issues"
          : qualityCheck;

      await updateDoc(doc(db, "excelupload", selectedPO.id), {
        items: updatedItems,
        poStatus,
        receivedAt: now,
        lastInvoiceAt: now,
        totalReceivedQty,
        qualityCheck: finalQcStatus,
        remarks,
        storeQcStatus: "approved",
        storeQcApprovedAt: now,
        storeQcApprovedBy: "Store Team",
      });

      await updateDoc(doc(db, "excelupload", selectedInvoice.id), {
        storeQcStatus: hasDamage ? "approved_with_issues" : "approved",
        storeQcApprovedAt: now,
        storeQcApprovedBy: "Store Team",
        qualityCheck: finalQcStatus,
        remarks,
        poStatus,
        items: updatedItems,
      });

      if (qualityCheck !== "failed") {
        await addToStock(receivedItems, selectedPO.poNumber, selectedPO.vendor);
      }

      setUploading(false);
      setStep(4);
    } catch (err) {
      console.error("Submit error:", err);
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  const steps = [
    { num: 1, label: "Select Invoice" },
    { num: 2, label: "Verify Qty" },
    { num: 3, label: "Quality Check" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            Store Quality Check
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review vendor invoices and approve material receipt
          </p>
        </div>
        <BtnSecondary onClick={() => navigate("/store/dashboard")}>
          Cancel
        </BtnSecondary>
      </div>

      {step < 4 && (
        <Card className="p-5">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {steps.map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      step > s.num
                        ? "bg-emerald-600 text-white"
                        : step === s.num
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                          : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {step > s.num ? <FiCheck size={16} /> : s.num}
                  </div>
                  <p
                    className={`text-[10px] font-bold whitespace-nowrap ${step >= s.num ? "text-slate-700" : "text-slate-400"}`}
                  >
                    {s.label}
                  </p>
                </div>
                {idx < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${step > s.num ? "bg-emerald-600" : "bg-slate-200"}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}

      {/* ── Step 1: Select Invoice ── */}
      {step === 1 && (
        <Card>
          <CardHeader
            title="Pending Invoices for QC"
            subtitle={`${pendingInvoices.length} invoice(s) awaiting store verification`}
          />
          {loadingInvoices || loadingPO ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                {loadingPO ? "Loading PO data..." : "Loading invoices..."}
              </p>
            </div>
          ) : pendingInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FiShield size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">
                No Pending Invoices
              </p>
              <p className="text-xs text-slate-400 mt-1">
                All invoices have been verified.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {pendingInvoices.map((inv) => {
                const totalItems = (inv.items || []).length;
                const totalQty = (inv.items || []).reduce(
                  (s, i) => s + (i.newReceived || i.invoiceQty || 0),
                  0,
                );
                return (
                  <div
                    key={inv.id}
                    className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleSelectInvoice(inv)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-bold text-slate-800">
                            Invoice: {inv.invoiceNo || "—"}
                          </p>
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full uppercase">
                            Pending QC
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          PO: <strong>{inv.linkedPoNo}</strong> · {inv.vendor}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                          <span>
                            {totalItems} items · {totalQty} units
                          </span>
                          {inv.invoiceDate && (
                            <span>
                              Invoice Date: {formatDate(inv.invoiceDate)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FiClock size={10} />
                            Uploaded: {formatDateTime(inv.createdAt)}
                          </span>
                        </div>
                      </div>
                      <button className="ml-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap flex items-center gap-1.5">
                        <FiShield size={12} />
                        Review & Approve →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Step 2: Verify Quantities ── */}
      {step === 2 && selectedPO && selectedInvoice && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Invoice Details */}
          <Card>
            <CardHeader title="Invoice Details" />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold mb-1">PO Number</p>
                    <p className="text-slate-800 font-bold">
                      {selectedPO.poNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Invoice No</p>
                    <p className="text-slate-800 font-bold">
                      {invoiceNo || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Vendor</p>
                    <p className="text-slate-800">{selectedPO.vendor}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">
                      Invoice Date
                    </p>
                    <p className="text-slate-800">
                      {invoiceDate ? formatDate(invoiceDate) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">
                      Current PO Status
                    </p>
                    <StatusPill status={selectedPO.status} />
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">
                      After Approval
                    </p>
                    <StatusPill status={livePoStatus} />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-bold text-slate-600 mb-2">
                  Receipt Summary:
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items in Invoice:</span>
                    <span className="font-bold text-slate-800">
                      {receivedItems.filter((i) => i.matchedFromInvoice).length}{" "}
                      / {receivedItems.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">This Invoice Qty:</span>
                    <span className="font-bold text-slate-800">
                      {getTotalNewReceived()} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Still Pending After:</span>
                    <span
                      className={`font-bold ${getTotalShortage() > 0 ? "text-orange-600" : "text-emerald-600"}`}
                    >
                      {getTotalShortage()} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      PO Status After Approval:
                    </span>
                    <StatusPill status={livePoStatus} />
                  </div>
                </div>
              </div>

              {/* ✅ Live damage summary — updates as user edits */}
              {receivedItems.some(
                (i) => i.issue === "damage" && (i.damagedQty || 0) > 0,
              ) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-red-700 mb-1.5 flex items-center gap-1.5">
                    <FiAlertTriangle size={12} /> Damage Noted:
                  </p>
                  <div className="space-y-1">
                    {receivedItems
                      .filter(
                        (i) => i.issue === "damage" && (i.damagedQty || 0) > 0,
                      )
                      .map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-mono font-bold text-red-800">
                            {item.productCode}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-red-600">
                              {item.newReceived - item.damagedQty} usable +{" "}
                              <strong>{item.damagedQty} damaged</strong>
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <FiAlertCircle
                  size={13}
                  className="text-blue-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-blue-700">
                  Quantities are pre-filled from the invoice uploaded by Sales.
                  You can edit "Physical" and "Issue" values if needed.
                </p>
              </div>
            </div>
          </Card>

          {/* Right: Verify Quantities */}
          <Card>
            <CardHeader
              title="Verify Quantities"
              subtitle={`${getTotalNewReceived()} units this invoice · ${receivedItems.length} items`}
            />
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {pagedItems.map((item) => {
                // ✅ Use productCode to always get fresh state from receivedItems
                const currentItem =
                  receivedItems.find(
                    (r) => r.productCode === item.productCode,
                  ) || item;
                const ordered = currentItem.orderedQty || 0;
                const already = currentItem.alreadyReceived || 0;
                const thisInv = currentItem.newReceived || 0;
                const damaged =
                  currentItem.issue === "damage"
                    ? currentItem.damagedQty || 0
                    : 0;
                const usable = thisInv - damaged;
                const totalAfter = already + usable;
                const remaining = Math.max(0, ordered - totalAfter);
                const excess = Math.max(0, totalAfter - ordered);
                const itemStatus = getItemStatus(ordered, totalAfter);
                const progressPct =
                  ordered > 0
                    ? Math.min(100, Math.round((totalAfter / ordered) * 100))
                    : 0;

                return (
                  <div
                    key={currentItem.productCode}
                    className={`p-4 border rounded-lg ${
                      itemStatus === "complete"
                        ? "border-emerald-200 bg-emerald-50/30"
                        : itemStatus === "excess"
                          ? "border-purple-200 bg-purple-50/30"
                          : itemStatus === "partial"
                            ? "border-orange-200 bg-orange-50/30"
                            : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <FiPackage
                        className="text-slate-400 mt-0.5 flex-shrink-0"
                        size={15}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 font-mono">
                            {currentItem.productCode}
                          </p>
                          <StatusPill status={itemStatus} />
                          {currentItem.matchedFromInvoice ? (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              ✓ Invoice
                            </span>
                          ) : (
                            <span className="text-[10px] text-orange-500 font-bold">
                              ⚠ Not in Invoice
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {currentItem.description}
                        </p>
                      </div>
                    </div>

                    {/* 4-col grid */}
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {/* Ordered */}
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wide">
                          Ordered
                        </p>
                        <div className="h-8 flex items-center px-2 bg-slate-50 border border-slate-200 rounded-lg">
                          <p className="text-sm font-bold text-slate-800">
                            {ordered}
                          </p>
                        </div>
                      </div>

                      {/* Invoice Qty (read-only) */}
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wide">
                          Invoice Qty
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={thisInv}
                          disabled
                          className="w-full h-8 border border-slate-200 rounded-lg px-2 text-sm font-bold text-slate-800 bg-slate-50 cursor-not-allowed"
                        />
                      </div>

                      {/* Physical Qty (editable) */}
                      <div>
                        <p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase tracking-wide">
                          Physical
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={currentItem.physicalQty ?? thisInv}
                          onChange={(e) =>
                            updateItem(currentItem.productCode, {
                              physicalQty: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full h-8 border rounded-lg px-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                            (currentItem.physicalQty ?? thisInv) !== thisInv
                              ? "border-orange-300 bg-orange-50 text-orange-700"
                              : "border-indigo-200 bg-indigo-50/40 text-indigo-700"
                          }`}
                        />
                        {(currentItem.physicalQty ?? thisInv) !== thisInv && (
                          <p className="text-[9px] text-orange-600 font-bold mt-0.5 leading-tight">
                            ⚠ Differs ({thisInv})
                          </p>
                        )}
                      </div>

                      {/* Issue */}
                      <div>
                        <p className="text-[10px] text-red-400 font-bold mb-1 uppercase tracking-wide">
                          Issue
                        </p>
                        <select
                          value={currentItem.issue || ""}
                          onChange={(e) =>
                            updateItem(currentItem.productCode, {
                              issue: e.target.value,
                              issueDetail: "",
                              damagedQty: 0,
                            })
                          }
                          className={`w-full h-8 border rounded-lg px-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-red-300 ${
                            currentItem.issue
                              ? "border-red-300 bg-red-50 text-red-700"
                              : "border-slate-200 text-slate-500"
                          }`}
                        >
                          <option value="">— None</option>
                          <option value="damage">🔴 Damage</option>
                          <option value="shortage">🟠 Shortage</option>
                          <option value="excess">🟣 Excess</option>
                          <option value="quality">🟡 Quality</option>
                          <option value="wrong_item">🔵 Wrong Item</option>
                          <option value="other">⚪ Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Damaged Qty field */}
                    {currentItem.issue === "damage" && (
                      <div className="mt-1 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-[10px] text-red-600 font-bold mb-1 uppercase tracking-wide">
                              Damaged Qty{" "}
                              {/* <span className="normal-case text-red-400 font-normal">
                                (how many units are damaged?)
                              </span> */}
                            </p>
                            <input
                              type="number"
                              min="0"
                              max={thisInv}
                              value={currentItem.damagedQty || 0}
                              onChange={(e) =>
                                updateItem(currentItem.productCode, {
                                  damagedQty: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full h-9 border-2 border-red-300 bg-white rounded-lg px-3 text-sm font-black text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                              placeholder="0"
                            />
                          </div>
                          {(currentItem.damagedQty || 0) > 0 && (
                            <div className="flex-shrink-0 text-right">
                              <p className="text-[10px] text-slate-400 mb-1">
                                Usable stock
                              </p>
                              <p className="text-sm font-black text-emerald-600">
                                {thisInv - (currentItem.damagedQty || 0)}{" "}
                                <span className="text-xs font-normal text-slate-400">
                                  {currentItem.unit}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                        {(currentItem.damagedQty || 0) > 0 && (
                          <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1">
                            <FiAlertTriangle size={10} />
                            Stock will be updated with{" "}
                            {thisInv - (currentItem.damagedQty || 0)} usable
                            units. {currentItem.damagedQty} damaged units will
                            remain pending from vendor.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Issue Detail */}
                    {currentItem.issue && (
                      <div className="mt-1 mb-2">
                        <p className="text-[10px] text-red-500 font-bold mb-1">
                          Issue Details{" "}
                          <span className="text-red-400 font-normal">
                            (describe the problem)
                          </span>
                        </p>
                        <textarea
                          rows={2}
                          value={currentItem.issueDetail || ""}
                          placeholder={
                            currentItem.issue === "damage"
                              ? "e.g. 5 pipes cracked, packing torn..."
                              : currentItem.issue === "shortage"
                                ? "e.g. Invoice says 100 but only 85 received..."
                                : currentItem.issue === "excess"
                                  ? "e.g. 10 extra units received..."
                                  : currentItem.issue === "quality"
                                    ? "e.g. Surface finish not acceptable..."
                                    : currentItem.issue === "wrong_item"
                                      ? "e.g. Received FRC-110-2 instead of FRC-110-1..."
                                      : "Describe the issue..."
                          }
                          onChange={(e) =>
                            updateItem(currentItem.productCode, {
                              issueDetail: e.target.value,
                            })
                          }
                          className="w-full border border-red-200 bg-red-50/50 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                        />
                      </div>
                    )}

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>
                          {totalAfter}/{ordered} {currentItem.unit}
                          {damaged > 0 && (
                            <span className="text-red-400 ml-1">
                              ({damaged} damaged)
                            </span>
                          )}
                        </span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            itemStatus === "complete"
                              ? "bg-emerald-500"
                              : itemStatus === "excess"
                                ? "bg-purple-500"
                                : itemStatus === "partial"
                                  ? "bg-orange-500"
                                  : "bg-blue-300"
                          }`}
                          style={{ width: `${Math.min(progressPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {itemStatus === "partial" && remaining > 0 && (
                      <p className="text-[11px] text-orange-600 font-bold mt-1.5 flex items-center gap-1">
                        <FiAlertTriangle size={10} /> {remaining}{" "}
                        {currentItem.unit} still pending
                        {damaged > 0 && ` (incl. ${damaged} damaged)`}
                      </p>
                    )}
                    {itemStatus === "excess" && (
                      <p className="text-[11px] text-purple-600 font-bold mt-1.5 flex items-center gap-1">
                        <FiAlertTriangle size={10} /> {excess}{" "}
                        {currentItem.unit} excess received
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Showing {(currentPage - 1) * itemsPerPage + 1}–
                    {Math.min(currentPage * itemsPerPage, receivedItems.length)}{" "}
                    of {receivedItems.length} items
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pg) => (
                        <button
                          key={pg}
                          onClick={() => setCurrentPage(pg)}
                          className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${pg === currentPage ? "bg-emerald-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-600"}`}
                        >
                          {pg}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* Status banners */}
              {getTotalShortage() > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <FiAlertTriangle size={12} /> Shortage — PO will be: PARTIAL
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    {getTotalShortage()} units pending. Another invoice needed
                    later.
                  </p>
                </div>
              )}
              {livePoStatus === "received" && getTotalShortage() === 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <FiCheck size={12} /> All matched — PO will be: COMPLETE
                  </p>
                </div>
              )}
              {livePoStatus === "excess" && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                    <FiAlertTriangle size={12} /> Excess received — PO will be:
                    EXCESS
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 3: Quality Check ── */}
      {step === 3 && selectedPO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader
              title="Quality Check"
              subtitle="Final verification before approving material receipt"
            />
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                  Quality Check Result
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      value: "passed",
                      icon: "✅",
                      label: "Passed",
                      sub: "All items good — full approval",
                      border: "border-emerald-400 bg-emerald-50",
                      text: "text-emerald-700",
                      ring: "ring-emerald-300",
                    },
                    {
                      value: "passed_with_issues",
                      icon: "⚠️",
                      label: "Passed with Issues",
                      sub: "Approved but minor issues noted",
                      border: "border-amber-400 bg-amber-50",
                      text: "text-amber-700",
                      ring: "ring-amber-300",
                    },
                    {
                      value: "failed",
                      icon: "❌",
                      label: "Failed",
                      sub: "Items rejected — no stock update",
                      border: "border-red-400 bg-red-50",
                      text: "text-red-700",
                      ring: "ring-red-300",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setQualityCheck(opt.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        qualityCheck === opt.value
                          ? `${opt.border} ${opt.text} ring-2 ${opt.ring} font-bold`
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold">{opt.label}</p>
                        <p className="text-[11px] opacity-70">{opt.sub}</p>
                      </div>
                      {qualityCheck === opt.value && (
                        <FiCheck className="ml-auto flex-shrink-0" size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Remarks{" "}
                  <span className="text-slate-400 normal-case">(optional)</span>
                </p>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    qualityCheck === "failed"
                      ? "Describe the reason for rejection..."
                      : qualityCheck === "passed_with_issues"
                        ? "Describe the issues observed..."
                        : "Any additional notes..."
                  }
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none transition-colors ${
                    qualityCheck === "failed"
                      ? "border-red-200 bg-red-50/30 focus:ring-red-300"
                      : qualityCheck === "passed_with_issues"
                        ? "border-amber-200 bg-amber-50/30 focus:ring-amber-300"
                        : "border-slate-200 focus:ring-emerald-300"
                  }`}
                />
              </div>

              {/* Items with issues summary — ✅ shows preserved data from step 2 */}
              {receivedItems.some((i) => i.issue) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 mb-2">
                    ⚠️ Items with Issues Noted:
                  </p>
                  <div className="space-y-1">
                    {receivedItems
                      .filter((i) => i.issue)
                      .map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-amber-800"
                        >
                          <span className="font-bold font-mono flex-shrink-0">
                            {item.productCode}
                          </span>
                          <span className="text-amber-600 capitalize">
                            — {item.issue.replace("_", " ")}
                            {item.issue === "damage" &&
                              (item.damagedQty || 0) > 0 && (
                                <span className="text-red-600 font-bold ml-1">
                                  ({item.damagedQty} units)
                                </span>
                              )}
                          </span>
                          {item.issueDetail && (
                            <span className="text-amber-500 truncate">
                              : {item.issueDetail}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {qualityCheck === "failed" && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <FiAlertTriangle
                    size={14}
                    className="text-red-500 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-xs text-red-700">
                    <strong>Stock will NOT be updated.</strong> Sales team will
                    be notified of the rejection.
                  </p>
                </div>
              )}
              {qualityCheck !== "failed" && (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <FiCheck
                    size={14}
                    className="text-emerald-600 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-xs text-emerald-800">
                    After approval:{" "}
                    <strong>stock will be updated immediately</strong> and{" "}
                    <strong>Sales team will be notified</strong> to complete
                    final invoice submission.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Confirm Summary */}
          <Card>
            <CardHeader
              title="Confirm Summary"
              subtitle="Review before final approval"
            />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs">
                {[
                  {
                    label: "PO Number",
                    value: selectedPO.poNumber,
                    bold: true,
                  },
                  { label: "Invoice No", value: invoiceNo, bold: true },
                  { label: "Vendor", value: selectedPO.vendor },
                  {
                    label: "Invoice Date",
                    value: invoiceDate
                      ? new Date(invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—",
                  },
                ].map(({ label, value, bold }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-slate-500">{label}</span>
                    <span
                      className={`${bold ? "font-black" : "font-semibold"} text-slate-800`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-slate-500">Units this invoice</span>
                  <span className="font-black text-slate-800 text-sm">
                    {getTotalNewReceived()} units
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">PO Status after</span>
                  <StatusPill status={livePoStatus} />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                  Item Breakdown
                </p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {receivedItems.map((item, i) => {
                    const phys = item.physicalQty ?? item.newReceived ?? 0;
                    const inv = item.newReceived ?? 0;
                    const damaged =
                      item.issue === "damage" ? item.damagedQty || 0 : 0;
                    const usable = inv - damaged;
                    const differs = phys !== inv;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${
                          damaged > 0
                            ? "bg-red-50 border border-red-100"
                            : item.issue
                              ? "bg-amber-50 border border-amber-100"
                              : differs
                                ? "bg-amber-50 border border-amber-100"
                                : "bg-slate-50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-bold font-mono text-slate-800">
                            {item.productCode}
                          </span>
                          {item.issue && (
                            <span className="ml-2 text-red-500 capitalize font-bold">
                              ⚠ {item.issue.replace("_", " ")}
                              {damaged > 0 && (
                                <span className="ml-1">({damaged} dmg)</span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {damaged > 0 ? (
                            <span className="text-emerald-600">
                              Usable: <strong>{usable}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Inv: <strong>{inv}</strong>
                            </span>
                          )}
                          {differs && !damaged && (
                            <span className="text-amber-600">
                              Phys: <strong>{phys}</strong>
                            </span>
                          )}
                          <StatusPill
                            status={getItemStatus(
                              item.orderedQty || 0,
                              (item.alreadyReceived || 0) + usable,
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 4 && selectedPO && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <FiCheck size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">
              QC Approved & Stock Updated!
            </h3>
            <p className="text-sm text-slate-600 mb-2">
              {selectedPO.poNumber} — {selectedPO.vendor}
            </p>
            <p className="text-xs text-indigo-600 font-bold mb-6">
              ✅ Sales team has been notified to complete invoice submission
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 mb-6">
              <span className="text-xs text-slate-500">PO Status:</span>
              <StatusPill status={livePoStatus} />
            </div>

            <div className="space-y-1.5 text-sm text-slate-600 mb-8">
              <p>
                ✅ Invoice <strong>{invoiceNo}</strong> approved
              </p>
              <p>
                ✅ Stock updated with{" "}
                <strong>{getTotalNewReceived()} units</strong>
              </p>
              <p>
                ✅ Quality check: <strong>{qualityCheck}</strong>
              </p>
              {getTotalShortage() > 0 && (
                <p className="text-orange-600 font-bold">
                  ⚠️ {getTotalShortage()} units still pending — next invoice
                  required
                </p>
              )}
            </div>

            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-left">
                <p className="text-xs font-bold text-slate-700 mb-3">
                  📦 Stock Added:
                </p>
                <div className="space-y-2">
                  {receivedItems
                    .filter((i) => i.newReceived > 0)
                    .map((item, idx) => {
                      const damaged =
                        item.issue === "damage" ? item.damagedQty || 0 : 0;
                      const usable = item.newReceived - damaged;
                      const total = (item.alreadyReceived || 0) + usable;
                      const status = getItemStatus(item.orderedQty || 0, total);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-600 font-mono">
                            {item.productCode}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">
                              {total}/{item.orderedQty}
                            </span>
                            <span className="font-bold text-emerald-600">
                              +{usable} {item.unit}
                            </span>
                            {damaged > 0 && (
                              <span className="text-red-500 font-bold text-[10px]">
                                ({damaged} damaged)
                              </span>
                            )}
                            <StatusPill status={status} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <BtnSecondary
                onClick={() => {
                  setStep(1);
                  setSelectedInvoice(null);
                  setSelectedPO(null);
                  setReceivedItems([]);
                  setInvoiceNo("");
                  setInvoiceDate("");
                  setQualityCheck("passed");
                  setRemarks("");
                  setCurrentPage(1);
                  setLoadingInvoices(true);
                  getDocs(
                    query(
                      collection(db, "excelupload"),
                      orderBy("createdAt", "desc"),
                    ),
                  ).then((snap) => {
                    const invoices = snap.docs
                      .map((d) => ({ id: d.id, ...d.data() }))
                      .filter(
                        (d) =>
                          d.type === "INVOICE" &&
                          d.storeQcStatus !== "approved" &&
                          d.linkedPoId,
                      );
                    setPendingInvoices(invoices);
                    setLoadingInvoices(false);
                  });
                }}
              >
                Review Another Invoice
              </BtnSecondary>
              <BtnPrimary onClick={() => navigate("/store/dashboard")}>
                Go to Dashboard
              </BtnPrimary>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary
            onClick={() => {
              setStep(1);
              setSelectedInvoice(null);
              setSelectedPO(null);
              setReceivedItems([]);
            }}
          >
            ← Back
          </BtnSecondary>
          <BtnPrimary onClick={() => setStep(3)}>
            Next: Quality Check →
          </BtnPrimary>
        </div>
      )}
      {step === 3 && (
        <div className="flex justify-end gap-3">
          {/* ✅ Back preserves all receivedItems state — just changes step */}
          <BtnSecondary onClick={() => setStep(2)}>← Back</BtnSecondary>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center gap-2 ${
              qualityCheck === "failed"
                ? "bg-red-600 hover:bg-red-700"
                : qualityCheck === "passed_with_issues"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : qualityCheck === "failed" ? (
              "❌ Reject & Notify Sales"
            ) : qualityCheck === "passed_with_issues" ? (
              "⚠️ Approve with Issues & Update Stock"
            ) : (
              "✅ Approve & Update Stock"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
