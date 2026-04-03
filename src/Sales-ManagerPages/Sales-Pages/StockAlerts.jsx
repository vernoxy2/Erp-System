import { useState, useMemo, useEffect } from "react";
import {
  FiSearch,
  FiEye,
  FiClock,
  FiArrowUp,
  FiArrowDown,
  FiAlertCircle,
  FiRefreshCw,
  FiAlertTriangle,
  FiPackage,
} from "react-icons/fi";
import { Card, CardHeader, Modal } from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const getStockStatus = (available, lowLevel, reorderLevel) => {
  if (available <= 0) return "shortage";
  if (available < lowLevel * 0.5) return "shortage";
  if (available < lowLevel) return "low";
  if (available < reorderLevel) return "reorder";
  return "ok";
};

export default function SalesStock() {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLow, setFilterLow] = useState(false);
  const [ledgerItem, setLedgerItem] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("__ALL__");
  const [statusFilter, setStatusFilter] = useState("__ALL__");
  const [categoryList, setCategoryList] = useState([]);
  const [vendorFilter, setVendorFilter] = useState("__ALL__");
  const [vendorList, setVendorList] = useState([]);
  const [qcDamageMap, setQcDamageMap] = useState({});
  const [soPartialMap, setSoPartialMap] = useState({});

  // ── Load QC damage + SO partial maps ──
  useEffect(() => {
    const loadQCData = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "excelupload"), where("type", "==", "so")),
        );
        const damageMap = {};
        const partialMap = {};

        snap.docs.forEach((d) => {
          const so = d.data();
          const soNo =
            so.woNumber ||
            so.excelHeader?.voucherNo ||
            so.excelHeader?.reference ||
            "—";
          const soSt = so.soStatus || "";
          const soIsFulfilled = [
            "complete",
            "dispatched",
            "ready_for_dispatch",
            "fulfilled",
          ].includes(soSt);

          (so.items || []).forEach((item) => {
            const code = item.productCode;
            if (!code) return;
            const dmg = parseFloat(item.damagedQty || 0);
            const orderedQty = parseFloat(
              item.orderedQty || item.quantity || 0,
            );
            const invoicedQty = parseFloat(item.totalInvoicedQty || 0);
            const itemFulfilled = orderedQty > 0 && invoicedQty >= orderedQty;
            if (
              dmg > 0 &&
              !item.damageResolved &&
              !soIsFulfilled &&
              !itemFulfilled
            ) {
              damageMap[code] = (damageMap[code] || 0) + dmg;
            }
          });

          const hasQcShortage =
            (soSt === "waiting_for_qc" || soSt === "ready_for_dispatch") &&
            (so.soQcIssues || []).length > 0;

          if (hasQcShortage) {
            (so.soQcIssues || []).forEach((iss) => {
              const code = iss.productCode;
              if (!code) return;
              const shortQty = parseFloat(iss.shortage || 0);
              if (shortQty > 0 && !partialMap[code]) {
                partialMap[code] = {
                  pending: shortQty,
                  soNo,
                  soDocId: d.id,
                  source: "qc_shortage",
                };
              }
            });
          }

          if (soSt === "waiting_for_qc") {
            (so.items || []).forEach((item) => {
              const code = item.productCode;
              if (!code) return;
              const ordered = parseFloat(item.orderedQty || item.quantity || 0);
              const readyQty = parseFloat(item.soQcReadyQty ?? ordered);
              const short = ordered - readyQty;
              if (short > 0 && !partialMap[code]) {
                partialMap[code] = {
                  pending: short,
                  soNo,
                  soDocId: d.id,
                  source: "qc_shortage",
                };
              }
            });
          }

          if (
            so.orderStatus === "partial" ||
            so.soStatus === "partial_pending"
          ) {
            (so.items || []).forEach((item) => {
              const code = item.productCode;
              if (!code) return;
              const ordered = parseFloat(item.orderedQty || item.quantity || 0);
              const invoiced = parseFloat(item.invoicedQty || 0);
              const remaining = ordered - invoiced;
              if (remaining > 0) {
                partialMap[code] = {
                  pending: remaining,
                  soNo,
                  soDocId: d.id,
                  source: "invoice_partial",
                };
              }
            });
          }
        });

        setQcDamageMap(damageMap);
        setSoPartialMap(partialMap);
      } catch (err) {
        console.error("QC damage map load error:", err);
      }
    };

    loadQCData();
    const interval = setInterval(loadQCData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Stock subscription ──
  useEffect(() => {
    let unsubStock = null;
    getDocs(collection(db, "stockCategories")).then((catSnapshot) => {
      const thresholdMap = {};
      const cats = [];
      catSnapshot.docs.forEach((d) => {
        const cat = d.data();
        cats.push(cat.name);
        (cat.subcategories || []).forEach((sub) => {
          const key = (sub.name || "").trim().toLowerCase();
          if (key)
            thresholdMap[key] = {
              lowLevel: sub.lowLevel ?? 100,
              reorderLevel: sub.reorderLevel ?? 150,
              categoryName: cat.name,
            };
        });
      });
      cats.sort((a, b) => {
        const order = (n = "") =>
          n.toUpperCase().includes("PIPE")
            ? 0
            : n.toUpperCase().includes("FITTING")
              ? 1
              : 2;
        return order(a) - order(b) || a.localeCompare(b);
      });
      setCategoryList(cats);

      unsubStock = onSnapshot(collection(db, "stock"), (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const item = { id: d.id, ...d.data() };
          const key = (item.description || "").trim().toLowerCase();
          const thresh = thresholdMap[key] || {};
          return {
            ...item,
            lowLevel: item.lowLevel ?? thresh.lowLevel ?? 100,
            reorderLevel: item.reorderLevel ?? thresh.reorderLevel ?? 150,
            categoryName: thresh.categoryName ?? "Uncategorized",
          };
        });
        setStockItems(data);
        setLoading(false);
        const vendors = [
          ...new Set(
            data
              .flatMap((item) => (item.ledger || []).map((l) => l.by))
              .filter(Boolean),
          ),
        ].sort();
        setVendorList(vendors);
      });
    });
    return () => {
      if (unsubStock) unsubStock();
    };
  }, []);

  const getItemStatus = (item) =>
    getStockStatus(
      item.available ?? 0,
      item.lowLevel ?? 100,
      item.reorderLevel ?? 150,
    );

  const getDamagedQty = (item) => {
    const stockDmg = parseFloat(item.damagedQty || 0);
    const qcDmg = qcDamageMap[item.productCode] || 0;
    return Math.max(stockDmg, qcDmg);
  };

  const getSOPending = (item) => soPartialMap[item.productCode] || null;
  const getSOShortage = (item) => parseFloat(item.soShortage || 0);
  const [unitFilter, setUnitFilter] = useState("__ALL__");
  const shortageCount = stockItems.filter(
    (s) => getItemStatus(s) === "shortage",
  ).length;
  const lowCount = stockItems.filter((s) => getItemStatus(s) === "low").length;
  const reorderCount = stockItems.filter(
    (s) => getItemStatus(s) === "reorder",
  ).length;

  // const filtered = useMemo(() => {
  //   return stockItems.filter((s) => {
  //     const matchSearch =
  //       (s.description || "").toLowerCase().includes(search.toLowerCase()) ||
  //       (s.productCode || "").toLowerCase().includes(search.toLowerCase()) ||
  //       (s.ledger || []).some((l) =>
  //         (l.ref || "").toLowerCase().includes(search.toLowerCase()),
  //       );
  //     const matchCategory =
  //       categoryFilter === "__ALL__" || s.categoryName === categoryFilter;
  //     const matchAlert = !filterLow || getItemStatus(s) !== "ok";
  //     const matchStatus =
  //       statusFilter === "__ALL__" ||
  //       (statusFilter === "damaged"
  //         ? getDamagedQty(s) > 0
  //         : statusFilter === "partial"
  //           ? !!getSOPending(s)
  //           : statusFilter === "shortage_qc"
  //             ? s.qcIssue === "shortage"
  //             : statusFilter === "quality"
  //               ? s.qcIssue === "quality"
  //               : statusFilter === "excess"
  //                 ? s.qcIssue === "excess"
  //                 : getItemStatus(s) === statusFilter);
  //     const matchUnit =
  //       unitFilter === "__ALL__" ||
  //       (s.unit || "").toLowerCase() === unitFilter.toLowerCase();
  //     return (
  //       matchSearch &&
  //       matchCategory &&
  //       matchAlert &&
  //       matchStatus &&
  //       matchVendor &&
  //       matchUnit
  //     );
  //   });
  // }, [
  //   stockItems,
  //   search,
  //   filterLow,
  //   categoryFilter,
  //   statusFilter,
  //   vendorFilter,
  //   qcDamageMap,
  //   soPartialMap,
  // ]);

  const filtered = useMemo(() => { return stockItems.filter((s) => {
      const matchSearch =
        (s.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.productCode || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.ledger || []).some((l) =>
          (l.ref || "").toLowerCase().includes(search.toLowerCase()),
        );
      const matchCategory =
        categoryFilter === "__ALL__" || s.categoryName === categoryFilter;
      const matchAlert = !filterLow || getItemStatus(s) !== "ok";
      const matchStatus =
        statusFilter === "__ALL__" ||
        (statusFilter === "damaged"
          ? getDamagedQty(s) > 0
          : statusFilter === "partial"
            ? !!getSOPending(s)
            : statusFilter === "shortage_qc"
              ? s.qcIssue === "shortage"
              : statusFilter === "quality"
                ? s.qcIssue === "quality"
                : statusFilter === "excess"
                  ? s.qcIssue === "excess"
                  : getItemStatus(s) === statusFilter);
      const matchVendor =
        vendorFilter === "__ALL__" ||
        (s.ledger || []).some((l) => l.by === vendorFilter);
      const matchUnit =
        unitFilter === "__ALL__" ||
        (s.unit || "").toLowerCase() === unitFilter.toLowerCase();
      return (
        matchSearch &&
        matchCategory &&
        matchAlert &&
        matchStatus &&
        matchVendor &&
        matchUnit
      );
    });
  }, [
    stockItems,
    search,
    filterLow,
    categoryFilter,
    statusFilter,
    vendorFilter,
    unitFilter,
    qcDamageMap,
    soPartialMap,
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          Stock Management
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {loading
            ? "Loading..."
            : `${stockItems.length} total SKUs · Live stock levels`}
        </p>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-md text-slate-400 uppercase font-bold">
              Total SKUs
            </p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {stockItems.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4">
            <p className="text-md text-emerald-500 uppercase font-bold">
              Available
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {stockItems.filter((s) => getItemStatus(s) === "ok").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-md text-red-400 uppercase font-bold">Shortage</p>
            <p className="text-2xl font-black text-red-600 mt-1">
              {shortageCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <p className="text-md text-amber-500 uppercase font-bold">
              Low Stock
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {lowCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <p className="text-md text-orange-400 uppercase font-bold">
              Reorder
            </p>
            <p className="text-2xl font-black text-orange-600 mt-1">
              {reorderCount}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="px-5 py-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px] max-w-xs relative">
            <FiSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Search description / part no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[160px]"
          >
            <option value="__ALL__">All Categories</option>
            {categoryList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[140px]"
          >
            <option value="__ALL__">All Status</option>
            <option value="shortage">Shortage</option>
            <option value="damaged">Damage</option>
            <option value="shortage_qc">QC Shortage</option>
            <option value="quality">Quality Issue</option>
            <option value="excess">Excess</option>
            <option value="partial">SO Partial</option>
            <option value="low">Low Stock</option>
            <option value="reorder">Reorder</option>
            <option value="ok">OK</option>
          </select>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[120px]"
          >
            <option value="__ALL__">All Units</option>
            <option value="nos">NOS</option>
            <option value="kg">KG</option>
            <option value="pcs">PCS</option>
            <option value="mtr">MTR</option>
            <option value="set">SET</option>
          </select>
          <button
            onClick={() => setFilterLow(!filterLow)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
              filterLow
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600"
            }`}
          >
            <FiAlertCircle size={13} /> Alerts Only
          </button>
          <span className="ml-auto text-xs text-slate-400 font-medium">
            {filtered.length} results
          </span>
        </div>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader
          title="All Stock Items"
          subtitle="PO = stock increase, SO Invoice = stock decrease"
        />
        {loading ? (
          <div className="text-center py-16">
            <FiRefreshCw
              size={28}
              className="animate-spin mx-auto text-teal-500 mb-3"
            />
            <p className="text-sm text-slate-400">Fetching stock data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="bg-slate-50 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  <th className="px-5 py-3 text-left">No</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-center">Part No.</th>
                  <th className="px-4 py-3 text-center">HSN/SAC</th>
                  <th className="px-4 py-3 text-center">Available</th>
                  <th className="px-4 py-3 text-center">Reserved</th>
                  <th className="px-4 py-3 text-center">Reorder Qty</th>
                  <th className="px-4 py-3 text-center">Unit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item, idx) => {
                  const avail = Math.max(0, item.available ?? 0);
                  const reserved = item.reserved || 0;
                  const reorderQty = item.reorder || 0;
                  const status = getItemStatus(item);
                  const hasReorder = reorderQty > 0;
                  const damagedQty = getDamagedQty(item);
                  const hasDamage = damagedQty > 0;
                  const soPending = getSOPending(item);
                  const soShortage = getSOShortage(item);
                  const qcIssue = item.qcIssue || "";

                  // ✅ rowBg — qcIssue based colors
                  const rowBg = hasDamage
                    ? "bg-red-50/30"
                    : qcIssue === "shortage"
                      ? "bg-orange-50/20"
                      : qcIssue === "quality"
                        ? "bg-amber-50/20"
                        : qcIssue === "excess"
                          ? "bg-purple-50/20"
                          : qcIssue === "wrong_item"
                            ? "bg-blue-50/20"
                            : soPending
                              ? "bg-amber-50/20"
                              : status === "shortage"
                                ? "bg-red-50/40"
                                : hasReorder
                                  ? "bg-orange-50/30"
                                  : status === "low"
                                    ? "bg-amber-50/30"
                                    : status === "reorder"
                                      ? "bg-orange-50/20"
                                      : "";

                  const availColor =
                    status === "shortage"
                      ? "text-red-500"
                      : status === "low"
                        ? "text-amber-600"
                        : status === "reorder"
                          ? "text-orange-500"
                          : "text-teal-600";

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 transition-colors ${rowBg}`}
                    >
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">
                        {idx + 1}
                      </td>

                      {/* ✅ Description — Damage + QC Issue badges */}
                      <td className="px-4 py-3.5 text-slate-800 font-medium max-w-xs">
                        <div className="truncate">
                          {item.description || "—"}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {/* 🔴 Damage */}
                          {hasDamage && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600 border border-red-200">
                              <FiAlertTriangle size={9} /> {damagedQty} Damaged
                            </span>
                          )}
                          {/* 🟠 Shortage (QC) */}
                          {!hasDamage && qcIssue === "shortage" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                              🟠 Shortage
                            </span>
                          )}
                          {/* 🟡 Quality */}
                          {!hasDamage && qcIssue === "quality" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              🟡 Quality Issue
                            </span>
                          )}
                          {/* 🟣 Excess */}
                          {!hasDamage && qcIssue === "excess" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                              🟣 Excess
                            </span>
                          )}
                          {/* 🔵 Wrong Item */}
                          {!hasDamage && qcIssue === "wrong_item" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                              🔵 Wrong Item
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">
                          {item.productCode || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-500 font-mono">
                        {item.hsnSac || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`font-black text-base ${availColor}`}>
                          {avail}
                        </span>
                        {hasDamage && (
                          <p className="text-[10px] text-red-400 font-bold mt-0.5 leading-none">
                            +{damagedQty} dmg
                          </p>
                        )}
                      </td>

                      {/* Reserved */}
                      <td className="px-4 py-3.5 text-center">
                        {reserved > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-black text-amber-600 text-base">
                              {/* {reserved} */}
                              {reserved > 0 ? reserved : "—"}
                            </span>
                            {/* <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                              <FiPackage size={8} /> SO Pending
                            </span>
                            {soShortage > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">
                                ⚠ {soShortage} short
                              </span>
                            )} */}
                          </div>
                        ) : soShortage > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-slate-400 text-sm font-semibold">
                              0
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">
                              ⚠ {soShortage} short
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-sm font-semibold">
                            0
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {hasReorder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                            +{reorderQty}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center text-xs text-slate-400 uppercase">
                        {item.unit || "nos"}
                      </td>

                      {/* ✅ Status column — stock status + QC badges */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {/* Stock level status */}
                          {status === "shortage" ? (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">
                              SHORTAGE
                            </span>
                          ) : status === "low" ? (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded-full">
                              LOW
                            </span>
                          ) : status === "reorder" ? (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                              REORDER
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">
                              OK
                            </span>
                          )}

                          {/* 🔴 Damage badge */}
                          {hasDamage && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FiAlertTriangle size={8} /> DAMAGE
                            </span>
                          )}

                          {/* ✅ QC Issue badges — shortage/quality/excess/wrong */}
                          {!hasDamage && qcIssue === "shortage" && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              🟠 SHORTAGE
                            </span>
                          )}
                          {!hasDamage && qcIssue === "quality" && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              🟡 QUALITY
                            </span>
                          )}
                          {!hasDamage && qcIssue === "excess" && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              🟣 EXCESS
                            </span>
                          )}
                          {!hasDamage && qcIssue === "wrong_item" && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              🔵 WRONG
                            </span>
                          )}

                          {/* SO Partial */}
                          {soPending && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                soPending.source === "qc_shortage"
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              <FiPackage size={8} />
                              {soPending.source === "qc_shortage"
                                ? "SO SHORT"
                                : "PARTIAL"}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setLedgerItem(item)}
                          className="flex items-center gap-1 mx-auto text-teal-600 hover:text-teal-800 text-xs font-semibold bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <FiEye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-14 text-slate-400 text-sm"
                    >
                      {stockItems.length === 0
                        ? "No stock data yet. Upload a PO to add stock."
                        : "No items match your search"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ledger Modal */}
      {ledgerItem && (
        <Modal
          title={`Stock Ledger — ${ledgerItem.description || ledgerItem.productCode}`}
          onClose={() => setLedgerItem(null)}
          size="lg"
        >
          <div className="space-y-4">
            {/* Damage alert */}
            {getDamagedQty(ledgerItem) > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <FiAlertTriangle
                  size={14}
                  className="text-red-500 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-red-700">
                    ⚠️ {getDamagedQty(ledgerItem)} Damaged Units (QC Flagged)
                  </p>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    QC inspection has flagged these units as damaged. Tracked
                    for vendor follow-up.
                  </p>
                </div>
              </div>
            )}

            {/* ✅ QC Issue alert in modal */}
            {!getDamagedQty(ledgerItem) && ledgerItem.qcIssue && (
              <div
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  ledgerItem.qcIssue === "shortage"
                    ? "bg-orange-50 border-orange-200"
                    : ledgerItem.qcIssue === "quality"
                      ? "bg-amber-50 border-amber-200"
                      : ledgerItem.qcIssue === "excess"
                        ? "bg-purple-50 border-purple-200"
                        : ledgerItem.qcIssue === "wrong_item"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-slate-50 border-slate-200"
                }`}
              >
                <FiAlertTriangle
                  size={14}
                  className={`mt-0.5 flex-shrink-0 ${
                    ledgerItem.qcIssue === "shortage"
                      ? "text-orange-500"
                      : ledgerItem.qcIssue === "quality"
                        ? "text-amber-500"
                        : ledgerItem.qcIssue === "excess"
                          ? "text-purple-500"
                          : "text-blue-500"
                  }`}
                />
                <div>
                  <p
                    className={`text-xs font-bold ${
                      ledgerItem.qcIssue === "shortage"
                        ? "text-orange-700"
                        : ledgerItem.qcIssue === "quality"
                          ? "text-amber-700"
                          : ledgerItem.qcIssue === "excess"
                            ? "text-purple-700"
                            : "text-blue-700"
                    }`}
                  >
                    {ledgerItem.qcIssue === "shortage"
                      ? "🟠 QC Shortage — Partial receipt"
                      : ledgerItem.qcIssue === "quality"
                        ? "🟡 Quality Issue — QC Flagged"
                        : ledgerItem.qcIssue === "excess"
                          ? "🟣 Excess Received — QC Noted"
                          : ledgerItem.qcIssue === "wrong_item"
                            ? "🔵 Wrong Item — Return Required"
                            : `⚠ QC Issue: ${ledgerItem.qcIssue}`}
                  </p>
                  {ledgerItem.qcIssueDetail && (
                    <p className="text-[11px] text-slate-500 mt-0.5 italic">
                      {ledgerItem.qcIssueDetail}
                    </p>
                  )}
                </div>
              </div>
            )}

            {getSOPending(ledgerItem) && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <FiPackage size={14} className="text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700">
                    📦 {getSOPending(ledgerItem).pending} Units Pending — SO{" "}
                    {getSOPending(ledgerItem).soNo}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Partial invoice done. Remaining{" "}
                    {getSOPending(ledgerItem).pending} units will be deducted
                    when next invoice is uploaded.
                  </p>
                </div>
              </div>
            )}

            {(ledgerItem.reserved || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <FiPackage size={14} className="text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700">
                    📦 {ledgerItem.reserved} Units Reserved for SO Dispatch
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Committed to a Sales Order — deducted when Sales Invoice
                    uploaded.
                  </p>
                </div>
              </div>
            )}

            {(ledgerItem.soShortage || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <FiAlertTriangle
                  size={14}
                  className="text-orange-500 flex-shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-orange-700">
                    ⚠ {ledgerItem.soShortage} Units SO Shortage Pending
                  </p>
                  <p className="text-[11px] text-orange-600 mt-0.5">
                    Partial invoice done — {ledgerItem.soShortage} units still
                    to deliver.
                  </p>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: "Available",
                  value: Math.max(0, ledgerItem.available ?? 0),
                  color:
                    (ledgerItem.available ?? 0) <= 0
                      ? "text-red-600"
                      : "text-teal-600",
                  bg: "bg-slate-50",
                },
                {
                  label: "Reserved",
                  value: ledgerItem.reserved || 0,
                  color:
                    (ledgerItem.reserved || 0) > 0
                      ? "text-amber-600"
                      : "text-slate-400",
                  bg:
                    (ledgerItem.reserved || 0) > 0
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-slate-50",
                  sub: (ledgerItem.reserved || 0) > 0 ? "SO Pending" : null,
                },
                {
                  label: "Reorder Qty",
                  value: ledgerItem.reorder || 0,
                  color:
                    (ledgerItem.reorder || 0) > 0
                      ? "text-orange-600"
                      : "text-slate-400",
                  bg:
                    (ledgerItem.reorder || 0) > 0
                      ? "bg-orange-50 border border-orange-200"
                      : "bg-slate-50",
                },
                {
                  label: "Damaged",
                  value: getDamagedQty(ledgerItem) || 0,
                  color:
                    getDamagedQty(ledgerItem) > 0
                      ? "text-red-600"
                      : "text-slate-400",
                  bg:
                    getDamagedQty(ledgerItem) > 0
                      ? "bg-red-50 border border-red-200"
                      : "bg-slate-50",
                },
              ].map(({ label, value, color, bg, sub }) => (
                <div key={label} className={`rounded-lg p-3 text-center ${bg}`}>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">
                    {label}
                  </p>
                  <p className={`text-xl font-black mt-0.5 ${color} break-all`}>
                    {value}
                  </p>
                  {sub && (
                    <p className="text-[9px] font-bold text-amber-600 mt-0.5">
                      {sub}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Ledger history */}
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <FiClock size={13} /> Movement History
              </p>
              {(ledgerItem.ledger || []).length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {[...(ledgerItem.ledger || [])].reverse().map((l, i) => {
                    const dmgMatch = l.remarks?.match(/Damage:\s*(\d+)/i);
                    const dmgQty = dmgMatch ? parseInt(dmgMatch[1], 10) : 0;
                    const hasDmg = dmgQty > 0;
                    const isOut = l.type === "OUT";
                    const isReplacementIn = l.type === "replacement-in";
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 ${
                          hasDmg
                            ? "border-red-100 bg-red-50/30"
                            : isOut
                              ? "border-amber-100 bg-amber-50/20"
                              : isReplacementIn
                                ? "border-emerald-100 bg-emerald-50/30"
                                : "border-slate-100"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${l.type === "IN" || isReplacementIn ? "bg-emerald-100" : "bg-amber-100"}`}
                        >
                          {l.type === "IN" || isReplacementIn ? (
                            <FiArrowDown
                              size={13}
                              className="text-emerald-600"
                            />
                          ) : (
                            <FiArrowUp size={13} className="text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-bold ${l.type === "IN" || isReplacementIn ? "text-emerald-600" : "text-amber-700"}`}
                            >
                              {isReplacementIn ? "REPLACEMENT IN" : l.type}{" "}
                              {l.qty} units
                            </span>
                            {isOut && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                <FiPackage size={8} /> SO Reserved
                              </span>
                            )}
                            {hasDmg && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                                <FiAlertTriangle size={8} /> {dmgQty} damaged
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              · Ref: {l.ref || "—"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Balance:{" "}
                            <span className="font-bold">
                              {Math.max(0, l.balance || 0)}
                            </span>{" "}
                            · By: {l.by || "—"}
                          </p>
                          {/* {l.remarks && (hasDmg || isReplacementIn) && (
                            <p className="text-[10px] text-slate-400 mt-0.5 italic">{l.remarks}</p>
                          )} */}
                          {l.remarks && (
                            <p
                              className={`text-[10px] mt-0.5 italic ${
                                isReplacementIn
                                  ? "text-emerald-600 font-bold"
                                  : hasDmg
                                    ? "text-red-500"
                                    : "text-slate-400"
                              }`}
                            >
                              {l.remarks}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          <div>
                            {l.date
                              ? new Date(l.date).toLocaleDateString("en-IN")
                              : "—"}
                          </div>
                          <div>
                            {l.date
                              ? new Date(l.date).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : ""}
                          </div>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <FiClock size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No movement records found</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
