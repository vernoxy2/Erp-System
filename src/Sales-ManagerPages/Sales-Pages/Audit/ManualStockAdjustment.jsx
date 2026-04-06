import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useLocation } from "react-router-dom";
import { db, auth } from "../../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

const generateDocId = (type = "ADJ") => {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${type}-${year}-${rand}`;
};

const ManualStockAdjustment = () => {
  const location = useLocation();

  const [mode, setMode] = useState("");
  const [adjustments, setAdjustments] = useState([]);
  const [currentAdjustment, setCurrentAdjustment] = useState({
    productCode: "",
    productName: "",
    systemStock: 0,
    adjustQty: 0,
    unit: "KG",
    category: "",
    reason: "",
  });
  const [stockDocId, setStockDocId] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Bulk states
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkValidating, setBulkValidating] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Verification prefill banner
  const [verificationSource, setVerificationSource] = useState(null);
  const [prefillLoading, setPrefillLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState({
    name: "",
    role: "user",
    department: "",
    email: "",
    uid: "",
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      try {
        const q = query(
          collection(db, "user"),
          where("email", "==", firebaseUser.email),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userData = snap.docs[0].data();
          setCurrentUser({
            name: userData.name || "Store Manager",
            role: userData.role || "user",
            department: userData.department || "",
            email: userData.email || firebaseUser.email,
            uid: firebaseUser.uid,
          });
        }
      } catch (err) {
        console.error(err);
      }
    });
    return () => unsubscribe();
  }, []);

  const categories = [
    "Physical Verification Mismatch",
    "Damaged Stock",
    "Expired Stock",
    "Found in Storage",
    "Theft/Loss",
    "Data Entry Error",
    "Extra Stock",
    "Other",
  ];

  const getApprovalLevel = (role, department) => {
    const r = (role || "").toLowerCase();
    const d = (department || "").toLowerCase();
    if (d === "warehouse") return "Admin";
    if (r.includes("store")) return "Admin";
    if (r.includes("sales")) return "Store Manager";
    if (r.includes("admin")) return "Owner";
    return "Admin";
  };

  // ── On mount: check if navigated from VerificationReports ──
  useEffect(() => {
    const state = location.state;
    if (state?.fromVerification && state?.prefillProducts?.length > 0) {
      setVerificationSource(state.verificationId);
      setMode("single");
      autoFillFromVerification(state.prefillProducts);
    }
  }, []);

  // ── Auto-fill adjustments from verification mismatches ──
  const autoFillFromVerification = async (prefillProducts) => {
    setPrefillLoading(true);
    const filled = [];

    for (const p of prefillProducts) {
      try {
        const q = query(
          collection(db, "stock"),
          where("productCode", "==", p.productCode),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const item = d.data();
          const systemStock = item.available ?? p.systemStock ?? 0;
          const adjustQty = p.physicalCount - systemStock;
          const newTotal = systemStock + adjustQty;
          filled.push({
            productCode: p.productCode,
            productName: item.description || item.productName || p.productName,
            systemStock,
            adjustQty,
            adjustment: adjustQty,
            adjustmentType: adjustQty < 0 ? "decrease" : "increase",
            newTotal,
            unit: item.unit || p.unit || "KG",
            category: p.category || "Physical Verification Mismatch",
            reason: p.reason || `Verification mismatch`,
            stockDocId: d.id,
          });
        }
      } catch (err) {
        console.error("Prefill fetch error for", p.productCode, err);
      }
    }

    setAdjustments(filled);
    setPrefillLoading(false);
  };

  // ── Auto-fill on product code blur ──
  // const handleProductCodeBlur = async () => {
  //   const code = currentAdjustment.productCode.trim();
  //   if (!code) return;
  //   setLoadingCode(true);
  //   try {
  //     const q = query(
  //       collection(db, "stock"),
  //       where("productCode", "==", code),
  //     );
  //     const snap = await getDocs(q);
  //     if (!snap.empty) {
  //       const d = snap.docs[0];
  //       const item = d.data();
  //       setStockDocId(d.id);
  //       setCurrentAdjustment((prev) => ({
  //         ...prev,
  //         productName: item.description || item.productName || "",
  //         systemStock: item.available ?? 0,
  //         unit: item.unit || "KG",
  //       }));
  //     } else {
  //       alert("Product code not found in stock!");
  //       setStockDocId(null);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   }
  //   setLoadingCode(false);
  // };

  const handleProductCodeBlur = async () => {
    const code = currentAdjustment.productCode.trim();
    if (!code) return;
    setLoadingCode(true);
    try {
      const q = query(
        collection(db, "stock"),
        where("productCode", "==", code),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        // ✅ Found — auto-fill as before
        const d = snap.docs[0];
        const item = d.data();
        setStockDocId(d.id);
        setIsManualEntry(false);
        setCurrentAdjustment((prev) => ({
          ...prev,
          productName: item.description || item.productName || "",
          systemStock: item.available ?? 0,
          unit: item.unit || "KG",
        }));
      } else {
        // ✅ Not found — manual entry allow કરો, alert નહીં
        setStockDocId(null);
        setIsManualEntry(true);
        setCurrentAdjustment((prev) => ({
          ...prev,
          productName: "",
          systemStock: 0,
          unit: "",
        }));
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingCode(false);
  };
  // ── Single: Add to list ──
  const addAdjustment = () => {
    if (!currentAdjustment.reason) {
      alert("Reason is mandatory!");
      return;
    }
    // if (!stockDocId) {
    //   alert("Please enter a valid product code first!");
    //   return;
    // }
    if (!stockDocId && !isManualEntry) {
      alert("Please enter a product code first!");
      return;
    }
    if (isManualEntry && !currentAdjustment.productName) {
      alert("Product Name is mandatory for new items!");
      return;
    }
    if (isManualEntry && !currentAdjustment.unit) {
      alert("Unit is mandatory for new items!");
      return;
    }
    const newTotal = currentAdjustment.adjustQty;
    const adjustment =
      currentAdjustment.adjustQty - currentAdjustment.systemStock;
    setAdjustments([
      ...adjustments,
      {
        ...currentAdjustment,
        adjustment,
        adjustmentType: adjustment < 0 ? "decrease" : "increase",
        newTotal,
        stockDocId,
      },
    ]);
    setCurrentAdjustment({
      productCode: "",
      productName: "",
      systemStock: 0,
      adjustQty: 0,
      unit: "KG",
      category: "",
      reason: "",
    });
    setStockDocId(null);
    setIsManualEntry(false);
  };

  // ── Remove a prefilled or manually added adjustment ──
  const removeAdjustment = (index) => {
    setAdjustments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Single: Submit ──
  const submitForApproval = async () => {
    if (adjustments.length === 0) return;
    setSubmitting(true);
    try {
      const docId = generateDocId("ADJ");
      const ref = `MANUAL-${docId}`;

      // for (const adj of adjustments) {
      //   // const newAvailable = adj.systemStock + adj.adjustment;
      //   const newAvailable = adj.newTotal;
      //   const ledgerEntry = {
      //     type: "MANUAL_ADJUSTMENT",
      //     qty: Math.abs(adj.adjustment),
      //     balance: newAvailable,
      //     by: currentUser.name,
      //     ref,
      //     date: new Date().toISOString(),
      //     remarks: `Manual Adjustment — ${adj.reason}${adj.category ? ` (${adj.category})` : ""}`,
      //   };
      //   await updateDoc(doc(db, "stock", adj.stockDocId), {
      //     available: newAvailable,
      //     ledger: arrayUnion(ledgerEntry),
      //   });
      // }
      for (const adj of adjustments) {
        const newAvailable = adj.newTotal;
        const ledgerEntry = {
          type: "MANUAL_ADJUSTMENT",
          qty: Math.abs(adj.adjustment),
          balance: newAvailable,
          by: currentUser.name,
          ref,
          date: new Date().toISOString(),
          remarks: `Manual Adjustment — ${adj.reason}${adj.category ? ` (${adj.category})` : ""}`,
        };

        if (adj.stockDocId) {
          // ✅ Found in stock — update
          await updateDoc(doc(db, "stock", adj.stockDocId), {
            available: newAvailable,
            ledger: arrayUnion(ledgerEntry),
          });
        } else {
          // ✅ Manual entry — create new stock doc
          await addDoc(collection(db, "stock"), {
            productCode: adj.productCode,
            description: adj.productName,
            available: newAvailable,
            unit: adj.unit,
            ledger: [ledgerEntry],
            createdAt: serverTimestamp(),
          });
        }
      }

      await addDoc(collection(db, "stockAdjustments"), {
        docId,
        type: "Stock Adjustment",
        status: "pending",
        requestedBy: currentUser.name,
        requestedByRole: currentUser.role,
        department: currentUser.department,
        approvalLevel: getApprovalLevel(
          currentUser.role,
          currentUser.department,
        ),
        totalProducts: adjustments.length,
        sourceVerificationId: verificationSource || null,
        products: adjustments.map((adj) => ({
          productCode: adj.productCode,
          productName: adj.productName,
          systemStock: adj.systemStock,
          physicalStock: adj.systemStock + adj.adjustment,
          // adjustment: adj.adjustment,
          adjustment: adj.newTotal - adj.systemStock,
          adjustQty: adj.newTotal - adj.systemStock,
          // adjustQty: adj.adjustment,
          newTotal: adj.newTotal,
          unit: adj.unit,
          category: adj.category || "",
          reason: adj.reason,
          stockDocId: adj.stockDocId,
        })),
        createdAt: serverTimestamp(),
      });

      alert(
        `✅ ${adjustments.length} adjustment(s) applied & submitted for review! (ID: ${docId})`,
      );
      setAdjustments([]);
      setVerificationSource(null);
      setMode("");
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
    setSubmitting(false);
  };

  // ── Bulk: Download template ──
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Sl",
        "Description of Goods",
        "",
        "",
        "",
        "",
        "",
        "",
        "HSN/SAC",
        "Part No.",
        "Quantity",
      ],
      ["No.", "", "", "", "", "", "", "", "", "", ""],
      [
        1,
        "PPRCT FR COMPOSITE PIPE PN10- 110MM",
        "",
        "",
        "",
        "",
        "",
        "",
        "39173990",
        "PPR-110-10",
        200,
      ],
      [
        2,
        "PPRCT COUPLER SIZE 110MM",
        "",
        "",
        "",
        "",
        "",
        "",
        "39174000",
        "FRC-110-1",
        10,
      ],
    ]);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 40 },
      { wch: 5 },
      { wch: 5 },
      { wch: 5 },
      { wch: 5 },
      { wch: 5 },
      { wch: 5 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Audit");
    XLSX.writeFile(wb, "Stock_Audit_Template.xlsx");
  };

  // ── Bulk: Upload & validate ──
  // valid=true  → found in stock   → will UPDATE
  // isNew=true  → not found        → will CREATE new stock entry
  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkValidating(true);
    setBulkRows([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
        const dataRows = rows
          .slice(2)
          .filter((r) => r[0] !== undefined && r[0] !== null && r[0] !== "");

        const validated = [];
        for (const row of dataRows) {
          const sl = row[0];
          const description = String(row[1] || "").trim();
          const hsnSac = String(row[8] || "").trim();
          const partNo = String(row[9] || "").trim();
          const physicalQty = parseFloat(row[10] ?? 0);
          if (!partNo) continue;

          try {
            const q = query(
              collection(db, "stock"),
              where("productCode", "==", partNo),
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              // ── MATCHED: existing stock doc found ──
              const d = snap.docs[0];
              const item = d.data();
              const systemStock = item.available ?? 0;
              const adjustQty = physicalQty - systemStock;
              validated.push({
                sl,
                productCode: partNo,
                productName: item.description || description,
                hsnSac,
                systemStock,
                physicalQty,
                adjustQty,
                newTotal: physicalQty,
                unit: item.unit || "PCS",
                reason: "Physical Verification Mismatch",
                category: "Physical Verification Mismatch",
                stockDocId: d.id,
                isNew: false,
                valid: true,
                error: "",
              });
            } else {
              // ── NOT FOUND: will create new stock entry ──
              validated.push({
                sl,
                productCode: partNo,
                productName: description,
                hsnSac,
                systemStock: 0,
                physicalQty,
                adjustQty: physicalQty,
                newTotal: physicalQty,
                unit: "PCS",
                reason: "Physical Verification — New Item",
                category: "Physical Verification Mismatch",
                stockDocId: null,
                isNew: true,
                valid: false,
                error: "New Item",
              });
            }
          } catch {
            validated.push({
              sl,
              productCode: partNo,
              productName: description,
              hsnSac,
              systemStock: 0,
              physicalQty,
              adjustQty: 0,
              newTotal: 0,
              unit: "PCS",
              reason: "",
              stockDocId: null,
              isNew: false,
              valid: false,
              error: "Firebase error",
            });
          }
        }
        setBulkRows(validated);
      } catch (err) {
        alert("Error reading file. Please check the format.");
        console.error(err);
      }
      setBulkValidating(false);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const submitBulk = async () => {
    const rowsToProcess = bulkRows.filter((r) => r.valid || r.isNew);
    if (rowsToProcess.length === 0) return;
    setShowConfirm(false);
    setBulkSubmitting(true);
    try {
      const docId = generateDocId("ADJ");
      const ref = `MANUAL-${docId}`;

      for (const row of rowsToProcess) {
        if (row.isNew) {
          // ── CREATE new stock document ──
          await addDoc(collection(db, "stock"), {
            productCode: row.productCode,
            description: row.productName,
            available: row.physicalQty,
            unit: row.unit,
            hsnSac: row.hsnSac || "",
            ledger: [
              {
                type: "IN",
                qty: row.physicalQty,
                balance: row.physicalQty,
                by: currentUser.name,
                ref,
                date: new Date().toISOString(),
                remarks: `Initial Stock Entry — Bulk Physical Verification`,
              },
            ],
            createdAt: serverTimestamp(),
          });
        } else {
          // ── UPDATE existing stock document ──
          const ledgerEntry = {
            type: "BULK_ADJUSTMENT",
            qty: Math.abs(row.adjustQty),
            balance: row.newTotal,
            by: currentUser.name,
            ref,
            date: new Date().toISOString(),
            // remarks: `Manual Adjustment — ${row.reason || "Bulk Stock Audit"}`,
            remarks: `Bulk Stock Adjustment — Physical Qty set to ${row.newTotal} ${row.unit}`,
          };
          await updateDoc(doc(db, "stock", row.stockDocId), {
            available: row.newTotal,
            ledger: arrayUnion(ledgerEntry),
          });
        }
      }

      await addDoc(collection(db, "stockAdjustments"), {
        docId,
        type: "Stock Adjustment (Bulk)",
        status: "pending",
        requestedBy: currentUser.name,
        requestedByRole: currentUser.role,
        department: currentUser.department,
        approvalLevel: getApprovalLevel(
          currentUser.role,
          currentUser.department,
        ),
        totalProducts: rowsToProcess.length,
        sourceVerificationId: verificationSource || null,
        products: rowsToProcess.map((row) => ({
          productCode: row.productCode,
          productName: row.productName,
          hsnSac: row.hsnSac || "",
          systemStock: row.systemStock,
          physicalQty: row.physicalQty,
          adjustment: row.adjustQty,
          adjustQty: row.adjustQty,
          newTotal: row.newTotal,
          unit: row.unit,
          category: row.category || "Physical Verification Mismatch",
          reason: row.reason || "Bulk Stock Audit",
          isNewItem: row.isNew,
          stockDocId: row.stockDocId || null,
        })),
        createdAt: serverTimestamp(),
      });

      setBulkSubmitting(false);
      setBulkRows([]);
      setMode("");
      setVerificationSource(null);
      alert(
        `✅ ${rowsToProcess.filter((r) => !r.isNew).length} items updated, ` +
          `${rowsToProcess.filter((r) => r.isNew).length} new items added to stock. (ID: ${docId})`,
      );
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
      setBulkSubmitting(false);
    }
  };

  const totalIncreases = adjustments.filter(
    (adj) => adj.adjustmentType === "increase",
  ).length;
  const validBulkCount = bulkRows.filter((r) => r.valid).length;
  const newBulkCount = bulkRows.filter((r) => r.isNew).length;
  const errorBulkCount = bulkRows.filter((r) => !r.valid && !r.isNew).length;
  const totalSubmittable = validBulkCount + newBulkCount;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Manual Stock Adjustment
        </h1>
        <p className="text-gray-600 mt-1">
          Stock updates immediately — also logged to Approval Queue
        </p>
      </div>

      {/* ── Verification Source Banner ── */}
      {verificationSource && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-sm font-semibold text-orange-800">
                Auto-filled from Verification Report
              </p>
              <p className="text-xs text-orange-600">
                Report ID: {verificationSource} — Review and edit before
                submitting
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerificationSource(null)}
            className="text-orange-400 hover:text-orange-700 text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* Prefill loading */}
      {prefillLoading && (
        <div className="mb-6 text-center py-6 text-indigo-500 text-sm animate-pulse">
          Fetching stock data for mismatched products...
        </div>
      )}

      {/* ── Mode Selection ── */}
      {!mode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onClick={() => setMode("single")}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-lg cursor-pointer transition-all"
          >
            <div className="flex items-start space-x-4">
              <span className="text-4xl"></span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  Single Product Mode
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  For daily use, 1-10 products, manual entry
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>• Quick product selection</li>
                  <li>• Enter adjustment qty</li>
                  <li>• Specify reason</li>
                  <li>• Updates stock immediately</li>
                </ul>
                <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Start Single Mode
                </button>
              </div>
            </div>
          </div>

          <div
            onClick={() => setMode("bulk")}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-lg cursor-pointer transition-all"
          >
            <div className="flex items-start space-x-4">
              <span className="text-4xl"></span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  Bulk Upload Mode
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  For annual audits, 10+ products via Excel
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>• Upload audit Excel directly</li>
                  <li>• Auto-fetches from stock using Part No.</li>
                  <li>• Preview before submit</li>
                  <li>• Updates all stock at once</li>
                </ul>
                <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Start Bulk Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Product Mode ── */}
      {mode === "single" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {adjustments.length}
                  </p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <span className="text-2xl"></span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Increases</p>
                  <p className="text-2xl font-bold text-green-600">
                    {totalIncreases}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <span className="text-2xl"></span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Add Product Adjustment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Code *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentAdjustment.productCode}
                    onChange={(e) =>
                      setCurrentAdjustment({
                        ...currentAdjustment,
                        productCode: e.target.value,
                      })
                    }
                    onBlur={handleProductCodeBlur}
                    placeholder="e.g. PPR-110-10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {loadingCode && (
                    <span className="absolute right-3 top-2.5 text-xs text-indigo-500 animate-pulse">
                      Fetching...
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name{" "}
                  <span className="text-xs text-indigo-500">(auto-filled)</span>
                </label>
                {/* <input
                  type="text"
                  value={currentAdjustment.productName}
                  readOnly
                  placeholder="Auto-filled from product code"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                /> */}
                <input
                  type="text"
                  value={currentAdjustment.productName}
                  readOnly={!isManualEntry}
                  onChange={(e) =>
                    setCurrentAdjustment({
                      ...currentAdjustment,
                      productName: e.target.value,
                    })
                  }
                  placeholder={
                    isManualEntry
                      ? "Type product name..."
                      : "Auto-filled from product code"
                  }
                  className={`w-full px-4 py-2 border rounded-lg ${
                    isManualEntry
                      ? "border-orange-400 bg-white text-gray-800 focus:ring-2 focus:ring-orange-400"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current System Stock{" "}
                  <span className="text-xs text-indigo-500">(auto-filled)</span>
                </label>
                <input
                  type="number"
                  value={currentAdjustment.systemStock}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Physical Qty *{" "}
                  <span className="text-xs text-gray-400">
                    (+ to add, - to remove)
                  </span>
                  {currentAdjustment.productName &&
                    currentAdjustment.adjustQty !== 0 &&
                    (() => {
                      const diff =
                        currentAdjustment.adjustQty -
                        currentAdjustment.systemStock;
                      return (
                        <span className="ml-2 text-xs font-normal">
                          →{" "}
                          <span
                            className={
                              diff >= 0
                                ? "text-green-600 font-bold"
                                : "text-red-600 font-bold"
                            }
                          >
                            {diff > 0 ? "+" : ""}
                            {diff} {currentAdjustment.unit}
                          </span>
                        </span>
                      );
                    })()}
                </label>
                <input
                  type="number"
                  value={currentAdjustment.adjustQty}
                  onChange={(e) =>
                    setCurrentAdjustment({
                      ...currentAdjustment,
                      adjustQty: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="e.g. 500 or -200"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit{" "}
                  <span className="text-xs text-indigo-500">(auto-filled)</span>
                </label>
                {/* <input
                  type="text"
                  value={currentAdjustment.unit}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                /> */}
                <input
                  type="text"
                  value={currentAdjustment.unit}
                  readOnly={!isManualEntry}
                  onChange={(e) =>
                    setCurrentAdjustment({
                      ...currentAdjustment,
                      unit: e.target.value,
                    })
                  }
                  placeholder={isManualEntry ? "e.g. KG, PCS, MTR..." : ""}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    isManualEntry
                      ? "border-orange-400 bg-white text-gray-800 focus:ring-2 focus:ring-orange-400"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category{" "}
                  <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <select
                  value={currentAdjustment.category}
                  onChange={(e) =>
                    setCurrentAdjustment({
                      ...currentAdjustment,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason * <span className="text-red-600">(Mandatory)</span>
                </label>
                <textarea
                  value={currentAdjustment.reason}
                  onChange={(e) =>
                    setCurrentAdjustment({
                      ...currentAdjustment,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Explain the reason for this adjustment..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {currentAdjustment.productName &&
              currentAdjustment.adjustQty !== 0 &&
              (() => {
                const diff =
                  currentAdjustment.adjustQty - currentAdjustment.systemStock;
                return (
                  <div
                    className={`mt-4 p-3 rounded-lg text-sm border ${
                      diff >= 0
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    Stock will be SET to:{" "}
                    <strong>
                      {currentAdjustment.adjustQty} {currentAdjustment.unit}
                    </strong>
                    &nbsp;(System: {currentAdjustment.systemStock} → Physical:{" "}
                    {currentAdjustment.adjustQty}, Diff:{" "}
                    <strong>
                      {diff > 0 ? "+" : ""}
                      {diff}
                    </strong>
                    )
                  </div>
                );
              })()}

            <div className="mt-4 flex space-x-3">
              <button
                onClick={addAdjustment}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Adjustment
              </button>
              <button
                onClick={() => {
                  setMode("");
                  setVerificationSource(null);
                }}
                className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* ── Pending / Pre-filled Adjustments ── */}
          {adjustments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {verificationSource
                  ? "Pre-filled from Verification Report"
                  : "Pending Adjustments"}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Product
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        System Stock
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        Adjust Qty
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        New Total
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        Remove
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.map((adj, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">
                            {adj.productCode}
                          </div>
                          <div className="text-sm text-gray-500">
                            {adj.productName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800">
                          {adj.systemStock} {adj.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              adj.adjustmentType === "decrease"
                                ? "text-red-600 font-semibold"
                                : "text-green-600 font-semibold"
                            }
                          >
                            {adj.adjustment > 0 ? "+" : ""}
                            {adj.adjustment} {adj.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-700">
                          {adj.newTotal} {adj.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {adj.category || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {adj.reason}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeAdjustment(index)}
                            className="text-red-400 hover:text-red-600 text-lg font-bold"
                            title="Remove"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex items-center justify-end">
                <button
                  onClick={submitForApproval}
                  disabled={submitting}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Updating Stock..." : "Submit & Update Stock"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk Upload Mode ── */}
      {mode === "bulk" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              Bulk Upload via Excel
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              Supported format — Sl · Description of Goods · HSN/SAC · Part No.
              · Quantity
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center">
                <div className="text-4xl mb-3">📥</div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Step 1: Download Template
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Sl · Description · HSN/SAC · Part No. · Quantity
                </p>
                <button
                  onClick={downloadTemplate}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  Download Template
                </button>
              </div>

              <div className="border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-lg p-5 text-center">
                <div className="text-4xl mb-3">📤</div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Step 2: Upload File
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Auto-validates each Part No. from stock
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  id="bulk-file-upload"
                  onChange={handleBulkUpload}
                />
                <label
                  htmlFor="bulk-file-upload"
                  className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer text-sm"
                >
                  {bulkValidating ? "Validating..." : "Choose File"}
                </label>
                <p className="text-xs text-gray-400 mt-2">.xlsx / .xls only</p>
              </div>
            </div>

            {bulkValidating && (
              <div className="text-center py-8 text-indigo-500 text-sm animate-pulse">
                🔍 Validating Part No. against stock collection...
              </div>
            )}

            {!bulkValidating && bulkRows.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="text-sm font-semibold text-gray-700">
                    {bulkRows.length} rows found
                  </span>
                  {validBulkCount > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                      {validBulkCount} matched
                    </span>
                  )}
                  {newBulkCount > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      ＋ {newBulkCount} new items
                    </span>
                  )}
                  {errorBulkCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                      ✗ {errorBulkCount} error
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                          Sl
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                          Part No.
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                          Description
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">
                          HSN/SAC
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                          System Stock
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                          Physical Qty
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                          Difference
                        </th>
                        {/* <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Difference</th> */}
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                          New Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-gray-100 ${
                            row.valid
                              ? "bg-white hover:bg-gray-50"
                              : row.isNew
                                ? "bg-blue-50 hover:bg-blue-100"
                                : "bg-red-50"
                          }`}
                        >
                          <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">
                            {row.sl}
                          </td>
                          <td className="px-3 py-2.5">
                            {row.valid ? (
                              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Matched
                              </span>
                            ) : row.isNew ? (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                ＋ New Item
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {row.error}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-700 font-semibold">
                            {row.productCode}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">
                            {row.productName}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-gray-500 font-mono">
                            {row.hsnSac || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-gray-700">
                            {row.isNew ? (
                              <span className="text-blue-400 italic text-[10px]">
                                new
                              </span>
                            ) : (
                              `${row.systemStock} ${row.unit}`
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold text-gray-800">
                            {row.physicalQty} {row.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold">
                            {row.valid ? (
                              <span
                                className={
                                  row.adjustQty > 0
                                    ? "text-green-600"
                                    : row.adjustQty < 0
                                      ? "text-red-600"
                                      : "text-gray-400"
                                }
                              >
                                {row.adjustQty > 0 ? "+" : ""}
                                {row.adjustQty}
                              </span>
                            ) : row.isNew ? (
                              <span className="text-blue-600">
                                +{row.physicalQty}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          {/* {row.adjustQty !== 0 && (
                            <span
                              className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                                row.adjustQty > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {row.adjustQty > 0 ? "+" : ""}
                              {row.adjustQty}
                            </span>
                          )} */}
                          <td className="px-3 py-2.5 text-right text-xs font-bold text-indigo-700">
                            {row.valid || row.isNew
                              ? `${row.newTotal} ${row.unit}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setBulkRows([])}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear & re-upload
                  </button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    navigate="/store/stock-alerts"
                    disabled={bulkSubmitting || totalSubmittable === 0}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    {bulkSubmitting
                      ? "Updating Stock..."
                      : `Submit & Update ${totalSubmittable} Items →`}
                  </button>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={() => {
                  setMode("");
                  setBulkRows([]);
                  setVerificationSource(null);
                }}
                className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Confirmation Modal ── */}
      {showConfirm && (
        <div
          style={{
            minHeight: 400,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="fixed inset-0 z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 text-center">
            <div className="text-5xl mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Confirm Bulk Stock Update
            </h2>
            <p className="text-gray-500 text-sm mb-3">
              You are about to process{" "}
              <span className="font-bold text-indigo-700">
                {totalSubmittable} items
              </span>
              .
            </p>
            <div className="flex justify-center gap-2 mb-5">
              {validBulkCount > 0 && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                  {validBulkCount} update existing
                </span>
              )}
              {newBulkCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                  ＋ {newBulkCount} add new
                </span>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2 max-h-52 overflow-y-auto">
              {bulkRows
                .filter((r) => r.valid || r.isNew)
                .map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs border-b border-gray-100 pb-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      {row.isNew && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-1 py-0.5 rounded">
                          NEW
                        </span>
                      )}
                      <span className="font-mono font-semibold text-gray-700">
                        {row.productCode}
                      </span>
                      <span className="text-gray-400 ml-1 truncate max-w-[100px]">
                        — {row.productName}
                      </span>
                    </div>
                    <span className="font-bold ml-2 whitespace-nowrap">
                      {row.isNew ? (
                        <span className="text-blue-700">
                          ＋{row.physicalQty} {row.unit}
                        </span>
                      ) : (
                        <>
                          <span className="text-gray-500">
                            {row.systemStock}
                          </span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-indigo-700">
                            {row.newTotal}
                          </span>
                          <span className="text-gray-400 ml-0.5">
                            {row.unit}
                          </span>
                          {row.adjustQty !== 0 && (
                            <span
                              className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                                row.adjustQty > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {row.adjustQty > 0 ? "+" : ""}
                              {row.adjustQty}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitBulk}
                className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Confirm & Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualStockAdjustment;
