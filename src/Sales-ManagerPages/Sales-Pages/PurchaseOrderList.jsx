import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShoppingCart,
  FiClock,
  FiAlertTriangle,
  FiEye,
  FiPlus,
  FiSearch,
  FiX,
} from "react-icons/fi";
import {
  Card,
  CardHeader,
  KPICard,
  StatusBadge,
  Table,
  Alert,
  BtnPrimary,
  Select,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// ── ETA Status Calculate ──────────────────────────────────────────────────────
function calcStatus(deliveryDate) {
  if (!deliveryDate) return { status: "pending", remainingDays: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eta = new Date(deliveryDate);
  eta.setHours(0, 0, 0, 0);
  const diff = Math.round((eta - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { status: "overdue", remainingDays: diff };
  if (diff <= 2) return { status: "warning", remainingDays: diff };
  // return { status: "pending", remainingDays: diff };
  return { status: "ordered", remainingDays: diff };
}

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [poData, setPoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredPOs = poData.filter((po) => {
    const matchStatus = filterStatus === "all" || po.status === filterStatus;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      po.poNumber?.toLowerCase().includes(q) ||
      po.vendor?.toLowerCase().includes(q) ||
      po.vendorContact?.toLowerCase().includes(q) ||
      po.date?.toLowerCase().includes(q) ||
      po.eta?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
  const paginatedPOs = filteredPOs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const totalPages = Math.ceil(filteredPOs.length / ITEMS_PER_PAGE);
  // ── Firebase fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
        );
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const pos = all.filter((doc) => {
          if (doc.type === "INVOICE") return false;
          if (doc.type === "PO") return true;
          if (doc.type === "SALES_ORDER") return false;
          const buyer = doc.excelHeader?.buyer;
          return !buyer || buyer.trim() === "";
        });

        // const mapped = pos.map((po) => {
        //   const { status, remainingDays } = po.receivedAt
        //     ? { status: "received", remainingDays: 0 }
        //     : calcStatus(po.deliveryDate);
        const mapped = pos.map((po) => {
          const { status: etaStatus, remainingDays } = calcStatus(
            po.deliveryDate,
          );
          const status =
            po.poStatus === "complete"
              ? "complete"
              : po.poStatus === "partial"
                ? "partial"
                : po.poStatus === "excess"
                  ? "excess"
                  : po.poStatus === "ordered"
                    ? "ordered"
                    : po.receivedAt
                      ? "complete"
                      : etaStatus;
          console.log(
            "PO:",
            po.woNumber,
            "poStatus:",
            po.poStatus,
            "status:",
            status,
          );
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
            vendorContact:
              po.customerContact || po.excelHeader?.reference || "—",
            date: po.excelHeader?.dated || "",
            createdDate: po.createdAt
              ? new Date(po.createdAt).toLocaleDateString("en-IN")
              : "",
            eta: po.deliveryDate || "—",
            status,
            remainingDays,
            items: po.items || [],
            grandTotal: 0,
          };
        });

        setPoData(mapped);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPOs();
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalPOs = poData.length;
  const pendingPOs = poData.filter((po) => po.status === "pending").length;
  const orderedPOs = poData.filter((po) => po.status === "ordered").length;
  const partialPOs = poData.filter((po) => po.status === "partial").length;
  const warningPOs = poData.filter((po) => po.status === "warning").length;
  const overduePOs = poData.filter((po) => po.status === "overdue").length;

  // ── Filter + Search ───────────────────────────────────────────────────────

  const urgentPOs = poData.filter(
    (po) => po.status === "warning" || po.status === "overdue",
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "overdue":
        return "text-red-600";
      case "warning":
        return "text-orange-600";
      case "ordered":
        return "text-blue-600";
      case "partial":
        return "text-orange-600";
      case "complete":
        return "text-emerald-600";
      case "excess":
        return "text-purple-600";
      case "received":
        return "text-emerald-600";
      default:
        return "text-slate-600";
    }
  };

  const getETADisplay = (po) => {
    if (po.status === "overdue")
      return `Overdue by ${Math.abs(po.remainingDays)} days`;
    if (po.status === "warning") return `${po.remainingDays} days remaining`;
    return `${po.remainingDays} days remaining`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        <span className="text-slate-500 text-sm">
          Loading Purchase Orders...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Purchase Orders</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track vendor orders and material arrival
          </p>
        </div>
        <BtnPrimary onClick={() => navigate("/sales/purchase-orders/upload")}>
          <FiPlus size={14} /> Upload PO
        </BtnPrimary>
      </div>

      {/* Critical Alerts */}
      {(overduePOs > 0 || warningPOs > 0) && (
        <Alert type="warning">
          <div className="space-y-1">
            <p className="font-bold">⚠️ Purchase Order Alerts:</p>
            {overduePOs > 0 && (
              <p>
                • {overduePOs} POs are overdue - Follow up with vendors urgently
              </p>
            )}
            {warningPOs > 0 && (
              <p>• {warningPOs} POs arriving in 2 days - Prepare for receipt</p>
            )}
          </div>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Purchase Orders"
          value={totalPOs}
          icon={FiShoppingCart}
          color="indigo"
        />
        <KPICard
          label="Ordered"
          value={orderedPOs}
          icon={FiClock}
          color="blue"
        />
        <KPICard
          label="Partial"
          value={partialPOs}
          icon={FiAlertTriangle}
          color="amber"
        />
        <KPICard
          label="Overdue"
          value={overduePOs}
          icon={FiAlertTriangle}
          color="red"
        />
      </div>

      {/* Urgent Actions */}
      {urgentPOs.length > 0 && (
        <Card>
          <CardHeader
            title="Urgent Actions Required"
            subtitle={`${urgentPOs.length} POs need immediate attention`}
          />
          <div className="divide-y divide-slate-50">
            {urgentPOs.map((po) => (
              <div
                key={po.id}
                className={`px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${po.status === "overdue" ? "bg-red-50" : "bg-orange-50"}`}
                onClick={() =>
                  navigate(`/sales/upload-vendor-invoice?poId=${po.id}`)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm font-bold text-slate-800">
                        {po.poNumber}
                      </p>
                      <StatusBadge status={po.status} />
                    </div>
                    <p className="text-sm text-slate-600">{po.vendor}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <FiClock
                          size={12}
                          className={getStatusColor(po.status)}
                        />
                        <span
                          className={`font-bold ${getStatusColor(po.status)}`}
                        >
                          {getETADisplay(po)}
                        </span>
                      </div>
                      <span className="text-slate-400">ETA: {po.eta}</span>
                      <span className="text-slate-400">
                        {po.items.length} items
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {po.status === "overdue" ? (
                      <button className="mt-2 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700">
                        Follow Up
                      </button>
                    ) : (
                      <button className="mt-2 px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700">
                        Prepare Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Purchase Orders */}
      <Card>
        <CardHeader
          title="All Purchase Orders"
          subtitle={`${filteredPOs.length} orders`}
          action={
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex items-center">
                <FiSearch
                  size={13}
                  className="absolute left-2.5 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search PO, Vendor..."
                  value={searchQuery}
                  // onChange={(e) => setSearchQuery(e.target.value)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48 bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX size={12} />
                  </button>
                )}
                
              </div>

              {/* Status Filter */}
              <Select
                value={filterStatus}
                // onChange={(e) => setFilterStatus(e.target.value)}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "ordered", label: "Ordered" },
                  { value: "partial", label: "Partial" },
                  { value: "complete", label: "Complete" },
                  { value: "excess", label: "Excess" },
                  { value: "warning", label: "Warning" },
                  { value: "overdue", label: "Overdue" },
                ]}
                className="text-xs"
              />
            </div>
          }
        />

        <Table
          headers={[
            { label: "PO Number" },
            { label: "Vendor" },
            { label: "Date" },
            { label: "ETA" },
            { label: "Items", align: "center" },
            { label: "Status", align: "center" },
            { label: "Action", align: "center" },
          ]}
        >
          {/* {filteredPOs.slice(0, 10).map((po) => ( */}
          {paginatedPOs.map((po) => (
            // <tr
            //   key={po.id}
            //   className={`hover:bg-slate-50 transition-colors ${
            //     po.status === "complete" ? "cursor-pointer" : "cursor-default"
            //   }`}
            //   onClick={() => {
            //     if (po.status === "complete") {
            //       navigate(`/sales/purchase-orders/complete/${po.id}`);
            //     }
            //   }}
            // >
            <tr
              key={po.id}
              className="hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => {
                if (po.status === "complete") {
                   navigate(`/sales/purchase-orders/complete/${po.id}`);
                } else {
                  navigate(`/sales/upload-vendor-invoice?poId=${po.id}`);
                }
              }}
            >
              <td className="px-5 py-4">
                <p className="text-sm font-bold text-slate-800 font-mono">
                  {po.poNumber}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {po.createdDate}
                </p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm text-slate-700">{po.vendor}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {po.vendorContact}
                </p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm text-slate-600">{po.date}</p>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <FiClock size={14} className={getStatusColor(po.status)} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{po.eta}</p>
                    <p
                      className={`text-xs font-bold ${getStatusColor(po.status)}`}
                    >
                      {getETADisplay(po)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-center">
                <p className="text-sm font-bold text-slate-800">
                  {po.items.length}
                </p>
              </td>
              <td className="px-5 py-4 text-center">
                <StatusBadge status={po.status} />
              </td>
              <td className="px-5 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/sales/purchase-orders/${po.id}`);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="View Details"
                  >
                    <FiEye size={14} />
                  </button>
                  {(po.status === "warning" || po.status === "overdue") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sales/upload-vendor-invoice?poId=${po.id}`);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                    >
                      Receive
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>

        {/* No results from search */}
        {filteredPOs.length === 0 && searchQuery && (
          <div className="p-10 text-center">
            <FiSearch size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              No results for "{searchQuery}"
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try a different PO number or vendor name
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* No POs at all */}
        {filteredPOs.length === 0 && !searchQuery && (
          <div className="p-12 text-center">
            <FiShoppingCart size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              No Purchase Orders Found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {filterStatus === "all"
                ? "Upload your first purchase order"
                : `No ${filterStatus} orders`}
            </p>
            {filterStatus === "all" && (
              <BtnPrimary
                onClick={() => navigate("/sales/purchase-orders/upload")}
                className="mt-4 mx-auto"
              >
                <FiPlus size={14} /> Upload Purchase Order
              </BtnPrimary>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredPOs.length)} of{" "}
              {filteredPOs.length} orders
            </p>
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                      currentPage === page
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              {/* Next */}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ETA Legend */}
      {/* <Card>
        <div className="p-6">
          <p className="text-xs font-bold text-slate-700 mb-4">
            📅 ETA Status Legend:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Pending</p>
                <p className="text-xs text-slate-400">More than 2 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Warning</p>
                <p className="text-xs text-slate-400">2 days or less</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Overdue</p>
                <p className="text-xs text-slate-400">ETA passed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Received</p>
                <p className="text-xs text-slate-400">Material arrived</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Ordered</p>
                <p className="text-xs text-slate-400">
                  PO sent, awaiting material
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Partial</p>
                <p className="text-xs text-slate-400">Some material received</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Complete</p>
                <p className="text-xs text-slate-400">All material received</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Excess</p>
                <p className="text-xs text-slate-400">
                  Extra material received
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card> */}
      <Card>
        <div className="p-6">
          <p className="text-xs font-bold text-slate-700 mb-4">
            📅 Status Legend:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Ordered</p>
                <p className="text-xs text-slate-400">
                  PO sent, awaiting material
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Partial</p>
                <p className="text-xs text-slate-400">Some material received</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Complete</p>
                <p className="text-xs text-slate-400">All material received</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Excess</p>
                <p className="text-xs text-slate-400">
                  Extra material received
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <div>
                <p className="text-xs font-bold text-slate-700">Warning</p>
                <p className="text-xs text-slate-400">2 days or less</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div>
                <p className="text-xs font-bold text-slate-700">Overdue</p>
                <p className="text-xs text-slate-400">ETA passed</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
