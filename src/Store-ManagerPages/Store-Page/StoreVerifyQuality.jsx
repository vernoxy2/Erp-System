
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   FiCheck,
//   FiPackage,
//   FiAlertTriangle,
//   FiClock,
//   FiAlertCircle,
//   FiShield,
//   FiShoppingCart,
//   FiFileText,
// } from "react-icons/fi";
// import {
//   Card,
//   CardHeader,
//   BtnPrimary,
//   BtnSecondary,
// } from "../StoreComponent/ui/index";
// import { db } from "../../firebase";
// import {
//   collection,
//   getDocs,
//   getDoc,
//   query,
//   orderBy,
//   addDoc,
//   updateDoc,
//   doc,
//   where,
// } from "firebase/firestore";

// function formatDateTime(isoStr) {
//   if (!isoStr) return "—";
//   try {
//     return new Date(isoStr).toLocaleString("en-IN", {
//       day: "2-digit", month: "short", year: "numeric",
//       hour: "2-digit", minute: "2-digit", hour12: true,
//     });
//   } catch { return isoStr; }
// }

// function formatDate(isoStr) {
//   if (!isoStr) return "—";
//   try {
//     return new Date(isoStr).toLocaleDateString("en-IN", {
//       day: "2-digit", month: "short", year: "numeric",
//     });
//   } catch { return isoStr; }
// }

// function StatusPill({ status }) {
//   const map = {
//     material_hold: "bg-blue-50 text-blue-700 border-blue-200",
//     ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     dispatched: "bg-slate-50 text-slate-700 border-slate-200",
//     pending: "bg-amber-50 text-amber-700 border-amber-200",
//     overdue: "bg-red-50 text-red-700 border-red-200",
//     warning: "bg-orange-50 text-orange-700 border-orange-200",
//     paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     unpaid: "bg-red-50 text-red-700 border-red-200",
//     in_transit: "bg-blue-50 text-blue-700 border-blue-200",
//     delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     ordered: "bg-blue-50 text-blue-700 border-blue-200",
//     partial: "bg-orange-50 text-orange-700 border-orange-200",
//     complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     excess: "bg-purple-50 text-purple-700 border-purple-200",
//     received: "bg-teal-50 text-teal-700 border-teal-200",
//     pending_qc: "bg-amber-50 text-amber-700 border-amber-200",
//     approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     waiting_for_qc: "bg-violet-50 text-violet-700 border-violet-200",
//   };
//   const n = status?.toLowerCase().replace(" ", "_");
//   return (
//     <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${map[n] || map.pending}`}>
//       {n?.replace(/_/g, " ")}
//     </span>
//   );
// }

// function getItemStatus(orderedQty, totalReceivedQty) {
//   if (totalReceivedQty === 0) return "ordered";
//   if (totalReceivedQty < orderedQty) return "partial";
//   if (totalReceivedQty === orderedQty) return "complete";
//   return "excess";
// }

// function calcPoStatus(items) {
//   const statuses = items.map((i) =>
//     getItemStatus(i.orderedQty || i.quantity || 0, i.totalReceivedQty || 0),
//   );
//   if (statuses.every((s) => s === "complete")) return "complete";
//   if (statuses.some((s) => s === "excess")) return "excess";
//   if (statuses.some((s) => s === "partial" || s === "complete")) return "partial";
//   return "ordered";
// }

// async function addToStock(items, poNumber, vendor, isReplacement = false) {
//   const now = new Date().toISOString();
//   for (const item of items) {
//     const qty = item.physicalQty ?? item.newReceived ?? 0;
//     if (qty <= 0) continue;
//     const key = item.productCode?.toString().trim() || item.description?.trim();
//     if (!key) continue;
//     const damagedQty = item.damagedQty || 0;
//     const remarksStr = [
//       damagedQty > 0 ? `Damage: ${damagedQty} units (tracked)` : "",
//       item.issue && item.issue !== "damage" ? `Issue: ${item.issue}` : "",
//       item.issueDetail ? `— ${item.issueDetail}` : "",
//     ].filter(Boolean).join(" | ");
//     const q = query(collection(db, "stock"), where("productCode", "==", key));
//     const snap = await getDocs(q);
//     if (snap.empty) {
//       const newDocDamagedQty = isReplacement ? 0 : damagedQty;
//       await addDoc(collection(db, "stock"), {
//         productCode: key, description: item.description || "",
//         hsnSac: item.hsnSac || "", unit: item.unit || "pcs",
//         available: qty, reserved: 0, backorder: 0, excess: 0, minLevel: 0,
//         lastUpdated: now, damagedQty: newDocDamagedQty, hasIssue: newDocDamagedQty > 0,
//         ledger: [{ type: "IN", qty, ref: poNumber, by: vendor, balance: qty, date: now, remarks: remarksStr }],
//       });
//     } else {
//       const sd = snap.docs[0];
//       const sdata = sd.data();
//       const existBackorder = sdata.backorder || 0;
//       const currentAvail = sdata.available || 0;
//       const clearedBackorder = Math.min(existBackorder, qty);
//       const remainingBackorder = Math.max(0, existBackorder - qty);
//       const netAvail = currentAvail + qty - clearedBackorder;
//       const orderedQty = item.orderedQty || qty;
//       const totalReceived = item.totalReceivedQty || 0;
//       const excessQty = totalReceived > orderedQty ? totalReceived - orderedQty : 0;
//       const newDamagedQty = isReplacement ? 0 : parseFloat(sdata.damagedQty || 0) + damagedQty;
//       await updateDoc(doc(db, "stock", sd.id), {
//         available: Math.max(0, netAvail), backorder: remainingBackorder, excess: excessQty,
//         damagedQty: newDamagedQty, hasIssue: newDamagedQty > 0, lastUpdated: now,
//         ledger: [...(sdata.ledger || []), {
//           type: "IN", qty, ref: poNumber, by: vendor,
//           balance: Math.max(0, netAvail), date: now, remarks: remarksStr,
//         }],
//       });
//     }
//   }
// }

// function isSalesOrder(type) {
//   if (!type) return false;
//   const t = type.trim().toLowerCase().replace(/[\s_\-\.]/g, "");
//   return ["salesorder", "so", "workorder", "wo", "sales", "sales_order"].includes(t);
// }

// export default function StoreVerifyQuality() {
//   const navigate = useNavigate();
//   const [step, setStep] = useState(1);
//   const [pendingInvoices, setPendingInvoices] = useState([]);
//   const [loadingInvoices, setLoadingInvoices] = useState(true);
//   const [pendingSalesOrders, setPendingSalesOrders] = useState([]);
//   const [loadingSO, setLoadingSO] = useState(true);
//   const [qcMode, setQcMode] = useState("po");
//   const [selectedSO, setSelectedSO] = useState(null);
//   const [soItems, setSoItems] = useState([]);
//   const [loadingSO2, setLoadingSO2] = useState(false);
//   const [loadingPO, setLoadingPO] = useState(false);
//   const [selectedInvoice, setSelectedInvoice] = useState(null);
//   const [selectedPO, setSelectedPO] = useState(null);
//   const [receivedItems, setReceivedItems] = useState([]);
//   const [invoiceNo, setInvoiceNo] = useState("");
//   const [invoiceDate, setInvoiceDate] = useState("");
//   const [qualityCheck, setQualityCheck] = useState("passed");
//   const [remarks, setRemarks] = useState("");
//   const [uploading, setUploading] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   // ✅ CHANGE 2: SO items pagination
//   const [soItemsPage, setSoItemsPage] = useState(1);
//   const SO_ITEMS_PER_PAGE = 5;

//   useEffect(() => {
//     const saved = localStorage.getItem("storeQcDraft");
//     if (!saved) return;
//     const verifyAndRestore = async () => {
//       try {
//         const d = JSON.parse(saved);
//         if (!d.step || d.step <= 1 || !d.selectedInvoice?.id) { localStorage.removeItem("storeQcDraft"); return; }
//         const invSnap = await getDoc(doc(db, "excelupload", d.selectedInvoice.id));
//         if (!invSnap.exists()) { localStorage.removeItem("storeQcDraft"); return; }
//         const invData = invSnap.data();
//         if (invData.storeQcStatus === "approved") { localStorage.removeItem("storeQcDraft"); return; }
//         setStep(d.step); setInvoiceNo(d.invoiceNo || ""); setInvoiceDate(d.invoiceDate || "");
//         setQualityCheck(d.qualityCheck || "passed"); setRemarks(d.remarks || "");
//         setSelectedInvoice(d.selectedInvoice || null); setSelectedPO(d.selectedPO || null);
//         setReceivedItems(d.receivedItems || []); setCurrentPage(d.currentPage || 1);
//       } catch { localStorage.removeItem("storeQcDraft"); }
//     };
//     verifyAndRestore();
//   }, []);

//   useEffect(() => {
//     if (step === 1 || step === 4) { localStorage.removeItem("storeQcDraft"); return; }
//     const data = { step, invoiceNo, invoiceDate, qualityCheck, remarks, selectedInvoice, selectedPO, receivedItems, currentPage };
//     localStorage.setItem("storeQcDraft", JSON.stringify(data));
//   }, [step, receivedItems, qualityCheck, remarks, currentPage, invoiceNo, invoiceDate]);

//   const fetchPendingInvoices = async () => {
//     setLoadingInvoices(true);
//     try {
//       const snap = await getDocs(query(collection(db, "excelupload"), orderBy("createdAt", "desc")));
//       const allRaw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//       const all = allRaw.filter((d) => {
//         const t = (d.type || "").trim().toUpperCase();
//         return t === "INVOICE" && d.storeQcStatus !== "approved" && !!d.linkedPoId;
//       });
//       const seenIds = new Set();
//       const deduped = [];
//       for (const inv of all) {
//         if (!seenIds.has(inv.id)) { seenIds.add(inv.id); deduped.push(inv); }
//       }
//       setPendingInvoices(deduped);
//     } catch (err) { console.error("Fetch invoices error:", err); }
//     finally { setLoadingInvoices(false); }
//   };

//   const fetchPendingSalesOrders = async () => {
//     setLoadingSO(true);
//     try {
//       const snap = await getDocs(query(collection(db, "excelupload"), orderBy("createdAt", "desc")));
//       const allSO = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//       const soList = allSO.filter((d) => {
//         const isSOType = isSalesOrder(d.type);
//         const soSt = d.soStatus || d.status || "";
//         const isWaitingQc = soSt === "waiting_for_qc" || soSt === "waitingforqc" || soSt === "waiting for qc";
//         return isSOType && isWaitingQc;
//       });
//       setPendingSalesOrders(soList);
//     } catch (err) { console.error("Fetch SO error:", err); }
//     finally { setLoadingSO(false); }
//   };

//   useEffect(() => { fetchPendingInvoices(); fetchPendingSalesOrders(); }, []);

//   const handleSelectSO = async (so) => {
//     setLoadingSO2(true);
//     try {
//       const soSnap = await getDoc(doc(db, "excelupload", so.id));
//       if (!soSnap.exists()) { alert("SO not found."); await fetchPendingSalesOrders(); setLoadingSO2(false); return; }
//       const soData = soSnap.data();
//       if (soData.soStatus === "ready_for_dispatch" || soData.soStatus === "complete") {
//         alert("⚠️ This SO has already been approved. Refreshing list...");
//         await fetchPendingSalesOrders(); setLoadingSO2(false); return;
//       }
//       const isReopen = soData.soStatus === "waiting_for_qc" && (soData.soQcIssues?.length > 0);
//       const soItemsRaw = soData.items || [];
//       const mappedItems = await Promise.all(
//         soItemsRaw.map(async (item) => {
//           const productCode = item.productCode?.toString().trim();
//           let stockAvailable = 0, stockDocId = null;
//           if (productCode) {
//             const stockQ = query(collection(db, "stock"), where("productCode", "==", productCode));
//             const stockSnap = await getDocs(stockQ);
//             if (!stockSnap.empty) {
//               stockAvailable = Math.max(0, stockSnap.docs[0].data().available || 0);
//               stockDocId = stockSnap.docs[0].id;
//             }
//           }
//           const orderedQty = item.quantity || item.orderedQty || 0;
//           const lastIssue = isReopen ? (item.soQcIssue || "") : "";
//           const lastIssueDetail = isReopen ? (item.soQcIssueDetail || "") : "";
//           const savedReadyQty = item.soQcReadyQty ?? null;
//           const defaultReadyQty = Math.min(orderedQty, stockAvailable);
//           const readyQty = isReopen && savedReadyQty !== null ? savedReadyQty : defaultReadyQty;
//           return {
//             ...item, orderedQty, stockAvailable, stockDocId, readyQty,
//             // ✅ FIX 5: damagedQty preserve from last QC
//             damagedQty:     isReopen ? (item.damagedQty || 0) : 0,
//             issue:          lastIssue,
//             issueDetail:    lastIssueDetail,
//             _hadIssue:      isReopen && !!lastIssue,
//             _lastIssue:     lastIssue,
//             _lastReadyQty:  savedReadyQty,
//           };
//         })
//       );
//       const header = soData.excelHeader || soData.invoiceHeader || {};
//       setSelectedSO({
//         id: soData.id || so.id,
//         soNumber: header.reference || soData.invoiceNo || soData.woNumber || `SO-${so.id.slice(0, 8).toUpperCase()}`,
//         customer: soData.customer || header.consignee || "—",
//         deliveryDate: soData.deliveryDate || header.dated || "",
//         createdAt: soData.createdAt || null,
//         items: soItemsRaw,
//         soStatus: soData.soStatus,
//       });
//       setSoItems(mappedItems);
//       setQualityCheck("passed"); setRemarks(""); setQcMode("so"); setCurrentPage(1); setSoItemsPage(1); setStep(2);
//     } catch (err) { console.error("Load SO error:", err); alert("Error loading SO: " + err.message); }
//     finally { setLoadingSO2(false); }
//   };

//   const updateSoItem = (productCode, changes) => {
//     setSoItems((prev) => prev.map((item) => item.productCode === productCode ? { ...item, ...changes } : item));
//   };

//   const getSoItemStatus = (item) => {
//     const ready = item.readyQty ?? 0;
//     const ordered = item.orderedQty || 0;
//     if (ready === 0) return "ordered";
//     if (ready < ordered) return "partial";
//     if (ready === ordered) return "complete";
//     return "excess";
//   };

//   const liveSoStatus = (() => {
//     if (soItems.length === 0) return "pending";
//     const statuses = soItems.map((i) => getSoItemStatus(i));
//     if (statuses.every((s) => s === "complete")) return "complete";
//     if (statuses.some((s) => s === "partial" || s === "complete")) return "partial";
//     return "pending";
//   })();

//   const soTotalReady    = soItems.reduce((s, i) => s + (i.readyQty ?? 0), 0);
//   const soTotalShortage = soItems.reduce((s, i) => s + Math.max(0, (i.orderedQty || 0) - (i.readyQty ?? 0)), 0);

//   // ✅ FIX 2: handleSOSubmit — stock document ma damagedQty write karo
//   const handleSOSubmit = async () => {
//     setUploading(true);
//     try {
//       const now = new Date().toISOString();
//       const hasIssues  = soItems.some((i) => i.issue && i.issue !== "");
//       const allComplete = soItems.every((i) => getSoItemStatus(i) === "complete");

//       // ✅ FIX 5: damagedQty + damageResolved include karo
//       const updatedItems = soItems.map((item) => ({
//         ...item,
//         soQcReadyQty:    item.readyQty    ?? 0,
//         soQcIssue:       item.issue       || "",
//         soQcIssueDetail: item.issueDetail || "",
//         soQcStatus:      getSoItemStatus(item),
//         damagedQty:      item.damagedQty  || 0,
//         damageResolved:  false,
//       }));

//       const newSoStatus =
//         qualityCheck === "failed"         ? "waiting_for_qc"      :
//         allComplete && !hasIssues         ? "ready_for_dispatch"  :
//                                             "waiting_for_qc";

//       await updateDoc(doc(db, "excelupload", selectedSO.id), {
//         items:            updatedItems,
//         soStatus:         newSoStatus,
//         soQcStatus:       allComplete && qualityCheck !== "failed" ? "approved" : "issues",
//         soQcApprovedAt:   now,
//         soQcApprovedBy:   "Store Team",
//         soQcRemarks:      remarks,
//         soQcIssues:       soItems.filter((i) => i.issue).map((i) => ({
//           productCode: i.productCode,
//           issue:       i.issue,
//           detail:      i.issueDetail,
//           shortage:    Math.max(0, (i.orderedQty || 0) - (i.readyQty ?? 0)),
//           damagedQty:  i.damagedQty || 0,
//         })),
//         qualityCheck:     qualityCheck,
//         remarks,
//       });

//       // ✅ FIX 2: Stock documents ma damagedQty write karo — badge show thase
//       for (const item of soItems) {
//         const dmgQty = parseFloat(item.damagedQty || 0);
//         if (!item.productCode) continue;
//         const stockQ    = query(collection(db, "stock"), where("productCode", "==", item.productCode));
//         const stockSnap = await getDocs(stockQ);
//         if (stockSnap.empty) continue;
//         const stockDocRef = doc(db, "stock", stockSnap.docs[0].id);
//         if (dmgQty > 0) {
//           // 🔴 Damage set — badge show thase SalesStock page par
//           await updateDoc(stockDocRef, {
//             damagedQty:   dmgQty,
//             hasSOPending: true,
//             lastQCDate:   now,
//           });
//         } else if (newSoStatus === "ready_for_dispatch") {
//           // ✅ Fully approved, no damage — badges clear karo
//           await updateDoc(stockDocRef, {
//             damagedQty:   0,
//             hasSOPending: false,
//           });
//         }
//       }

//       localStorage.removeItem("storeQcDraft");
//       setUploading(false);
//       setStep(4);
//       await fetchPendingSalesOrders();
//     } catch (err) {
//       console.error("SO Submit error:", err);
//       setUploading(false);
//       alert("Error: " + err.message);
//     }
//   };

//   const handleSelectInvoice = async (invoice) => {
//     setLoadingPO(true);
//     try {
//       const freshInvSnap = await getDoc(doc(db, "excelupload", invoice.id));
//       if (!freshInvSnap.exists()) { alert("Invoice not found."); await fetchPendingInvoices(); setLoadingPO(false); return; }
//       const freshInvData = freshInvSnap.data();
//       if (freshInvData?.storeQcStatus === "approved") {
//         alert("⚠️ This invoice was already fully approved. Refreshing list...");
//         await fetchPendingInvoices(); setLoadingPO(false); return;
//       }
//       if (!invoice.linkedPoId) { alert("This invoice has no linked PO ID."); setLoadingPO(false); return; }
//       const poSnap = await getDoc(doc(db, "excelupload", invoice.linkedPoId));
//       if (!poSnap.exists()) { alert(`Linked PO not found: ${invoice.linkedPoId}`); setLoadingPO(false); return; }
//       const poData = { id: poSnap.id, ...poSnap.data() };
//       const po = {
//         id: poData.id,
//         poNumber: invoice.linkedPoNo || poData.woNumber || poData.excelHeader?.voucherNo || poData.id.slice(0, 8).toUpperCase(),
//         vendor: invoice.vendor || poData.customer || poData.excelHeader?.supplier || "—",
//         date: poData.excelHeader?.dated || "",
//         status: poData.poStatus || "ordered",
//         createdAt: poData.createdAt || null,
//         items: (poData.items || []).map((item) => ({
//           ...item, orderedQty: item.orderedQty || item.quantity || 0,
//           totalReceivedQty: item.totalReceivedQty || 0, unit: item.unit || "pcs",
//         })),
//       };
//       setSelectedPO(po); setSelectedInvoice(invoice);
//       setInvoiceNo(invoice.invoiceNo || ""); setInvoiceDate(invoice.invoiceDate || "");
//       const invItems = invoice.items || [];
//       const isReopen = invoice.storeQcStatus === "approved_with_issues";
//       const mapped = po.items.map((poItem) => {
//         const invItem = invItems.find((i) => i.productCode?.toLowerCase().trim() === poItem.productCode?.toLowerCase().trim());
//         const alreadyReceived = poItem.totalReceivedQty || 0;
//         const orderedQty = poItem.orderedQty || poItem.quantity || 0;
//         let newReceived = isReopen ? Math.max(0, orderedQty - alreadyReceived)
//           : invItem ? invItem.newReceived || invItem.invoiceQty || 0 : 0;
//         const lastIssue       = isReopen ? (invItem?.issue       || "") : "";
//         const lastIssueDetail = isReopen ? (invItem?.issueDetail || "") : "";
//         const lastDamagedQty  = isReopen ? (invItem?.damagedQty  || 0)  : 0;
//         return {
//           ...poItem, alreadyReceived, newReceived, orderedQty,
//           matchedFromInvoice: !!invItem, physicalQty: newReceived,
//           issue: lastIssue, issueDetail: lastIssueDetail, damagedQty: 0,
//           _lastDamagedQty: lastDamagedQty, _hadIssue: isReopen && !!lastIssue,
//         };
//       });
//       setReceivedItems(mapped); setCurrentPage(1); setQualityCheck("passed"); setRemarks(""); setStep(2);
//     } catch (err) { console.error("Load PO error:", err); alert("Error loading PO: " + err.message); }
//     finally { setLoadingPO(false); }
//   };

//   const updateItem = (productCode, changes) => {
//     setReceivedItems((prev) => prev.map((item) => item.productCode === productCode ? { ...item, ...changes } : item));
//   };

//   const getUsableQty = (item) => item.physicalQty ?? item.newReceived ?? 0;
//   const getTotalNewReceived = () => receivedItems.reduce((s, i) => s + (i.physicalQty ?? i.newReceived ?? 0), 0);
//   const getTotalShortage = () => receivedItems.reduce((sum, item) => {
//     const total = (item.alreadyReceived || 0) + getUsableQty(item);
//     return sum + Math.max(0, (item.orderedQty || 0) - total);
//   }, 0);

//   const livePoStatus = (() => {
//     if (receivedItems.length === 0) return "ordered";
//     const computed = calcPoStatus(receivedItems.map((i) => ({ orderedQty: i.orderedQty || 0, totalReceivedQty: (i.alreadyReceived || 0) + getUsableQty(i) })));
//     if (computed === "partial" || computed === "complete") return "received";
//     if (computed === "excess") return "excess";
//     return computed;
//   })();

//   const totalPages = Math.ceil(receivedItems.length / itemsPerPage);
//   const pagedItems = receivedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const handleSubmit = async () => {
//     setUploading(true);
//     try {
//       const now = new Date().toISOString();
//       const hasDamage = receivedItems.some((i) => (i.damagedQty || 0) > 0);
//       const updatedItems = receivedItems.map((item) => {
//         const orderedQty = item.orderedQty || 0;
//         const alreadyReceived = item.alreadyReceived || 0;
//         const physical = item.physicalQty ?? item.newReceived ?? 0;
//         const totalReceivedQty = alreadyReceived + physical;
//         return {
//           ...item, totalReceivedQty, orderedQty, quantity: orderedQty,
//           shortage: Math.max(0, orderedQty - totalReceivedQty),
//           itemStatus: getItemStatus(orderedQty, totalReceivedQty),
//           physicalQty: physical, damagedQty: item.damagedQty || 0,
//           issue: item.issue || "", issueDetail: item.issueDetail || "",
//         };
//       });
//       const poStatus = calcPoStatus(updatedItems.map((i) => ({ orderedQty: i.orderedQty, totalReceivedQty: i.totalReceivedQty })));
//       const totalReceivedQty = updatedItems.reduce((s, i) => s + i.totalReceivedQty, 0);
//       const finalQcStatus = hasDamage && qualityCheck === "passed" ? "passed_with_issues" : qualityCheck;
//       await updateDoc(doc(db, "excelupload", selectedPO.id), {
//         items: updatedItems, poStatus, receivedAt: now, lastInvoiceAt: now, totalReceivedQty,
//         qualityCheck: finalQcStatus, remarks, storeQcStatus: "approved",
//         storeQcApprovedAt: now, storeQcApprovedBy: "Store Team",
//       });
//       await updateDoc(doc(db, "excelupload", selectedInvoice.id), {
//         storeQcStatus: hasDamage ? "approved_with_issues" : "approved",
//         storeQcApprovedAt: now, storeQcApprovedBy: "Store Team",
//         qualityCheck: finalQcStatus, remarks, poStatus, items: updatedItems,
//       });
//       const isReplacement = selectedInvoice.storeQcStatus === "approved_with_issues";
//       if (qualityCheck !== "failed") await addToStock(receivedItems, selectedPO.poNumber, selectedPO.vendor, isReplacement);
//       localStorage.removeItem("storeQcDraft");
//       setUploading(false); setStep(4);
//     } catch (err) { console.error("Submit error:", err); setUploading(false); alert("Error: " + err.message); }
//   };

//   const steps = [
//     { num: 1, label: "Select Invoice" },
//     { num: 2, label: "Verify Qty" },
//     { num: 3, label: "Quality Check" },
//   ];

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-xl font-black text-slate-800">Store Quality Check</h2>
//           <p className="text-xs text-slate-400 mt-0.5">Review vendor invoices and approve material receipt</p>
//         </div>
//         <BtnSecondary onClick={() => navigate("/store/dashboard")}>Cancel</BtnSecondary>
//       </div>

//       {step < 4 && (
//         <Card className="p-5">
//           <div className="flex items-center justify-between max-w-lg mx-auto">
//             {steps.map((s, idx) => (
//               <React.Fragment key={s.num}>
//                 <div className="flex flex-col items-center gap-1">
//                   <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step > s.num ? "bg-emerald-600 text-white" : step === s.num ? "bg-emerald-600 text-white ring-4 ring-emerald-100" : "bg-slate-200 text-slate-400"}`}>
//                     {step > s.num ? <FiCheck size={16} /> : s.num}
//                   </div>
//                   <p className={`text-[10px] font-bold whitespace-nowrap ${step >= s.num ? "text-slate-700" : "text-slate-400"}`}>{s.label}</p>
//                 </div>
//                 {idx < 2 && <div className={`flex-1 h-0.5 mx-1 ${step > s.num ? "bg-emerald-600" : "bg-slate-200"}`} />}
//               </React.Fragment>
//             ))}
//           </div>
//         </Card>
//       )}

//       {/* ── Step 1 ── */}
//       {step === 1 && (
//         <>
//           {(() => {
//             const saved = localStorage.getItem("storeQcDraft");
//             if (!saved) return null;
//             try {
//               const d = JSON.parse(saved);
//               if (!d.step || d.step <= 1) return null;
//               return (
//                 <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
//                   <p className="text-xs font-bold text-amber-700">📝 Draft found — Invoice: {d.invoiceNo || "—"} · PO: {d.selectedPO?.poNumber || "—"}</p>
//                   <div className="flex gap-2">
//                     <button onClick={() => {
//                       const d2 = JSON.parse(localStorage.getItem("storeQcDraft"));
//                       setStep(d2.step); setSelectedInvoice(d2.selectedInvoice); setSelectedPO(d2.selectedPO);
//                       setReceivedItems(d2.receivedItems); setInvoiceNo(d2.invoiceNo); setInvoiceDate(d2.invoiceDate);
//                       setQualityCheck(d2.qualityCheck); setRemarks(d2.remarks); setCurrentPage(d2.currentPage || 1);
//                     }} className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600">Resume →</button>
//                     <button onClick={() => { localStorage.removeItem("storeQcDraft"); window.location.reload(); }}
//                       className="px-3 py-1 bg-white border border-amber-300 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-50">Discard</button>
//                   </div>
//                 </div>
//               );
//             } catch { return null; }
//           })()}

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             {/* LEFT: Sales Orders */}
//             <Card>
//               <CardHeader
//                 title={<div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><FiFileText size={14} className="text-violet-600" /></div><span>Sales Orders — Waiting for QC</span></div>}
//                 subtitle={loadingSO ? "Loading..." : `${pendingSalesOrders.length} SO(s) awaiting quality check`}
//               />
//               {loadingSO ? (
//                 <div className="divide-y divide-slate-50 min-h-[200px]">
//                   {[1, 2, 3].map((i) => (
//                     <div key={i} className="px-6 py-5 animate-pulse">
//                       <div className="flex items-center justify-between">
//                         <div className="flex-1 space-y-2">
//                           <div className="flex items-center gap-3"><div className="h-4 w-28 bg-slate-200 rounded-md" /><div className="h-4 w-24 bg-violet-100 rounded-full" /></div>
//                           <div className="h-3 w-40 bg-slate-100 rounded-md" />
//                         </div>
//                         <div className="h-6 w-24 bg-violet-100 rounded-full ml-4" />
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : pendingSalesOrders.length === 0 ? (
//                 <div className="p-12 text-center">
//                   <FiShield size={40} className="mx-auto mb-3 text-slate-200" />
//                   <p className="text-sm font-bold text-slate-500">No Pending Sales Orders</p>
//                   <p className="text-xs text-slate-400 mt-1">All SOs have been verified.</p>
//                 </div>
//               ) : (
//                 <div className="divide-y divide-slate-50">
//                   {pendingSalesOrders.map((so) => {
//                     const header = so.excelHeader || so.invoiceHeader || {};
//                     const soNumber = header.reference || so.invoiceNo || so.woNumber || `SO-${so.id.slice(0, 8).toUpperCase()}`;
//                     const customer = so.customer || header.consignee || header.buyer || "—";
//                     const totalItems = (so.items || []).length;
//                     const totalQty = (so.items || []).reduce((s, i) => s + (i.quantity || i.orderedQty || 0), 0);
//                     const deliveryDate = so.deliveryDate || header.dated || so.eta || "";
//                     const hasQcIssues = (so.soQcIssues?.length > 0);
//                     const prevShortageItems = (so.soQcIssues || []).filter(i => i.issue === "shortage");
//                     return (
//                       <div key={so.id} className={`px-6 py-4 transition-colors cursor-pointer ${hasQcIssues ? "bg-orange-50/40 hover:bg-orange-50 border-l-4 border-l-orange-400" : "hover:bg-violet-50/40"}`}>
//                         <div className="flex items-center justify-between">
//                           <div className="flex-1">
//                             <div className="flex items-center gap-3 mb-1 flex-wrap">
//                               <p className="text-sm font-bold text-slate-800">{soNumber}</p>
//                               {hasQcIssues ? (
//                                 <>
//                                   <span className="px-2.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 rounded-full uppercase">⚠ Partial — Shortage</span>
//                                   {prevShortageItems.length > 0 && (
//                                     <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 rounded-full">
//                                       {prevShortageItems.reduce((s, i) => s + (i.shortage || 0), 0)} units short
//                                     </span>
//                                   )}
//                                 </>
//                               ) : (
//                                 <span className="px-2.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 rounded-full uppercase">Waiting for QC</span>
//                               )}
//                             </div>
//                             <p className="text-sm text-slate-600">{customer}</p>
//                             <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
//                               <span>{totalItems} items · {totalQty} units</span>
//                               {deliveryDate && <span>Delivery: {formatDate(deliveryDate)}</span>}
//                               <span className="flex items-center gap-1"><FiClock size={10} />{formatDateTime(so.createdAt)}</span>
//                             </div>
//                             {hasQcIssues && (
//                               <div className="mt-2 flex flex-wrap gap-1.5">
//                                 {(so.soQcIssues || []).map((iss, i) => (
//                                   <span key={i} className="px-2 py-0.5 text-[10px] font-bold bg-white border border-orange-200 text-orange-700 rounded-md">
//                                     {iss.productCode}: {iss.issue?.replace("_", " ")}{iss.shortage > 0 && ` (${iss.shortage} short)`}
//                                   </span>
//                                 ))}
//                               </div>
//                             )}
//                           </div>
//                           <button onClick={() => handleSelectSO(so)} disabled={loadingSO2}
//                             className={`ml-4 px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 ${hasQcIssues ? "bg-orange-500 hover:bg-orange-600" : "bg-violet-600 hover:bg-violet-700"}`}>
//                             <FiShield size={12} />
//                             {loadingSO2 ? "Loading..." : hasQcIssues ? "Re-verify →" : "Verify SO →"}
//                           </button>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </Card>

//             {/* RIGHT: PO Invoices */}
//             <Card>
//               <CardHeader
//                 title={<div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><FiShoppingCart size={14} className="text-emerald-600" /></div><span>Purchase Orders — Pending QC</span></div>}
//                 subtitle={loadingInvoices ? "Loading..." : `${pendingInvoices.length} invoice(s) awaiting store verification`}
//               />
//               {loadingInvoices || loadingPO ? (
//                 <div className="divide-y divide-slate-50 min-h-[200px]">
//                   {[1, 2, 3].map((i) => (
//                     <div key={i} className="px-6 py-5 animate-pulse">
//                       <div className="flex items-center justify-between">
//                         <div className="flex-1 space-y-2">
//                           <div className="flex items-center gap-3"><div className="h-4 w-36 bg-slate-200 rounded-md" /><div className="h-4 w-20 bg-amber-100 rounded-full" /></div>
//                           <div className="h-3 w-48 bg-slate-100 rounded-md" />
//                         </div>
//                         <div className="h-8 w-36 bg-emerald-100 rounded-lg ml-4" />
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : pendingInvoices.length === 0 ? (
//                 <div className="p-12 text-center">
//                   <FiShield size={40} className="mx-auto mb-3 text-slate-200" />
//                   <p className="text-sm font-bold text-slate-500">No Pending Invoices</p>
//                   <p className="text-xs text-slate-400 mt-1">All invoices have been verified.</p>
//                 </div>
//               ) : (
//                 <div className="divide-y divide-slate-50">
//                   {pendingInvoices.map((inv) => {
//                     const totalItems = (inv.items || []).length;
//                     const totalQty = (inv.items || []).reduce((s, i) => s + (i.newReceived || i.invoiceQty || 0), 0);
//                     const hasIssues = inv.storeQcStatus === "approved_with_issues";
//                     const issueItems = (inv.items || []).filter(i => i.issue && i.issue !== "");
//                     const damagedItems = (inv.items || []).filter(i => (i.damagedQty || 0) > 0);
//                     const shortageItems = (inv.items || []).filter(i => i.issue === "shortage");
//                     return (
//                       <div key={inv.id}
//                         className={`px-6 py-4 transition-colors cursor-pointer ${hasIssues ? "bg-red-50/40 hover:bg-red-50 border-l-4 border-l-red-400" : "hover:bg-slate-50"}`}
//                         onClick={() => handleSelectInvoice(inv)}>
//                         <div className="flex items-center justify-between">
//                           <div className="flex-1">
//                             <div className="flex items-center gap-3 mb-1 flex-wrap">
//                               <p className="text-sm font-bold text-slate-800">Invoice: {inv.invoiceNo || "—"}</p>
//                               {hasIssues ? (
//                                 <>
//                                   {damagedItems.length > 0 && <span className="px-2.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 rounded-full uppercase">🔴 {damagedItems.reduce((s, i) => s + (i.damagedQty || 0), 0)} Damaged</span>}
//                                   {shortageItems.length > 0 && <span className="px-2.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 rounded-full uppercase">🟠 Shortage</span>}
//                                   {issueItems.filter(i => i.issue !== "damage" && i.issue !== "shortage").length > 0 && <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full uppercase">⚠ Issues</span>}
//                                 </>
//                               ) : (
//                                 <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full uppercase">Pending QC</span>
//                               )}
//                             </div>
//                             <p className="text-sm text-slate-600">PO: <strong>{inv.linkedPoNo}</strong> · {inv.vendor}</p>
//                             <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
//                               <span>{totalItems} items · {totalQty} units</span>
//                               {inv.invoiceDate && <span>Invoice Date: {formatDate(inv.invoiceDate)}</span>}
//                               <span className="flex items-center gap-1"><FiClock size={10} />Uploaded: {formatDateTime(inv.createdAt)}</span>
//                             </div>
//                             {hasIssues && issueItems.length > 0 && (
//                               <div className="mt-2 flex flex-wrap gap-1.5">
//                                 {issueItems.map((item, idx) => (
//                                   <span key={idx} className="px-2 py-0.5 text-[10px] font-bold bg-white border border-red-200 text-red-700 rounded-md">
//                                     {item.productCode}: {item.issue?.replace("_", " ")}{(item.damagedQty || 0) > 0 && ` (${item.damagedQty} dmg)`}
//                                   </span>
//                                 ))}
//                               </div>
//                             )}
//                           </div>
//                           <button className={`ml-4 px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${hasIssues ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
//                             <FiShield size={12} />{hasIssues ? "Review Issues →" : "Review & Approve →"}
//                           </button>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </Card>
//           </div>
//         </>
//       )}

//       {/* ── SO Step 2 ── */}
//       {step === 2 && qcMode === "so" && selectedSO && (
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           <Card>
//             <CardHeader title="Sales Order Details" />
//             <div className="p-6 space-y-4">
//               <div className="p-4 bg-slate-50 rounded-lg">
//                 <div className="grid grid-cols-2 gap-3 text-xs">
//                   <div><p className="text-slate-400 font-bold mb-1">SO Number</p><p className="text-slate-800 font-bold">{selectedSO.soNumber}</p></div>
//                   <div><p className="text-slate-400 font-bold mb-1">Customer</p><p className="text-slate-800">{selectedSO.customer}</p></div>
//                   <div><p className="text-slate-400 font-bold mb-1">Delivery Date</p><p className="text-slate-800">{selectedSO.deliveryDate || "—"}</p></div>
//                   <div><p className="text-slate-400 font-bold mb-1">After QC</p><StatusPill status={liveSoStatus === "complete" ? "ready" : liveSoStatus} /></div>
//                 </div>
//               </div>
//               <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs">
//                 <p className="text-xs font-bold text-slate-600 mb-2">QC Summary:</p>
//                 <div className="flex justify-between"><span className="text-slate-500">Total Items:</span><span className="font-bold text-slate-800">{soItems.length}</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">Ready for Dispatch:</span><span className="font-bold text-emerald-600">{soTotalReady} units</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">Shortage:</span><span className={`font-bold ${soTotalShortage > 0 ? "text-orange-600" : "text-emerald-600"}`}>{soTotalShortage} units</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">SO Status After:</span><StatusPill status={liveSoStatus === "complete" ? "ready" : liveSoStatus} /></div>
//               </div>
//               {soItems.some((i) => i._hadIssue) && (
//                 <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
//                   <p className="text-xs font-bold text-amber-700 mb-2">⚠️ Previous Issues:</p>
//                   {soItems.filter((i) => i._hadIssue).map((item, i) => (
//                     <div key={i} className="text-xs text-amber-800 flex gap-2 mt-1">
//                       <span className="font-mono font-bold">{item.productCode}</span>
//                       <span className="capitalize text-amber-600">— {item._lastIssue?.replace("_", " ")}</span>
//                     </div>
//                   ))}
//                 </div>
//               )}
//               <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                 <FiAlertCircle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
//                 <p className="text-xs text-blue-700">Set "Ready Qty" = actual units you can dispatch from stock. Shortage items will stay in QC list.</p>
//               </div>
//             </div>
//           </Card>

//           <Card>
//             <CardHeader title="Verify Stock Availability" subtitle={`${soTotalReady} units ready · ${soItems.length} items`} />
//             <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
//               {/* ✅ CHANGE 2: Paginated soItems */}
//               {soItems.slice((soItemsPage - 1) * SO_ITEMS_PER_PAGE, soItemsPage * SO_ITEMS_PER_PAGE).map((item) => {
//                 const ordered = item.orderedQty || 0;
//                 const avail   = item.stockAvailable || 0;
//                 const ready   = item.readyQty ?? Math.min(ordered, avail);
//                 const itemSt  = getSoItemStatus(item);
//                 const shortage = Math.max(0, ordered - ready);
//                 const progressPct = ordered > 0 ? Math.min(100, Math.round((ready / ordered) * 100)) : 0;
//                 const stockSufficient = avail >= ordered;
//                 return (
//                   <div key={item.productCode} className={`p-4 border rounded-lg ${
//                     item._hadIssue && item.issue === "shortage" ? "border-orange-400 bg-orange-50/20 ring-1 ring-orange-300"
//                     : item._hadIssue && item.issue === "damage" ? "border-red-400 bg-red-50/20 ring-1 ring-red-300"
//                     : item._hadIssue ? "border-amber-400 bg-amber-50/20"
//                     : itemSt === "complete" ? "border-emerald-200 bg-emerald-50/30"
//                     : itemSt === "partial"  ? "border-orange-200 bg-orange-50/30"
//                     : "border-slate-200"
//                   }`}>
//                     <div className="flex items-start gap-3 mb-3">
//                       <FiPackage className="text-slate-400 mt-0.5 flex-shrink-0" size={15} />
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2 flex-wrap">
//                           <p className="text-sm font-bold text-slate-800 font-mono">{item.productCode}</p>
//                           <StatusPill status={itemSt === "complete" ? "complete" : itemSt} />
//                           {item._hadIssue && (
//                             <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border ${item.issue === "shortage" ? "bg-orange-100 text-orange-700 border-orange-300" : item.issue === "damage" ? "bg-red-100 text-red-700 border-red-300" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
//                               Last: {item._lastIssue?.replace("_", " ")}
//                             </span>
//                           )}
//                           {!stockSufficient && <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 rounded-full">Stock Low</span>}
//                         </div>
//                         <p className="text-xs text-slate-500 truncate">{item.description}</p>
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-3 gap-2 mb-2">
//                       <div>
//                         <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Ordered</p>
//                         <div className="h-8 flex items-center px-2 bg-slate-50 border border-slate-200 rounded-lg"><p className="text-sm font-bold text-slate-800">{ordered}</p></div>
//                       </div>
//                       <div>
//                         <p className="text-[10px] font-bold mb-1 uppercase tracking-wide text-teal-500">In Stock</p>
//                         <div className={`h-8 flex items-center px-2 border rounded-lg ${stockSufficient ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
//                           <p className={`text-sm font-bold ${stockSufficient ? "text-emerald-700" : "text-red-600"}`}>{avail}</p>
//                         </div>
//                       </div>
//                       <div>
//                         <p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase">Ready</p>
//                         <input type="number" min="0" max={avail}
//                           value={item.readyQty ?? Math.min(ordered, avail)}
//                           onChange={(e) => {
//                             const newReady = Math.min(parseFloat(e.target.value) || 0, avail);
//                             const currentIssue = item.issue;
//                             // ✅ CHANGE 1: If issue is already "damage", auto-calc damagedQty = ordered - newReady
//                             if (currentIssue === "damage") {
//                               const autoDmg = Math.max(0, ordered - newReady);
//                               updateSoItem(item.productCode, {
//                                 readyQty:    newReady,
//                                 damagedQty:  autoDmg,
//                                 issueDetail: `Damaged: ${autoDmg} units (Ordered: ${ordered}, Stock: ${avail}, Ready: ${newReady})`,
//                               });
//                             } else {
//                               const autoIssue  = newReady < ordered ? "shortage" : "";
//                               const autoDetail = newReady < ordered ? `Short: ${ordered - newReady} units (Stock: ${avail}, Ordered: ${ordered})` : "";
//                               updateSoItem(item.productCode, { readyQty: newReady, issue: autoIssue, issueDetail: autoDetail });
//                             }
//                           }}
//                           className={`w-full h-8 border rounded-lg px-2 text-sm font-bold focus:outline-none focus:ring-2 ${ready < ordered ? "border-orange-300 bg-orange-50 text-orange-700 focus:ring-orange-300" : "border-indigo-200 bg-indigo-50/40 text-indigo-700 focus:ring-indigo-300"}`}
//                         />
//                       </div>
//                     </div>

//                     {/* ✅ FIX 3: Issue dropdown — "Damage" option added */}
//                     <div className="mb-2">
//                       <p className="text-[10px] text-red-400 font-bold mb-1 uppercase">Issue</p>
//                       <select value={item.issue || ""}
//                         onChange={(e) => {
//                           const iss = e.target.value;
//                           // ✅ CHANGE 1: Damage select thay tyare auto-calc damagedQty = ordered - ready
//                           const currentReady = item.readyQty ?? Math.min(ordered, avail);
//                           const autoDmg = iss === "damage" ? Math.max(0, ordered - currentReady) : 0;
//                           const autoDetail =
//                             iss === "damage"   ? `Damaged: ${autoDmg} units (Ordered: ${ordered}, Ready: ${currentReady})`
//                             : iss === "shortage" ? `Short: ${Math.max(0, ordered - currentReady)} units`
//                             : iss === "quality" ? "Quality issue noted"
//                             : iss === "other"   ? "Other issue" : "";
//                           updateSoItem(item.productCode, { issue: iss, issueDetail: autoDetail, damagedQty: autoDmg });
//                         }}
//                         className={`w-full h-8 border rounded-lg px-1.5 text-[11px] font-bold focus:outline-none ${item.issue ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"}`}>
//                         <option value="">— None</option>
//                         <option value="damage">🔴 Damage</option>
//                         <option value="shortage">🟠 Shortage</option>
//                         <option value="quality">🟡 Quality</option>
//                         <option value="wrong_item">🔵 Wrong Item</option>
//                         <option value="other">⚪ Other</option>
//                       </select>
//                     </div>

//                     {/* ✅ FIX 4: Damage input — stock page par badge show thase */}
//                     {item.issue === "damage" && (
//                       <div className="mt-1 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
//                         <p className="text-[10px] text-red-600 font-bold mb-1 uppercase">
//                           Damaged Qty <span className="normal-case font-normal text-red-400">(tracking only — badge shows on Stock Alerts page)</span>
//                         </p>
//                         <input type="number" min="0"
//                           value={item.damagedQty || 0}
//                           onChange={(e) => {
//                             const dmg = parseFloat(e.target.value) || 0;
//                             updateSoItem(item.productCode, {
//                               damagedQty:  dmg,
//                               issueDetail: `Damaged: ${dmg} units (Ordered: ${ordered}, Stock: ${avail})`,
//                             });
//                           }}
//                           className="w-full h-9 border-2 border-red-300 bg-white rounded-lg px-3 text-sm font-black text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
//                           placeholder="0"
//                         />
//                         {(item.damagedQty || 0) > 0 && (
//                           <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1">
//                             <FiAlertTriangle size={10} />
//                             {item.damagedQty} damaged units — badge will show on Stock Alerts page ✅
//                           </p>
//                         )}
//                       </div>
//                     )}

//                     {item.issue && item.issue !== "damage" && (
//                       <div className="mb-2">
//                         <p className="text-[10px] text-red-500 font-bold mb-1">Issue Details</p>
//                         <textarea rows={2} value={item.issueDetail || ""}
//                           onChange={(e) => updateSoItem(item.productCode, { issueDetail: e.target.value })}
//                           className="w-full border border-red-200 bg-red-50/50 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none resize-none"
//                           placeholder="Describe the issue..." />
//                       </div>
//                     )}

//                     <div>
//                       <div className="flex justify-between text-[10px] text-slate-400 mb-1">
//                         <span>{ready}/{ordered} {item.unit || "pcs"}{(item.damagedQty || 0) > 0 && <span className="text-red-400 ml-1">({item.damagedQty} damaged)</span>}</span>
//                         <span>{progressPct}%</span>
//                       </div>
//                       <div className="w-full bg-slate-100 rounded-full h-1.5">
//                         <div className={`h-1.5 rounded-full transition-all ${itemSt === "complete" ? "bg-emerald-500" : itemSt === "partial" ? "bg-orange-500" : "bg-blue-300"}`}
//                           style={{ width: `${progressPct}%` }} />
//                       </div>
//                       {/* ✅ CHANGE 3: Contextual message based on issue type */}
//                       {item.issue === "damage" && (item.damagedQty || 0) > 0 && (
//                         <p className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
//                           <FiAlertTriangle size={10} /> {item.damagedQty} {item.unit} damaged — tracked for vendor follow-up
//                         </p>
//                       )}
//                       {item.issue === "shortage" && shortage > 0 && (
//                         <p className="text-[11px] text-orange-600 font-bold mt-1 flex items-center gap-1">
//                           <FiAlertTriangle size={10} /> {shortage} {item.unit} short in stock
//                         </p>
//                       )}
//                       {item.issue === "quality" && (
//                         <p className="text-[11px] text-amber-600 font-bold mt-1 flex items-center gap-1">
//                           <FiAlertTriangle size={10} /> Quality issue noted — awaiting review
//                         </p>
//                       )}
//                       {item.issue === "wrong_item" && (
//                         <p className="text-[11px] text-blue-600 font-bold mt-1 flex items-center gap-1">
//                           <FiAlertTriangle size={10} /> Wrong item received — return required
//                         </p>
//                       )}
//                       {item.issue === "other" && (
//                         <p className="text-[11px] text-slate-500 font-bold mt-1 flex items-center gap-1">
//                           <FiAlertTriangle size={10} /> Issue noted — see details above
//                         </p>
//                       )}
//                       {/* No issue + shortage = show shortage msg */}
//                       {!item.issue && shortage > 0 && (
//                         <p className="text-[11px] text-orange-600 font-bold mt-1 flex items-center gap-1">
//                           <FiAlertTriangle size={10} /> {shortage} {item.unit} short in stock
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 );
//               })}

//               {soTotalShortage > 0 && (
//                 <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
//                   <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5"><FiAlertTriangle size={12} /> Shortage — SO will stay in QC list</p>
//                   <p className="text-xs text-orange-600 mt-1">{soTotalShortage} units pending. Stock update required.</p>
//                 </div>
//               )}
//               {liveSoStatus === "complete" && (
//                 <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
//                   <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5"><FiCheck size={12} /> All items ready — SO will move to: READY FOR DISPATCH ✅</p>
//                 </div>
//               )}

//               {/* ✅ CHANGE 2: Pagination controls */}
//               {Math.ceil(soItems.length / SO_ITEMS_PER_PAGE) > 1 && (
//                 <div className="flex items-center justify-between pt-3 border-t border-slate-100">
//                   <p className="text-xs text-slate-400">
//                     Showing <span className="font-bold text-slate-600">{(soItemsPage - 1) * SO_ITEMS_PER_PAGE + 1}–{Math.min(soItemsPage * SO_ITEMS_PER_PAGE, soItems.length)}</span> of <span className="font-bold text-slate-600">{soItems.length}</span> items
//                   </p>
//                   <div className="flex items-center gap-1">
//                     <button
//                       onClick={() => setSoItemsPage((p) => Math.max(1, p - 1))}
//                       disabled={soItemsPage === 1}
//                       className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
//                     >← Prev</button>
//                     {Array.from({ length: Math.ceil(soItems.length / SO_ITEMS_PER_PAGE) }, (_, i) => i + 1).map((pg) => (
//                       <button
//                         key={pg}
//                         onClick={() => setSoItemsPage(pg)}
//                         className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${pg === soItemsPage ? "bg-violet-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-600"}`}
//                       >{pg}</button>
//                     ))}
//                     <button
//                       onClick={() => setSoItemsPage((p) => Math.min(Math.ceil(soItems.length / SO_ITEMS_PER_PAGE), p + 1))}
//                       disabled={soItemsPage === Math.ceil(soItems.length / SO_ITEMS_PER_PAGE)}
//                       className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
//                     >Next →</button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </Card>
//         </div>
//       )}

//       {/* ── PO Step 2 ── */}
//       {step === 2 && qcMode === "po" && selectedPO && selectedInvoice && (
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           <Card>
//             <CardHeader title="Invoice Details" />
//             <div className="p-6 space-y-4">
//               <div className="p-4 bg-slate-50 rounded-lg">
//                 <div className="grid grid-cols-2 gap-3 text-xs">
//                   <div><p className="text-slate-400 font-bold mb-1">PO Number</p><p className="text-slate-800 font-bold">{selectedPO.poNumber}</p></div>
//                   <div><p className="text-slate-400 font-bold mb-1">Invoice No</p><p className="text-slate-800 font-bold">{invoiceNo || "—"}</p></div>
//                   <div><p className="text-slate-400 font-bold mb-1">Vendor</p><p className="text-slate-800">{selectedPO.vendor}</p></div>
//                   <div><p className="text-slate-400 font-bold mb-1">Invoice Date</p><p className="text-slate-800">{invoiceDate ? formatDate(invoiceDate) : "—"}</p></div>
//                   <div><p className="text-slate-400 font-bold mb-1">Current PO Status</p><StatusPill status={selectedPO.status} /></div>
//                   <div><p className="text-slate-400 font-bold mb-1">After Approval</p><StatusPill status={livePoStatus} /></div>
//                 </div>
//               </div>
//               <div className="p-3 bg-slate-50 rounded-lg">
//                 <p className="text-xs font-bold text-slate-600 mb-2">Receipt Summary:</p>
//                 <div className="space-y-1.5 text-xs">
//                   <div className="flex justify-between"><span className="text-slate-500">Items in Invoice:</span><span className="font-bold text-slate-800">{receivedItems.filter((i) => i.matchedFromInvoice).length} / {receivedItems.length}</span></div>
//                   <div className="flex justify-between"><span className="text-slate-500">Stock to be Added:</span><span className="font-bold text-slate-800">{getTotalNewReceived()} units</span></div>
//                   <div className="flex justify-between"><span className="text-slate-500">Still Pending After:</span><span className={`font-bold ${getTotalShortage() > 0 ? "text-orange-600" : "text-emerald-600"}`}>{getTotalShortage()} units</span></div>
//                   <div className="flex justify-between"><span className="text-slate-500">PO Status After Approval:</span><StatusPill status={livePoStatus} /></div>
//                 </div>
//               </div>
//               {receivedItems.some((i) => (i.damagedQty || 0) > 0) && (
//                 <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
//                   <p className="text-xs font-bold text-red-700 mb-1.5 flex items-center gap-1.5"><FiAlertTriangle size={12} /> Damage Tracked:</p>
//                   {receivedItems.filter((i) => (i.damagedQty || 0) > 0).map((item, i) => {
//                     const phys = item.physicalQty ?? item.newReceived ?? 0;
//                     return (
//                       <div key={i} className="flex items-center justify-between text-xs mt-1">
//                         <span className="font-mono font-bold text-red-800">{item.productCode}</span>
//                         <span className="text-red-600">Stock <strong>+{phys}</strong> · <strong>{item.damagedQty} damaged</strong> tracked</span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//               <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                 <FiAlertCircle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
//                 <p className="text-xs text-blue-700">Quantities are pre-filled from the invoice. Edit "Physical" = actual healthy units received. Damaged qty is for tracking only.</p>
//               </div>
//             </div>
//           </Card>

//           <Card>
//             <CardHeader title="Verify Quantities" subtitle={`${getTotalNewReceived()} units to stock · ${receivedItems.length} items`} />
//             <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
//               {pagedItems.map((item) => {
//                 const currentItem = receivedItems.find((r) => r.productCode === item.productCode) || item;
//                 const ordered = currentItem.orderedQty || 0;
//                 const already = currentItem.alreadyReceived || 0;
//                 const thisInv = currentItem.newReceived || 0;
//                 const phys    = currentItem.physicalQty ?? thisInv;
//                 const damagedQty = currentItem.damagedQty || 0;
//                 const totalAfter = already + phys;
//                 const remaining  = Math.max(0, ordered - totalAfter);
//                 const excess     = Math.max(0, totalAfter - ordered);
//                 const itemStatus = getItemStatus(ordered, totalAfter);
//                 const progressPct = ordered > 0 ? Math.min(100, Math.round((totalAfter / ordered) * 100)) : 0;
//                 return (
//                   <div key={currentItem.productCode} className={`p-4 border rounded-lg ${
//                     currentItem._hadIssue && currentItem.issue === "damage"   ? "border-red-400 bg-red-50/30 ring-1 ring-red-300"
//                     : currentItem._hadIssue && currentItem.issue === "shortage" ? "border-orange-400 bg-orange-50/30 ring-1 ring-orange-300"
//                     : currentItem._hadIssue  ? "border-amber-400 bg-amber-50/30"
//                     : itemStatus === "complete" ? "border-emerald-200 bg-emerald-50/30"
//                     : itemStatus === "excess"   ? "border-purple-200 bg-purple-50/30"
//                     : itemStatus === "partial"  ? "border-orange-200 bg-orange-50/30"
//                     : "border-slate-200"
//                   }`}>
//                     <div className="flex items-start gap-3 mb-3">
//                       <FiPackage className="text-slate-400 mt-0.5 flex-shrink-0" size={15} />
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2 flex-wrap">
//                           <p className="text-sm font-bold text-slate-800 font-mono">{currentItem.productCode}</p>
//                           <StatusPill status={itemStatus} />
//                           {currentItem.matchedFromInvoice ? <span className="text-[10px] text-emerald-600 font-bold">✓ Invoice</span> : <span className="text-[10px] text-orange-500 font-bold">⚠ Not in Invoice</span>}
//                           {currentItem._hadIssue && (
//                             <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border uppercase flex items-center gap-1 ${currentItem.issue === "damage" ? "bg-red-100 text-red-700 border-red-300" : currentItem.issue === "shortage" ? "bg-orange-100 text-orange-700 border-orange-300" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
//                               {currentItem.issue === "damage" ? "🔴" : currentItem.issue === "shortage" ? "🟠" : "⚠️"}
//                               Last: {currentItem.issue?.replace("_", " ")}{currentItem._lastDamagedQty > 0 && ` · ${currentItem._lastDamagedQty} dmg`}
//                             </span>
//                           )}
//                         </div>
//                         <p className="text-xs text-slate-500 truncate">{currentItem.description}</p>
//                       </div>
//                     </div>
//                     <div className="grid grid-cols-4 gap-2 mb-2">
//                       <div>
//                         <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Ordered</p>
//                         <div className="h-8 flex items-center px-2 bg-slate-50 border border-slate-200 rounded-lg"><p className="text-sm font-bold text-slate-800">{ordered}</p></div>
//                       </div>
//                       <div>
//                         <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Invoice Qty</p>
//                         <input type="number" value={thisInv} disabled className="w-full h-8 border border-slate-200 rounded-lg px-2 text-sm font-bold text-slate-800 bg-slate-50 cursor-not-allowed" />
//                       </div>
//                       <div>
//                         <p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase">Physical</p>
//                         <input type="number" min="0" value={currentItem.physicalQty ?? thisInv}
//                           onChange={(e) => {
//                             const newPhys = parseFloat(e.target.value) || 0;
//                             const inv = currentItem.newReceived || 0;
//                             const issue = currentItem.issue;
//                             const autoIssue   = !issue && newPhys < inv ? "shortage" : issue;
//                             const autoDamaged = autoIssue === "damage" ? Math.max(0, inv - newPhys) : currentItem.damagedQty;
//                             const autoDetail  = autoIssue === "shortage" ? `Short: ${inv - newPhys} units ` : autoIssue === "damage" ? `Damaged: ${autoDamaged} units ` : autoIssue === "excess" ? `Excess: ${newPhys - inv} units received` : currentItem.issueDetail;
//                             updateItem(currentItem.productCode, { physicalQty: newPhys, issue: autoIssue, issueDetail: autoDetail, damagedQty: autoDamaged });
//                           }}
//                           className={`w-full h-8 border rounded-lg px-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300 ${phys !== thisInv ? "border-orange-300 bg-orange-50 text-orange-700" : "border-indigo-200 bg-indigo-50/40 text-indigo-700"}`}
//                         />
//                         {phys !== thisInv && <p className="text-[9px] text-orange-600 font-bold mt-0.5">⚠ Differs ({thisInv})</p>}
//                       </div>
//                       <div>
//                         <p className="text-[10px] text-red-400 font-bold mb-1 uppercase">Issue</p>
//                         <select value={currentItem.issue || ""}
//                           onChange={(e) => {
//                             const newIssue = e.target.value;
//                             const inv = currentItem.newReceived || 0;
//                             const phys2 = currentItem.physicalQty ?? inv;
//                             const autoDamaged = newIssue === "damage" ? Math.max(0, inv - phys2) : 0;
//                             const autoDetail = newIssue === "damage" ? `Damaged: ${autoDamaged} units (Invoice: ${inv}, Physical: ${phys2})` : newIssue === "shortage" ? `Short: ${inv - phys2} units (Invoice: ${inv}, Physical: ${phys2})` : newIssue === "excess" ? `Excess: ${phys2 - inv} units received` : newIssue === "quality" ? "Quality issue noted" : newIssue === "wrong_item" ? "Wrong item received" : newIssue === "other" ? "Other issue" : "";
//                             updateItem(currentItem.productCode, { issue: newIssue, issueDetail: autoDetail, damagedQty: autoDamaged });
//                           }}
//                           className={`w-full h-8 border rounded-lg px-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-red-300 ${currentItem.issue ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"}`}>
//                           <option value="">— None</option>
//                           <option value="damage">🔴 Damage</option>
//                           <option value="shortage">🟠 Shortage</option>
//                           <option value="excess">🟣 Excess</option>
//                           <option value="quality">🟡 Quality</option>
//                           <option value="wrong_item">🔵 Wrong Item</option>
//                           <option value="other">⚪ Other</option>
//                         </select>
//                       </div>
//                     </div>
//                     {currentItem.issue === "damage" && (
//                       <div className="mt-1 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
//                         <div className="flex items-center gap-3">
//                           <div className="flex-1">
//                             <p className="text-[10px] text-red-600 font-bold mb-1 uppercase">Damaged Qty <span className="normal-case font-normal text-red-400">(tracking only)</span></p>
//                             <input type="number" min="0" value={currentItem.damagedQty || 0}
//                               onChange={(e) => {
//                                 const dmg = parseFloat(e.target.value) || 0;
//                                 const inv = currentItem.newReceived || 0;
//                                 const phys2 = currentItem.physicalQty ?? inv;
//                                 updateItem(currentItem.productCode, { damagedQty: dmg, issueDetail: `Damaged: ${dmg} units (Invoice: ${inv}, Physical: ${phys2})` });
//                               }}
//                               className="w-full h-9 border-2 border-red-300 bg-white rounded-lg px-3 text-sm font-black text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
//                               placeholder="0"
//                             />
//                           </div>
//                           <div className="flex-shrink-0 text-right">
//                             <p className="text-[10px] text-slate-400 mb-1">Stock added</p>
//                             <p className="text-sm font-black text-emerald-600">{phys} <span className="text-xs font-normal text-slate-400">{currentItem.unit}</span></p>
//                           </div>
//                         </div>
//                         {damagedQty > 0 && <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1"><FiAlertTriangle size={10} />Stock +{phys} units. {damagedQty} damaged units tracked for vendor follow-up.</p>}
//                       </div>
//                     )}
//                     {currentItem.issue && currentItem.issue !== "damage" && (
//                       <div className="mt-1 mb-2">
//                         <p className="text-[10px] text-red-500 font-bold mb-1">Issue Details</p>
//                         <textarea rows={2} value={currentItem.issueDetail || ""}
//                           placeholder={currentItem.issue === "shortage" ? "e.g. Invoice says 100 but only 85 received..." : currentItem.issue === "excess" ? "e.g. 10 extra units received..." : currentItem.issue === "quality" ? "e.g. Surface finish not acceptable..." : currentItem.issue === "wrong_item" ? "e.g. Received FRC-110-2 instead of FRC-110-1..." : "Describe the issue..."}
//                           onChange={(e) => updateItem(currentItem.productCode, { issueDetail: e.target.value })}
//                           className="w-full border border-red-200 bg-red-50/50 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
//                         />
//                       </div>
//                     )}
//                     <div>
//                       <div className="flex justify-between text-[10px] text-slate-400 mb-1">
//                         <span>{totalAfter}/{ordered} {currentItem.unit}{damagedQty > 0 && <span className="text-red-400 ml-1">({damagedQty} damaged tracked)</span>}</span>
//                         <span>{progressPct}%</span>
//                       </div>
//                       <div className="w-full bg-slate-100 rounded-full h-1.5">
//                         <div className={`h-1.5 rounded-full transition-all ${itemStatus === "complete" ? "bg-emerald-500" : itemStatus === "excess" ? "bg-purple-500" : itemStatus === "partial" ? "bg-orange-500" : "bg-blue-300"}`}
//                           style={{ width: `${Math.min(progressPct, 100)}%` }} />
//                       </div>
//                     </div>
//                     {itemStatus === "partial" && remaining > 0 && <p className="text-[11px] text-orange-600 font-bold mt-1.5 flex items-center gap-1"><FiAlertTriangle size={10} /> {remaining} {currentItem.unit} still pending</p>}
//                     {itemStatus === "excess" && <p className="text-[11px] text-purple-600 font-bold mt-1.5 flex items-center gap-1"><FiAlertTriangle size={10} /> {excess} {currentItem.unit} excess received</p>}
//                   </div>
//                 );
//               })}
//               {totalPages > 1 && (
//                 <div className="flex items-center justify-between pt-3 border-t border-slate-100">
//                   <p className="text-xs text-slate-400">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, receivedItems.length)} of {receivedItems.length} items</p>
//                   <div className="flex items-center gap-1">
//                     <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100">← Prev</button>
//                     {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
//                       <button key={pg} onClick={() => setCurrentPage(pg)} className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${pg === currentPage ? "bg-emerald-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-600"}`}>{pg}</button>
//                     ))}
//                     <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100">Next →</button>
//                   </div>
//                 </div>
//               )}
//               {getTotalShortage() > 0 && <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg"><p className="text-xs font-bold text-orange-700 flex items-center gap-1.5"><FiAlertTriangle size={12} /> Shortage — PO will be: PARTIAL</p><p className="text-xs text-orange-600 mt-1">{getTotalShortage()} units pending. Another invoice needed later.</p></div>}
//               {livePoStatus === "received" && getTotalShortage() === 0 && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg"><p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5"><FiCheck size={12} /> All matched — PO will be: COMPLETE</p></div>}
//               {livePoStatus === "excess" && <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg"><p className="text-xs font-bold text-purple-700 flex items-center gap-1.5"><FiAlertTriangle size={12} /> Excess received — PO will be: EXCESS</p></div>}
//             </div>
//           </Card>
//         </div>
//       )}

//       {/* ── SO Step 3 ── */}
//       {step === 3 && qcMode === "so" && selectedSO && (
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           <Card>
//             <CardHeader title="Quality Check" subtitle="Final verification before approving SO for dispatch" />
//             <div className="p-6 space-y-5">
//               <div>
//                 <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Quality Check Result</p>
//                 <div className="grid grid-cols-1 gap-2">
//                   {[
//                     { value: "passed", icon: "✅", label: "Passed", sub: liveSoStatus === "complete" ? "All items ready — moves to Ready for Dispatch" : "Approved with shortage — stays in QC", border: "border-emerald-400 bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-300" },
//                     { value: "passed_with_issues", icon: "⚠️", label: "Passed with Issues", sub: "Approved but issues noted", border: "border-amber-400 bg-amber-50", text: "text-amber-700", ring: "ring-amber-300" },
//                     { value: "failed", icon: "❌", label: "Failed", sub: "SO rejected — stays in QC list", border: "border-red-400 bg-red-50", text: "text-red-700", ring: "ring-red-300" },
//                   ].map((opt) => (
//                     <button key={opt.value} type="button" onClick={() => setQualityCheck(opt.value)}
//                       className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${qualityCheck === opt.value ? `${opt.border} ${opt.text} ring-2 ${opt.ring} font-bold` : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
//                       <span className="text-xl flex-shrink-0">{opt.icon}</span>
//                       <div><p className="text-sm font-bold">{opt.label}</p><p className="text-[11px] opacity-70">{opt.sub}</p></div>
//                       {qualityCheck === opt.value && <FiCheck className="ml-auto flex-shrink-0" size={16} />}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//               <div>
//                 <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase">Remarks <span className="text-slate-400 normal-case">(optional)</span></p>
//                 <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
//                   placeholder={qualityCheck === "failed" ? "Reason for rejection..." : "Any additional notes..."}
//                   className="w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none border-slate-200 focus:ring-violet-300" />
//               </div>
//               {liveSoStatus === "complete" && qualityCheck !== "failed" ? (
//                 <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
//                   <FiCheck size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
//                   <p className="text-xs text-emerald-800">SO will move to <strong>Ready for Dispatch</strong>. ✅</p>
//                 </div>
//               ) : qualityCheck === "failed" ? (
//                 <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
//                   <FiAlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
//                   <p className="text-xs text-red-700">SO <strong>rejected</strong> — stays in QC list.</p>
//                 </div>
//               ) : (
//                 <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
//                   <FiAlertTriangle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
//                   <p className="text-xs text-orange-700">Shortage exists — SO will <strong>stay in QC list</strong> until stock available.</p>
//                 </div>
//               )}
//             </div>
//           </Card>
//           <Card>
//             <CardHeader title="Confirm Summary" subtitle="Review before final approval" />
//             <div className="p-6 space-y-4">
//               <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs">
//                 <div className="flex justify-between"><span className="text-slate-500">SO Number</span><span className="font-black text-slate-800">{selectedSO.soNumber}</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-semibold text-slate-800">{selectedSO.customer}</span></div>
//                 <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="text-slate-500">Units ready for dispatch</span><span className="font-black text-slate-800 text-sm">{soTotalReady} units</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">Shortage</span><span className={`font-bold ${soTotalShortage > 0 ? "text-orange-600" : "text-emerald-600"}`}>{soTotalShortage} units</span></div>
//                 <div className="flex justify-between"><span className="text-slate-500">SO Status After</span><StatusPill status={liveSoStatus === "complete" && qualityCheck !== "failed" ? "ready" : "partial"} /></div>
//               </div>
//               <div>
//                 <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Item Breakdown</p>
//                 <div className="space-y-1.5 max-h-64 overflow-y-auto">
//                   {soItems.map((item, i) => {
//                     const ready = item.readyQty ?? 0;
//                     const st = getSoItemStatus(item);
//                     return (
//                       <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${(item.damagedQty || 0) > 0 ? "bg-red-50 border border-red-100" : item.issue ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
//                         <div className="flex-1">
//                           <span className="font-bold font-mono text-slate-800">{item.productCode}</span>
//                           {item.issue && <span className="ml-2 text-orange-500 capitalize font-bold">⚠ {item.issue.replace("_", " ")}{(item.damagedQty || 0) > 0 && <span className="text-red-600 ml-1">({item.damagedQty} dmg)</span>}</span>}
//                         </div>
//                         <div className="flex items-center gap-2"><span className="text-violet-600">Ready: <strong>{ready}</strong></span><StatusPill status={st} /></div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>
//           </Card>
//         </div>
//       )}

//       {/* ── PO Step 3 ── */}
//       {step === 3 && qcMode === "po" && selectedPO && (
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           <Card>
//             <CardHeader title="Quality Check" subtitle="Final verification before approving material receipt" />
//             <div className="p-6 space-y-5">
//               <div>
//                 <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Quality Check Result</p>
//                 <div className="grid grid-cols-1 gap-2">
//                   {[
//                     { value: "passed", icon: "✅", label: "Passed", sub: "All items good — full approval", border: "border-emerald-400 bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-300" },
//                     { value: "passed_with_issues", icon: "⚠️", label: "Passed with Issues", sub: "Approved but minor issues noted", border: "border-amber-400 bg-amber-50", text: "text-amber-700", ring: "ring-amber-300" },
//                     { value: "failed", icon: "❌", label: "Failed", sub: "Items rejected — no stock update", border: "border-red-400 bg-red-50", text: "text-red-700", ring: "ring-red-300" },
//                   ].map((opt) => (
//                     <button key={opt.value} type="button" onClick={() => setQualityCheck(opt.value)}
//                       className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${qualityCheck === opt.value ? `${opt.border} ${opt.text} ring-2 ${opt.ring} font-bold` : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
//                       <span className="text-xl flex-shrink-0">{opt.icon}</span>
//                       <div><p className="text-sm font-bold">{opt.label}</p><p className="text-[11px] opacity-70">{opt.sub}</p></div>
//                       {qualityCheck === opt.value && <FiCheck className="ml-auto flex-shrink-0" size={16} />}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//               <div>
//                 <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase">Remarks <span className="text-slate-400 normal-case">(optional)</span></p>
//                 <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
//                   placeholder={qualityCheck === "failed" ? "Describe the reason for rejection..." : qualityCheck === "passed_with_issues" ? "Describe the issues observed..." : "Any additional notes..."}
//                   className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none transition-colors ${qualityCheck === "failed" ? "border-red-200 bg-red-50/30 focus:ring-red-300" : qualityCheck === "passed_with_issues" ? "border-amber-200 bg-amber-50/30 focus:ring-amber-300" : "border-slate-200 focus:ring-emerald-300"}`} />
//               </div>
//               {receivedItems.some((i) => i.issue) && (
//                 <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
//                   <p className="text-xs font-bold text-amber-700 mb-2">⚠️ Items with Issues Noted:</p>
//                   {receivedItems.filter((i) => i.issue).map((item, i) => (
//                     <div key={i} className="flex items-start gap-2 text-xs text-amber-800 mt-1">
//                       <span className="font-bold font-mono flex-shrink-0">{item.productCode}</span>
//                       <span className="text-amber-600 capitalize">— {item.issue.replace("_", " ")}{(item.damagedQty || 0) > 0 && <span className="text-red-600 font-bold ml-1">({item.damagedQty} tracked)</span>}</span>
//                     </div>
//                   ))}
//                 </div>
//               )}
//               {qualityCheck === "failed" ? (
//                 <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
//                   <FiAlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
//                   <p className="text-xs text-red-700"><strong>Stock will NOT be updated.</strong></p>
//                 </div>
//               ) : (
//                 <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
//                   <FiCheck size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
//                   <p className="text-xs text-emerald-800">After approval: <strong>stock will be updated immediately</strong>.</p>
//                 </div>
//               )}
//             </div>
//           </Card>
//           <Card>
//             <CardHeader title="Confirm Summary" subtitle="Review before final approval" />
//             <div className="p-6 space-y-4">
//               <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs">
//                 {[
//                   { label: "PO Number", value: selectedPO.poNumber, bold: true },
//                   { label: "Invoice No", value: invoiceNo, bold: true },
//                   { label: "Vendor", value: selectedPO.vendor },
//                   { label: "Invoice Date", value: invoiceDate ? new Date(invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
//                 ].map(({ label, value, bold }) => (
//                   <div key={label} className="flex justify-between items-center">
//                     <span className="text-slate-500">{label}</span>
//                     <span className={`${bold ? "font-black" : "font-semibold"} text-slate-800`}>{value}</span>
//                   </div>
//                 ))}
//                 <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
//                   <span className="text-slate-500">Units added to stock</span>
//                   <span className="font-black text-slate-800 text-sm">{getTotalNewReceived()} units</span>
//                 </div>
//                 <div className="flex justify-between items-center"><span className="text-slate-500">PO Status after</span><StatusPill status={livePoStatus} /></div>
//               </div>
//               <div>
//                 <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Item Breakdown</p>
//                 <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
//                   {receivedItems.map((item, i) => {
//                     const phys = item.physicalQty ?? item.newReceived ?? 0;
//                     const inv  = item.newReceived ?? 0;
//                     const damaged = item.damagedQty || 0;
//                     const differs = phys !== inv;
//                     return (
//                       <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${damaged > 0 ? "bg-red-50 border border-red-100" : item.issue ? "bg-amber-50 border border-amber-100" : differs ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
//                         <div className="flex-1 min-w-0">
//                           <span className="font-bold font-mono text-slate-800">{item.productCode}</span>
//                           {item.issue && <span className="ml-2 text-red-500 capitalize font-bold">⚠ {item.issue.replace("_", " ")}{damaged > 0 && <span className="ml-1">({damaged} tracked)</span>}</span>}
//                         </div>
//                         <div className="flex items-center gap-2 flex-shrink-0">
//                           <span className="text-emerald-600">Stock: <strong>+{phys}</strong></span>
//                           {differs && <span className="text-amber-600">Inv: <strong>{inv}</strong></span>}
//                           <StatusPill status={getItemStatus(item.orderedQty || 0, (item.alreadyReceived || 0) + phys)} />
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>
//           </Card>
//         </div>
//       )}

//       {/* ── SO Step 4 ── */}
//       {step === 4 && qcMode === "so" && selectedSO && (
//         <Card>
//           <div className="p-12 text-center">
//             <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${liveSoStatus === "complete" ? "bg-emerald-100" : "bg-amber-100"}`}>
//               {liveSoStatus === "complete" ? <FiCheck size={32} className="text-emerald-600" /> : <FiAlertTriangle size={32} className="text-amber-600" />}
//             </div>
//             <h3 className="text-lg font-black text-slate-800 mb-2">
//               {liveSoStatus === "complete" ? "SO QC Approved — Ready for Dispatch! 🚀" : "SO QC Done — Partial Shortage"}
//             </h3>
//             <p className="text-sm text-slate-600 mb-2">{selectedSO.soNumber} — {selectedSO.customer}</p>
//             {liveSoStatus === "complete" ? (
//               <p className="text-xs text-violet-600 font-bold mb-6">✅ Status updated to "Ready for Dispatch"</p>
//             ) : (
//               <p className="text-xs text-orange-600 font-bold mb-6">⚠️ Shortage noted — SO stays in QC list until stock available</p>
//             )}
//             <div className="space-y-1.5 text-sm text-slate-600 mb-8">
//               <p>✅ SO <strong>{selectedSO.soNumber}</strong> QC completed</p>
//               <p>✅ <strong>{soTotalReady} units</strong> verified and ready</p>
//               {soTotalShortage > 0 && <p className="text-orange-600 font-bold">⚠️ <strong>{soTotalShortage} units</strong> short — pending stock</p>}
//               {soItems.some((i) => (i.damagedQty || 0) > 0) && (
//                 <p className="text-red-600 font-bold">🔴 Damage badge set on Stock Alerts page</p>
//               )}
//             </div>
//             <div className="flex items-center justify-center gap-3">
//               <BtnSecondary onClick={async () => {
//                 setStep(1); setQcMode("po"); setSelectedSO(null); setSoItems([]);
//                 setQualityCheck("passed"); setRemarks(""); setCurrentPage(1);
//                 await fetchPendingSalesOrders();
//               }}>Review Another SO</BtnSecondary>
//               <BtnPrimary onClick={() => navigate("/store/dashboard")}>Go to Dashboard</BtnPrimary>
//             </div>
//           </div>
//         </Card>
//       )}

//       {/* ── PO Step 4 ── */}
//       {step === 4 && (qcMode === "po" || !selectedSO) && selectedPO && (
//         <Card>
//           <div className="p-12 text-center">
//             <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
//               <FiCheck size={32} className="text-emerald-600" />
//             </div>
//             <h3 className="text-lg font-black text-slate-800 mb-2">QC Approved & Stock Updated!</h3>
//             <p className="text-sm text-slate-600 mb-2">{selectedPO.poNumber} — {selectedPO.vendor}</p>
//             <p className="text-xs text-indigo-600 font-bold mb-6">✅ Sales team has been notified</p>
//             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 mb-6">
//               <span className="text-xs text-slate-500">PO Status:</span><StatusPill status={livePoStatus} />
//             </div>
//             <div className="space-y-1.5 text-sm text-slate-600 mb-8">
//               <p>✅ Invoice <strong>{invoiceNo}</strong> approved</p>
//               <p>✅ Stock updated with <strong>{getTotalNewReceived()} units</strong></p>
//               <p>✅ Quality check: <strong>{qualityCheck}</strong></p>
//               {getTotalShortage() > 0 && <p className="text-orange-600 font-bold">⚠️ {getTotalShortage()} units still pending — next invoice required</p>}
//             </div>
//             <div className="max-w-2xl mx-auto mb-8">
//               <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-left">
//                 <p className="text-xs font-bold text-slate-700 mb-3">📦 Stock Added:</p>
//                 <div className="space-y-2">
//                   {receivedItems.filter((i) => (i.physicalQty ?? i.newReceived ?? 0) > 0).map((item, idx) => {
//                     const phys = item.physicalQty ?? item.newReceived ?? 0;
//                     const damaged = item.damagedQty || 0;
//                     const total = (item.alreadyReceived || 0) + phys;
//                     return (
//                       <div key={idx} className="flex items-center justify-between text-xs">
//                         <span className="text-slate-600 font-mono">{item.productCode}</span>
//                         <div className="flex items-center gap-2">
//                           <span className="text-slate-400">{total}/{item.orderedQty}</span>
//                           <span className="font-bold text-emerald-600">+{phys} {item.unit}</span>
//                           {damaged > 0 && <span className="text-red-500 font-bold text-[10px]">({damaged} damaged tracked)</span>}
//                           <StatusPill status={getItemStatus(item.orderedQty || 0, total)} />
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>
//             <div className="flex items-center justify-center gap-3 flex-wrap">
//               <BtnSecondary onClick={async () => {
//                 localStorage.removeItem("storeQcDraft");
//                 setStep(1); setQcMode("po"); setSelectedInvoice(null); setSelectedPO(null); setReceivedItems([]);
//                 setSelectedSO(null); setSoItems([]);
//                 setInvoiceNo(""); setInvoiceDate(""); setQualityCheck("passed"); setRemarks(""); setCurrentPage(1);
//                 await fetchPendingInvoices(); await fetchPendingSalesOrders();
//               }}>Review Another</BtnSecondary>
//               <BtnPrimary onClick={() => { localStorage.removeItem("storeQcDraft"); navigate("/store/dashboard"); }}>Go to Dashboard</BtnPrimary>
//             </div>
//           </div>
//         </Card>
//       )}

//       {step === 2 && (
//         <div className="flex justify-end gap-3">
//           <BtnSecondary onClick={() => {
//             setStep(1);
//             if (qcMode === "so") { setSelectedSO(null); setSoItems([]); setQcMode("po"); }
//             else { setSelectedInvoice(null); setSelectedPO(null); setReceivedItems([]); }
//           }}>← Back</BtnSecondary>
//           <BtnPrimary onClick={() => setStep(3)}>Next: Quality Check →</BtnPrimary>
//         </div>
//       )}
//       {step === 3 && (
//         <div className="flex justify-end gap-3">
//           <BtnSecondary onClick={() => setStep(2)}>← Back</BtnSecondary>
//           {qcMode === "so" ? (
//             <button onClick={handleSOSubmit} disabled={uploading}
//               className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center gap-2 ${qualityCheck === "failed" ? "bg-red-600 hover:bg-red-700" : liveSoStatus === "complete" ? "bg-violet-600 hover:bg-violet-700" : "bg-amber-500 hover:bg-amber-600"}`}>
//               {uploading ? (<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</>)
//                 : qualityCheck === "failed" ? "❌ Reject SO"
//                 : liveSoStatus === "complete" ? "✅ Approve — Ready for Dispatch"
//                 : "⚠️ Approve with Shortage"}
//             </button>
//           ) : (
//             <button onClick={handleSubmit} disabled={uploading}
//               className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center gap-2 ${qualityCheck === "failed" ? "bg-red-600 hover:bg-red-700" : qualityCheck === "passed_with_issues" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
//               {uploading ? (<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</>) : qualityCheck === "failed" ? "❌ Reject & Notify Sales" : qualityCheck === "passed_with_issues" ? "⚠️ Approve with Issues & Update Stock" : "✅ Approve & Update Stock"}
//             </button>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheck,
  FiPackage,
  FiAlertTriangle,
  FiClock,
  FiAlertCircle,
  FiShield,
  FiShoppingCart,
  FiFileText,
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

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return isoStr; }
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return isoStr; }
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
    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${map[n] || map.pending}`}>
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
      damagedQty > 0 ? `Damage: ${damagedQty} units (tracked)` : "",
      item.issue && item.issue !== "damage" ? `Issue: ${item.issue}` : "",
      item.issueDetail ? `— ${item.issueDetail}` : "",
    ].filter(Boolean).join(" | ");
    const q = query(collection(db, "stock"), where("productCode", "==", key));
    const snap = await getDocs(q);
    if (snap.empty) {
      const newDocDamagedQty = isReplacement ? 0 : damagedQty;
      await addDoc(collection(db, "stock"), {
        productCode: key, description: item.description || "",
        hsnSac: item.hsnSac || "", unit: item.unit || "pcs",
        available: qty, reserved: 0, backorder: 0, excess: 0, minLevel: 0,
        lastUpdated: now, damagedQty: newDocDamagedQty, hasIssue: newDocDamagedQty > 0,
        ledger: [{ type: "IN", qty, ref: poNumber, by: vendor, balance: qty, date: now, remarks: remarksStr }],
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
      const newDamagedQty = isReplacement ? 0 : parseFloat(sdata.damagedQty || 0) + damagedQty;
      await updateDoc(doc(db, "stock", sd.id), {
        available: Math.max(0, netAvail), backorder: remainingBackorder, excess: excessQty,
        damagedQty: newDamagedQty, hasIssue: newDamagedQty > 0, lastUpdated: now,
        ledger: [...(sdata.ledger || []), {
          type: "IN", qty, ref: poNumber, by: vendor,
          balance: Math.max(0, netAvail), date: now, remarks: remarksStr,
        }],
      });
    }
  }
}

function isSalesOrder(type) {
  if (!type) return false;
  const t = type.trim().toLowerCase().replace(/[\s_\-\.]/g, "");
  return ["salesorder", "so", "workorder", "wo", "sales", "sales_order"].includes(t);
}

export default function StoreVerifyQuality() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [pendingSalesOrders, setPendingSalesOrders] = useState([]);
  const [loadingSO, setLoadingSO] = useState(true);
  const [qcMode, setQcMode] = useState("po");
  const [selectedSO, setSelectedSO] = useState(null);
  const [soItems, setSoItems] = useState([]);
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

  // ✅ CHANGE 2: SO items pagination
  const [soItemsPage, setSoItemsPage] = useState(1);
  const SO_ITEMS_PER_PAGE = 5;

  // useEffect(() => {
  //   const saved = localStorage.getItem("storeQcDraft");
  //   if (!saved) return;
  //   const verifyAndRestore = async () => {
  //     try {
  //       const d = JSON.parse(saved);
  //       if (!d.step || d.step <= 1 || !d.selectedInvoice?.id) { localStorage.removeItem("storeQcDraft"); return; }
  //       const invSnap = await getDoc(doc(db, "excelupload", d.selectedInvoice.id));
  //       if (!invSnap.exists()) { localStorage.removeItem("storeQcDraft"); return; }
  //       const invData = invSnap.data();
  //       if (invData.storeQcStatus === "approved") { localStorage.removeItem("storeQcDraft"); return; }
  //       setStep(d.step); setInvoiceNo(d.invoiceNo || ""); setInvoiceDate(d.invoiceDate || "");
  //       setQualityCheck(d.qualityCheck || "passed"); setRemarks(d.remarks || "");
  //       setSelectedInvoice(d.selectedInvoice || null); setSelectedPO(d.selectedPO || null);
  //       setReceivedItems(d.receivedItems || []); setCurrentPage(d.currentPage || 1);
  //     } catch { localStorage.removeItem("storeQcDraft"); }
  //   };
  //   verifyAndRestore();
  // }, []);

  useEffect(() => {
  const saved = localStorage.getItem("storeQcDraft");
  if (!saved) return;
  try {
    const d = JSON.parse(saved);
    if (!d.step || d.step <= 1 || !d.selectedInvoice?.id) {
      localStorage.removeItem("storeQcDraft");
    }
  } catch {
    localStorage.removeItem("storeQcDraft");
  }
}, []);

  useEffect(() => {
    if (step === 1 || step === 4) { localStorage.removeItem("storeQcDraft"); return; }
    const data = { step, invoiceNo, invoiceDate, qualityCheck, remarks, selectedInvoice, selectedPO, receivedItems, currentPage };
    localStorage.setItem("storeQcDraft", JSON.stringify(data));
  }, [step, receivedItems, qualityCheck, remarks, currentPage, invoiceNo, invoiceDate]);

  const fetchPendingInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const snap = await getDocs(query(collection(db, "excelupload"), orderBy("createdAt", "desc")));
      const allRaw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const all = allRaw.filter((d) => {
        const t = (d.type || "").trim().toUpperCase();
        return t === "INVOICE" && d.storeQcStatus !== "approved" && !!d.linkedPoId;
      });
      const seenIds = new Set();
      const deduped = [];
      for (const inv of all) {
        if (!seenIds.has(inv.id)) { seenIds.add(inv.id); deduped.push(inv); }
      }
      setPendingInvoices(deduped);
    } catch (err) { console.error("Fetch invoices error:", err); }
    finally { setLoadingInvoices(false); }
  };

  const fetchPendingSalesOrders = async () => {
    setLoadingSO(true);
    try {
      const snap = await getDocs(query(collection(db, "excelupload"), orderBy("createdAt", "desc")));
      const allSO = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const soList = allSO.filter((d) => {
        const isSOType = isSalesOrder(d.type);
        const soSt = d.soStatus || d.status || "";
        const isWaitingQc = soSt === "waiting_for_qc" || soSt === "waitingforqc" || soSt === "waiting for qc";
        return isSOType && isWaitingQc;
      });
      setPendingSalesOrders(soList);
    } catch (err) { console.error("Fetch SO error:", err); }
    finally { setLoadingSO(false); }
  };

  useEffect(() => { fetchPendingInvoices(); fetchPendingSalesOrders(); }, []);

  const handleSelectSO = async (so) => {
    setLoadingSO2(true);
    try {
      const soSnap = await getDoc(doc(db, "excelupload", so.id));
      if (!soSnap.exists()) { alert("SO not found."); await fetchPendingSalesOrders(); setLoadingSO2(false); return; }
      const soData = soSnap.data();
      if (soData.soStatus === "ready_for_dispatch" || soData.soStatus === "complete") {
        alert("⚠️ This SO has already been approved. Refreshing list...");
        await fetchPendingSalesOrders(); setLoadingSO2(false); return;
      }
      const isReopen = soData.soStatus === "waiting_for_qc" && (soData.soQcIssues?.length > 0);
      const soItemsRaw = soData.items || [];
      const mappedItems = await Promise.all(
        soItemsRaw.map(async (item) => {
          const productCode = item.productCode?.toString().trim();
          let stockAvailable = 0, stockDocId = null;
          if (productCode) {
            const stockQ = query(collection(db, "stock"), where("productCode", "==", productCode));
            const stockSnap = await getDocs(stockQ);
            if (!stockSnap.empty) {
              stockAvailable = Math.max(0, stockSnap.docs[0].data().available || 0);
              stockDocId = stockSnap.docs[0].id;
            }
          }
          const orderedQty = item.quantity || item.orderedQty || 0;
          const lastIssue = isReopen ? (item.soQcIssue || "") : "";
          const lastIssueDetail = isReopen ? (item.soQcIssueDetail || "") : "";
          const savedReadyQty = item.soQcReadyQty ?? null;
          const defaultReadyQty = Math.min(orderedQty, stockAvailable);
          const readyQty = isReopen && savedReadyQty !== null ? savedReadyQty : defaultReadyQty;
          return {
            ...item, orderedQty, stockAvailable, stockDocId, readyQty,
            // ✅ FIX 5: damagedQty preserve from last QC
            damagedQty:     isReopen ? (item.damagedQty || 0) : 0,
            issue:          lastIssue,
            issueDetail:    lastIssueDetail,
            _hadIssue:      isReopen && !!lastIssue,
            _lastIssue:     lastIssue,
            _lastReadyQty:  savedReadyQty,
          };
        })
      );
      const header = soData.excelHeader || soData.invoiceHeader || {};
      setSelectedSO({
        id: soData.id || so.id,
        soNumber: header.reference || soData.invoiceNo || soData.woNumber || `SO-${so.id.slice(0, 8).toUpperCase()}`,
        customer: soData.customer || header.consignee || "—",
        deliveryDate: soData.deliveryDate || header.dated || "",
        createdAt: soData.createdAt || null,
        items: soItemsRaw,
        soStatus: soData.soStatus,
      });
      setSoItems(mappedItems);
      setQualityCheck("passed"); setRemarks(""); setQcMode("so"); setCurrentPage(1); setSoItemsPage(1); setStep(2);
    } catch (err) { console.error("Load SO error:", err); alert("Error loading SO: " + err.message); }
    finally { setLoadingSO2(false); }
  };

  const updateSoItem = (productCode, changes) => {
    setSoItems((prev) => prev.map((item) => item.productCode === productCode ? { ...item, ...changes } : item));
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

  const soTotalReady    = soItems.reduce((s, i) => s + (i.readyQty ?? 0), 0);
  const soTotalShortage = soItems.reduce((s, i) => s + Math.max(0, (i.orderedQty || 0) - (i.readyQty ?? 0)), 0);

  // ✅ FIX 2: handleSOSubmit — stock document ma damagedQty write karo
  const handleSOSubmit = async () => {
    setUploading(true);
    try {
      const now = new Date().toISOString();
      const hasIssues  = soItems.some((i) => i.issue && i.issue !== "");
      const allComplete = soItems.every((i) => getSoItemStatus(i) === "complete");

      // ✅ FIX 5: damagedQty + damageResolved include karo
      const updatedItems = soItems.map((item) => ({
        ...item,
        soQcReadyQty:    item.readyQty    ?? 0,
        soQcIssue:       item.issue       || "",
        soQcIssueDetail: item.issueDetail || "",
        soQcStatus:      getSoItemStatus(item),
        damagedQty:      item.damagedQty  || 0,
        damageResolved:  false,
      }));

      const newSoStatus =
        qualityCheck === "failed"         ? "waiting_for_qc"      :
        allComplete && !hasIssues         ? "ready_for_dispatch"  :
                                            "partial_approved";   // ✅ FIX: shortage approved → unlock sales invoice upload

      await updateDoc(doc(db, "excelupload", selectedSO.id), {
        items:            updatedItems,
        soStatus:         newSoStatus,
        soQcStatus:       allComplete && qualityCheck !== "failed" ? "approved" : "issues",
        soQcApprovedAt:   now,
        soQcApprovedBy:   "Store Team",
        soQcRemarks:      remarks,
        soQcIssues:       soItems.filter((i) => i.issue).map((i) => ({
          productCode: i.productCode,
          issue:       i.issue,
          detail:      i.issueDetail,
          shortage:    Math.max(0, (i.orderedQty || 0) - (i.readyQty ?? 0)),
          damagedQty:  i.damagedQty || 0,
        })),
        qualityCheck:     qualityCheck,
        remarks,
      });

      // ✅ FIX 2: Stock documents ma damagedQty write karo — badge show thase
      for (const item of soItems) {
        const dmgQty = parseFloat(item.damagedQty || 0);
        if (!item.productCode) continue;
        const stockQ    = query(collection(db, "stock"), where("productCode", "==", item.productCode));
        const stockSnap = await getDocs(stockQ);
        if (stockSnap.empty) continue;
        const stockDocRef = doc(db, "stock", stockSnap.docs[0].id);
        if (dmgQty > 0) {
          // 🔴 Damage set — badge show thase SalesStock page par
          await updateDoc(stockDocRef, {
            damagedQty:   dmgQty,
            hasSOPending: true,
            lastQCDate:   now,
          });
        } else if (newSoStatus === "ready_for_dispatch") {
          // ✅ Fully approved, no damage — badges clear karo
          await updateDoc(stockDocRef, {
            damagedQty:   0,
            hasSOPending: false,
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

  const handleSelectInvoice = async (invoice) => {
    setLoadingPO(true);
    try {
      const freshInvSnap = await getDoc(doc(db, "excelupload", invoice.id));
      if (!freshInvSnap.exists()) { alert("Invoice not found."); await fetchPendingInvoices(); setLoadingPO(false); return; }
      const freshInvData = freshInvSnap.data();
      if (freshInvData?.storeQcStatus === "approved") {
        alert("⚠️ This invoice was already fully approved. Refreshing list...");
        await fetchPendingInvoices(); setLoadingPO(false); return;
      }
      if (!invoice.linkedPoId) { alert("This invoice has no linked PO ID."); setLoadingPO(false); return; }
      const poSnap = await getDoc(doc(db, "excelupload", invoice.linkedPoId));
      if (!poSnap.exists()) { alert(`Linked PO not found: ${invoice.linkedPoId}`); setLoadingPO(false); return; }
      const poData = { id: poSnap.id, ...poSnap.data() };
      const po = {
        id: poData.id,
        poNumber: invoice.linkedPoNo || poData.woNumber || poData.excelHeader?.voucherNo || poData.id.slice(0, 8).toUpperCase(),
        vendor: invoice.vendor || poData.customer || poData.excelHeader?.supplier || "—",
        date: poData.excelHeader?.dated || "",
        status: poData.poStatus || "ordered",
        createdAt: poData.createdAt || null,
        items: (poData.items || []).map((item) => ({
          ...item, orderedQty: item.orderedQty || item.quantity || 0,
          totalReceivedQty: item.totalReceivedQty || 0, unit: item.unit || "pcs",
        })),
      };
      setSelectedPO(po); setSelectedInvoice(invoice);
      setInvoiceNo(invoice.invoiceNo || ""); setInvoiceDate(invoice.invoiceDate || "");
      const invItems = invoice.items || [];
      const isReopen = invoice.storeQcStatus === "approved_with_issues";
      const mapped = po.items.map((poItem) => {
        const invItem = invItems.find((i) => i.productCode?.toLowerCase().trim() === poItem.productCode?.toLowerCase().trim());
        const alreadyReceived = poItem.totalReceivedQty || 0;
        const orderedQty = poItem.orderedQty || poItem.quantity || 0;
        let newReceived = isReopen ? Math.max(0, orderedQty - alreadyReceived)
          : invItem ? invItem.newReceived || invItem.invoiceQty || 0 : 0;
        const lastIssue       = isReopen ? (invItem?.issue       || "") : "";
        const lastIssueDetail = isReopen ? (invItem?.issueDetail || "") : "";
        const lastDamagedQty  = isReopen ? (invItem?.damagedQty  || 0)  : 0;
        return {
          ...poItem, alreadyReceived, newReceived, orderedQty,
          matchedFromInvoice: !!invItem, physicalQty: newReceived,
          issue: lastIssue, issueDetail: lastIssueDetail, damagedQty: 0,
          _lastDamagedQty: lastDamagedQty, _hadIssue: isReopen && !!lastIssue,
        };
      });
      setReceivedItems(mapped); setCurrentPage(1); setQualityCheck("passed"); setRemarks(""); setStep(2);
    } catch (err) { console.error("Load PO error:", err); alert("Error loading PO: " + err.message); }
    finally { setLoadingPO(false); }
  };

  const updateItem = (productCode, changes) => {
    setReceivedItems((prev) => prev.map((item) => item.productCode === productCode ? { ...item, ...changes } : item));
  };

  const getUsableQty = (item) => item.physicalQty ?? item.newReceived ?? 0;
  const getTotalNewReceived = () => receivedItems.reduce((s, i) => s + (i.physicalQty ?? i.newReceived ?? 0), 0);
  const getTotalShortage = () => receivedItems.reduce((sum, item) => {
    const total = (item.alreadyReceived || 0) + getUsableQty(item);
    return sum + Math.max(0, (item.orderedQty || 0) - total);
  }, 0);

  const livePoStatus = (() => {
    if (receivedItems.length === 0) return "ordered";
    const computed = calcPoStatus(receivedItems.map((i) => ({ orderedQty: i.orderedQty || 0, totalReceivedQty: (i.alreadyReceived || 0) + getUsableQty(i) })));
    if (computed === "partial" || computed === "complete") return "received";
    if (computed === "excess") return "excess";
    return computed;
  })();

  const totalPages = Math.ceil(receivedItems.length / itemsPerPage);
  const pagedItems = receivedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // const handleSubmit = async () => {
  //   setUploading(true);
  //   try {
  //     const now = new Date().toISOString();
  //     const hasDamage = receivedItems.some((i) => (i.damagedQty || 0) > 0);
  //     const updatedItems = receivedItems.map((item) => {
  //       const orderedQty = item.orderedQty || 0;
  //       const alreadyReceived = item.alreadyReceived || 0;
  //       const physical = item.physicalQty ?? item.newReceived ?? 0;
  //       const totalReceivedQty = alreadyReceived + physical;
  //       return {
  //         ...item, totalReceivedQty, orderedQty, quantity: orderedQty,
  //         shortage: Math.max(0, orderedQty - totalReceivedQty),
  //         itemStatus: getItemStatus(orderedQty, totalReceivedQty),
  //         physicalQty: physical, damagedQty: item.damagedQty || 0,
  //         issue: item.issue || "", issueDetail: item.issueDetail || "",
  //       };
  //     });
  //     const poStatus = calcPoStatus(updatedItems.map((i) => ({ orderedQty: i.orderedQty, totalReceivedQty: i.totalReceivedQty })));
  //     const totalReceivedQty = updatedItems.reduce((s, i) => s + i.totalReceivedQty, 0);
  //     const finalQcStatus = hasDamage && qualityCheck === "passed" ? "passed_with_issues" : qualityCheck;
  //     await updateDoc(doc(db, "excelupload", selectedPO.id), {
  //       items: updatedItems, poStatus, receivedAt: now, lastInvoiceAt: now, totalReceivedQty,
  //       qualityCheck: finalQcStatus, remarks, storeQcStatus: "approved",
  //       storeQcApprovedAt: now, storeQcApprovedBy: "Store Team",
  //     });
  //     await updateDoc(doc(db, "excelupload", selectedInvoice.id), {
  //       storeQcStatus: hasDamage ? "approved_with_issues" : "approved",
  //       storeQcApprovedAt: now, storeQcApprovedBy: "Store Team",
  //       qualityCheck: finalQcStatus, remarks, poStatus, items: updatedItems,
  //     });
  //     const isReplacement = selectedInvoice.storeQcStatus === "approved_with_issues";
  //     // if (qualityCheck !== "failed") await addToStock(receivedItems, selectedPO.poNumber, selectedPO.vendor, isReplacement);
  //     if (qualityCheck !== "failed") await addToStock(receivedItems, selectedPO.poNumber, selectedPO.vendor, isReplacement);
      
  //     localStorage.removeItem("storeQcDraft");
  //     setUploading(false); setStep(4);
  //   } catch (err) { console.error("Submit error:", err); setUploading(false); alert("Error: " + err.message); }
  // };

  const handleSubmit = async () => {
  setUploading(true);
  try {
    const now = new Date().toISOString();
    const hasDamage = receivedItems.some((i) => (i.damagedQty || 0) > 0);
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

    const totalReceivedQty = updatedItems.reduce(
      (s, i) => s + i.totalReceivedQty, 0,
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

    const isReplacement = selectedInvoice.storeQcStatus === "approved_with_issues";

    // ✅ Stock update + badge remove (only if QC passed)
    if (qualityCheck !== "failed") {
      await addToStock(receivedItems, selectedPO.poNumber, selectedPO.vendor, isReplacement);

      // ✅ Badge remove — product fully received હોય તો
      for (const item of receivedItems) {
        const physical = item.physicalQty ?? item.newReceived ?? 0;
        const totalReceived = (item.alreadyReceived || 0) + physical;
        const orderedQty = item.orderedQty || 0;

        if (totalReceived >= orderedQty) {
          const key = item.productCode?.toString().trim();
          if (!key) continue;
          const stockSnap = await getDocs(
            query(collection(db, "stock"), where("productCode", "==", key))
          );
          if (!stockSnap.empty) {
            await updateDoc(doc(db, "stock", stockSnap.docs[0].id), {
              damagedQty: 0,
              hasIssue: false,
            });
          }
        }
      }
    }

    localStorage.removeItem("storeQcDraft");
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
          <h2 className="text-xl font-black text-slate-800">Store Quality Check</h2>
          <p className="text-xs text-slate-400 mt-0.5">Review vendor invoices and approve material receipt</p>
        </div>
        <BtnSecondary onClick={() => navigate("/store/dashboard")}>Cancel</BtnSecondary>
      </div>

      {step < 4 && (
        <Card className="p-5">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {steps.map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step > s.num ? "bg-emerald-600 text-white" : step === s.num ? "bg-emerald-600 text-white ring-4 ring-emerald-100" : "bg-slate-200 text-slate-400"}`}>
                    {step > s.num ? <FiCheck size={16} /> : s.num}
                  </div>
                  <p className={`text-[10px] font-bold whitespace-nowrap ${step >= s.num ? "text-slate-700" : "text-slate-400"}`}>{s.label}</p>
                </div>
                {idx < 2 && <div className={`flex-1 h-0.5 mx-1 ${step > s.num ? "bg-emerald-600" : "bg-slate-200"}`} />}
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}

      {/* ── Step 1 ── */}
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
                  <p className="text-xs font-bold text-amber-700">📝 Draft found — Invoice: {d.invoiceNo || "—"} · PO: {d.selectedPO?.poNumber || "—"}</p>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const d2 = JSON.parse(localStorage.getItem("storeQcDraft"));
                      setStep(d2.step); setSelectedInvoice(d2.selectedInvoice); setSelectedPO(d2.selectedPO);
                      setReceivedItems(d2.receivedItems); setInvoiceNo(d2.invoiceNo); setInvoiceDate(d2.invoiceDate);
                      setQualityCheck(d2.qualityCheck); setRemarks(d2.remarks); setCurrentPage(d2.currentPage || 1);
                    }} className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600">Resume →</button>
                    <button onClick={() => { localStorage.removeItem("storeQcDraft"); window.location.reload(); }}
                      className="px-3 py-1 bg-white border border-amber-300 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-50">Discard</button>
                  </div>
                </div>
              );
            } catch { return null; }
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Sales Orders */}
            <Card>
              <CardHeader
                title={<div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><FiFileText size={14} className="text-violet-600" /></div><span>Sales Orders — Waiting for QC</span></div>}
                subtitle={loadingSO ? "Loading..." : `${pendingSalesOrders.length} SO(s) awaiting quality check`}
              />
              {loadingSO ? (
                <div className="divide-y divide-slate-50 min-h-[200px]">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="px-6 py-5 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3"><div className="h-4 w-28 bg-slate-200 rounded-md" /><div className="h-4 w-24 bg-violet-100 rounded-full" /></div>
                          <div className="h-3 w-40 bg-slate-100 rounded-md" />
                        </div>
                        <div className="h-6 w-24 bg-violet-100 rounded-full ml-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingSalesOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <FiShield size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-bold text-slate-500">No Pending Sales Orders</p>
                  <p className="text-xs text-slate-400 mt-1">All SOs have been verified.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {pendingSalesOrders.map((so) => {
                    const header = so.excelHeader || so.invoiceHeader || {};
                    const soNumber = header.reference || so.invoiceNo || so.woNumber || `SO-${so.id.slice(0, 8).toUpperCase()}`;
                    const customer = so.customer || header.consignee || header.buyer || "—";
                    const totalItems = (so.items || []).length;
                    const totalQty = (so.items || []).reduce((s, i) => s + (i.quantity || i.orderedQty || 0), 0);
                    const deliveryDate = so.deliveryDate || header.dated || so.eta || "";
                    const hasQcIssues = (so.soQcIssues?.length > 0);
                    const prevShortageItems = (so.soQcIssues || []).filter(i => i.issue === "shortage");
                    return (
                      <div key={so.id} className={`px-6 py-4 transition-colors cursor-pointer ${hasQcIssues ? "bg-orange-50/40 hover:bg-orange-50 border-l-4 border-l-orange-400" : "hover:bg-violet-50/40"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <p className="text-sm font-bold text-slate-800">{soNumber}</p>
                              {hasQcIssues ? (
                                <>
                                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 rounded-full uppercase">⚠ Partial — Shortage</span>
                                  {prevShortageItems.length > 0 && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 rounded-full">
                                      {prevShortageItems.reduce((s, i) => s + (i.shortage || 0), 0)} units short
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 rounded-full uppercase">Waiting for QC</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">{customer}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                              <span>{totalItems} items · {totalQty} units</span>
                              {deliveryDate && <span>Delivery: {formatDate(deliveryDate)}</span>}
                              <span className="flex items-center gap-1"><FiClock size={10} />{formatDateTime(so.createdAt)}</span>
                            </div>
                            {hasQcIssues && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(so.soQcIssues || []).map((iss, i) => (
                                  <span key={i} className="px-2 py-0.5 text-[10px] font-bold bg-white border border-orange-200 text-orange-700 rounded-md">
                                    {iss.productCode}: {iss.issue?.replace("_", " ")}{iss.shortage > 0 && ` (${iss.shortage} short)`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => handleSelectSO(so)} disabled={loadingSO2}
                            className={`ml-4 px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 ${hasQcIssues ? "bg-orange-500 hover:bg-orange-600" : "bg-violet-600 hover:bg-violet-700"}`}>
                            <FiShield size={12} />
                            {loadingSO2 ? "Loading..." : hasQcIssues ? "Re-verify →" : "Verify SO →"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* RIGHT: PO Invoices */}
            <Card>
              <CardHeader
                title={<div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><FiShoppingCart size={14} className="text-emerald-600" /></div><span>Purchase Orders — Pending QC</span></div>}
                subtitle={loadingInvoices ? "Loading..." : `${pendingInvoices.length} invoice(s) awaiting store verification`}
              />
              {loadingInvoices || loadingPO ? (
                <div className="divide-y divide-slate-50 min-h-[200px]">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="px-6 py-5 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3"><div className="h-4 w-36 bg-slate-200 rounded-md" /><div className="h-4 w-20 bg-amber-100 rounded-full" /></div>
                          <div className="h-3 w-48 bg-slate-100 rounded-md" />
                        </div>
                        <div className="h-8 w-36 bg-emerald-100 rounded-lg ml-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingInvoices.length === 0 ? (
                <div className="p-12 text-center">
                  <FiShield size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-bold text-slate-500">No Pending Invoices</p>
                  <p className="text-xs text-slate-400 mt-1">All invoices have been verified.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {pendingInvoices.map((inv) => {
                    const totalItems = (inv.items || []).length;
                    const totalQty = (inv.items || []).reduce((s, i) => s + (i.newReceived || i.invoiceQty || 0), 0);
                    const hasIssues = inv.storeQcStatus === "approved_with_issues";
                    const issueItems = (inv.items || []).filter(i => i.issue && i.issue !== "");
                    const damagedItems = (inv.items || []).filter(i => (i.damagedQty || 0) > 0);
                    const shortageItems = (inv.items || []).filter(i => i.issue === "shortage");
                    return (
                      <div key={inv.id}
                        className={`px-6 py-4 transition-colors cursor-pointer ${hasIssues ? "bg-red-50/40 hover:bg-red-50 border-l-4 border-l-red-400" : "hover:bg-slate-50"}`}
                        onClick={() => handleSelectInvoice(inv)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <p className="text-sm font-bold text-slate-800">Invoice: {inv.invoiceNo || "—"}</p>
                              {hasIssues ? (
                                <>
                                  {damagedItems.length > 0 && <span className="px-2.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 rounded-full uppercase">🔴 {damagedItems.reduce((s, i) => s + (i.damagedQty || 0), 0)} Damaged</span>}
                                  {shortageItems.length > 0 && <span className="px-2.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 rounded-full uppercase">🟠 Shortage</span>}
                                  {issueItems.filter(i => i.issue !== "damage" && i.issue !== "shortage").length > 0 && <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full uppercase">⚠ Issues</span>}
                                </>
                              ) : (
                                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full uppercase">Pending QC</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">PO: <strong>{inv.linkedPoNo}</strong> · {inv.vendor}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                              <span>{totalItems} items · {totalQty} units</span>
                              {inv.invoiceDate && <span>Invoice Date: {formatDate(inv.invoiceDate)}</span>}
                              <span className="flex items-center gap-1"><FiClock size={10} />Uploaded: {formatDateTime(inv.createdAt)}</span>
                            </div>
                            {hasIssues && issueItems.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {issueItems.map((item, idx) => (
                                  <span key={idx} className="px-2 py-0.5 text-[10px] font-bold bg-white border border-red-200 text-red-700 rounded-md">
                                    {item.productCode}: {item.issue?.replace("_", " ")}{(item.damagedQty || 0) > 0 && ` (${item.damagedQty} dmg)`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button className={`ml-4 px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${hasIssues ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                            <FiShield size={12} />{hasIssues ? "Review Issues →" : "Review & Approve →"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ── SO Step 2 ── */}
      {step === 2 && qcMode === "so" && selectedSO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Sales Order Details" />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-slate-400 font-bold mb-1">SO Number</p><p className="text-slate-800 font-bold">{selectedSO.soNumber}</p></div>
                  <div><p className="text-slate-400 font-bold mb-1">Customer</p><p className="text-slate-800">{selectedSO.customer}</p></div>
                  <div><p className="text-slate-400 font-bold mb-1">Delivery Date</p><p className="text-slate-800">{selectedSO.deliveryDate || "—"}</p></div>
                  <div><p className="text-slate-400 font-bold mb-1">After QC</p><StatusPill status={liveSoStatus === "complete" ? "ready" : liveSoStatus} /></div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs">
                <p className="text-xs font-bold text-slate-600 mb-2">QC Summary:</p>
                <div className="flex justify-between"><span className="text-slate-500">Total Items:</span><span className="font-bold text-slate-800">{soItems.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Ready for Dispatch:</span><span className="font-bold text-emerald-600">{soTotalReady} units</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Shortage:</span><span className={`font-bold ${soTotalShortage > 0 ? "text-orange-600" : "text-emerald-600"}`}>{soTotalShortage} units</span></div>
                <div className="flex justify-between"><span className="text-slate-500">SO Status After:</span><StatusPill status={liveSoStatus === "complete" ? "ready" : liveSoStatus} /></div>
              </div>
              {soItems.some((i) => i._hadIssue) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-bold text-amber-700 mb-2">⚠️ Previous Issues:</p>
                  {soItems.filter((i) => i._hadIssue).map((item, i) => (
                    <div key={i} className="text-xs text-amber-800 flex gap-2 mt-1">
                      <span className="font-mono font-bold">{item.productCode}</span>
                      <span className="capitalize text-amber-600">— {item._lastIssue?.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <FiAlertCircle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">Set "Ready Qty" = actual units you can dispatch from stock. Shortage items will stay in QC list.</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Verify Stock Availability" subtitle={`${soTotalReady} units ready · ${soItems.length} items`} />
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* ✅ CHANGE 2: Paginated soItems */}
              {soItems.slice((soItemsPage - 1) * SO_ITEMS_PER_PAGE, soItemsPage * SO_ITEMS_PER_PAGE).map((item) => {
                const ordered = item.orderedQty || 0;
                const avail   = item.stockAvailable || 0;
                const ready   = item.readyQty ?? Math.min(ordered, avail);
                const itemSt  = getSoItemStatus(item);
                const shortage = Math.max(0, ordered - ready);
                const progressPct = ordered > 0 ? Math.min(100, Math.round((ready / ordered) * 100)) : 0;
                const stockSufficient = avail >= ordered;
                return (
                  <div key={item.productCode} className={`p-4 border rounded-lg ${
                    item._hadIssue && item.issue === "shortage" ? "border-orange-400 bg-orange-50/20 ring-1 ring-orange-300"
                    : item._hadIssue && item.issue === "damage" ? "border-red-400 bg-red-50/20 ring-1 ring-red-300"
                    : item._hadIssue ? "border-amber-400 bg-amber-50/20"
                    : itemSt === "complete" ? "border-emerald-200 bg-emerald-50/30"
                    : itemSt === "partial"  ? "border-orange-200 bg-orange-50/30"
                    : "border-slate-200"
                  }`}>
                    <div className="flex items-start gap-3 mb-3">
                      <FiPackage className="text-slate-400 mt-0.5 flex-shrink-0" size={15} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 font-mono">{item.productCode}</p>
                          <StatusPill status={itemSt === "complete" ? "complete" : itemSt} />
                          {item._hadIssue && (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border ${item.issue === "shortage" ? "bg-orange-100 text-orange-700 border-orange-300" : item.issue === "damage" ? "bg-red-100 text-red-700 border-red-300" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
                              Last: {item._lastIssue?.replace("_", " ")}
                            </span>
                          )}
                          {!stockSufficient && <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 rounded-full">Stock Low</span>}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{item.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Ordered</p>
                        <div className="h-8 flex items-center px-2 bg-slate-50 border border-slate-200 rounded-lg"><p className="text-sm font-bold text-slate-800">{ordered}</p></div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold mb-1 uppercase tracking-wide text-teal-500">In Stock</p>
                        <div className={`h-8 flex items-center px-2 border rounded-lg ${stockSufficient ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                          <p className={`text-sm font-bold ${stockSufficient ? "text-emerald-700" : "text-red-600"}`}>{avail}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase">Ready</p>
                        <input type="number" min="0" max={avail}
                          value={item.readyQty ?? Math.min(ordered, avail)}
                          onChange={(e) => {
                            const newReady = Math.min(parseFloat(e.target.value) || 0, avail);
                            const currentIssue = item.issue;
                            // ✅ CHANGE 1: If issue is already "damage", auto-calc damagedQty = ordered - newReady
                            if (currentIssue === "damage") {
                              const autoDmg = Math.max(0, ordered - newReady);
                              updateSoItem(item.productCode, {
                                readyQty:    newReady,
                                damagedQty:  autoDmg,
                                issueDetail: `Damaged: ${autoDmg} units (Ordered: ${ordered}, Stock: ${avail}, Ready: ${newReady})`,
                              });
                            } else {
                              const autoIssue  = newReady < ordered ? "shortage" : "";
                              const autoDetail = newReady < ordered ? `Short: ${ordered - newReady} units (Stock: ${avail}, Ordered: ${ordered})` : "";
                              updateSoItem(item.productCode, { readyQty: newReady, issue: autoIssue, issueDetail: autoDetail });
                            }
                          }}
                          className={`w-full h-8 border rounded-lg px-2 text-sm font-bold focus:outline-none focus:ring-2 ${ready < ordered ? "border-orange-300 bg-orange-50 text-orange-700 focus:ring-orange-300" : "border-indigo-200 bg-indigo-50/40 text-indigo-700 focus:ring-indigo-300"}`}
                        />
                      </div>
                    </div>

                    {/* ✅ FIX 3: Issue dropdown — "Damage" option added */}
                    <div className="mb-2">
                      <p className="text-[10px] text-red-400 font-bold mb-1 uppercase">Issue</p>
                      <select value={item.issue || ""}
                        onChange={(e) => {
                          const iss = e.target.value;
                          // ✅ CHANGE 1: Damage select thay tyare auto-calc damagedQty = ordered - ready
                          const currentReady = item.readyQty ?? Math.min(ordered, avail);
                          const autoDmg = iss === "damage" ? Math.max(0, ordered - currentReady) : 0;
                          const autoDetail =
                            iss === "damage"   ? `Damaged: ${autoDmg} units (Ordered: ${ordered}, Ready: ${currentReady})`
                            : iss === "shortage" ? `Short: ${Math.max(0, ordered - currentReady)} units`
                            : iss === "quality" ? "Quality issue noted"
                            : iss === "other"   ? "Other issue" : "";
                          updateSoItem(item.productCode, { issue: iss, issueDetail: autoDetail, damagedQty: autoDmg });
                        }}
                        className={`w-full h-8 border rounded-lg px-1.5 text-[11px] font-bold focus:outline-none ${item.issue ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"}`}>
                        <option value="">— None</option>
                        <option value="damage">🔴 Damage</option>
                        <option value="shortage">🟠 Shortage</option>
                        <option value="quality">🟡 Quality</option>
                        <option value="wrong_item">🔵 Wrong Item</option>
                        <option value="other">⚪ Other</option>
                      </select>
                    </div>

                    {/* ✅ FIX 4: Damage input — stock page par badge show thase */}
                    {item.issue === "damage" && (
                      <div className="mt-1 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-[10px] text-red-600 font-bold mb-1 uppercase">
                          Damaged Qty <span className="normal-case font-normal text-red-400">(tracking only — badge shows on Stock Alerts page)</span>
                        </p>
                        <input type="number" min="0"
                          value={item.damagedQty || 0}
                          onChange={(e) => {
                            const dmg = parseFloat(e.target.value) || 0;
                            updateSoItem(item.productCode, {
                              damagedQty:  dmg,
                              issueDetail: `Damaged: ${dmg} units (Ordered: ${ordered}, Stock: ${avail})`,
                            });
                          }}
                          className="w-full h-9 border-2 border-red-300 bg-white rounded-lg px-3 text-sm font-black text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                          placeholder="0"
                        />
                        {(item.damagedQty || 0) > 0 && (
                          <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1">
                            <FiAlertTriangle size={10} />
                            {item.damagedQty} damaged units — badge will show on Stock Alerts page ✅
                          </p>
                        )}
                      </div>
                    )}

                    {item.issue && item.issue !== "damage" && (
                      <div className="mb-2">
                        <p className="text-[10px] text-red-500 font-bold mb-1">Issue Details</p>
                        <textarea rows={2} value={item.issueDetail || ""}
                          onChange={(e) => updateSoItem(item.productCode, { issueDetail: e.target.value })}
                          className="w-full border border-red-200 bg-red-50/50 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none resize-none"
                          placeholder="Describe the issue..." />
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{ready}/{ordered} {item.unit || "pcs"}{(item.damagedQty || 0) > 0 && <span className="text-red-400 ml-1">({item.damagedQty} damaged)</span>}</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${itemSt === "complete" ? "bg-emerald-500" : itemSt === "partial" ? "bg-orange-500" : "bg-blue-300"}`}
                          style={{ width: `${progressPct}%` }} />
                      </div>
                      {/* ✅ CHANGE 3: Contextual message based on issue type */}
                      {item.issue === "damage" && (item.damagedQty || 0) > 0 && (
                        <p className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                          <FiAlertTriangle size={10} /> {item.damagedQty} {item.unit} damaged — tracked for vendor follow-up
                        </p>
                      )}
                      {item.issue === "shortage" && shortage > 0 && (
                        <p className="text-[11px] text-orange-600 font-bold mt-1 flex items-center gap-1">
                          <FiAlertTriangle size={10} /> {shortage} {item.unit} short in stock
                        </p>
                      )}
                      {item.issue === "quality" && (
                        <p className="text-[11px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                          <FiAlertTriangle size={10} /> Quality issue noted — awaiting review
                        </p>
                      )}
                      {item.issue === "wrong_item" && (
                        <p className="text-[11px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                          <FiAlertTriangle size={10} /> Wrong item received — return required
                        </p>
                      )}
                      {item.issue === "other" && (
                        <p className="text-[11px] text-slate-500 font-bold mt-1 flex items-center gap-1">
                          <FiAlertTriangle size={10} /> Issue noted — see details above
                        </p>
                      )}
                      {/* No issue + shortage = show shortage msg */}
                      {!item.issue && shortage > 0 && (
                        <p className="text-[11px] text-orange-600 font-bold mt-1 flex items-center gap-1">
                          <FiAlertTriangle size={10} /> {shortage} {item.unit} short in stock
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {soTotalShortage > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5"><FiAlertTriangle size={12} /> Shortage — SO will stay in QC list</p>
                  <p className="text-xs text-orange-600 mt-1">{soTotalShortage} units pending. Stock update required.</p>
                </div>
              )}
              {liveSoStatus === "complete" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5"><FiCheck size={12} /> All items ready — SO will move to: READY FOR DISPATCH ✅</p>
                </div>
              )}

              {/* ✅ CHANGE 2: Pagination controls */}
              {Math.ceil(soItems.length / SO_ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Showing <span className="font-bold text-slate-600">{(soItemsPage - 1) * SO_ITEMS_PER_PAGE + 1}–{Math.min(soItemsPage * SO_ITEMS_PER_PAGE, soItems.length)}</span> of <span className="font-bold text-slate-600">{soItems.length}</span> items
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSoItemsPage((p) => Math.max(1, p - 1))}
                      disabled={soItemsPage === 1}
                      className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                    >← Prev</button>
                    {Array.from({ length: Math.ceil(soItems.length / SO_ITEMS_PER_PAGE) }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setSoItemsPage(pg)}
                        className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${pg === soItemsPage ? "bg-violet-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-600"}`}
                      >{pg}</button>
                    ))}
                    <button
                      onClick={() => setSoItemsPage((p) => Math.min(Math.ceil(soItems.length / SO_ITEMS_PER_PAGE), p + 1))}
                      disabled={soItemsPage === Math.ceil(soItems.length / SO_ITEMS_PER_PAGE)}
                      className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                    >Next →</button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── PO Step 2 ── */}
      {step === 2 && qcMode === "po" && selectedPO && selectedInvoice && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Invoice Details" />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-slate-400 font-bold mb-1">PO Number</p><p className="text-slate-800 font-bold">{selectedPO.poNumber}</p></div>
                  <div><p className="text-slate-400 font-bold mb-1">Invoice No</p><p className="text-slate-800 font-bold">{invoiceNo || "—"}</p></div>
                  <div><p className="text-slate-400 font-bold mb-1">Vendor</p><p className="text-slate-800">{selectedPO.vendor}</p></div>
                  <div><p className="text-slate-400 font-bold mb-1">Invoice Date</p><p className="text-slate-800">{invoiceDate ? formatDate(invoiceDate) : "—"}</p></div>
                  <div><p className="text-slate-400 font-bold mb-1">Current PO Status</p><StatusPill status={selectedPO.status} /></div>
                  <div><p className="text-slate-400 font-bold mb-1">After Approval</p><StatusPill status={livePoStatus} /></div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-bold text-slate-600 mb-2">Receipt Summary:</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Items in Invoice:</span><span className="font-bold text-slate-800">{receivedItems.filter((i) => i.matchedFromInvoice).length} / {receivedItems.length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Stock to be Added:</span><span className="font-bold text-slate-800">{getTotalNewReceived()} units</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Still Pending After:</span><span className={`font-bold ${getTotalShortage() > 0 ? "text-orange-600" : "text-emerald-600"}`}>{getTotalShortage()} units</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">PO Status After Approval:</span><StatusPill status={livePoStatus} /></div>
                </div>
              </div>
              {receivedItems.some((i) => (i.damagedQty || 0) > 0) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-red-700 mb-1.5 flex items-center gap-1.5"><FiAlertTriangle size={12} /> Damage Tracked:</p>
                  {receivedItems.filter((i) => (i.damagedQty || 0) > 0).map((item, i) => {
                    const phys = item.physicalQty ?? item.newReceived ?? 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs mt-1">
                        <span className="font-mono font-bold text-red-800">{item.productCode}</span>
                        <span className="text-red-600">Stock <strong>+{phys}</strong> · <strong>{item.damagedQty} damaged</strong> tracked</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <FiAlertCircle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">Quantities are pre-filled from the invoice. Edit "Physical" = actual healthy units received. Damaged qty is for tracking only.</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Verify Quantities" subtitle={`${getTotalNewReceived()} units to stock · ${receivedItems.length} items`} />
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {pagedItems.map((item) => {
                const currentItem = receivedItems.find((r) => r.productCode === item.productCode) || item;
                const ordered = currentItem.orderedQty || 0;
                const already = currentItem.alreadyReceived || 0;
                const thisInv = currentItem.newReceived || 0;
                const phys    = currentItem.physicalQty ?? thisInv;
                const damagedQty = currentItem.damagedQty || 0;
                const totalAfter = already + phys;
                const remaining  = Math.max(0, ordered - totalAfter);
                const excess     = Math.max(0, totalAfter - ordered);
                const itemStatus = getItemStatus(ordered, totalAfter);
                const progressPct = ordered > 0 ? Math.min(100, Math.round((totalAfter / ordered) * 100)) : 0;
                return (
                  <div key={currentItem.productCode} className={`p-4 border rounded-lg ${
                    currentItem._hadIssue && currentItem.issue === "damage"   ? "border-red-400 bg-red-50/30 ring-1 ring-red-300"
                    : currentItem._hadIssue && currentItem.issue === "shortage" ? "border-orange-400 bg-orange-50/30 ring-1 ring-orange-300"
                    : currentItem._hadIssue  ? "border-amber-400 bg-amber-50/30"
                    : itemStatus === "complete" ? "border-emerald-200 bg-emerald-50/30"
                    : itemStatus === "excess"   ? "border-purple-200 bg-purple-50/30"
                    : itemStatus === "partial"  ? "border-orange-200 bg-orange-50/30"
                    : "border-slate-200"
                  }`}>
                    <div className="flex items-start gap-3 mb-3">
                      <FiPackage className="text-slate-400 mt-0.5 flex-shrink-0" size={15} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 font-mono">{currentItem.productCode}</p>
                          <StatusPill status={itemStatus} />
                          {currentItem.matchedFromInvoice ? <span className="text-[10px] text-emerald-600 font-bold">✓ Invoice</span> : <span className="text-[10px] text-orange-500 font-bold">⚠ Not in Invoice</span>}
                          {currentItem._hadIssue && (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border uppercase flex items-center gap-1 ${currentItem.issue === "damage" ? "bg-red-100 text-red-700 border-red-300" : currentItem.issue === "shortage" ? "bg-orange-100 text-orange-700 border-orange-300" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
                              {currentItem.issue === "damage" ? "🔴" : currentItem.issue === "shortage" ? "🟠" : "⚠️"}
                              Last: {currentItem.issue?.replace("_", " ")}{currentItem._lastDamagedQty > 0 && ` · ${currentItem._lastDamagedQty} dmg`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{currentItem.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Ordered</p>
                        <div className="h-8 flex items-center px-2 bg-slate-50 border border-slate-200 rounded-lg"><p className="text-sm font-bold text-slate-800">{ordered}</p></div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Invoice Qty</p>
                        <input type="number" value={thisInv} disabled className="w-full h-8 border border-slate-200 rounded-lg px-2 text-sm font-bold text-slate-800 bg-slate-50 cursor-not-allowed" />
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase">Physical</p>
                        <input type="number" min="0" value={currentItem.physicalQty ?? thisInv}
                          onChange={(e) => {
                            const newPhys = parseFloat(e.target.value) || 0;
                            const inv = currentItem.newReceived || 0;
                            const issue = currentItem.issue;
                            const autoIssue   = !issue && newPhys < inv ? "shortage" : issue;
                            const autoDamaged = autoIssue === "damage" ? Math.max(0, inv - newPhys) : currentItem.damagedQty;
                            const autoDetail  = autoIssue === "shortage" ? `Short: ${inv - newPhys} units ` : autoIssue === "damage" ? `Damaged: ${autoDamaged} units ` : autoIssue === "excess" ? `Excess: ${newPhys - inv} units received` : currentItem.issueDetail;
                            updateItem(currentItem.productCode, { physicalQty: newPhys, issue: autoIssue, issueDetail: autoDetail, damagedQty: autoDamaged });
                          }}
                          className={`w-full h-8 border rounded-lg px-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300 ${phys !== thisInv ? "border-orange-300 bg-orange-50 text-orange-700" : "border-indigo-200 bg-indigo-50/40 text-indigo-700"}`}
                        />
                        {phys !== thisInv && <p className="text-[9px] text-orange-600 font-bold mt-0.5">⚠ Differs ({thisInv})</p>}
                      </div>
                      <div>
                        <p className="text-[10px] text-red-400 font-bold mb-1 uppercase">Issue</p>
                        <select value={currentItem.issue || ""}
                          onChange={(e) => {
                            const newIssue = e.target.value;
                            const inv = currentItem.newReceived || 0;
                            const phys2 = currentItem.physicalQty ?? inv;
                            const autoDamaged = newIssue === "damage" ? Math.max(0, inv - phys2) : 0;
                            const autoDetail = newIssue === "damage" ? `Damaged: ${autoDamaged} units (Invoice: ${inv}, Physical: ${phys2})` : newIssue === "shortage" ? `Short: ${inv - phys2} units (Invoice: ${inv}, Physical: ${phys2})` : newIssue === "excess" ? `Excess: ${phys2 - inv} units received` : newIssue === "quality" ? "Quality issue noted" : newIssue === "wrong_item" ? "Wrong item received" : newIssue === "other" ? "Other issue" : "";
                            updateItem(currentItem.productCode, { issue: newIssue, issueDetail: autoDetail, damagedQty: autoDamaged });
                          }}
                          className={`w-full h-8 border rounded-lg px-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-red-300 ${currentItem.issue ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"}`}>
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
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-[10px] text-red-600 font-bold mb-1 uppercase">Damaged Qty <span className="normal-case font-normal text-red-400">(tracking only)</span></p>
                            <input type="number" min="0" value={currentItem.damagedQty || 0}
                              onChange={(e) => {
                                const dmg = parseFloat(e.target.value) || 0;
                                const inv = currentItem.newReceived || 0;
                                const phys2 = currentItem.physicalQty ?? inv;
                                updateItem(currentItem.productCode, { damagedQty: dmg, issueDetail: `Damaged: ${dmg} units (Invoice: ${inv}, Physical: ${phys2})` });
                              }}
                              className="w-full h-9 border-2 border-red-300 bg-white rounded-lg px-3 text-sm font-black text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                              placeholder="0"
                            />
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-[10px] text-slate-400 mb-1">Stock added</p>
                            <p className="text-sm font-black text-emerald-600">{phys} <span className="text-xs font-normal text-slate-400">{currentItem.unit}</span></p>
                          </div>
                        </div>
                        {damagedQty > 0 && <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1"><FiAlertTriangle size={10} />Stock +{phys} units. {damagedQty} damaged units tracked for vendor follow-up.</p>}
                      </div>
                    )}
                    {currentItem.issue && currentItem.issue !== "damage" && (
                      <div className="mt-1 mb-2">
                        <p className="text-[10px] text-red-500 font-bold mb-1">Issue Details</p>
                        <textarea rows={2} value={currentItem.issueDetail || ""}
                          placeholder={currentItem.issue === "shortage" ? "e.g. Invoice says 100 but only 85 received..." : currentItem.issue === "excess" ? "e.g. 10 extra units received..." : currentItem.issue === "quality" ? "e.g. Surface finish not acceptable..." : currentItem.issue === "wrong_item" ? "e.g. Received FRC-110-2 instead of FRC-110-1..." : "Describe the issue..."}
                          onChange={(e) => updateItem(currentItem.productCode, { issueDetail: e.target.value })}
                          className="w-full border border-red-200 bg-red-50/50 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                        />
                      </div>
                    )}
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{totalAfter}/{ordered} {currentItem.unit}{damagedQty > 0 && <span className="text-red-400 ml-1">({damagedQty} damaged tracked)</span>}</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${itemStatus === "complete" ? "bg-emerald-500" : itemStatus === "excess" ? "bg-purple-500" : itemStatus === "partial" ? "bg-orange-500" : "bg-blue-300"}`}
                          style={{ width: `${Math.min(progressPct, 100)}%` }} />
                      </div>
                    </div>
                    {itemStatus === "partial" && remaining > 0 && <p className="text-[11px] text-orange-600 font-bold mt-1.5 flex items-center gap-1"><FiAlertTriangle size={10} /> {remaining} {currentItem.unit} still pending</p>}
                    {itemStatus === "excess" && <p className="text-[11px] text-purple-600 font-bold mt-1.5 flex items-center gap-1"><FiAlertTriangle size={10} /> {excess} {currentItem.unit} excess received</p>}
                  </div>
                );
              })}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, receivedItems.length)} of {receivedItems.length} items</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100">← Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                      <button key={pg} onClick={() => setCurrentPage(pg)} className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${pg === currentPage ? "bg-emerald-600 text-white" : "border border-slate-200 hover:bg-slate-100 text-slate-600"}`}>{pg}</button>
                    ))}
                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100">Next →</button>
                  </div>
                </div>
              )}
              {getTotalShortage() > 0 && <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg"><p className="text-xs font-bold text-orange-700 flex items-center gap-1.5"><FiAlertTriangle size={12} /> Shortage — PO will be: PARTIAL</p><p className="text-xs text-orange-600 mt-1">{getTotalShortage()} units pending. Another invoice needed later.</p></div>}
              {livePoStatus === "received" && getTotalShortage() === 0 && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg"><p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5"><FiCheck size={12} /> All matched — PO will be: COMPLETE</p></div>}
              {livePoStatus === "excess" && <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg"><p className="text-xs font-bold text-purple-700 flex items-center gap-1.5"><FiAlertTriangle size={12} /> Excess received — PO will be: EXCESS</p></div>}
            </div>
          </Card>
        </div>
      )}

      {/* ── SO Step 3 ── */}
      {step === 3 && qcMode === "so" && selectedSO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Quality Check" subtitle="Final verification before approving SO for dispatch" />
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Quality Check Result</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "passed", icon: "✅", label: "Passed", sub: liveSoStatus === "complete" ? "All items ready — moves to Ready for Dispatch" : "Approved with shortage — stays in QC", border: "border-emerald-400 bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-300" },
                    { value: "passed_with_issues", icon: "⚠️", label: "Passed with Issues", sub: "Approved but issues noted", border: "border-amber-400 bg-amber-50", text: "text-amber-700", ring: "ring-amber-300" },
                    { value: "failed", icon: "❌", label: "Failed", sub: "SO rejected — stays in QC list", border: "border-red-400 bg-red-50", text: "text-red-700", ring: "ring-red-300" },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setQualityCheck(opt.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${qualityCheck === opt.value ? `${opt.border} ${opt.text} ring-2 ${opt.ring} font-bold` : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                      <span className="text-xl flex-shrink-0">{opt.icon}</span>
                      <div><p className="text-sm font-bold">{opt.label}</p><p className="text-[11px] opacity-70">{opt.sub}</p></div>
                      {qualityCheck === opt.value && <FiCheck className="ml-auto flex-shrink-0" size={16} />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase">Remarks <span className="text-slate-400 normal-case">(optional)</span></p>
                <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  placeholder={qualityCheck === "failed" ? "Reason for rejection..." : "Any additional notes..."}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none border-slate-200 focus:ring-violet-300" />
              </div>
              {liveSoStatus === "complete" && qualityCheck !== "failed" ? (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <FiCheck size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-800">SO will move to <strong>Ready for Dispatch</strong>. ✅</p>
                </div>
              ) : qualityCheck === "failed" ? (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <FiAlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">SO <strong>rejected</strong> — stays in QC list.</p>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <FiAlertTriangle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700">Shortage exists — SO will <strong>stay in QC list</strong> until stock available.</p>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Confirm Summary" subtitle="Review before final approval" />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">SO Number</span><span className="font-black text-slate-800">{selectedSO.soNumber}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-semibold text-slate-800">{selectedSO.customer}</span></div>
                <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="text-slate-500">Units ready for dispatch</span><span className="font-black text-slate-800 text-sm">{soTotalReady} units</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Shortage</span><span className={`font-bold ${soTotalShortage > 0 ? "text-orange-600" : "text-emerald-600"}`}>{soTotalShortage} units</span></div>
                <div className="flex justify-between"><span className="text-slate-500">SO Status After</span><StatusPill status={liveSoStatus === "complete" && qualityCheck !== "failed" ? "ready" : "partial"} /></div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Item Breakdown</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {soItems.map((item, i) => {
                    const ready = item.readyQty ?? 0;
                    const st = getSoItemStatus(item);
                    return (
                      <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${(item.damagedQty || 0) > 0 ? "bg-red-50 border border-red-100" : item.issue ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
                        <div className="flex-1">
                          <span className="font-bold font-mono text-slate-800">{item.productCode}</span>
                          {item.issue && <span className="ml-2 text-orange-500 capitalize font-bold">⚠ {item.issue.replace("_", " ")}{(item.damagedQty || 0) > 0 && <span className="text-red-600 ml-1">({item.damagedQty} dmg)</span>}</span>}
                        </div>
                        <div className="flex items-center gap-2"><span className="text-violet-600">Ready: <strong>{ready}</strong></span><StatusPill status={st} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── PO Step 3 ── */}
      {step === 3 && qcMode === "po" && selectedPO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Quality Check" subtitle="Final verification before approving material receipt" />
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Quality Check Result</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "passed", icon: "✅", label: "Passed", sub: "All items good — full approval", border: "border-emerald-400 bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-300" },
                    { value: "passed_with_issues", icon: "⚠️", label: "Passed with Issues", sub: "Approved but minor issues noted", border: "border-amber-400 bg-amber-50", text: "text-amber-700", ring: "ring-amber-300" },
                    { value: "failed", icon: "❌", label: "Failed", sub: "Items rejected — no stock update", border: "border-red-400 bg-red-50", text: "text-red-700", ring: "ring-red-300" },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setQualityCheck(opt.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${qualityCheck === opt.value ? `${opt.border} ${opt.text} ring-2 ${opt.ring} font-bold` : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                      <span className="text-xl flex-shrink-0">{opt.icon}</span>
                      <div><p className="text-sm font-bold">{opt.label}</p><p className="text-[11px] opacity-70">{opt.sub}</p></div>
                      {qualityCheck === opt.value && <FiCheck className="ml-auto flex-shrink-0" size={16} />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase">Remarks <span className="text-slate-400 normal-case">(optional)</span></p>
                <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  placeholder={qualityCheck === "failed" ? "Describe the reason for rejection..." : qualityCheck === "passed_with_issues" ? "Describe the issues observed..." : "Any additional notes..."}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none transition-colors ${qualityCheck === "failed" ? "border-red-200 bg-red-50/30 focus:ring-red-300" : qualityCheck === "passed_with_issues" ? "border-amber-200 bg-amber-50/30 focus:ring-amber-300" : "border-slate-200 focus:ring-emerald-300"}`} />
              </div>
              {receivedItems.some((i) => i.issue) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 mb-2">⚠️ Items with Issues Noted:</p>
                  {receivedItems.filter((i) => i.issue).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-800 mt-1">
                      <span className="font-bold font-mono flex-shrink-0">{item.productCode}</span>
                      <span className="text-amber-600 capitalize">— {item.issue.replace("_", " ")}{(item.damagedQty || 0) > 0 && <span className="text-red-600 font-bold ml-1">({item.damagedQty} tracked)</span>}</span>
                    </div>
                  ))}
                </div>
              )}
              {qualityCheck === "failed" ? (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <FiAlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700"><strong>Stock will NOT be updated.</strong></p>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <FiCheck size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-800">After approval: <strong>stock will be updated immediately</strong>.</p>
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
                  { label: "Invoice Date", value: invoiceDate ? new Date(invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-slate-500">{label}</span>
                    <span className={`${bold ? "font-black" : "font-semibold"} text-slate-800`}>{value}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-slate-500">Units added to stock</span>
                  <span className="font-black text-slate-800 text-sm">{getTotalNewReceived()} units</span>
                </div>
                <div className="flex justify-between items-center"><span className="text-slate-500">PO Status after</span><StatusPill status={livePoStatus} /></div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">Item Breakdown</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {receivedItems.map((item, i) => {
                    const phys = item.physicalQty ?? item.newReceived ?? 0;
                    const inv  = item.newReceived ?? 0;
                    const damaged = item.damagedQty || 0;
                    const differs = phys !== inv;
                    return (
                      <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${damaged > 0 ? "bg-red-50 border border-red-100" : item.issue ? "bg-amber-50 border border-amber-100" : differs ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold font-mono text-slate-800">{item.productCode}</span>
                          {item.issue && <span className="ml-2 text-red-500 capitalize font-bold">⚠ {item.issue.replace("_", " ")}{damaged > 0 && <span className="ml-1">({damaged} tracked)</span>}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-emerald-600">Stock: <strong>+{phys}</strong></span>
                          {differs && <span className="text-amber-600">Inv: <strong>{inv}</strong></span>}
                          <StatusPill status={getItemStatus(item.orderedQty || 0, (item.alreadyReceived || 0) + phys)} />
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

      {/* ── SO Step 4 ── */}
      {step === 4 && qcMode === "so" && selectedSO && (
        <Card>
          <div className="p-12 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${liveSoStatus === "complete" ? "bg-emerald-100" : "bg-amber-100"}`}>
              {liveSoStatus === "complete" ? <FiCheck size={32} className="text-emerald-600" /> : <FiAlertTriangle size={32} className="text-amber-600" />}
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">
              {liveSoStatus === "complete" ? "SO QC Approved — Ready for Dispatch! 🚀" : "SO QC Done — Partial Shortage"}
            </h3>
            <p className="text-sm text-slate-600 mb-2">{selectedSO.soNumber} — {selectedSO.customer}</p>
            {liveSoStatus === "complete" ? (
              <p className="text-xs text-violet-600 font-bold mb-6">✅ Status updated to "Ready for Dispatch"</p>
            ) : (
              <p className="text-xs text-orange-600 font-bold mb-6">⚠️ Shortage noted — SO stays in QC list until stock available</p>
            )}
            <div className="space-y-1.5 text-sm text-slate-600 mb-8">
              <p>✅ SO <strong>{selectedSO.soNumber}</strong> QC completed</p>
              <p>✅ <strong>{soTotalReady} units</strong> verified and ready</p>
              {soTotalShortage > 0 && <p className="text-orange-600 font-bold">⚠️ <strong>{soTotalShortage} units</strong> short — pending stock</p>}
              {soItems.some((i) => (i.damagedQty || 0) > 0) && (
                <p className="text-red-600 font-bold">🔴 Damage badge set on Stock Alerts page</p>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <BtnSecondary onClick={async () => {
                setStep(1); setQcMode("po"); setSelectedSO(null); setSoItems([]);
                setQualityCheck("passed"); setRemarks(""); setCurrentPage(1);
                await fetchPendingSalesOrders();
              }}>Review Another SO</BtnSecondary>
              <BtnPrimary onClick={() => navigate("/store/dashboard")}>Go to Dashboard</BtnPrimary>
            </div>
          </div>
        </Card>
      )}

      {/* ── PO Step 4 ── */}
      {step === 4 && (qcMode === "po" || !selectedSO) && selectedPO && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <FiCheck size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">QC Approved & Stock Updated!</h3>
            <p className="text-sm text-slate-600 mb-2">{selectedPO.poNumber} — {selectedPO.vendor}</p>
            <p className="text-xs text-indigo-600 font-bold mb-6">✅ Sales team has been notified</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 mb-6">
              <span className="text-xs text-slate-500">PO Status:</span><StatusPill status={livePoStatus} />
            </div>
            <div className="space-y-1.5 text-sm text-slate-600 mb-8">
              <p>✅ Invoice <strong>{invoiceNo}</strong> approved</p>
              <p>✅ Stock updated with <strong>{getTotalNewReceived()} units</strong></p>
              <p>✅ Quality check: <strong>{qualityCheck}</strong></p>
              {getTotalShortage() > 0 && <p className="text-orange-600 font-bold">⚠️ {getTotalShortage()} units still pending — next invoice required</p>}
            </div>
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-left">
                <p className="text-xs font-bold text-slate-700 mb-3">📦 Stock Added:</p>
                <div className="space-y-2">
                  {receivedItems.filter((i) => (i.physicalQty ?? i.newReceived ?? 0) > 0).map((item, idx) => {
                    const phys = item.physicalQty ?? item.newReceived ?? 0;
                    const damaged = item.damagedQty || 0;
                    const total = (item.alreadyReceived || 0) + phys;
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-mono">{item.productCode}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{total}/{item.orderedQty}</span>
                          <span className="font-bold text-emerald-600">+{phys} {item.unit}</span>
                          {damaged > 0 && <span className="text-red-500 font-bold text-[10px]">({damaged} damaged tracked)</span>}
                          <StatusPill status={getItemStatus(item.orderedQty || 0, total)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <BtnSecondary onClick={async () => {
                localStorage.removeItem("storeQcDraft");
                setStep(1); setQcMode("po"); setSelectedInvoice(null); setSelectedPO(null); setReceivedItems([]);
                setSelectedSO(null); setSoItems([]);
                setInvoiceNo(""); setInvoiceDate(""); setQualityCheck("passed"); setRemarks(""); setCurrentPage(1);
                await fetchPendingInvoices(); await fetchPendingSalesOrders();
              }}>Review Another</BtnSecondary>
              <BtnPrimary onClick={() => { localStorage.removeItem("storeQcDraft"); navigate("/store/dashboard"); }}>Go to Dashboard</BtnPrimary>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => {
            setStep(1);
            if (qcMode === "so") { setSelectedSO(null); setSoItems([]); setQcMode("po"); }
            else { setSelectedInvoice(null); setSelectedPO(null); setReceivedItems([]); }
          }}>← Back</BtnSecondary>
          <BtnPrimary onClick={() => setStep(3)}>Next: Quality Check →</BtnPrimary>
        </div>
      )}
      {step === 3 && (
        <div className="flex justify-end gap-3">
          <BtnSecondary onClick={() => setStep(2)}>← Back</BtnSecondary>
          {qcMode === "so" ? (
            <button onClick={handleSOSubmit} disabled={uploading}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center gap-2 ${qualityCheck === "failed" ? "bg-red-600 hover:bg-red-700" : liveSoStatus === "complete" ? "bg-violet-600 hover:bg-violet-700" : "bg-amber-500 hover:bg-amber-600"}`}>
              {uploading ? (<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</>)
                : qualityCheck === "failed" ? "❌ Reject SO"
                : liveSoStatus === "complete" ? "✅ Approve — Ready for Dispatch"
                : "⚠️ Approve with Shortage"}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={uploading}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center gap-2 ${qualityCheck === "failed" ? "bg-red-600 hover:bg-red-700" : qualityCheck === "passed_with_issues" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              {uploading ? (<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</>) : qualityCheck === "failed" ? "❌ Reject & Notify Sales" : qualityCheck === "passed_with_issues" ? "⚠️ Approve with Issues & Update Stock" : "✅ Approve & Update Stock"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}