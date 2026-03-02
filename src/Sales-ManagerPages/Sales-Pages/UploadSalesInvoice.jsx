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
} from "react-icons/fi";
import {
  Card,
  CardHeader,
  Input,
  Select,
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

// ── Date helpers ──────────────────────────────────────────────────────────────
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
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return "";
}

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

// ── Status Pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    reserved: "bg-blue-50 text-blue-700 border-blue-200",
    partial: "bg-orange-50 text-orange-700 border-orange-200",
    ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ready_to_dispatch: "bg-emerald-50 text-emerald-700 border-emerald-200",
    complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    excess: "bg-purple-50 text-purple-700 border-purple-200",
    dispatched: "bg-slate-50 text-slate-700 border-slate-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-orange-50 text-orange-700 border-orange-200",
  };
  const s = status?.toLowerCase().replace(" ", "_");
  const label =
    s === "ready" || s === "ready_to_dispatch"
      ? "READY TO DISPATCH"
      : s?.replace("_", " ").toUpperCase();
  return (
    <span
      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${map[s] || "bg-slate-50 text-slate-600 border-slate-200"}`}
    >
      {label}
    </span>
  );
}

// ── Item status ───────────────────────────────────────────────────────────────
function getItemStatus(orderedQty, totalInvoicedQty) {
  if (totalInvoicedQty === 0) return "reserved";
  if (totalInvoicedQty < orderedQty) return "partial";
  if (totalInvoicedQty === orderedQty) return "complete";
  return "excess";
}

// ── Overall SO status ─────────────────────────────────────────────────────────
function calcSoStatus(items) {
  const statuses = items.map((i) =>
    getItemStatus(i.orderedQty || i.quantity || 0, i.totalInvoicedQty || 0),
  );
  if (statuses.every((s) => s === "reserved")) return "reserved";
  if (statuses.some((s) => s === "excess")) return "excess";
  if (statuses.every((s) => s === "ready" || s === "complete"))
    return "complete";
  if (
    statuses.some((s) => s === "partial" || s === "ready" || s === "complete")
  )
    return "partial";
  return "reserved";
}

// ── SO History Timeline ───────────────────────────────────────────────────────
function SOHistoryTimeline({ selectedSO, linkedInvoices, loadingHistory }) {
  if (!selectedSO) return null;
  const totalOrdered = selectedSO.items.reduce(
    (s, i) => s + (i.orderedQty || i.quantity || 0),
    0,
  );
  const totalInvoiced = selectedSO.items.reduce(
    (s, i) => s + (i.totalInvoicedQty || 0),
    0,
  );
  const totalPending = Math.max(0, totalOrdered - totalInvoiced);

  const events = [];
  events.push({
    type: "created",
    icon: "📄",
    label: "Sales Order Created",
    sub: `SO: ${selectedSO.soNumber} · Customer: ${selectedSO.customer}`,
    datetime: selectedSO.createdAt || null,
    status: "reserved",
  });

  [...linkedInvoices]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((inv) => {
      const thisQty = (inv.items || []).reduce(
        (s, i) => s + (i.newInvoiced || 0),
        0,
      );
      const pending = (inv.items || []).reduce(
        (s, i) =>
          s + Math.max(0, (i.orderedQty || 0) - (i.totalInvoicedQty || 0)),
        0,
      );
      events.push({
        type: "invoice",
        icon: "🧾",
        label: `Sales Invoice Uploaded${inv.invoiceNo ? ` — ${inv.invoiceNo}` : ""}`,
        sub: `${thisQty} units invoiced · Stock deducted`,
        datetime: inv.createdAt,
        invoiceDate: inv.invoiceDate,
        remarks: inv.remarks,
        status: inv.soStatus || "partial",
        pending,
      });
      if (inv.soStatus === "partial") {
        events.push({
          type: "status",
          icon: "🔄",
          label: "Status → PARTIAL",
          sub: `${pending} units still pending`,
          datetime: inv.createdAt,
          status: "partial",
          pending,
        });
      } else if (inv.soStatus === "ready") {
        events.push({
          type: "status",
          icon: "✅",
          label: "Status → READY TO DISPATCH",
          sub: "All units invoiced · Stock deducted",
          datetime: inv.createdAt,
          status: "ready",
        });
      } else if (inv.soStatus === "excess") {
        events.push({
          type: "status",
          icon: "⚠️",
          label: "Status → EXCESS",
          sub: "Invoiced more than ordered",
          datetime: inv.createdAt,
          status: "excess",
        });
      }
    });

  return (
    <Card>
      <CardHeader
        title="SO History Timeline"
        subtitle={`${linkedInvoices.length} invoice${linkedInvoices.length !== 1 ? "s" : ""} · ${totalInvoiced}/${totalOrdered} units invoiced${totalPending > 0 ? ` · ${totalPending} pending` : ""}`}
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
              className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-slate-50/60"
            >
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
                  {event.type === "invoice" && event.invoiceDate && (
                    <span className="text-[10px] text-slate-400">
                      📅 {formatDate(event.invoiceDate)}
                    </span>
                  )}
                  {event.type === "status" &&
                    event.status === "partial" &&
                    event.pending > 0 && (
                      <p className="text-[10px] text-orange-500 font-bold mt-1">
                        ↳ {event.pending} units still pending
                      </p>
                    )}
                </div>
              </div>
              {event.datetime && (
                <p className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1 mt-0.5">
                  <FiClock size={9} /> {formatDateTime(event.datetime)}
                </p>
              )}
            </div>
          ))}
          {totalPending > 0 && linkedInvoices.length > 0 && (
            <div className="px-6 py-3 flex items-center gap-3">
              <span className="text-sm">⏳</span>
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
          {linkedInvoices.length === 0 && (
            <div className="px-6 py-4 flex items-center gap-3">
              <span className="text-sm">⏳</span>
              <p className="text-xs text-slate-400">
                No invoices uploaded yet for this SO
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UploadSalesInvoice() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const urlSoId = urlParams.get("soId");

  const [step, setStep] = useState(urlSoId ? 2 : 1);
  const [selectedSO, setSelectedSO] = useState(null);
  const [invoiceExcelFile, setInvoiceExcelFile] = useState(null);
  const [invoiceHeader, setInvoiceHeader] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [parsingExcel, setParsingExcel] = useState(false);
  const [excelParsed, setExcelParsed] = useState(false);
  const [invoicedItems, setInvoicedItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingSOs, setPendingSOs] = useState([]);
  const [loadingSOs, setLoadingSOs] = useState(true);
  const [linkedInvoices, setLinkedInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [stockAlerts, setStockAlerts] = useState([]);

  // ── Fetch Sales Orders ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSOs = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
        );
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const sos = all.filter((doc) => {
          if (doc.type !== "SALES_ORDER") return false;
          if (doc.soStatus === "complete") return false;
          //    if (doc.soStatus === "excess") return false;
          return true;
        });
        const mapped = sos.map((so) => ({
          id: so.id,
          soNumber:
            so.woNumber ||
            so.excelHeader?.voucherNo ||
            so.id.slice(0, 8).toUpperCase(),
          customer:
            so.customer ||
            so.excelHeader?.buyer ||
            so.excelHeader?.consignee ||
            "—",
          date: so.excelHeader?.dated || "",
          createdAt: so.createdAt || null,
          status: so.soStatus || "reserved",
          items: (so.items || []).map((item) => ({
            ...item,
            orderedQty: item.orderedQty || item.quantity || 0,
            totalInvoicedQty: item.totalInvoicedQty || 0,
            unit: item.unit || "pcs",
          })),
        }));
        setPendingSOs(mapped);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoadingSOs(false);
      }
    };
    fetchSOs();
  }, []);

  // ── Auto-select from URL ──────────────────────────────────────────────────
  useEffect(() => {
    if (loadingSOs || pendingSOs.length === 0 || !urlSoId) return;
    const matched = pendingSOs.find((so) => so.id === urlSoId);
    if (matched) handleSelectSO(matched);
  }, [loadingSOs, pendingSOs.length]);

  // ── Fetch linked invoices ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSO) {
      setLinkedInvoices([]);
      return;
    }
    setLoadingHistory(true);
    const fetch = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "excelupload"),
            // where("type", "==", "SALES_INVOICE"),
            where("linkedSoId", "==", selectedSO.id),
          ),
        );
        setLinkedInvoices(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((d) => d.type === "SALES_INVOICE")
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetch();
  }, [selectedSO?.id]);

  // ── Select SO ────────────────────────────────────────────────────────────
  const handleSelectSO = (so) => {
    setSelectedSO(so);
    setInvoicedItems(
      so.items.map((item) => ({
        ...item,
        newInvoiced: 0,
        alreadyInvoiced: item.totalInvoicedQty || 0,
        orderedQty: item.orderedQty || item.quantity || 0,
      })),
    );
    setExcelParsed(false);
    setInvoiceExcelFile(null);
    setInvoiceHeader(null);
    setInvoiceNo("");
    setDuplicateWarning("");
    setStockAlerts([]);
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

        // ── Identify type from row 1 ──
        let docType = "";
        for (let col = 0; col <= range.e.c; col++) {
          const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
          if (cell && cell.v) {
            const val = String(cell.v).toUpperCase();
            if (val.includes("SALES INVOICE") || val.includes("TAX INVOICE")) {
              docType = "SALES_INVOICE";
              break;
            }
            if (val.includes("PURCHASE INVOICE")) {
              docType = "PURCHASE_INVOICE";
              break;
            }
          }
        }
        if (docType === "PURCHASE_INVOICE") {
          alert(
            "This is a Purchase Invoice! Please use 'Upload Vendor Invoice' instead.",
          );
          setParsingExcel(false);
          return;
        }

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
                    const right2 =
                      sheet[XLSX.utils.encode_cell({ r: row, c: col + 2 })];
                    const below =
                      sheet[XLSX.utils.encode_cell({ r: row + 1, c: col })];
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
            "Bill No",
            "Voucher No",
          ]),
          dated: findVal(["Dated", "Invoice Date", "Bill Date"]),
          buyer: findVal(["Buyer", "Bill to"]),
          consignee: findVal(["Consignee", "Ship to"]),
          gstin: findVal(["GSTIN/UIN", "GSTIN"]),
        };

        if (header.invoiceNo) {
          setInvoiceNo(header.invoiceNo);
          const isDupe = linkedInvoices.some(
            (inv) =>
              inv.invoiceNo?.toLowerCase().trim() ===
              header.invoiceNo?.toLowerCase().trim(),
          );
          if (isDupe)
            setDuplicateWarning(
              `⚠️ Invoice "${header.invoiceNo}" already uploaded for this SO.`,
            );
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

        // ── Match with SO items ──
        if (selectedSO) {
          const updated = selectedSO.items.map((soItem) => {
            const already = soItem.totalInvoicedQty || 0;
            const orderedQty = soItem.orderedQty || soItem.quantity || 0;
            const matched = invoiceItems.find(
              (inv) =>
                inv.productCode &&
                soItem.productCode &&
                inv.productCode.toLowerCase().trim() ===
                  soItem.productCode.toLowerCase().trim(),
            );
            return {
              ...soItem,
              orderedQty,
              alreadyInvoiced: already,
              newInvoiced: matched ? matched.invoiceQty : 0,
              matchedFromExcel: !!matched,
            };
          });
          setInvoicedItems(updated);
          setExcelParsed(true);
        }

        setParsingExcel(false);
      } catch (err) {
        console.error("Parse error:", err);
        setParsingExcel(false);
        alert("Error parsing Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

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
      isDupe ? `⚠️ Invoice "${val}" already uploaded for this SO.` : "",
    );
  };

  const updateInvoicedQty = (idx, qty) => {
    const updated = [...invoicedItems];
    updated[idx].newInvoiced = qty;
    setInvoicedItems(updated);
  };

  // ── Deduct Stock (OUT) ────────────────────────────────────────────────────
  const deductStock = async (items, soNumber, customer) => {
    const alerts = [];
    const now = new Date().toISOString();
    for (const item of items) {
      const qty = item.newInvoiced || 0;
      if (qty <= 0) continue;
      const key =
        item.productCode?.toString().trim() || item.description?.trim();
      if (!key) continue;

      const q = query(collection(db, "stock"), where("productCode", "==", key));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Stock નથી - backorder create, available = 0
        alerts.push({
          productCode: key,
          needed: qty,
          available: 0,
          shortage: qty,
        });
        await addDoc(collection(db, "stock"), {
          productCode: key,
          description: item.description || "",
          hsnSac: item.hsnSac || "",
          unit: item.unit || "pcs",
          available: 0,
          reserved: 0,
          backorder: qty,
          minLevel: 0,
          lastUpdated: now,
          ledger: [
            {
              type: "OUT",
              qty,
              ref: soNumber,
              by: customer,
              balance: 0,
              date: now,
            },
          ],
        });
      } else {
        const sd = snap.docs[0];
        const sdata = sd.data();
        const current = sdata.available || 0;
        const newAvail = current - qty;

        if (newAvail >= 0) {
          // Stock enough
          await updateDoc(doc(db, "stock", sd.id), {
            available: newAvail,
            reserved: (sdata.reserved || 0) + qty,
            backorder: 0,
            lastUpdated: now,
            ledger: [
              ...(sdata.ledger || []),
              {
                type: "OUT",
                qty,
                ref: soNumber,
                by: customer,
                balance: newAvail,
                date: now,
              },
            ],
          });
        } else {
          // Stock ઓછો - backorder
          const backorderQty = Math.abs(newAvail);
          alerts.push({
            productCode: key,
            needed: qty,
            available: current,
            shortage: backorderQty,
          });
          await updateDoc(doc(db, "stock", sd.id), {
            available: 0,
            reserved: (sdata.reserved || 0) + current,
            backorder: (sdata.backorder || 0) + backorderQty,
            lastUpdated: now,
            ledger: [
              ...(sdata.ledger || []),
              {
                type: "OUT",
                qty,
                ref: soNumber,
                by: customer,
                balance: 0,
                date: now,
              },
            ],
          });
        }
      }
    }
    return alerts;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setUploading(true);
    try {
      const now = new Date().toISOString();

      const updatedItems = invoicedItems.map((item) => {
        const orderedQty = item.orderedQty || 0;
        const alreadyInvoiced = item.alreadyInvoiced || 0;
        const newInvoiced = item.newInvoiced || 0;
        const totalInvoicedQty = alreadyInvoiced + newInvoiced;
        const itemStatus = getItemStatus(orderedQty, totalInvoicedQty);
        return {
          ...item,
          totalInvoicedQty,
          orderedQty,
          itemStatus,
          shortage: Math.max(0, orderedQty - totalInvoicedQty),
        };
      });

      const soStatus = calcSoStatus(
        updatedItems.map((i) => ({
          orderedQty: i.orderedQty,
          totalInvoicedQty: i.totalInvoicedQty,
        })),
      );

      // 1. Stock deduct
      const alerts = await deductStock(
        invoicedItems,
        selectedSO.soNumber,
        selectedSO.customer,
      );
      setStockAlerts(alerts);

      // 2. Update SO document
      await updateDoc(doc(db, "excelupload", selectedSO.id), {
        items: updatedItems,
        soStatus,
        lastInvoiceAt: now,
        invoiceNo,
        invoiceNos: arrayUnion(invoiceNo),
        invoiceDate,
        remarks,
        invoiceCount: linkedInvoices.length + 1,
        totalInvoicedQty: updatedItems.reduce(
          (s, i) => s + i.totalInvoicedQty,
          0,
        ),
      });

      // 3. Save SALES_INVOICE record
      await addDoc(collection(db, "excelupload"), {
        type: "SALES_INVOICE",
        linkedSoId: selectedSO.id,
        linkedSoNo: selectedSO.soNumber,
        invoiceNo,
        invoiceDate,
        customer: selectedSO.customer,
        invoiceHeader: invoiceHeader || {},
        items: updatedItems.map((i) => ({
          productCode: i.productCode || "",
          description: i.description || "",
          orderedQty: i.orderedQty || 0,
          totalInvoicedQty: i.totalInvoicedQty || 0,
          newInvoiced: i.newInvoiced || 0,
          alreadyInvoiced: i.alreadyInvoiced || 0,
          itemStatus: i.itemStatus || "",
          shortage: i.shortage || 0,
          unit: i.unit || "pcs",
          hsnSac: i.hsnSac || "",
        })),
        soStatus,
        remarks: remarks || "",
        stockAlerts: (alerts || []).map((a) => ({
          productCode: a.productCode || "",
          needed: a.needed || 0,
          available: a.available || 0,
          shortage: a.shortage || 0,
        })),
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

  // ── Live calc ─────────────────────────────────────────────────────────────
  const getTotalShortage = () =>
    invoicedItems.reduce((sum, item) => {
      const total = (item.alreadyInvoiced || 0) + (item.newInvoiced || 0);
      return sum + Math.max(0, (item.orderedQty || 0) - total);
    }, 0);

  const getTotalNewInvoiced = () =>
    invoicedItems.reduce((sum, item) => sum + (item.newInvoiced || 0), 0);

  const liveSoStatus = (() => {
    const computed = calcSoStatus(
      invoicedItems.map((i) => ({
        orderedQty: i.orderedQty || 0,
        totalInvoicedQty: (i.alreadyInvoiced || 0) + (i.newInvoiced || 0),
      })),
    );
    return computed;
  })();
  const steps = [
    { num: 1, label: "Select SO" },
    { num: 2, label: "Upload Invoice" },
    { num: 3, label: "Verify Qty" },
    { num: 4, label: "Confirm" },
    { num: 5, label: "Done" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            Upload Sales Invoice
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate invoice and deduct stock
          </p>
        </div>
        <div className="flex gap-3">
          <BtnPrimary onClick={() => navigate("/sales/sales-orders/upload")}>
            <FiPlus size={14} /> Upload SO
          </BtnPrimary>
          <BtnSecondary onClick={() => navigate("/sales/sales-orders")}>
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

      {/* ── STEP 1: Select SO ── */}
      {step === 1 && (
        <Card>
          <CardHeader
            title="Select Sales Order"
            subtitle={`${pendingSOs.length} SOs pending invoicing`}
          />
          {loadingSOs ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          ) : pendingSOs.length === 0 ? (
            <div className="p-12 text-center">
              <FiFileText size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">
                No Pending Sales Orders
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {pendingSOs.map((so) => {
                const totalOrdered = so.items.reduce(
                  (s, i) => s + (i.orderedQty || 0),
                  0,
                );
                const totalInvoiced = so.items.reduce(
                  (s, i) => s + (i.totalInvoicedQty || 0),
                  0,
                );
                const remaining = totalOrdered - totalInvoiced;
                return (
                  <div
                    key={so.id}
                    className={`px-6 py-4 hover:bg-slate-50 cursor-pointer ${so.status === "partial" ? "bg-orange-50/40" : ""}`}
                    onClick={() => handleSelectSO(so)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-bold text-slate-800">
                            {so.soNumber}
                          </p>
                          <StatusPill status={so.status} />
                        </div>
                        <p className="text-sm text-slate-600">{so.customer}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                          <span>{so.items.length} items</span>
                          {totalInvoiced > 0 && (
                            <span className="text-orange-600 font-bold">
                              Invoiced: {totalInvoiced}/{totalOrdered}
                            </span>
                          )}
                        </div>
                        {so.status === "partial" && remaining > 0 && (
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
                        {so.status === "partial"
                          ? "Invoice Remaining →"
                          : "Create Invoice →"}
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
      {step === 2 && selectedSO && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SO Info */}
            <Card>
              <CardHeader title="Selected Sales Order" />
              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold mb-1">SO Number</p>
                      <p className="text-slate-800 font-bold">
                        {selectedSO.soNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Customer</p>
                      <p className="text-slate-800 font-bold">
                        {selectedSO.customer}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">SO Date</p>
                      <p className="text-slate-800">{selectedSO.date || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1">Status</p>
                      <StatusPill status={selectedSO.status} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">
                    📋 SO Items ({selectedSO.items.length}):
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedSO.items.map((item, idx) => (
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
                        {item.totalInvoicedQty > 0 && (
                          <span className="text-orange-600 font-bold">
                            Inv: {item.totalInvoicedQty}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Invoice Upload */}
            <Card>
              <CardHeader
                title="Upload Sales Invoice Excel"
                subtitle="Row 1 must contain 'SALES INVOICE' or 'TAX INVOICE'"
              />
              <div className="p-6 space-y-4">
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 cursor-pointer"
                  onClick={() =>
                    document.getElementById("salesInvoiceInput").click()
                  }
                >
                  <FiUpload size={24} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600 font-medium">
                    {invoiceExcelFile
                      ? invoiceExcelFile.name
                      : "Click to upload Sales Invoice Excel"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx or .xls</p>
                  <input
                    id="salesInvoiceInput"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleInvoiceExcel}
                  />
                </div>

                {parsingExcel && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Parsing...</p>
                  </div>
                )}

                {invoiceHeader && excelParsed && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs font-bold text-emerald-700 mb-2">
                      ✅ Parsed Successfully!
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {invoiceHeader.invoiceNo && (
                        <div>
                          <p className="text-slate-400">Invoice No</p>
                          <p className="font-bold">{invoiceHeader.invoiceNo}</p>
                        </div>
                      )}
                      {invoiceHeader.dated && (
                        <div>
                          <p className="text-slate-400">Dated</p>
                          <p className="font-bold">{invoiceHeader.dated}</p>
                        </div>
                      )}
                      {invoiceHeader.buyer && (
                        <div>
                          <p className="text-slate-400">Buyer</p>
                          <p className="font-bold">{invoiceHeader.buyer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {duplicateWarning && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <FiAlertTriangle
                      size={14}
                      className="text-red-500 mt-0.5"
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
                  placeholder="Auto-filled from Excel"
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
                      {invoicedItems.filter((i) => i.matchedFromExcel).length}{" "}
                      items matched
                    </p>
                    {invoicedItems.filter((i) => !i.matchedFromExcel).length >
                      0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️{" "}
                        {
                          invoicedItems.filter((i) => !i.matchedFromExcel)
                            .length
                        }{" "}
                        SO items not in Invoice
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* History Timeline */}
          <SOHistoryTimeline
            selectedSO={selectedSO}
            linkedInvoices={linkedInvoices}
            loadingHistory={loadingHistory}
          />
        </div>
      )}

      {/* ── STEP 3: Verify Quantities ── */}
      {step === 3 && selectedSO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Invoice Details" />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold mb-1">SO Number</p>
                    <p className="text-slate-800 font-bold">
                      {selectedSO.soNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Invoice No</p>
                    <p className="text-slate-800 font-bold">
                      {invoiceNo || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Customer</p>
                    <p className="text-slate-800">{selectedSO.customer}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">
                      Invoice Date
                    </p>
                    <p className="text-slate-800">{invoiceDate}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">
                      Current Status
                    </p>
                    <StatusPill status={selectedSO.status} />
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">
                      After This Invoice
                    </p>
                    <StatusPill status={liveSoStatus} />
                  </div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p className="font-bold text-slate-600">Summary:</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">This Invoice Qty:</span>
                  <span className="font-bold">
                    {getTotalNewInvoiced()} units
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
                  <span className="text-slate-500">SO Status After:</span>
                  <StatusPill status={liveSoStatus} />
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <FiAlertTriangle size={12} /> Stock will be deducted on
                  confirm
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Verify Quantities"
              subtitle={`${getTotalNewInvoiced()} units this invoice`}
            />
            <div className="p-6 space-y-3">
              {invoicedItems.map((item, idx) => {
                const ordered = item.orderedQty || 0;
                const already = item.alreadyInvoiced || 0;
                const thisInv = item.newInvoiced || 0;
                const totalAfter = already + thisInv;
                const remaining = Math.max(0, ordered - totalAfter);
                const excess = Math.max(0, totalAfter - ordered);
                const itemStatus = getItemStatus(ordered, totalAfter);
                const pct =
                  ordered > 0
                    ? Math.min(100, Math.round((totalAfter / ordered) * 100))
                    : 0;

                return (
                  <div
                    key={idx}
                    className={`p-4 border rounded-lg ${
                      itemStatus === "ready"
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
                          Prior Inv
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
                          onChange={(e) =>
                            updateInvoicedQty(
                              idx,
                              parseInt(e.target.value) || 0,
                            )
                          }
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
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          itemStatus === "ready"
                            ? "bg-emerald-500"
                            : itemStatus === "excess"
                              ? "bg-purple-500"
                              : itemStatus === "partial"
                                ? "bg-orange-500"
                                : "bg-blue-300"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {getTotalShortage() > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <FiAlertTriangle size={12} /> {getTotalShortage()} units
                    pending — SO will be: PARTIAL
                  </p>
                </div>
              )}
              {liveSoStatus === "ready" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <FiCheck size={12} /> All matched — SO will be: READY TO
                    DISPATCH
                  </p>
                </div>
              )}
              {liveSoStatus === "excess" && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                    <FiAlertTriangle size={12} /> Excess — SO will be: EXCESS
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 4: Confirm ── */}
      {step === 4 && selectedSO && (
        <Card>
          <CardHeader
            title="Confirm & Deduct Stock"
            subtitle="Stock will be deducted on confirm"
          />
          <div className="p-6 max-w-lg space-y-4">
            <Textarea
              label="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any notes..."
              rows={4}
            />
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <p className="font-bold text-slate-700">Confirm Summary:</p>
              <p className="text-slate-600">
                SO: <strong>{selectedSO.soNumber}</strong>
              </p>
              <p className="text-slate-600">
                Invoice: <strong>{invoiceNo}</strong>
              </p>
              <p className="text-slate-600">
                Units this invoice: <strong>{getTotalNewInvoiced()}</strong>
              </p>
              <p className="text-slate-600">
                Invoice #{linkedInvoices.length + 1} for this SO
              </p>
              <p className="text-slate-600">
                SO Status after: <strong>{liveSoStatus?.toUpperCase()}</strong>
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-bold text-amber-700">
                ⚠️ {getTotalNewInvoiced()} units will be deducted from stock
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
          <BtnPrimary onClick={() => setStep(4)}>Next: Confirm →</BtnPrimary>
        </div>
      )}
      {step === 4 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => setStep(3)}>← Back</BtnSecondary>
          <BtnPrimary onClick={handleSubmit} disabled={uploading}>
            {uploading ? "Processing..." : "Confirm & Deduct Stock"}
          </BtnPrimary>
        </div>
      )}

      {/* ── STEP 5: Done ── */}
      {step === 5 && selectedSO && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <FiCheck size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">
              Sales Invoice Created!
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {selectedSO.soNumber} — {selectedSO.customer}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 mb-6">
              <span className="text-xs text-slate-500">SO Status:</span>
              <StatusPill status={liveSoStatus} />
            </div>
            <div className="space-y-1.5 text-sm text-slate-600 mb-8">
              <p>
                ✅ Invoice <strong>{invoiceNo}</strong> recorded
              </p>
              <p>
                ✅ Stock deducted:{" "}
                <strong>{getTotalNewInvoiced()} units</strong>
              </p>
              <p>✅ Invoice #{linkedInvoices.length + 1} for this SO</p>
              {stockAlerts.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 text-left">
                  <p className="text-red-700 font-bold text-xs mb-1">
                    ⚠️ Stock Shortage ({stockAlerts.length} items):
                  </p>
                  {stockAlerts.map((a, i) => (
                    <p key={i} className="text-red-600 text-xs">
                      • {a.productCode}: Need {a.needed}, Available{" "}
                      {a.available} (Short: {a.shortage})
                    </p>
                  ))}
                </div>
              )}
              {getTotalShortage() > 0 && (
                <p className="text-orange-600 font-bold">
                  ⚠️ {getTotalShortage()} units still pending
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {getTotalShortage() > 0 && (
                <BtnPrimary onClick={() => window.location.reload()}>
                  Upload Remaining Invoice
                </BtnPrimary>
              )}
              <BtnSecondary
                onClick={() => {
                  setStep(1);
                  setSelectedSO(null);
                  setInvoicedItems([]);
                  setExcelParsed(false);
                  setInvoiceExcelFile(null);
                  setInvoiceNo("");
                  setInvoiceHeader(null);
                  setLinkedInvoices([]);
                  setDuplicateWarning("");
                  setStockAlerts([]);
                }}
              >
                Upload Another Invoice
              </BtnSecondary>
              <BtnPrimary onClick={() => navigate("/sales/sales-orders")}>
                View Sales Orders
              </BtnPrimary>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
