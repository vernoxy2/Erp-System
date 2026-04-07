import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
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

import SalesOrderQCList from "./SalesOrderQCList";
import PurchaseOrderQCList from "./PurchaseOrderQCList";

// ─── Helpers ────────────────────────────────────────────────────────────────
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
    waiting_for_qc: "bg-violet-50 text-violet-700 border-violet-200",
  };
  const n = status?.toLowerCase().replace(" ", "_");
  return (
    <span
      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${map[n] || map.pending}`}
    >
      {n?.replace(/_/g, " ")}
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
  if (statuses.some((s) => s === "partial" || s === "complete")) return "partial";
  return "ordered";
}

async function addToStock(items, poNumber, vendor, isReplacement = false) {
  const now = new Date().toISOString();
  for (const item of items) {
    const qty = item.physicalQty ?? item.newReceived ?? 0;
    if (qty <= 0) continue;
    const key = item.productCode?.toString().trim() || item.description?.trim();
    if (!key) continue;
    const damagedQty = item.damagedQty || 0;
    const remarksStr = [
      isReplacement ? "✅ REPLACEMENT STOCK" : "",
      damagedQty > 0 ? `Damage: ${damagedQty} units (tracked)` : "",
      item.issue && item.issue !== "damage" ? `Issue: ${item.issue}` : "",
      item.issueDetail ? `— ${item.issueDetail}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const q = query(collection(db, "stock"), where("productCode", "==", key));
    const snap = await getDocs(q);
    if (snap.empty) {
      const newDocDamagedQty = isReplacement ? 0 : damagedQty;
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
        damagedQty: newDocDamagedQty,
        hasIssue: newDocDamagedQty > 0,
        ledger: [
          {
            type: isReplacement ? "replacement-in" : "IN",
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
      const excessQty = totalReceived > orderedQty ? totalReceived - orderedQty : 0;
      const newDamagedQty = isReplacement
        ? 0
        : parseFloat(sdata.damagedQty || 0) + damagedQty;
      await updateDoc(doc(db, "stock", sd.id), {
        available: Math.max(0, netAvail),
        backorder: remainingBackorder,
        excess: excessQty,
        damagedQty: newDamagedQty,
        hasIssue: newDamagedQty > 0,
        lastUpdated: now,
        ...(isReplacement && { qcIssue: "", qcIssueDetail: "" }),
        ledger: [
          ...(sdata.ledger || []),
          {
            type: isReplacement ? "replacement-in" : "IN",
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

function isSalesOrder(type) {
  if (!type) return false;
  const t = type.trim().toLowerCase().replace(/[\s_\-\.]/g, "");
  return ["salesorder", "so", "workorder", "wo", "sales", "sales_order"].includes(t);
}

function QtyInput({ initialValue, onChange }) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = String(initialValue ?? 0);
  }, []);
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      defaultValue={initialValue ?? 0}
      onInput={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        e.target.value = raw;
        const parsed = raw === "" ? 0 : parseInt(raw, 10) || 0;
        onChange(parsed);
      }}
      onFocus={(e) => e.target.select()}
      className="w-16 h-7 border border-emerald-200 rounded-lg px-2 text-xs font-bold text-center bg-emerald-50/40 text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StoreVerifyQuality() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [pendingSalesOrders, setPendingSalesOrders] = useState([]);
  const [loadingSO, setLoadingSO] = useState(false);
  const [qcMode, setQcMode] = useState("po");
  const [selectedSO, setSelectedSO] = useState(null);
  const [soItems, setSoItems] = useState([]);
  const soItemsRef = useRef([]);
  const [loadingSO2, setLoadingSO2] = useState(false);
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

  const setSoItemsSync = (items) => {
    soItemsRef.current = items;
    setSoItems(items);
  };

  const updateSoItem = (productCode, changes) => {
    setSoItems((prev) => {
      const updated = prev.map((item) =>
        item.productCode === productCode ? { ...item, ...changes } : item,
      );
      soItemsRef.current = updated;
      return updated;
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem("storeQcDraft");
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      if (!d.step || d.step <= 1 || !d.selectedInvoice?.id)
        localStorage.removeItem("storeQcDraft");
    } catch {
      localStorage.removeItem("storeQcDraft");
    }
  }, []);

  useEffect(() => {
    if (step === 1 || step === 4) {
      localStorage.removeItem("storeQcDraft");
      return;
    }
    const data = {
      step,
      invoiceNo,
      invoiceDate,
      qualityCheck,
      remarks,
      selectedInvoice,
      selectedPO,
      receivedItems,
      currentPage,
    };
    localStorage.setItem("storeQcDraft", JSON.stringify(data));
  }, [step, receivedItems, qualityCheck, remarks, currentPage, invoiceNo, invoiceDate]);

  const fetchPendingInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const snap = await getDocs(
        query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
      );
      const allRaw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const all = allRaw.filter((d) => {
        const t = (d.type || "").trim().toUpperCase();
        return t === "INVOICE" && !!d.linkedPoId;
      });
      const grouped = {};
      for (const inv of all) {
        const key = inv.invoiceNo || inv.id;
        if (!grouped[key]) {
          grouped[key] = inv;
        } else {
          const existing = grouped[key].createdAt?.toDate?.() || new Date(0);
          const current = inv.createdAt?.toDate?.() || new Date(0);
          if (current > existing) grouped[key] = inv;
        }
      }
      setPendingInvoices(Object.values(grouped));
    } catch (err) {
      console.error("Fetch invoices error:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchPendingSalesOrders = async () => {
    setLoadingSO(true);
    try {
      const snap = await getDocs(
        query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
      );
      const allSO = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const soList = allSO.filter((d) => {
        const isSOType = isSalesOrder(d.type);
        const soSt = d.soStatus || d.status || "";
        return (
          isSOType &&
          [
            "waiting_for_qc",
            "waitingforqc",
            "waiting for qc",
            "ready_for_dispatch",
            "partial_approved",
            "complete",
          ].includes(soSt)
        );
      });
      setPendingSalesOrders(soList);
    } catch (err) {
      console.error("Fetch SO error:", err);
    } finally {
      setLoadingSO(false);
    }
  };

  useEffect(() => {
    fetchPendingInvoices();
    fetchPendingSalesOrders();
  }, []);

  const handleSelectSO = async (so) => {
    if (so.soStatus === "ready_for_dispatch" || so.soStatus === "complete") {
      const header = so.excelHeader || so.invoiceHeader || {};
      setSelectedSO({
        id: so.id,
        soNumber:
          header.reference ||
          so.invoiceNo ||
          so.woNumber ||
          `SO-${so.id.slice(0, 8).toUpperCase()}`,
        customer: so.customer || header.consignee || "—",
        deliveryDate: so.deliveryDate || header.dated || "",
        createdAt: so.createdAt || null,
        items: so.items || [],
        soStatus: so.soStatus,
      });
      const items = (so.items || []).map((item) => ({
        ...item,
        orderedQty: item.quantity || item.orderedQty || 0,
        readyQty: item.soQcReadyQty ?? (item.quantity || item.orderedQty || 0),
      }));
      setSoItemsSync(items);
      setQcMode("so");
      setStep(2);
      return;
    }

    setLoadingSO2(true);
    try {
      const soSnap = await getDoc(doc(db, "excelupload", so.id));
      if (!soSnap.exists()) {
        alert("SO not found.");
        await fetchPendingSalesOrders();
        setLoadingSO2(false);
        return;
      }
      const soData = soSnap.data();
      if (soData.soStatus === "ready_for_dispatch" || soData.soStatus === "complete") {
        alert("⚠️ This SO has already been approved. Refreshing list...");
        await fetchPendingSalesOrders();
        setLoadingSO2(false);
        return;
      }
      const isReopen =
        soData.soStatus === "waiting_for_qc" && soData.soQcIssues?.length > 0;
      const soItemsRaw = soData.items || [];
      const mappedItems = await Promise.all(
        soItemsRaw.map(async (item) => {
          const productCode = item.productCode?.toString().trim();
          let stockAvailable = 0, stockDocId = null;
          if (productCode) {
            const stockQ = query(
              collection(db, "stock"),
              where("productCode", "==", productCode),
            );
            const stockSnap = await getDocs(stockQ);
            if (!stockSnap.empty) {
              stockAvailable = Math.max(0, stockSnap.docs[0].data().available || 0);
              stockDocId = stockSnap.docs[0].id;
            }
          }
          const orderedQty = item.quantity || item.orderedQty || 0;
          const lastIssue = isReopen ? item.soQcIssue || "" : "";
          const lastIssueDetail = isReopen ? item.soQcIssueDetail || "" : "";
          const savedReadyQty = item.soQcReadyQty ?? null;
          const defaultReadyQty = Math.min(orderedQty, stockAvailable);
          const readyQty =
            isReopen && savedReadyQty !== null ? savedReadyQty : defaultReadyQty;
          return {
            ...item,
            orderedQty,
            stockAvailable,
            stockDocId,
            readyQty,
            damagedQty: isReopen ? item.damagedQty || 0 : 0,
            issue: lastIssue,
            issueDetail: lastIssueDetail,
            _hadIssue: isReopen && !!lastIssue,
            _lastIssue: lastIssue,
            _lastReadyQty: savedReadyQty,
          };
        }),
      );
      const header = soData.excelHeader || soData.invoiceHeader || {};
      setSelectedSO({
        id: soData.id || so.id,
        soNumber:
          header.reference ||
          soData.invoiceNo ||
          soData.woNumber ||
          `SO-${so.id.slice(0, 8).toUpperCase()}`,
        customer: soData.customer || header.consignee || "—",
        deliveryDate: soData.deliveryDate || header.dated || "",
        createdAt: soData.createdAt || null,
        items: soItemsRaw,
        soStatus: soData.soStatus,
      });
      setSoItemsSync(mappedItems);
      setQualityCheck("passed");
      setRemarks("");
      setQcMode("so");
      setCurrentPage(1);
      setStep(2);
    } catch (err) {
      console.error("Load SO error:", err);
      alert("Error loading SO: " + err.message);
    } finally {
      setLoadingSO2(false);
    }
  };

  const getSoItemStatus = (item) => {
    const ready = item.readyQty ?? 0;
    const ordered = item.orderedQty || 0;
    if (ready === 0) return "ordered";
    if (ready < ordered) return "partial";
    if (ready === ordered) return "complete";
    return "excess";
  };

  const liveSoStatus = (() => {
    if (soItems.length === 0) return "pending";
    const statuses = soItems.map((i) => getSoItemStatus(i));
    if (statuses.every((s) => s === "complete")) return "complete";
    if (statuses.some((s) => s === "partial" || s === "complete")) return "partial";
    return "pending";
  })();

  const soTotalReady = soItems.reduce((s, i) => s + (i.readyQty ?? 0), 0);
  const soTotalShortage = soItems.reduce(
    (s, i) => s + Math.max(0, (i.orderedQty || 0) - (i.readyQty ?? 0)),
    0,
  );

  const handleSOSubmit = async () => {
    setUploading(true);
    try {
      const now = new Date().toISOString();
      const currentItems = soItemsRef.current;
      const hasIssues = currentItems.some((i) => i.issue && i.issue !== "");
      const allComplete = currentItems.every((i) => getSoItemStatus(i) === "complete");
      const updatedItems = currentItems.map((item) => ({
        ...item,
        soQcReadyQty: item.readyQty ?? 0,
        soQcIssue: item.issue || "",
        soQcIssueDetail: item.issueDetail || "",
        soQcStatus: getSoItemStatus(item),
        damagedQty: item.damagedQty || 0,
        damageResolved: false,
      }));
      const newSoStatus =
        qualityCheck === "failed"
          ? "waiting_for_qc"
          : allComplete && !hasIssues
            ? "ready_for_dispatch"
            : "partial_approved";
      await updateDoc(doc(db, "excelupload", selectedSO.id), {
        items: updatedItems,
        soStatus: newSoStatus,
        soQcStatus: allComplete && qualityCheck !== "failed" ? "approved" : "issues",
        soQcApprovedAt: now,
        soQcApprovedBy: "Store Team",
        soQcRemarks: remarks,
        soQcIssues: currentItems
          .filter((i) => i.issue)
          .map((i) => ({
            productCode: i.productCode,
            issue: i.issue,
            detail: i.issueDetail,
            shortage: Math.max(0, (i.orderedQty || 0) - (i.readyQty ?? 0)),
            damagedQty: i.damagedQty || 0,
          })),
        qualityCheck,
        remarks,
      });
      for (const item of currentItems) {
        const dmgQty = parseFloat(item.damagedQty || 0);
        if (!item.productCode) continue;
        const stockQ = query(
          collection(db, "stock"),
          where("productCode", "==", item.productCode),
        );
        const stockSnap = await getDocs(stockQ);
        if (stockSnap.empty) continue;
        const stockDocRef = doc(db, "stock", stockSnap.docs[0].id);
        if (item.issue && item.issue !== "" && item.issue !== "damage") {
          await updateDoc(stockDocRef, {
            hasIssue: true,
            qcIssue: item.issue,
            qcIssueDetail: item.issueDetail || "",
            lastQCDate: now,
          });
        }
        if (dmgQty > 0) {
          await updateDoc(stockDocRef, {
            damagedQty: dmgQty,
            hasIssue: true,
            hasSOPending: true,
            lastQCDate: now,
          });
        }
        const hasItemIssue = item.issue && item.issue !== "";
        if (!hasItemIssue && newSoStatus === "ready_for_dispatch") {
          await updateDoc(stockDocRef, {
            damagedQty: 0,
            hasIssue: false,
            hasSOPending: false,
            qcIssue: "",
            qcIssueDetail: "",
            lastQCDate: now,
          });
        }
      }
      if (qualityCheck !== "failed") {
        for (const item of currentItems) {
          const reserveQty = parseFloat(item.readyQty) || 0;
          if (!item.productCode || reserveQty <= 0) continue;
          const stockQ = query(
            collection(db, "stock"),
            where("productCode", "==", item.productCode),
          );
          const stockSnap = await getDocs(stockQ);
          if (stockSnap.empty) continue;
          const stockRef = doc(db, "stock", stockSnap.docs[0].id);
          const sdata = stockSnap.docs[0].data();
          const currentReserved = parseFloat(sdata.reserved) || 0;
          const currentAvail = parseFloat(sdata.available) || 0;
          await updateDoc(stockRef, {
            reserved: currentReserved + reserveQty,
            lastUpdated: now,
            ledger: [
              ...(sdata.ledger || []),
              {
                type: "RESERVED",
                qty: reserveQty,
                ref: selectedSO.soNumber,
                by: "Store QC",
                balance: currentAvail,
                date: now,
                remarks: `SO QC Approved — Reserved for dispatch · ${selectedSO.soNumber}`,
              },
            ],
          });
        }
      }
      localStorage.removeItem("storeQcDraft");
      setUploading(false);
      setStep(4);
      await fetchPendingSalesOrders();
    } catch (err) {
      console.error("SO Submit error:", err);
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  // ─── handleSelectInvoice ────────────────────────────────────────────────────
  const handleSelectInvoice = async (invoice) => {
    if (invoice.storeQcStatus === "approved") {
      setLoadingPO(true);
      try {
        const poSnap = await getDoc(doc(db, "excelupload", invoice.linkedPoId));
        if (!poSnap.exists()) {
          alert("Linked PO not found.");
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
          status: poData.poStatus || "complete",
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
        setQualityCheck(invoice.qualityCheck || "passed");
        setRemarks(invoice.remarks || "");
        const mapped = po.items.map((poItem) => {
          const invItem = (invoice.items || []).find(
            (i) =>
              i.productCode?.toLowerCase().trim() ===
              poItem.productCode?.toLowerCase().trim(),
          );
          const alreadyReceived = poItem.totalReceivedQty || 0;
          const orderedQty = poItem.orderedQty || poItem.quantity || 0;
          const physicalQty =
            invItem?.physicalQty ?? invItem?.newReceived ?? invItem?.invoiceQty ?? 0;
          return {
            ...poItem,
            alreadyReceived,
            orderedQty,
            physicalQty,
            newReceived: physicalQty,
            matchedFromInvoice: !!invItem,
            issue: invItem?.issue || "",
            issueDetail: invItem?.issueDetail || "",
            damagedQty: invItem?.damagedQty || 0,
          };
        });
        setReceivedItems(mapped);
        setQcMode("po");
        setCurrentPage(1);
        setStep(2);
      } catch (err) {
        console.error("Load approved PO error:", err);
        alert("Error: " + err.message);
      } finally {
        setLoadingPO(false);
      }
      return;
    }

    // ── Normal pending invoice flow ──
    setLoadingPO(true);
    try {
      const poSnap = await getDoc(doc(db, "excelupload", invoice.linkedPoId));
      if (!poSnap.exists()) {
        alert("Linked PO not found.");
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
      setQualityCheck("passed");
      setRemarks("");
      const mapped = po.items.map((poItem) => {
        const invItem = (invoice.items || []).find(
          (i) =>
            i.productCode?.toLowerCase().trim() ===
            poItem.productCode?.toLowerCase().trim(),
        );
        const alreadyReceived = poItem.totalReceivedQty || 0;
        const orderedQty = poItem.orderedQty || poItem.quantity || 0;
        const invoiceQty = invItem?.newReceived ?? invItem?.invoiceQty ?? 0;
        return {
          ...poItem,
          alreadyReceived,
          orderedQty,
          physicalQty: invoiceQty,
          newReceived: invoiceQty,
          matchedFromInvoice: !!invItem,
          issue: "",
          issueDetail: "",
          damagedQty: 0,
        };
      });
      setReceivedItems(mapped);
      setQcMode("po");
      setCurrentPage(1);
      setStep(2);
    } catch (err) {
      console.error("Load PO error:", err);
      alert("Error: " + err.message);
    } finally {
      setLoadingPO(false);
    }
  };

  const updateItem = (productCode, changes) => {
    setReceivedItems((prev) =>
      prev.map((item) =>
        item.productCode === productCode ? { ...item, ...changes } : item,
      ),
    );
  };

  const getUsableQty = (item) => item.physicalQty ?? item.newReceived ?? 0;

  const getTotalNewReceived = () =>
    receivedItems.reduce((s, i) => s + (i.physicalQty ?? i.newReceived ?? 0), 0);

  const getTotalShortage = () =>
    receivedItems.reduce((sum, item) => {
      const total = (item.alreadyReceived || 0) + getUsableQty(item);
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
      const hasDamage = receivedItems.some((i) => (i.damagedQty || 0) > 0);
      const isReplacement = selectedInvoice.storeQcStatus === "approved_with_issues";
      const updatedItems = receivedItems.map((item) => {
        const orderedQty = item.orderedQty || 0;
        const alreadyReceived = item.alreadyReceived || 0;
        const physical = item.physicalQty ?? item.newReceived ?? 0;
        const totalReceivedQty = alreadyReceived + physical;
        return {
          ...item,
          totalReceivedQty,
          orderedQty,
          quantity: orderedQty,
          shortage: Math.max(0, orderedQty - totalReceivedQty),
          itemStatus: getItemStatus(orderedQty, totalReceivedQty),
          physicalQty: physical,
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
      const totalReceivedQty = updatedItems.reduce((s, i) => s + i.totalReceivedQty, 0);
      const finalQcStatus =
        hasDamage && qualityCheck === "passed" ? "passed_with_issues" : qualityCheck;
      await updateDoc(doc(db, "excelupload", selectedPO.id), {
        items: updatedItems,
        poStatus: isReplacement ? "complete" : poStatus,
        receivedAt: now,
        lastInvoiceAt: now,
        totalReceivedQty,
        qualityCheck: finalQcStatus,
        remarks,
        storeQcStatus: qualityCheck === "passed" ? "approved" : "approved_with_issues",
        storeQcApprovedAt: now,
        storeQcApprovedBy: "Store Team",
        storeQcPending: false,
        pendingInvoiceId: null,
      });
      const invoiceQcStatus = isReplacement
        ? "approved"
        : qualityCheck === "passed"
          ? "approved"
          : "approved_with_issues";
      await updateDoc(doc(db, "excelupload", selectedInvoice.id), {
        storeQcStatus: invoiceQcStatus,
        storeQcApprovedAt: now,
        storeQcApprovedBy: "Store Team",
        qualityCheck: finalQcStatus,
        remarks,
        poStatus,
        items: updatedItems,
      });
      if (qualityCheck !== "failed") {
        await addToStock(receivedItems, selectedPO.poNumber, selectedPO.vendor, isReplacement);
        for (const item of receivedItems) {
          const key = item.productCode?.toString().trim();
          if (!key || !item.issue || item.issue === "" || item.issue === "damage") continue;
          const stockSnap = await getDocs(
            query(collection(db, "stock"), where("productCode", "==", key)),
          );
          if (stockSnap.empty) continue;
          await updateDoc(doc(db, "stock", stockSnap.docs[0].id), {
            hasIssue: true,
            qcIssue: item.issue,
            qcIssueDetail: item.issueDetail || "",
            lastQCDate: now,
          });
        }
        for (const item of receivedItems) {
          const key = item.productCode?.toString().trim();
          if (!key) continue;
          const physical = item.physicalQty ?? item.newReceived ?? 0;
          const totalReceived = (item.alreadyReceived || 0) + physical;
          const orderedQty = item.orderedQty || 0;
          const hasItemIssue = item.issue && item.issue !== "";
          const shouldClearBadge =
            isReplacement ||
            (!hasItemIssue && totalReceived >= orderedQty) ||
            (!hasItemIssue && qualityCheck === "passed");
          if (!shouldClearBadge) continue;
          const stockSnap = await getDocs(
            query(collection(db, "stock"), where("productCode", "==", key)),
          );
          if (stockSnap.empty) continue;
          await updateDoc(doc(db, "stock", stockSnap.docs[0].id), {
            damagedQty: 0,
            hasIssue: false,
            qcIssue: "",
            qcIssueDetail: "",
            lastQCDate: now,
          });
        }
      }
      localStorage.removeItem("storeQcDraft");
      setUploading(false);
      setStep(4);
      await fetchPendingInvoices();
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

  // ─── derived flag used in multiple places ────────────────────────────────
  const isApprovedPOView =
    step === 2 &&
    qcMode === "po" &&
    !!selectedPO &&
    selectedInvoice?.storeQcStatus === "approved";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Store Quality Check</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review vendor invoices and approve material receipt
          </p>
        </div>
        <BtnSecondary onClick={() => navigate("/store/dashboard")}>Cancel</BtnSecondary>
      </div>

      {/* Step Indicator — hide on approved read-only PO view */}
      {step < 4 && !isApprovedPOView && (
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
                    className={`text-[10px] font-bold whitespace-nowrap ${
                      step >= s.num ? "text-slate-700" : "text-slate-400"
                    }`}
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

      {/* ── STEP 1 ─────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <>
          {(() => {
            const saved = localStorage.getItem("storeQcDraft");
            if (!saved) return null;
            try {
              const d = JSON.parse(saved);
              if (!d.step || d.step <= 1) return null;
              return (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-bold text-amber-700">
                    📝 Draft found — Invoice: {d.invoiceNo || "—"} · PO:{" "}
                    {d.selectedPO?.poNumber || "—"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const d2 = JSON.parse(localStorage.getItem("storeQcDraft"));
                        setStep(d2.step);
                        setSelectedInvoice(d2.selectedInvoice);
                        setSelectedPO(d2.selectedPO);
                        setReceivedItems(d2.receivedItems);
                        setInvoiceNo(d2.invoiceNo);
                        setInvoiceDate(d2.invoiceDate);
                        setQualityCheck(d2.qualityCheck);
                        setRemarks(d2.remarks);
                        setCurrentPage(d2.currentPage || 1);
                      }}
                      className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600"
                    >
                      Resume →
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem("storeQcDraft");
                        window.location.reload();
                      }}
                      className="px-3 py-1 bg-white border border-amber-300 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-50"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              );
            } catch {
              return null;
            }
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesOrderQCList
              pendingSalesOrders={pendingSalesOrders}
              loadingSO={loadingSO}
              loadingSO2={loadingSO2}
              handleSelectSO={handleSelectSO}
            />
            <PurchaseOrderQCList
              pendingInvoices={pendingInvoices}
              loadingInvoices={loadingInvoices}
              loadingPO={loadingPO}
              handleSelectInvoice={handleSelectInvoice}
            />
          </div>
        </>
      )}

      {/* ── PO Step 2 — Approved Read-Only ─────────────────────────────────── */}
      {isApprovedPOView && (
        <div className="space-y-6">
          {/* Approved Banner */}
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <FiCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-800">
                Invoice Approved — Stock Updated
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {invoiceNo} · PO: {selectedPO.poNumber} · {selectedPO.vendor}
              </p>
            </div>
          </div>

          {/* Details Card */}
          <Card>
            <CardHeader title="Invoice Details" subtitle="Read only — QC complete" />
            <div className="p-6 space-y-4">
              {/* Info grid */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold mb-1">PO Number</p>
                    <p className="text-slate-800 font-bold">{selectedPO.poNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Invoice No</p>
                    <p className="text-slate-800 font-bold">{invoiceNo || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Vendor</p>
                    <p className="text-slate-800">{selectedPO.vendor}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Invoice Date</p>
                    <p className="text-slate-800">
                      {invoiceDate
                        ? new Date(invoiceDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">QC Result</p>
                    <p className="font-bold text-emerald-600 capitalize">
                      {qualityCheck?.replace(/_/g, " ") || "Passed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">PO Status</p>
                    <StatusPill status={selectedPO.status} />
                  </div>
                </div>
                {remarks && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-slate-400 font-bold text-xs mb-1">Remarks</p>
                    <p className="text-xs text-slate-600">{remarks}</p>
                  </div>
                )}
              </div>

              {/* Items list — same style as SO read-only */}
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">
                  📋 Items ({receivedItems.length}):
                </p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {receivedItems.map((item, idx) => {
                    const phys = item.physicalQty ?? item.newReceived ?? 0;
                    const total = (item.alreadyReceived || 0) + phys;
                    const st = getItemStatus(item.orderedQty || 0, total);
                    return (
                      <div
                        key={item.productCode || idx}
                        className={`flex items-center text-xs px-3 py-2 rounded-lg gap-3 border ${
                          item.issue
                            ? "bg-red-50 border-red-100"
                            : st === "complete"
                              ? "bg-emerald-50 border-emerald-100"
                              : st === "excess"
                                ? "bg-purple-50 border-purple-100"
                                : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        <span className="w-6 font-bold text-slate-400 flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="w-28 font-mono font-bold text-slate-700 flex-shrink-0 truncate">
                          {item.productCode}
                        </span>
                        <span className="flex-1 text-slate-500 truncate" title={item.description}>
                          {item.description}
                        </span>
                        <span className="text-slate-500 flex-shrink-0">
                          {item.orderedQty} {item.unit || "pcs"}
                        </span>
                        <span
                          className={`font-bold flex-shrink-0 ${
                            item.issue
                              ? "text-red-600"
                              : st === "excess"
                                ? "text-purple-600"
                                : "text-emerald-600"
                          }`}
                        >
                          Received: {phys}
                        </span>
                        <span className="flex-shrink-0">
                          <StatusPill status={st} />
                        </span>
                        {item.issue && (
                          <span className="text-[10px] font-bold text-red-600 capitalize flex-shrink-0">
                            ⚠ {item.issue.replace("_", " ")}
                            {item.damagedQty > 0 && ` (${item.damagedQty})`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-start">
            <BtnSecondary
              onClick={() => {
                setStep(1);
                setSelectedInvoice(null);
                setSelectedPO(null);
                setReceivedItems([]);
                setQcMode("po");
              }}
            >
              ← Back
            </BtnSecondary>
          </div>
        </div>
      )}

      {/* ── SO Complete — Read Only ─────────────────────────────────────────── */}
      {step === 2 &&
        qcMode === "so" &&
        selectedSO &&
        (selectedSO.soStatus === "ready_for_dispatch" ||
          selectedSO.soStatus === "complete") && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <FiCheck size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-800">
                  SO QC Approved — Ready for Dispatch
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {selectedSO.soNumber} · {selectedSO.customer}
                </p>
              </div>
            </div>
            <Card>
              <CardHeader title="Sales Order Details" subtitle="Read only — QC complete" />
              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold mb-1">SO Number</p>
                      <p className="text-slate-800 font-bold">{selectedSO.soNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Customer</p>
                      <p className="text-slate-800 font-bold">{selectedSO.customer}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Delivery Date</p>
                      <p className="text-slate-800">{selectedSO.deliveryDate || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Status</p>
                      <StatusPill status="ready" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">
                    📋 Items ({soItems.length}):
                  </p>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {soItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center text-xs px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 gap-3"
                      >
                        <span className="w-6 font-bold text-slate-500">{idx + 1}.</span>
                        <span className="w-28 font-mono text-slate-700">{item.productCode}</span>
                        <span className="flex-1 text-slate-500 truncate">{item.description}</span>
                        <span className="text-slate-500">
                          {item.orderedQty} {item.unit || "pcs"}
                        </span>
                        <span className="text-emerald-600 font-bold">
                          Ready: {item.readyQty ?? item.orderedQty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <div className="flex justify-start">
              <BtnSecondary
                onClick={() => {
                  setStep(1);
                  setSelectedSO(null);
                  setSoItemsSync([]);
                  setQcMode("po");
                }}
              >
                ← Back
              </BtnSecondary>
            </div>
          </div>
        )}

      {/* ── SO Step 2 — Normal Verify ──────────────────────────────────────── */}
      {step === 2 &&
        qcMode === "so" &&
        selectedSO &&
        selectedSO.soStatus !== "ready_for_dispatch" &&
        selectedSO.soStatus !== "complete" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Sales Order Details" />
              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold mb-1">SO Number</p>
                      <p className="text-slate-800 font-bold">{selectedSO.soNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Customer</p>
                      <p className="text-slate-800">{selectedSO.customer}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Delivery Date</p>
                      <p className="text-slate-800">{selectedSO.deliveryDate || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">After QC</p>
                      <StatusPill
                        status={liveSoStatus === "complete" ? "ready" : liveSoStatus}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs">
                  <p className="text-xs font-bold text-slate-600 mb-2">QC Summary:</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Items:</span>
                    <span className="font-bold text-slate-800">{soItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ready for Dispatch:</span>
                    <span className="font-bold text-emerald-600">{soTotalReady} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shortage:</span>
                    <span
                      className={`font-bold ${soTotalShortage > 0 ? "text-orange-600" : "text-emerald-600"}`}
                    >
                      {soTotalShortage} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SO Status After:</span>
                    <StatusPill
                      status={liveSoStatus === "complete" ? "ready" : liveSoStatus}
                    />
                  </div>
                </div>
                {soItems.some((i) => i._hadIssue) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-bold text-amber-700 mb-2">⚠️ Previous Issues:</p>
                    {soItems
                      .filter((i) => i._hadIssue)
                      .map((item, i) => (
                        <div key={i} className="text-xs text-amber-800 flex gap-2 mt-1">
                          <span className="font-mono font-bold">{item.productCode}</span>
                          <span className="capitalize text-amber-600">
                            — {item._lastIssue?.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <FiAlertCircle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Set "Ready Qty" = actual units you can dispatch from stock. Shortage items will
                    stay in QC list.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Items for Dispatch"
                subtitle={`${soItems.length} items · ${soTotalReady} units ready`}
              />
              <div className="p-4 overflow-auto max-h-[70vh]">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide w-8">#</th>
                      <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide w-28">Part No</th>
                      <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide">Description</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide w-14">Unit</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide w-20">Phy Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {soItems.map((item, idx) => {
                      const ordered = item.orderedQty || 0;
                      const avail = item.stockAvailable || 0;
                      const readyQty = item.readyQty ?? Math.min(ordered, avail);
                      const isShort = readyQty < ordered;
                      return (
                        <tr
                          key={item.productCode}
                          className={`transition-colors ${isShort ? "bg-orange-50/50" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-3 py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {item.productCode}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            <span className="block max-w-[180px] truncate" title={item.description}>
                              {item.description}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-500">
                            {item.unit || "pcs"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <QtyInput
                              initialValue={readyQty}
                              onChange={(newReady) => {
                                const autoIssue = newReady < ordered ? "shortage" : "";
                                const autoDetail =
                                  newReady < ordered
                                    ? `Short: ${ordered - newReady} units`
                                    : "";
                                updateSoItem(item.productCode, {
                                  readyQty: newReady,
                                  issue:
                                    item.issue === "damage" ? item.issue : autoIssue,
                                  issueDetail:
                                    item.issue === "damage" ? item.issueDetail : autoDetail,
                                  ...(item.issue === "damage" && {
                                    damagedQty: Math.max(0, ordered - newReady),
                                  }),
                                });
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {soTotalShortage > 0 && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                      <FiAlertTriangle size={12} /> {soTotalShortage} units short — SO will stay in
                      QC list
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

      {/* ── PO Step 2 — Normal Verify ──────────────────────────────────────── */}
      {step === 2 &&
        qcMode === "po" &&
        selectedPO &&
        selectedInvoice &&
        selectedInvoice.storeQcStatus !== "approved" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Invoice Details" />
              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold mb-1">PO Number</p>
                      <p className="text-slate-800 font-bold">{selectedPO.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Invoice No</p>
                      <p className="text-slate-800 font-bold">{invoiceNo || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Vendor</p>
                      <p className="text-slate-800">{selectedPO.vendor}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Invoice Date</p>
                      <p className="text-slate-800">{invoiceDate ? formatDate(invoiceDate) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Current PO Status</p>
                      <StatusPill status={selectedPO.status} />
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">After Approval</p>
                      <StatusPill status={livePoStatus} />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-600 mb-2">Receipt Summary:</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Items in Invoice:</span>
                      <span className="font-bold text-slate-800">
                        {receivedItems.filter((i) => i.matchedFromInvoice).length} /{" "}
                        {receivedItems.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stock to be Added:</span>
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
                      <span className="text-slate-500">PO Status After Approval:</span>
                      <StatusPill status={livePoStatus} />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <FiAlertCircle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Quantities are pre-filled from the invoice. Edit "Physical" = actual healthy
                    units received.
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Verify Quantities"
                subtitle={`${getTotalNewReceived()} units to stock · ${receivedItems.length} items`}
              />
              <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                {pagedItems.map((item) => {
                  const currentItem =
                    receivedItems.find((r) => r.productCode === item.productCode) || item;
                  const ordered = currentItem.orderedQty || 0;
                  const already = currentItem.alreadyReceived || 0;
                  const thisInv = currentItem.newReceived || 0;
                  const phys = currentItem.physicalQty ?? thisInv;
                  const totalAfter = already + phys;
                  const remaining = Math.max(0, ordered - totalAfter);
                  const excess = Math.max(0, totalAfter - ordered);
                  const itemStatus = getItemStatus(ordered, totalAfter);
                  const progressPct =
                    ordered > 0 ? Math.min(100, Math.round((totalAfter / ordered) * 100)) : 0;
                  return (
                    <div
                      key={currentItem.productCode}
                      className={`p-4 border rounded-lg ${
                        currentItem._hadIssue && currentItem.issue === "damage"
                          ? "border-red-400 bg-red-50/30 ring-1 ring-red-300"
                          : currentItem._hadIssue && currentItem.issue === "shortage"
                            ? "border-orange-400 bg-orange-50/30 ring-1 ring-orange-300"
                            : currentItem._hadIssue
                              ? "border-amber-400 bg-amber-50/30"
                              : itemStatus === "complete"
                                ? "border-emerald-200 bg-emerald-50/30"
                                : itemStatus === "excess"
                                  ? "border-purple-200 bg-purple-50/30"
                                  : itemStatus === "partial"
                                    ? "border-orange-200 bg-orange-50/30"
                                    : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <FiPackage className="text-slate-400 mt-0.5 flex-shrink-0" size={15} />
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
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">
                            Ordered
                          </p>
                          <div className="h-8 flex items-center px-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-sm font-bold text-slate-800">{ordered}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">
                            Invoice Qty
                          </p>
                          <input
                            type="number"
                            value={thisInv}
                            disabled
                            className="w-full h-8 border border-slate-200 rounded-lg px-2 text-sm font-bold text-slate-800 bg-slate-50 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase">
                            Physical
                          </p>
                          <input
                            type="number"
                            min="0"
                            value={currentItem.physicalQty ?? thisInv}
                            onChange={(e) => {
                              const newPhys = parseFloat(e.target.value) || 0;
                              const inv = currentItem.newReceived || 0;
                              const issue = currentItem.issue;
                              const autoIssue = !issue && newPhys < inv ? "shortage" : issue;
                              const autoDamaged =
                                autoIssue === "damage"
                                  ? Math.max(0, inv - newPhys)
                                  : currentItem.damagedQty;
                              const autoDetail =
                                autoIssue === "shortage"
                                  ? `Short: ${inv - newPhys} units `
                                  : autoIssue === "damage"
                                    ? `Damaged: ${autoDamaged} units `
                                    : currentItem.issueDetail;
                              updateItem(currentItem.productCode, {
                                physicalQty: newPhys,
                                issue: autoIssue,
                                issueDetail: autoDetail,
                                damagedQty: autoDamaged,
                              });
                            }}
                            className={`w-full h-8 border rounded-lg px-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                              phys !== thisInv
                                ? "border-orange-300 bg-orange-50 text-orange-700"
                                : "border-indigo-200 bg-indigo-50/40 text-indigo-700"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-red-400 font-bold mb-1 uppercase">
                            Issue
                          </p>
                          <select
                            value={currentItem.issue || ""}
                            onChange={(e) => {
                              const newIssue = e.target.value;
                              const inv = currentItem.newReceived || 0;
                              const phys2 = currentItem.physicalQty ?? inv;
                              const autoDamaged =
                                newIssue === "damage" ? Math.max(0, inv - phys2) : 0;
                              const autoDetail =
                                newIssue === "damage"
                                  ? `Damaged: ${autoDamaged} units`
                                  : newIssue === "shortage"
                                    ? `Short: ${inv - phys2} units`
                                    : newIssue === "quality"
                                      ? "Quality issue noted"
                                      : newIssue === "wrong_item"
                                        ? "Wrong item received"
                                        : "";
                              updateItem(currentItem.productCode, {
                                issue: newIssue,
                                issueDetail: autoDetail,
                                damagedQty: autoDamaged,
                              });
                            }}
                            className={`w-full h-8 border rounded-lg px-1.5 text-[11px] font-bold focus:outline-none ${
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
                      {currentItem.issue === "damage" && (
                        <div className="mt-1 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-[10px] text-red-600 font-bold mb-1 uppercase">
                            Damaged Qty{" "}
                            <span className="normal-case font-normal text-red-400">
                              (tracking only)
                            </span>
                          </p>
                          <input
                            type="number"
                            min="0"
                            value={currentItem.damagedQty || 0}
                            onChange={(e) => {
                              const dmg = parseFloat(e.target.value) || 0;
                              const inv = currentItem.newReceived || 0;
                              const phys2 = currentItem.physicalQty ?? inv;
                              updateItem(currentItem.productCode, {
                                damagedQty: dmg,
                                issueDetail: `Damaged: ${dmg} units (Invoice: ${inv}, Physical: ${phys2})`,
                              });
                            }}
                            className="w-full h-9 border-2 border-red-300 bg-white rounded-lg px-3 text-sm font-black text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                        </div>
                      )}
                      {currentItem.issue && currentItem.issue !== "damage" && (
                        <div className="mt-1 mb-2">
                          <p className="text-[10px] text-red-500 font-bold mb-1">Issue Details</p>
                          <textarea
                            rows={2}
                            value={currentItem.issueDetail || ""}
                            onChange={(e) =>
                              updateItem(currentItem.productCode, {
                                issueDetail: e.target.value,
                              })
                            }
                            className="w-full border border-red-200 bg-red-50/50 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none resize-none"
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>
                            {totalAfter}/{ordered} {currentItem.unit}
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
                          <FiAlertTriangle size={10} /> {remaining} {currentItem.unit} still pending
                        </p>
                      )}
                      {itemStatus === "excess" && (
                        <p className="text-[11px] text-purple-600 font-bold mt-1.5 flex items-center gap-1">
                          <FiAlertTriangle size={10} /> {excess} {currentItem.unit} excess received
                        </p>
                      )}
                    </div>
                  );
                })}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      Showing {(currentPage - 1) * itemsPerPage + 1}–
                      {Math.min(currentPage * itemsPerPage, receivedItems.length)} of{" "}
                      {receivedItems.length} items
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                      >
                        ← Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                        <button
                          key={pg}
                          onClick={() => setCurrentPage(pg)}
                          className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${
                            pg === currentPage
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-200 hover:bg-slate-100 text-slate-600"
                          }`}
                        >
                          {pg}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

      {/* ── SO Step 3 ──────────────────────────────────────────────────────── */}
      {step === 3 && qcMode === "so" && selectedSO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader
              title="Quality Check"
              subtitle="Final verification before approving SO for dispatch"
            />
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                  Quality Check Result
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      value: "passed",
                      icon: "✅",
                      label: "Passed",
                      sub:
                        liveSoStatus === "complete"
                          ? "All items ready — moves to Ready for Dispatch"
                          : "Approved with shortage — stays in QC",
                      border: "border-emerald-400 bg-emerald-50",
                      text: "text-emerald-700",
                      ring: "ring-emerald-300",
                    },
                    {
                      value: "passed_with_issues",
                      icon: "⚠️",
                      label: "Passed with Issues",
                      sub: "Approved but issues noted",
                      border: "border-amber-400 bg-amber-50",
                      text: "text-amber-700",
                      ring: "ring-amber-300",
                    },
                    {
                      value: "failed",
                      icon: "❌",
                      label: "Failed",
                      sub: "SO rejected — stays in QC list",
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
                <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Remarks{" "}
                  <span className="text-slate-400 normal-case">(optional)</span>
                </p>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none border-slate-200 focus:ring-violet-300"
                />
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Confirm Summary" subtitle="Review before final approval" />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">SO Number</span>
                  <span className="font-black text-slate-800">{selectedSO.soNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-semibold text-slate-800">{selectedSO.customer}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-slate-500">Units ready</span>
                  <span className="font-black text-slate-800 text-sm">{soTotalReady} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shortage</span>
                  <span
                    className={`font-bold ${soTotalShortage > 0 ? "text-orange-600" : "text-emerald-600"}`}
                  >
                    {soTotalShortage} units
                  </span>
                </div>
              </div>
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase w-8">#</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase">Part No</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase">Description</th>
                      <th className="text-center px-3 py-2 font-bold text-slate-500 uppercase w-14">Unit</th>
                      <th className="text-center px-3 py-2 font-bold text-slate-500 uppercase w-16">Ready</th>
                      <th className="text-center px-3 py-2 font-bold text-slate-500 uppercase w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {soItems.map((item, idx) => {
                      const ready = item.readyQty ?? 0;
                      const st = getSoItemStatus(item);
                      const isShort = st !== "complete";
                      return (
                        <tr key={item.productCode} className={isShort ? "bg-orange-50/40" : ""}>
                          <td className="px-3 py-2 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {item.productCode}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            <span className="block max-w-[140px] truncate">{item.description}</span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500">
                            {item.unit || "pcs"}
                          </td>
                          <td
                            className={`px-3 py-2 text-center font-bold ${isShort ? "text-orange-600" : "text-emerald-600"}`}
                          >
                            {ready}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <StatusPill status={st} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── PO Step 3 ──────────────────────────────────────────────────────── */}
      {step === 3 && qcMode === "po" && selectedPO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader
              title="Quality Check"
              subtitle="Final verification before approving material receipt"
            />
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
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
                      sub: "Approved but minor issues noted — stays in list",
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
                      onClick={() => {
                        setQualityCheck(opt.value);
                        if (opt.value === "passed") {
                          setReceivedItems((prev) =>
                            prev.map((item) => ({
                              ...item,
                              issue: "",
                              issueDetail: "",
                              damagedQty: 0,
                            })),
                          );
                        }
                      }}
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
                <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase">
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
              {receivedItems.some((i) => i.issue) && qualityCheck !== "passed" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 mb-2">
                    ⚠️ Items with Issues Noted:
                  </p>
                  {receivedItems
                    .filter((i) => i.issue)
                    .map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-amber-800 mt-1">
                        <span className="font-bold font-mono flex-shrink-0">{item.productCode}</span>
                        <span className="text-amber-600 capitalize">
                          — {item.issue.replace("_", " ")}
                          {(item.damagedQty || 0) > 0 && (
                            <span className="text-red-600 font-bold ml-1">
                              ({item.damagedQty} tracked)
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              {qualityCheck === "failed" ? (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <FiAlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    <strong>Stock will NOT be updated.</strong>
                  </p>
                </div>
              ) : qualityCheck === "passed_with_issues" ? (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <FiAlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    Stock updated. Invoice will{" "}
                    <strong>stay in pending list</strong> for follow-up.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <FiCheck size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-800">
                    After approval:{" "}
                    <strong>stock will be updated immediately</strong>.
                  </p>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Confirm Summary" subtitle="Review before final approval" />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs">
                {[
                  { label: "PO Number", value: selectedPO.poNumber, bold: true },
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
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-slate-500">{label}</span>
                    <span className={`${bold ? "font-black" : "font-semibold"} text-slate-800`}>
                      {value}
                    </span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-slate-500">Units added to stock</span>
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
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Item Breakdown</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {receivedItems.map((item, i) => {
                    const phys = item.physicalQty ?? item.newReceived ?? 0;
                    const damaged = item.damagedQty || 0;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${
                          damaged > 0
                            ? "bg-red-50 border border-red-100"
                            : item.issue
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
                                <span className="ml-1">({damaged} tracked)</span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-emerald-600">
                            Stock: <strong>+{phys}</strong>
                          </span>
                          <StatusPill
                            status={getItemStatus(
                              item.orderedQty || 0,
                              (item.alreadyReceived || 0) + phys,
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

      {/* ── SO Step 4 ──────────────────────────────────────────────────────── */}
      {step === 4 && qcMode === "so" && selectedSO && (
        <Card>
          <div className="p-12 text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                liveSoStatus === "complete" ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              {liveSoStatus === "complete" ? (
                <FiCheck size={32} className="text-emerald-600" />
              ) : (
                <FiAlertTriangle size={32} className="text-amber-600" />
              )}
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">
              {liveSoStatus === "complete"
                ? "SO QC Approved — Ready for Dispatch! 🚀"
                : "SO QC Done — Partial Shortage"}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {selectedSO.soNumber} — {selectedSO.customer}
            </p>
            <div className="flex items-center justify-center gap-3">
              <BtnSecondary
                onClick={async () => {
                  setStep(1);
                  setQcMode("po");
                  setSelectedSO(null);
                  setSoItemsSync([]);
                  setQualityCheck("passed");
                  setRemarks("");
                  setCurrentPage(1);
                  await fetchPendingSalesOrders();
                }}
              >
                Review Another SO
              </BtnSecondary>
              <BtnPrimary onClick={() => navigate("/store/dashboard")}>
                Go to Dashboard
              </BtnPrimary>
            </div>
          </div>
        </Card>
      )}

      {/* ── PO Step 4 ──────────────────────────────────────────────────────── */}
      {step === 4 && (qcMode === "po" || !selectedSO) && selectedPO && (
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 mb-6">
              <span className="text-xs text-slate-500">PO Status:</span>
              <StatusPill status={livePoStatus} />
            </div>
            <div className="space-y-1.5 text-sm text-slate-600 mb-8">
              <p>
                ✅ Invoice <strong>{invoiceNo}</strong> approved
              </p>
              <p>
                ✅ Stock updated with <strong>{getTotalNewReceived()} units</strong>
              </p>
              <p>
                ✅ Quality check: <strong>{qualityCheck}</strong>
              </p>
              {getTotalShortage() > 0 && (
                <p className="text-orange-600 font-bold">
                  ⚠️ {getTotalShortage()} units still pending — next invoice required
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <BtnSecondary
                onClick={async () => {
                  localStorage.removeItem("storeQcDraft");
                  setStep(1);
                  setQcMode("po");
                  setSelectedInvoice(null);
                  setSelectedPO(null);
                  setReceivedItems([]);
                  setSelectedSO(null);
                  setSoItemsSync([]);
                  setInvoiceNo("");
                  setInvoiceDate("");
                  setQualityCheck("passed");
                  setRemarks("");
                  setCurrentPage(1);
                  await fetchPendingInvoices();
                  await fetchPendingSalesOrders();
                }}
              >
                Review Another
              </BtnSecondary>
              <BtnPrimary
                onClick={() => {
                  localStorage.removeItem("storeQcDraft");
                  navigate("/store/dashboard");
                }}
              >
                Go to Dashboard
              </BtnPrimary>
            </div>
          </div>
        </Card>
      )}

      {/* ── Navigation Buttons ─────────────────────────────────────────────── */}
      {/* Only show on editable step 2 — hide on approved PO read-only view and SO read-only view */}
      {step === 2 &&
        !isApprovedPOView &&
        !(
          selectedSO?.soStatus === "ready_for_dispatch" ||
          selectedSO?.soStatus === "complete"
        ) && (
          <div className="flex justify-end gap-3">
            <BtnSecondary
              onClick={() => {
                setStep(1);
                if (qcMode === "so") {
                  setSelectedSO(null);
                  setSoItemsSync([]);
                  setQcMode("po");
                } else {
                  setSelectedInvoice(null);
                  setSelectedPO(null);
                  setReceivedItems([]);
                }
              }}
            >
              ← Back
            </BtnSecondary>
            <BtnPrimary onClick={() => setStep(3)}>Next: Quality Check →</BtnPrimary>
          </div>
        )}

      {step === 3 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => setStep(2)}>← Back</BtnSecondary>
          {qcMode === "so" ? (
            <button
              onClick={handleSOSubmit}
              disabled={uploading}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center gap-2 ${
                qualityCheck === "failed"
                  ? "bg-red-600 hover:bg-red-700"
                  : liveSoStatus === "complete"
                    ? "bg-violet-600 hover:bg-violet-700"
                    : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : qualityCheck === "failed" ? (
                "❌ Reject SO"
              ) : liveSoStatus === "complete" ? (
                "✅ Approve — Ready for Dispatch"
              ) : (
                "⚠️ Approve with Shortage"
              )}
            </button>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}