import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiFileText,
  FiCheck,
  FiPackage,
  FiAlertTriangle,
  FiPlus,
  FiUpload,
  FiClock,
  FiTrendingUp,
  FiAlertCircle,
} from "react-icons/fi";
import {
  Card,
  CardHeader,
  Input,
  Select,
  FileUpload,
  Textarea,
  BtnPrimary,
  BtnSecondary,
  Alert,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  where,
  arrayUnion,
} from "firebase/firestore";
import * as XLSX from "xlsx";

// ── ETA calc ──────────────────────────────────────────────────────────────────
function calcEtaStatus(deliveryDate) {
  if (!deliveryDate) return { status: "ordered", remainingDays: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eta = new Date(deliveryDate);
  eta.setHours(0, 0, 0, 0);
  const diff = Math.round((eta - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { status: "overdue", remainingDays: diff };
  if (diff <= 2) return { status: "warning", remainingDays: diff };
  return { status: "ordered", remainingDays: diff };
}

function toInputDate(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy)
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const monShort = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (monShort) {
    const months = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const m = months[monShort[2].toLowerCase()];
    const yr = monShort[3].length === 2 ? "20" + monShort[3] : monShort[3];
    if (m) return `${yr}-${m}-${monShort[1].padStart(2, "0")}`;
  }
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Math.round((+s - 25569) * 86400 * 1000));
    if (!isNaN(d)) return d.toISOString().split("T")[0];
  }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return "";
}

// ── Format datetime ───────────────────────────────────────────────────────────
function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-IN", {
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
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

// ── Status Pill ───────────────────────────────────────────────────────────────
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
  };
  const normalizedStatus = status?.toLowerCase();
  return (
    <span
      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${map[normalizedStatus] || map.pending}`}
    >
      {normalizedStatus?.replace("_", " ")}
    </span>
  );
}

// ── Item status ───────────────────────────────────────────────────────────────
function getItemStatus(orderedQty, totalReceivedQty) {
  if (totalReceivedQty === 0) return "ordered";
  if (totalReceivedQty < orderedQty) return "partial";
  if (totalReceivedQty === orderedQty) return "complete";
  return "excess";
}

// ── Overall PO status ─────────────────────────────────────────────────────────
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

// ── PO History Timeline Card ──────────────────────────────────────────────────
function POHistoryTimeline({ selectedPO, linkedInvoices, loadingHistory }) {
  if (!selectedPO) return null;

  const totalOrdered = selectedPO.items.reduce(
    (s, i) => s + (i.orderedQty || 0),
    0,
  );
  const totalReceived = selectedPO.items.reduce(
    (s, i) => s + (i.totalReceivedQty || 0),
    0,
  );
  const totalPending = Math.max(0, totalOrdered - totalReceived);

  // Build timeline events
  const events = [];

  // PO Created
  events.push({
    type: "created",
    icon: "📄",
    label: "Purchase Order Created",
    sub: `PO: ${selectedPO.poNumber} · Vendor: ${selectedPO.vendor}`,
    datetime: selectedPO.createdAt || null,
    status: "ordered",
  });

  const sortedInvoices = [...linkedInvoices].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

  sortedInvoices.forEach((inv) => {
    const invOrdered = (inv.items || []).reduce(
      (s, i) => s + (i.orderedQty || i.quantity || 0),
      0,
    );
    const invReceived = (inv.items || []).reduce(
      (s, i) => s + (i.totalReceivedQty || 0),
      0,
    );
    const thisQty = (inv.items || []).reduce(
      (s, i) => s + (i.newReceived || 0),
      0,
    );
    const pending = Math.max(0, invOrdered - invReceived);

    // Invoice upload event
    events.push({
      type: "invoice",
      icon: "⬆️",
      label: `Invoice Uploaded${inv.invoiceNo ? ` — ${inv.invoiceNo}` : ""}`,
      sub: `+${thisQty} units received`,
      datetime: inv.createdAt,
      invoiceDate: inv.invoiceDate,
      qc: inv.qualityCheck,
      remarks: inv.remarks,
      status: inv.poStatus || "partial",
      pending,
    });

    // Status change event
    if (inv.poStatus === "partial") {
      events.push({
        type: "status",
        icon: "🔄",
        label: "Status changed → PARTIAL",
        sub: `${pending} units still pending`,
        datetime: inv.createdAt,
        status: "partial",
        pending,
      });
    } else if (inv.poStatus === "complete") {
      events.push({
        type: "status",
        icon: "✅",
        label: "Status changed → COMPLETE",
        sub: `All ${invOrdered} units received · PO fully fulfilled`,
        datetime: inv.createdAt,
        status: "complete",
      });
    } else if (inv.poStatus === "excess") {
      events.push({
        type: "status",
        icon: "⚠️",
        label: "Status changed → EXCESS",
        sub: `Received more than ordered`,
        datetime: inv.createdAt,
        status: "excess",
      });
    }
  });

  return (
    <Card>
      <CardHeader
        title="PO History Timeline"
        subtitle={`${linkedInvoices.length} invoice${linkedInvoices.length !== 1 ? "s" : ""} · ${totalReceived}/${totalOrdered} units received${totalPending > 0 ? ` · ${totalPending} pending` : ""}`}
      />

      {loadingHistory ? (
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading history...</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {events.map((event, idx) => (
            <div
              key={idx}
              className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
            >
              {/* Left */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-sm mt-0.5 flex-shrink-0">
                  {event.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-800">
                      {event.label}
                    </p>
                    <StatusPill status={event.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {event.sub}
                  </p>

                  {/* Invoice extra info */}
                  {event.type === "invoice" && (
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {event.invoiceDate && (
                        <span className="text-[10px] text-slate-400">
                          📅 {formatDate(event.invoiceDate)}
                        </span>
                      )}
                      {event.qc && (
                        <span
                          className={`text-[10px] font-bold ${
                            event.qc === "passed"
                              ? "text-emerald-600"
                              : event.qc === "failed"
                                ? "text-red-600"
                                : "text-orange-600"
                          }`}
                        >
                          🔍 QC: {event.qc.toUpperCase()}
                        </span>
                      )}
                      {event.remarks && (
                        <span className="text-[10px] text-slate-400 italic">
                          💬 {event.remarks}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Partial pending note */}
                  {event.type === "status" &&
                    event.status === "partial" &&
                    event.pending > 0 && (
                      <p className="text-[10px] text-orange-500 font-bold mt-1">
                        ↳ Next invoice required for remaining {event.pending}{" "}
                        units
                      </p>
                    )}
                </div>
              </div>

              {/* Right: datetime */}
              {event.datetime && (
                <p className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 flex items-center gap-1 mt-0.5">
                  <FiClock size={9} />
                  {formatDateTime(event.datetime)}
                </p>
              )}
            </div>
          ))}

          {/* Awaiting next invoice */}
          {totalPending > 0 && linkedInvoices.length > 0 && (
            <div className="px-6 py-3 flex items-center gap-3">
              <span className="text-sm flex-shrink-0">⏳</span>
              <div>
                <p className="text-xs font-bold text-slate-400">
                  Awaiting next invoice...
                </p>
                <p className="text-[11px] text-orange-500 font-bold mt-0.5">
                  {totalPending} units still pending
                </p>
              </div>
            </div>
          )}

          {/* No invoices yet */}
          {linkedInvoices.length === 0 && (
            <div className="px-6 py-4 flex items-center gap-3">
              <span className="text-sm">⏳</span>
              <p className="text-xs text-slate-400">
                No invoices uploaded yet for this PO
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UploadVendorInvoice() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const urlPoId = urlParams.get("poId");
  const [step, setStep] = useState(urlPoId ? 2 : 1);
  const [selectedPO, setSelectedPO] = useState(null);
  const [invoiceExcelFile, setInvoiceExcelFile] = useState(null);
  const [invoiceHeader, setInvoiceHeader] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [parsingExcel, setParsingExcel] = useState(false);
  const [excelParsed, setExcelParsed] = useState(false);
  const [receivedItems, setReceivedItems] = useState([]);
  const [qualityCheck, setQualityCheck] = useState("passed");
  const [remarks, setRemarks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  // ── NEW: Linked invoices for history timeline ─────────────────────────────
  const [linkedInvoices, setLinkedInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  // ── Fetch all POs ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
        );
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const pos = all.filter((doc) => {
          if (doc.type === "INVOICE") return false;
          if (doc.type === "SALES_ORDER") return false;
          if (doc.poStatus === "complete") return false;
          if (doc.type !== "PO") {
            const buyer = doc.excelHeader?.buyer;
            if (buyer && buyer.trim() !== "") return false;
          }
          return true;
        });
        const mapped = pos.map((po) => {
          const { status: etaStatus, remainingDays } = calcEtaStatus(
            po.deliveryDate,
          );
          const poStatus = po.poStatus || etaStatus;
          return {
            id: po.id,
            poNumber:
              po.woNumber ||
              po.excelHeader?.voucherNo ||
              po.id.slice(0, 8).toUpperCase(),
            vendor:
              po.customer ||
              po.excelHeader?.supplier ||
              po.excelHeader?.consignee ||
              "—",
            vendorContact: po.customerContact || "—",
            date: po.excelHeader?.dated || "",
            eta: po.deliveryDate || "—",
            status: poStatus,
            remainingDays,
            createdAt: po.createdAt || null,
            items: (po.items || []).map((item) => ({
              ...item,
              orderedQty: item.orderedQty || item.quantity || 0,
              totalReceivedQty: item.totalReceivedQty || item.receivedQty || 0,
              unit: item.unit || "pcs",
            })),
          };
        });
        setPendingPOs(mapped);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchPOs();
  }, []);

  useEffect(() => {
    if (loadingPOs || pendingPOs.length === 0 || !urlPoId) return;
    const matched = pendingPOs.find((po) => po.id === urlPoId);
    if (matched) handleSelectPO(matched);
  }, [loadingPOs, pendingPOs.length]);

  // ── NEW: Fetch linked invoices when PO selected ───────────────────────────
  useEffect(() => {
    if (!selectedPO) {
      setLinkedInvoices([]);
      return;
    }
    setLoadingHistory(true);
    const fetchLinkedInvoices = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "excelupload"),
            // where("type", "==", "INVOICE"),
            where("linkedPoId", "==", selectedPO.id),
          ),
        );
        const invoices = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => d.type === "INVOICE")   
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setLinkedInvoices(invoices);
      } catch (err) {
        console.error("Linked invoices fetch error:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchLinkedInvoices();
  }, [selectedPO?.id]);

  const handleSelectPO = (po) => {
    setSelectedPO(po);
    setReceivedItems(
      po.items.map((item) => ({
        ...item,
        newReceived: 0,
        alreadyReceived: item.totalReceivedQty || 0,
        orderedQty: item.orderedQty || item.quantity || 0,
      })),
    );
    setExcelParsed(false);
    setInvoiceExcelFile(null);
    setInvoiceHeader(null);
    setInvoiceNo("");
    setDuplicateWarning("");
    setStep(2);
  };

  // ── Parse Invoice Excel ───────────────────────────────────────────────────
  const handleInvoiceExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setInvoiceExcelFile(file);
    setParsingExcel(true);
    setDuplicateWarning("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(sheet["!ref"]);

        const findVal = (keywords) => {
          for (let row = 0; row <= Math.min(40, range.e.r); row++) {
            for (let col = 0; col <= range.e.c; col++) {
              const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
              if (cell && cell.v) {
                const val = String(cell.v).toLowerCase();
                for (const kw of keywords) {
                  if (val.includes(kw.toLowerCase())) {
                    const right =
                      sheet[XLSX.utils.encode_cell({ r: row, c: col + 1 })];
                    const below =
                      sheet[XLSX.utils.encode_cell({ r: row + 1, c: col })];
                    const right2 =
                      sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
                    if (right && right.v) return String(right.v);
                    if (below && below.v) return String(below.v);
                    if (right2 && right2.v) return String(right2.v);
                  }
                }
              }
            }
          }
          return "";
        };

        const header = {
          invoiceNo: findVal([
            "Invoice No.",
            "Invoice No",
            "Invoice Number",
            "Bill No",
          ]),
          dated: findVal(["Dated", "Invoice Date", "Bill Date"]),
          supplierInvNo: findVal(["Supplier Invoice", "Supplier Inv"]),
          supplier: findVal(["Supplier (Bill from)", "Supplier", "Bill from"]),
          consignee: findVal(["Consignee (Ship to)", "Consignee", "Ship to"]),
          gstin: findVal(["GSTIN/UIN", "GSTIN"]),
        };

        if (header.invoiceNo) {
          setInvoiceNo(header.invoiceNo);
          // ── Duplicate check ──
          const isDupe = linkedInvoices.some(
            (inv) =>
              inv.invoiceNo?.toLowerCase().trim() ===
              header.invoiceNo?.toLowerCase().trim(),
          );
          if (isDupe) {
            setDuplicateWarning(
              `⚠️ Invoice "${header.invoiceNo}" has already been uploaded for this PO. Please verify before proceeding.`,
            );
          }
        }

        if (header.dated) {
          const converted = toInputDate(header.dated);
          setInvoiceDate(converted || header.dated);
        }

        setInvoiceHeader(header);

        // ── Find table ──
        let tableStartRow = -1;
        for (let row = 0; row <= range.e.r; row++) {
          for (let col = 0; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
            if (cell && cell.v) {
              const val = String(cell.v).toLowerCase();
              if (
                val.includes("description of goods") ||
                val === "sl" ||
                val === "si"
              ) {
                tableStartRow = row;
                break;
              }
            }
          }
          if (tableStartRow !== -1) break;
        }

        if (tableStartRow === -1) {
          alert("Table not found in Invoice Excel");
          setParsingExcel(false);
          return;
        }

        let descCol = -1,
          hsnCol = -1,
          partCol = -1,
          qtyCol = -1;
        for (let col = 0; col <= range.e.c; col++) {
          const cell =
            sheet[XLSX.utils.encode_cell({ r: tableStartRow, c: col })];
          if (cell && cell.v) {
            const val = String(cell.v).toLowerCase();
            if (val.includes("description")) descCol = col;
            if (val.includes("hsn")) hsnCol = col;
            if (val.includes("part")) partCol = col;
            if (val.includes("quantity")) qtyCol = col;
          }
        }

        const invoiceItems = [];
        for (let row = tableStartRow + 2; row <= range.e.r; row++) {
          const descCell =
            sheet[XLSX.utils.encode_cell({ r: row, c: descCol })];
          if (!descCell || !descCell.v) break;
          const partCode =
            partCol >= 0
              ? sheet[XLSX.utils.encode_cell({ r: row, c: partCol })]?.v || ""
              : "";
          const qty =
            qtyCol >= 0
              ? parseFloat(
                  sheet[XLSX.utils.encode_cell({ r: row, c: qtyCol })]?.v || 0,
                )
              : 0;
          invoiceItems.push({
            productCode: String(partCode).trim(),
            description: String(descCell.v),
            invoiceQty: qty,
            hsnSac:
              hsnCol >= 0
                ? sheet[XLSX.utils.encode_cell({ r: row, c: hsnCol })]?.v || ""
                : "",
          });
        }

        if (selectedPO) {
          const updatedReceivedItems = selectedPO.items.map((poItem) => {
            const already = poItem.totalReceivedQty || 0;
            const orderedQty = poItem.orderedQty || poItem.quantity || 0;
            const matched = invoiceItems.find(
              (inv) =>
                inv.productCode &&
                poItem.productCode &&
                inv.productCode.toLowerCase().trim() ===
                  poItem.productCode.toLowerCase().trim(),
            );
            return {
              ...poItem,
              orderedQty,
              alreadyReceived: already,
              newReceived: matched ? matched.invoiceQty : 0,
              invoiceQty: matched ? matched.invoiceQty : 0,
              matchedFromExcel: !!matched,
            };
          });

          const unmatchedInvoiceItems = invoiceItems.filter(
            (inv) =>
              !selectedPO.items.some(
                (poItem) =>
                  poItem.productCode?.toLowerCase().trim() ===
                  inv.productCode?.toLowerCase().trim(),
              ),
          );
          if (unmatchedInvoiceItems.length > 0) {
            console.warn("Unmatched invoice items:", unmatchedInvoiceItems);
          }

          setReceivedItems(updatedReceivedItems);
          setExcelParsed(true);
        }

        setParsingExcel(false);
      } catch (err) {
        console.error("Invoice Excel parse error:", err);
        setParsingExcel(false);
        alert("Error parsing invoice Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Manual invoice no change → check duplicate ────────────────────────────
  const handleInvoiceNoChange = (val) => {
    setInvoiceNo(val);
    if (!val.trim()) {
      setDuplicateWarning("");
      return;
    }
    const isDupe = linkedInvoices.some(
      (inv) => inv.invoiceNo?.toLowerCase().trim() === val.toLowerCase().trim(),
    );
    setDuplicateWarning(
      isDupe
        ? `⚠️ Invoice "${val}" has already been uploaded for this PO. Please verify before proceeding.`
        : "",
    );
  };

  // ── Update received qty manually ─────────────────────────────────────────
  const updateReceivedQty = (idx, newReceived) => {
    const updated = [...receivedItems];
    updated[idx].newReceived = newReceived;
    setReceivedItems(updated);
  };

  // ── Add to Stock ──────────────────────────────────────────────────────────
  // ── Add to Stock (PO Invoice) - backorder clear + excess handle ──
  const addToStock = async (items, poNumber, vendor) => {
    const now = new Date().toISOString();
    for (const item of items) {
      const qty = item.newReceived || 0;
      if (qty <= 0) continue;
      const key =
        item.productCode?.toString().trim() || item.description?.trim();
      if (!key) continue;

      const q = query(collection(db, "stock"), where("productCode", "==", key));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Stock doc નથી - create
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
            },
          ],
        });
      }
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setUploading(true);
    try {
      const now = new Date().toISOString();

      const updatedItems = receivedItems.map((item) => {
        const orderedQty = item.orderedQty || 0;
        const alreadyReceived = item.alreadyReceived || 0;
        const newReceived = item.newReceived || 0;
        const totalReceivedQty = alreadyReceived + newReceived;
        const itemStatus = getItemStatus(orderedQty, totalReceivedQty);
        return {
          ...item,
          totalReceivedQty,
          orderedQty,
          quantity: orderedQty,
          shortage: Math.max(0, orderedQty - totalReceivedQty),
          itemStatus,
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

      // 1. Update PO document — keep all invoice nos, don't overwrite
      await updateDoc(doc(db, "excelupload", selectedPO.id), {
        items: updatedItems,
        poStatus,
        receivedAt: now,
        lastInvoiceAt: now,
        invoiceNo, // last invoice no (backwards compat)
        invoiceNos: arrayUnion(invoiceNo), // accumulate all invoice nos
        invoiceDate,
        qualityCheck,
        remarks,
        invoiceCount: linkedInvoices.length + 1,
        totalReceivedQty,
      });

      // 2. Stock add
      await addToStock(receivedItems, selectedPO.poNumber, selectedPO.vendor);

      // 3. Save INVOICE record (each invoice is a separate doc — never overwritten)
      await addDoc(collection(db, "excelupload"), {
        type: "INVOICE",
        linkedPoId: selectedPO.id,
        linkedPoNo: selectedPO.poNumber,
        invoiceNo,
        invoiceDate,
        vendor: selectedPO.vendor,
        invoiceHeader: invoiceHeader || {},
        items: updatedItems,
        poStatus,
        qualityCheck,
        remarks,
        invoiceIndex: linkedInvoices.length + 1,
        createdAt: now,
      });

      setUploading(false);
      setStep(5);
    } catch (err) {
      console.error("Submit error:", err);
      setUploading(false);
      alert("Error: " + err.message);
    }
  };

  // ── Live calculations ─────────────────────────────────────────────────────
  const getTotalShortage = () =>
    receivedItems.reduce((sum, item) => {
      const total = (item.alreadyReceived || 0) + (item.newReceived || 0);
      return sum + Math.max(0, (item.orderedQty || 0) - total);
    }, 0);

  const getTotalNewReceived = () =>
    receivedItems.reduce((sum, item) => sum + (item.newReceived || 0), 0);

  const livePoStatus = (() => {
    const computed = calcPoStatus(
      receivedItems.map((i) => ({
        orderedQty: i.orderedQty || 0,
        totalReceivedQty: (i.alreadyReceived || 0) + (i.newReceived || 0),
      })),
    );
    if (computed === "partial" || computed === "complete") return "received";
    if (computed === "excess") return "excess";
    return computed;
  })();

  // ── Step indicator ────────────────────────────────────────────────────────
  const steps = [
    { num: 1, label: "Select PO" },
    { num: 2, label: "Upload Invoice" },
    { num: 3, label: "Verify Qty" },
    { num: 4, label: "Quality Check" },
    { num: 5, label: "Done" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            Upload Vendor Invoice
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record material receipt and update inventory
          </p>
        </div>
        <div className="flex gap-3">
          <BtnPrimary onClick={() => navigate("/sales/purchase-orders/upload")}>
            <FiPlus size={14} /> Edit PO
          </BtnPrimary>
          <BtnSecondary onClick={() => navigate("/sales/purchase-orders")}>
            Cancel
          </BtnSecondary>
        </div>
      </div>

      {/* Step indicator */}
      {step < 5 && (
        <Card className="p-5">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.slice(0, 4).map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                      step > s.num
                        ? "bg-indigo-600 text-white"
                        : step === s.num
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
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
                {idx < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${step > s.num ? "bg-indigo-600" : "bg-slate-200"}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}

      {/* ── STEP 1: Select PO ── */}
      {step === 1 && (
        <Card>
          <CardHeader
            title="Select Purchase Order"
            subtitle={`${pendingPOs.length} POs awaiting material`}
          />
          {loadingPOs ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          ) : pendingPOs.length === 0 ? (
            <div className="p-12 text-center">
              <FiFileText size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">
                No Pending Purchase Orders
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {pendingPOs.map((po) => {
                const totalOrdered = po.items.reduce(
                  (s, i) => s + (i.orderedQty || 0),
                  0,
                );
                const totalReceived = po.items.reduce(
                  (s, i) => s + (i.totalReceivedQty || 0),
                  0,
                );
                const remaining = totalOrdered - totalReceived;
                return (
                  <div
                    key={po.id}
                    className={`px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                      po.status === "overdue"
                        ? "bg-red-50"
                        : po.status === "warning"
                          ? "bg-orange-50"
                          : po.status === "partial"
                            ? "bg-orange-50/40"
                            : ""
                    }`}
                    onClick={() => handleSelectPO(po)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-bold text-slate-800">
                            {po.poNumber}
                          </p>
                          <StatusPill status={po.status} />
                        </div>
                        <p className="text-sm text-slate-600">{po.vendor}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                          <span>ETA: {po.eta}</span>
                          <span>{po.items.length} items</span>
                          {totalReceived > 0 && (
                            <span className="text-orange-600 font-bold">
                              Received: {totalReceived}/{totalOrdered}
                            </span>
                          )}
                        </div>
                        {po.status === "partial" && remaining > 0 && (
                          <div className="mt-2 flex items-center gap-2 bg-orange-100 border border-orange-200 rounded-lg px-3 py-1 w-fit">
                            <FiAlertTriangle
                              size={11}
                              className="text-orange-600"
                            />
                            <p className="text-xs font-bold text-orange-700">
                              {remaining} units still pending
                            </p>
                          </div>
                        )}
                      </div>
                      <button className="ml-4 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 whitespace-nowrap">
                        {po.status === "partial"
                          ? "Receive Remaining →"
                          : "Receive Material →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── STEP 2: Upload Invoice Excel ── */}
      {step === 2 && selectedPO && (
        <div className="space-y-6">
          {/* Row 1: PO Info + Invoice Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PO Info */}
            <Card>
              <CardHeader title="Selected Purchase Order" />
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
                      <p className="text-slate-400 font-bold mb-1">Vendor</p>
                      <p className="text-slate-800 font-bold">
                        {selectedPO.vendor}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">PO Date</p>
                      <p className="text-slate-800">{selectedPO.date || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Status</p>
                      <StatusPill status={selectedPO.status} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">
                    📋 PO Items ({selectedPO.items.length}):
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedPO.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg"
                      >
                        <span className="font-mono text-slate-700">
                          {item.productCode}
                        </span>
                        <span className="text-slate-500">
                          {item.orderedQty} {item.unit}
                        </span>
                        {item.totalReceivedQty > 0 && (
                          <span className="text-orange-600 font-bold">
                            Recv: {item.totalReceivedQty}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Invoice Excel Upload */}
            <Card>
              <CardHeader
                title="Upload Invoice Excel"
                subtitle="Vendor invoice Excel file"
              />
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Select Invoice Excel File{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() =>
                      document.getElementById("invoiceExcelInput").click()
                    }
                  >
                    <FiUpload
                      size={24}
                      className="mx-auto mb-2 text-slate-400"
                    />
                    <p className="text-sm text-slate-600 font-medium">
                      {invoiceExcelFile
                        ? invoiceExcelFile.name
                        : "Click to upload Invoice Excel"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">.xlsx or .xls</p>
                    <input
                      id="invoiceExcelInput"
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleInvoiceExcel}
                    />
                  </div>
                </div>

                {parsingExcel && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Parsing Invoice Excel...
                    </p>
                  </div>
                )}

                {invoiceHeader && excelParsed && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs font-bold text-emerald-700 mb-2">
                      ✅ Invoice Excel Parsed Successfully!
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {invoiceHeader.invoiceNo && (
                        <div>
                          <p className="text-slate-400">Invoice No</p>
                          <p className="font-bold text-slate-800">
                            {invoiceHeader.invoiceNo}
                          </p>
                        </div>
                      )}
                      {invoiceHeader.dated && (
                        <div>
                          <p className="text-slate-400">Dated</p>
                          <p className="font-bold text-slate-800">
                            {invoiceHeader.dated}
                          </p>
                        </div>
                      )}
                      {invoiceHeader.supplier && (
                        <div>
                          <p className="text-slate-400">Supplier</p>
                          <p className="font-bold text-slate-800">
                            {invoiceHeader.supplier}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Duplicate invoice warning */}
                {duplicateWarning && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <FiAlertTriangle
                      size={14}
                      className="text-red-500 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-xs font-bold text-red-700">
                      {duplicateWarning}
                    </p>
                  </div>
                )}

                <Input
                  label="Invoice Number"
                  value={invoiceNo}
                  onChange={(e) => handleInvoiceNoChange(e.target.value)}
                  placeholder="Auto-filled from Excel or enter manually"
                  required
                />
                <Input
                  label="Invoice Date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />

                {excelParsed && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-bold text-blue-700">
                      📦{" "}
                      {receivedItems.filter((i) => i.matchedFromExcel).length}{" "}
                      items matched from Invoice Excel
                    </p>
                    {receivedItems.filter((i) => !i.matchedFromExcel).length >
                      0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️{" "}
                        {
                          receivedItems.filter((i) => !i.matchedFromExcel)
                            .length
                        }{" "}
                        PO items not found in Invoice
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Row 2: PO History Timeline (3rd card — full width) */}
          <POHistoryTimeline
            selectedPO={selectedPO}
            linkedInvoices={linkedInvoices}
            loadingHistory={loadingHistory}
          />
        </div>
      )}

      {/* ── STEP 3: Verify Quantities ── */}
      {step === 3 && selectedPO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <p className="text-slate-800">{invoiceDate}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">
                      Current PO Status
                    </p>
                    <StatusPill status={selectedPO.status} />
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">
                      After This Invoice
                    </p>
                    <StatusPill status={livePoStatus} />
                  </div>
                </div>
              </div>

              {selectedPO.status === "partial" && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <FiAlertTriangle
                    size={14}
                    className="text-orange-600 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-orange-700">
                      Partial Receipt in Progress
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      Quantities already received are shown as "Prior Recv".
                      This invoice adds on top.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-bold text-slate-600 mb-2">
                  Summary:
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">This Invoice Qty:</span>
                    <span className="font-bold text-slate-800">
                      {getTotalNewReceived()} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Still Pending:</span>
                    <span
                      className={`font-bold ${getTotalShortage() > 0 ? "text-orange-600" : "text-emerald-600"}`}
                    >
                      {getTotalShortage()} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PO Status After:</span>
                    <StatusPill status={livePoStatus} />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Verify Quantities"
              subtitle={`${getTotalNewReceived()} units this invoice`}
            />
            <div className="p-6 space-y-3">
              {receivedItems.map((item, idx) => {
                const ordered = item.orderedQty || 0;
                const already = item.alreadyReceived || 0;
                const thisInv = item.newReceived || 0;
                const totalAfter = already + thisInv;
                const remaining = Math.max(0, ordered - totalAfter);
                const excess = Math.max(0, totalAfter - ordered);
                const itemStatus = getItemStatus(ordered, totalAfter);
                const progressPct =
                  ordered > 0
                    ? Math.min(100, Math.round((totalAfter / ordered) * 100))
                    : 0;

                return (
                  <div
                    key={idx}
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
                            {item.productCode}
                          </p>
                          <StatusPill status={itemStatus} />
                          {item.matchedFromExcel && (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              ✓ Excel
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1">
                          Ordered
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          {ordered}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1">
                          Prior Recv
                        </p>
                        <p className="text-sm font-bold text-blue-600">
                          {already}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1">
                          This Invoice
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={thisInv}
                          // onChange={(e) =>
                          //   updateReceivedQty(
                          //     idx,
                          //     parseInt(e.target.value) || 0,
                          //   )
                          // }
                          readOnly
                          disabled
                          className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1">
                          {remaining > 0
                            ? "Remaining"
                            : excess > 0
                              ? "Excess"
                              : "Status"}
                        </p>
                        <p
                          className={`text-sm font-bold ${remaining > 0 ? "text-orange-600" : excess > 0 ? "text-purple-600" : "text-emerald-600"}`}
                        >
                          {remaining > 0
                            ? `-${remaining}`
                            : excess > 0
                              ? `+${excess}`
                              : "✓"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>
                          {totalAfter}/{ordered} {item.unit}
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
                        <FiAlertTriangle size={10} /> {remaining} {item.unit}{" "}
                        still pending
                      </p>
                    )}
                    {itemStatus === "excess" && (
                      <p className="text-[11px] text-purple-600 font-bold mt-1.5 flex items-center gap-1">
                        <FiAlertTriangle size={10} /> {excess} {item.unit}{" "}
                        excess received
                      </p>
                    )}
                  </div>
                );
              })}

              {getTotalShortage() > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <FiAlertTriangle size={12} /> Shortage — PO will be: PARTIAL
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    {getTotalShortage()} units pending. Upload another invoice
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

      {/* ── STEP 4: Quality Check ── */}
      {step === 4 && selectedPO && (
        <Card>
          <CardHeader
            title="Quality Check"
            subtitle="Final verification before confirming receipt"
          />
          <div className="p-6 max-w-lg space-y-4">
            <Select
              label="Quality Check Result"
              value={qualityCheck}
              onChange={(e) => setQualityCheck(e.target.value)}
              options={[
                { value: "passed", label: "✓ Passed - All items good" },
                { value: "failed", label: "✗ Failed - Issues found" },
                { value: "partial", label: "⚠ Partial - Some issues" },
              ]}
            />
            <Textarea
              label="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any damage, shortage, or quality issues..."
              rows={4}
            />
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <p className="font-bold text-slate-700">Confirm Summary:</p>
              <p className="text-slate-600">
                PO: <strong>{selectedPO.poNumber}</strong>
              </p>
              <p className="text-slate-600">
                Invoice: <strong>{invoiceNo}</strong>
              </p>
              <p className="text-slate-600">
                Units this invoice: <strong>{getTotalNewReceived()}</strong>
              </p>
              <p className="text-slate-600">
                Total invoices for this PO:{" "}
                <strong>{linkedInvoices.length + 1}</strong>
              </p>
              <p className="text-slate-600">
                PO Status after: <strong>{livePoStatus?.toUpperCase()}</strong>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Action Buttons ── */}
      {step === 2 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => setStep(1)}>← Back</BtnSecondary>
          <BtnPrimary
            onClick={() => setStep(3)}
            disabled={!excelParsed || !invoiceNo}
          >
            Next: Verify Quantities →
          </BtnPrimary>
        </div>
      )}
      {step === 3 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => setStep(2)}>← Back</BtnSecondary>
          <BtnPrimary onClick={() => setStep(4)}>
            Next: Quality Check →
          </BtnPrimary>
        </div>
      )}
      {step === 4 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => setStep(3)}>← Back</BtnSecondary>
          <BtnPrimary onClick={handleSubmit} disabled={uploading}>
            {uploading ? "Processing..." : "Confirm Receipt & Update Stock"}
          </BtnPrimary>
        </div>
      )}

      {/* ── STEP 5: Done ── */}
      {step === 5 && selectedPO && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <FiCheck size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">
              Material Received Successfully!
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {selectedPO.poNumber} — {selectedPO.vendor}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 mb-6">
              <span className="text-xs text-slate-500">PO Status:</span>
              <StatusPill
                status={(() => {
                  const shortage = getTotalShortage();
                  const hasExcess = receivedItems.some(
                    (i) => i.alreadyReceived + i.newReceived > i.orderedQty,
                  );
                  if (shortage === 0 && !hasExcess) return "complete";
                  if (shortage === 0 && hasExcess) return "excess";
                  return "partial";
                })()}
              />
            </div>
            <div className="space-y-1.5 text-sm text-slate-600 mb-8">
              <p>
                ✅ Invoice <strong>{invoiceNo}</strong> recorded
              </p>
              <p>
                ✅ Stock updated with{" "}
                <strong>{getTotalNewReceived()} units</strong>
              </p>
              <p>
                ✅ Quality check: <strong>{qualityCheck}</strong>
              </p>
              <p>✅ Invoice #{linkedInvoices.length + 1} for this PO</p>
              {getTotalShortage() > 0 && (
                <p className="text-orange-600 font-bold">
                  ⚠️ {getTotalShortage()} units still pending — upload next
                  invoice when material arrives
                </p>
              )}
            </div>

            {/* Stock summary */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-left">
                <p className="text-xs font-bold text-slate-700 mb-3">
                  📦 Stock Added:
                </p>
                <div className="space-y-2">
                  {receivedItems
                    .filter((i) => i.newReceived > 0)
                    .map((item, idx) => {
                      const total =
                        (item.alreadyReceived || 0) + (item.newReceived || 0);
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
                              +{item.newReceived} {item.unit}
                            </span>
                            <StatusPill status={status} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              {getTotalShortage() > 0 && (
                <BtnPrimary onClick={() => window.location.reload()}>
                  Upload Remaining Invoice
                </BtnPrimary>
              )}
              {getTotalShortage() === 0 && (
                <BtnPrimary
                  onClick={() =>
                    navigate(`/sales/purchase-orders/complete/${selectedPO.id}`)
                  }
                >
                  View Complete Summary →
                </BtnPrimary>
              )}
              <BtnSecondary
                onClick={() => {
                  setStep(1);
                  setSelectedPO(null);
                  setReceivedItems([]);
                  setExcelParsed(false);
                  setInvoiceExcelFile(null);
                  setInvoiceNo("");
                  setInvoiceHeader(null);
                  setLinkedInvoices([]);
                  setDuplicateWarning("");
                }}
              >
                Upload Another Invoice
              </BtnSecondary>
              <BtnPrimary onClick={() => navigate("/sales/purchase-orders")}>
                View Purchase Orders
              </BtnPrimary>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
