import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShoppingBag,
  FiClock,
  FiAlertTriangle,
  FiEye,
  FiPlus,
  FiSearch,
  FiX,
  FiCheck,
  FiPackage,
} from "react-icons/fi";
import {
  Card,
  CardHeader,
  KPICard,
  Table,
  BtnPrimary,
  Select,
  Pagination,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return isoStr; }
}

function POStatusBadge({ status }) {
  const styles = {
    ordered:          "bg-blue-50 text-blue-700 border-blue-200",
    partial:          "bg-orange-50 text-orange-700 border-orange-200",
    received:         "bg-teal-50 text-teal-700 border-teal-200",
    waiting_qc:       "bg-indigo-50 text-indigo-700 border-indigo-200",
    excess:           "bg-purple-50 text-purple-700 border-purple-200",
    complete:         "bg-green-50 text-green-700 border-green-200",
  };
  const labels = {
    ordered:           "ORDERED",
    partial:           "PARTIAL",
    received:          "RECEIVED",
    waiting_qc:        "WAITING QC",
    excess:            "EXCESS",
    complete:          "COMPLETE",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {labels[status] || status?.toUpperCase()}
    </span>
  );
}

export default function PurchaseOrderListTable() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [poData, setPoData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "excelupload"), orderBy("createdAt", "desc")),
        );
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // ✅ Filter for PO types
        const pos = all.filter((doc) => {
          const t = (doc.type || "").toUpperCase().replace(/[_\s]/g, "");
          return (t === "PO" || t === "PURCHASEORDER") && !doc.linkedPoId;
        });

        const mapped = pos.map((po) => ({
          id: po.id,
          poNumber:
            po.excelHeader?.voucherNo ||
            po.woNumber ||
            po.id.slice(0, 8).toUpperCase(),
          supplier:
            po.customer ||
            po.excelHeader?.supplier ||
            po.excelHeader?.consignee ||
            "—",
          contact: po.customerContact || po.excelHeader?.reference || "—",
          date: po.excelHeader?.dated || "",
          createdAt: po.createdAt || null,
          status: po.storeQcPending ? "waiting_qc" : (po.poStatus || "ordered"),
          items: po.items || [],
          invoiceCount: po.invoiceCount || 0,
          totalReceived: po.totalReceivedQty || 0,
        }));

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
  const totalPOs    = poData.length;
  const orderedPOs  = poData.filter((po) => po.status === "ordered").length;
  const partialPOs  = poData.filter((po) => po.status === "partial").length;
  const waitingQC   = poData.filter((po) => po.status === "waiting_qc").length;
  const completePOs = poData.filter((po) => po.status === "complete").length;

  // ── Filter + Search ───────────────────────────────────────────────────────
  const filteredPOs = poData.filter((po) => {
    const matchStatus = filterStatus === "all" || po.status === filterStatus;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      po.poNumber?.toLowerCase().includes(q) ||
      po.supplier?.toLowerCase().includes(q) ||
      po.contact?.toLowerCase().includes(q) ||
      po.date?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── Pagination Logic ──────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
  const currentData = filteredPOs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        <span className="text-slate-500 text-sm">Loading Purchase Orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Purchase Orders</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track vendor orders and material receipt</p>
        </div>
        <BtnPrimary onClick={() => navigate("/sales/purchase-orders/upload")}>
          <FiPlus size={14} /> Upload PO
        </BtnPrimary>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard label="Total POs"    value={totalPOs}    icon={FiShoppingBag} color="indigo" />
        <KPICard label="Ordered"      value={orderedPOs}  icon={FiClock}        color="blue"   />
        <KPICard label="Partial"      value={partialPOs}  icon={FiAlertTriangle} color="amber" />
        <KPICard label="Waiting QC"   value={waitingQC}   icon={FiClock}        color="violet" />
        <KPICard label="Complete"     value={completePOs} icon={FiCheck}        color="green"  />
      </div>

      {waitingQC > 0 && (
        <div className="p-4 rounded-lg border bg-indigo-50 border-indigo-200 text-indigo-700 text-sm">
          <p className="font-bold">⏳ {waitingQC} PO{waitingQC > 1 ? "s" : ""} waiting for store QC approval!</p>
        </div>
      )}

      {/* All Purchase Orders */}
      <Card>
        <CardHeader
          title="All Purchase Orders"
          subtitle={`${filteredPOs.length} orders`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <FiSearch size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search PO, Supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48 bg-white"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 text-slate-400 hover:text-slate-600">
                    <FiX size={12} />
                  </button>
                )}
              </div>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: "all",        label: "All Status" },
                  { value: "ordered",    label: "Ordered" },
                  { value: "partial",    label: "Partial" },
                  { value: "waiting_qc", label: "Waiting QC" },
                  { value: "received",   label: "Received" },
                  { value: "complete",   label: "Complete" },
                ]}
                className="text-xs"
              />
            </div>
          }
        />

        <Table
          headers={[
            { label: "PO Number" },
            { label: "Supplier" },
            { label: "Date" },
            { label: "Created At" },
            { label: "Items", align: "center" },
            { label: "Received", align: "center" },
            { label: "Status", align: "center" },
            { label: "Action", align: "center" },
          ]}
        >
          {currentData.map((po) => {
            const totalOrdered  = po.items.reduce((s, i) => s + (i.orderedQty || i.quantity || 0), 0);
            const totalReceived = po.items.reduce((s, i) => s + (i.totalReceivedQty || 0), 0);
            const isComplete    = po.status === "complete";
            return (
              <tr
                key={po.id}
                className={`hover:bg-slate-50 transition-colors cursor-pointer ${isComplete ? "bg-emerald-50/20" : ""}`}
                onClick={() => navigate(`/sales/purchase-orders/details/${po.id}`)}
              >
                <td className="px-5 py-4">
                  <p className="text-sm font-bold text-slate-800 font-mono">{po.poNumber}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-slate-700">{po.supplier}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{po.contact}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-slate-600">{po.date || "—"}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <FiClock size={10} className="text-slate-400" />
                    {formatDateTime(po.createdAt)}
                  </p>
                </td>
                <td className="px-5 py-4 text-center">
                  <p className="text-sm font-bold text-slate-800">{po.items.length}</p>
                </td>
                <td className="px-5 py-4 text-center">
                  <p className="text-sm font-bold text-slate-800">{totalReceived}/{totalOrdered}</p>
                  {po.invoiceCount > 0 && (
                    <p className="text-xs text-slate-400">{po.invoiceCount} invoice{po.invoiceCount > 1 ? "s" : ""}</p>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <POStatusBadge status={po.status} />
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sales/purchase-orders/details/${po.id}`);
                      }}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                      title="View Details"
                    >
                      <FiEye size={14} />
                    </button>
                    {!isComplete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sales/upload-vendor-invoice?poId=${po.id}`);
                        }}
                        className="px-3 py-1.5 bg-indigo-400 text-white text-xs font-bold rounded-lg hover:bg-indigo-200"
                      >
                        {po.status === "partial" || po.status === "received"
                          ? "Receive Remaining"
                          : "Upload Invoice"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>

        {filteredPOs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredPOs.length}
            itemsPerPage={itemsPerPage}
            label="orders"
          />
        )}

        {filteredPOs.length === 0 && searchQuery && (
          <div className="p-10 text-center">
            <FiSearch size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No results for "{searchQuery}"</p>
            <button onClick={() => setSearchQuery("")} className="mt-3 text-xs text-indigo-600 font-bold hover:underline">Clear search</button>
          </div>
        )}
        {filteredPOs.length === 0 && !searchQuery && (
          <div className="p-12 text-center">
            <FiPackage size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No Purchase Orders Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterStatus === "all" ? "Upload your first purchase order" : `No ${filterStatus} orders`}
            </p>
            {filterStatus === "all" && (
              <BtnPrimary onClick={() => navigate("/sales/purchase-orders/upload")} className="mt-4 mx-auto">
                <FiPlus size={14} /> Upload PO
              </BtnPrimary>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
