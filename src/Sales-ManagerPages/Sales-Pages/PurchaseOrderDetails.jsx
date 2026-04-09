import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPackage, FiHash, FiCalendar, FiUser, FiMapPin, FiCreditCard } from "react-icons/fi";
import {
  Card,
  CardHeader,
  Pagination,
} from "../SalesComponent/ui/index";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {labels[status] || status?.toUpperCase()}
    </span>
  );
}

export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination for Items
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchPO() {
      try {
        const snap = await getDoc(doc(db, "excelupload", id));
        if (snap.exists()) {
          setPo({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Failed to fetch PO:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPO();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <span className="text-slate-500 font-medium">Loading Purchase Order...</span>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-20">
        <FiPackage size={48} className="mx-auto text-slate-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Purchase Order Not Found</h2>
        <button onClick={() => navigate("/sales/purchase-orders/list")} className="mt-4 text-indigo-600 font-bold hover:underline">
          Back to List
        </button>
      </div>
    );
  }

  const header = po.excelHeader || {};
  const status = po.storeQcPending ? "waiting_qc" : (po.poStatus || "ordered");
  const items = po.items || [];

  // Pagination logic
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const currentItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/sales/purchase-orders/list")}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <FiArrowLeft size={16} /> Back to List
        </button>
        <POStatusBadge status={status} />
      </div>

      {/* Hero Header */}
      <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-r from-indigo-600 to-indigo-700">
        <div className="p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1">Purchase Order</p>
              <h1 className="text-3xl font-black">{header.voucherNo || po.id.slice(0, 8).toUpperCase()}</h1>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-indigo-200" />
                  <span className="text-sm font-bold">{header.dated || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiUser className="text-indigo-200" />
                  <span className="text-sm font-bold">{header.supplier || header.consignee || "—"}</span>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <p className="text-indigo-100 text-[10px] font-black uppercase tracking-wider mb-1">Total Items</p>
              <p className="text-4xl font-black">{po.items?.length || 0}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* NEW Top Sections: Supplier Info, Reference, Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Supplier & Delivery Information */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader title="Supplier & Delivery Information" icon={FiMapPin} />
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier (Bill From)</h4>
                <div>
                  <p className="text-sm font-black text-slate-800">{header.supplier || "—"}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{header.partyAddress || "—"}</p>
                </div>
                {header.partyGstin && (
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                    <span className="text-[9px] font-black text-slate-400 uppercase">GSTIN</span>
                    <span className="text-xs font-bold font-mono text-indigo-600">{header.partyGstin}</span>
                  </div>
                )}
              </div>
              <div className="space-y-4 border-l border-slate-100 pl-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consignee (Ship To)</h4>
                <div>
                  <p className="text-sm font-black text-slate-800">{header.consignee || "—"}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{header.address || "—"}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (1/3): Reference & Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Reference Details" icon={FiHash} />
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Reference No. & Date</p>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-bold text-slate-700">
                  {header.reference || "—"}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Terms of Payment</p>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2">
                  <FiCreditCard className="text-slate-400" size={14} />
                  {header.paymentTerms || "—"}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Order Summary" icon={FiPackage} />
            <div className="p-5 space-y-3">
               <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-500">Total Quantity</span>
                  <span className="text-sm font-black text-slate-800">
                    {po.items?.reduce((s, i) => s + (i.orderedQty || i.quantity || 0), 0)}
                  </span>
               </div>
               <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-500">Total Received</span>
                  <span className="text-sm font-black text-indigo-600">
                    {po.items?.reduce((s, i) => s + (i.totalReceivedQty || 0), 0)}
                  </span>
               </div>
               <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-bold text-slate-500">Completion</span>
                  <span className="text-sm font-black text-emerald-600">
                    {(() => {
                      const ord = po.items?.reduce((s, i) => s + (i.orderedQty || i.quantity || 0), 0) || 0;
                      const rcv = po.items?.reduce((s, i) => s + (i.totalReceivedQty || 0), 0) || 0;
                      return ord > 0 ? Math.round((rcv / ord) * 100) : 0;
                    })()}%
                  </span>
               </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Product Items Table */}
      <Card>
        <CardHeader title="Product Items" subtitle={`${po.items?.length || 0} items in this order`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4 text-left">Sl</th>
                <th className="px-6 py-4 text-left">Part No.</th>
                <th className="px-6 py-4 text-left">Description</th>
                <th className="px-6 py-4 text-center">Ordered</th>
                <th className="px-6 py-4 text-center">Received</th>
                <th className="px-6 py-4 text-left">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-400 font-bold">{item.slNo || (currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono text-[11px] font-bold">
                      {item.productCode || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-800">{item.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">HSN: {item.hsnSac || "—"}</p>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-slate-800">{item.orderedQty || item.quantity}</td>
                  <td className="px-6 py-4 text-center font-black text-indigo-600">{item.totalReceivedQty || 0}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{item.unit || "nos"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={items.length}
            itemsPerPage={itemsPerPage}
            label="items"
          />
        )}
      </Card>
    </div>
  );
}
