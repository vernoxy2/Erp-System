import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

const ApprovalQueue = () => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ── Fetch pending requests ──
  // No orderBy — avoids needing a Firestore composite index. Sort client-side.
  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "stockAdjustments"),
        where("status", "==", "pending")
      );
      const snap = await getDocs(q);
      const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Newest first
      requests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

      setPendingRequests(requests);
    } catch (err) {
      console.error("Approval queue fetch error:", err);
      alert("Error loading queue: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // ── Approve ──
  const approveRequest = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      for (const product of selectedRequest.products || []) {
        if (!product.stockDocId) continue;
        const adjQty = product.adjustment ?? product.adjustQty ?? 0;
        const newAvailable = (product.systemStock ?? 0) + adjQty;
        const ledgerEntry = {
          type: adjQty >= 0 ? "IN" : "OUT",
          qty: Math.abs(adjQty),
          balance: newAvailable,
          by: selectedRequest.requestedBy || "Unknown",
          ref: selectedRequest.docId || selectedRequest.id,
          date: new Date().toISOString(),
          remarks: `Approved Adjustment — ${product.reason || ""}`,
        };
        await updateDoc(doc(db, "stock", product.stockDocId), {
          available: newAvailable,
          ledger: arrayUnion(ledgerEntry),
        });
      }

      await updateDoc(doc(db, "stockAdjustments", selectedRequest.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: "Current User",
      });

      alert(`✅ Request ${selectedRequest.docId || selectedRequest.id} approved!`);
      setSelectedRequest(null);
      fetchPendingRequests();
    } catch (err) {
      console.error("Approve error:", err);
      alert("Error approving: " + err.message);
    }
    setActionLoading(false);
  };

  // ── Reject ──
  const rejectRequest = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "stockAdjustments", selectedRequest.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: "Current User",
        rejectionReason: rejectReason.trim(),
      });

      alert(`❌ Request ${selectedRequest.docId || selectedRequest.id} rejected.`);
      setRejectModal(false);
      setRejectReason("");
      setSelectedRequest(null);
      fetchPendingRequests();
    } catch (err) {
      console.error("Reject error:", err);
      alert("Error rejecting: " + err.message);
    }
    setActionLoading(false);
  };

  // ── Badge color ──
  const getBadgeStyle = (role) => {
    if (!role) return "bg-gray-100 text-gray-700";
    const r = role.toLowerCase();
    if (r.includes("owner")) return "bg-red-100 text-red-800";
    if (r.includes("admin")) return "bg-orange-100 text-orange-800";
    if (r.includes("store")) return "bg-blue-100 text-blue-800";
    if (r.includes("sales")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-700";
  };

  const renderField = (val) =>
    val === undefined || val === null || val === "" ? "—" : val;

  const ownerCount = pendingRequests.filter((r) =>
    (r.approvalLevel || "").toLowerCase().includes("owner")
  ).length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Approval Queue</h2>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve stock adjustment requests
          </p>
        </div>
        <button
          onClick={fetchPendingRequests}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? "—" : pendingRequests.length}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <span className="text-2xl"></span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority (Owner)</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? "—" : ownerCount}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <span className="text-2xl"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm animate-pulse">
            Loading approval queue...
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && pendingRequests.length === 0 && !selectedRequest && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">All caught up!</h3>
          <p className="text-sm text-gray-500">No pending approval requests right now.</p>
        </div>
      )}

      {/* ── Pending Requests List ── */}
      {!loading && !selectedRequest && pendingRequests.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Requests</h2>

          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const totalProducts =
                request.totalProducts ?? (request.products || []).length;
              const createdAt = request.createdAt?.toDate
                ? request.createdAt.toDate().toLocaleString("en-IN")
                : request.requestedAt || "—";

              return (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-5 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {request.docId || request.id}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeStyle(
                            request.approvalLevel
                          )}`}
                        >
                          {request.approvalLevel || "Unknown"}
                        </span>
                        {request.requestedByRole && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeStyle(
                              request.requestedByRole
                            )}`}
                          >
                            {request.requestedByRole}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Type: {request.type || "Stock Adjustment"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Requested by:{" "}
                        <span className="font-medium">
                          {request.requestedBy || "—"}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">Date: {createdAt}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Products</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {totalProducts}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(request);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      Review Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail View ── */}
      {selectedRequest && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedRequest(null)}
            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Queue</span>
          </button>

          {/* Request Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  {selectedRequest.docId || selectedRequest.id}
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedRequest.type || "Stock Adjustment"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested By:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedRequest.requestedBy || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedRequest.createdAt?.toDate
                        ? selectedRequest.createdAt.toDate().toLocaleString("en-IN")
                        : selectedRequest.requestedAt || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Approval Level:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeStyle(
                        selectedRequest.approvalLevel
                      )}`}
                    >
                      {selectedRequest.approvalLevel || "Unknown"}
                    </span>
                  </div>
                  {selectedRequest.requestedByRole && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Role:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeStyle(
                          selectedRequest.requestedByRole
                        )}`}
                      >
                        {selectedRequest.requestedByRole}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary — Value Impact removed */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
                <p className="text-sm text-indigo-700 mb-3">Summary</p>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-800 font-medium">Total Products:</span>
                  <span className="text-2xl font-bold text-indigo-900">
                    {selectedRequest.totalProducts ??
                      (selectedRequest.products || []).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          {(selectedRequest.products || []).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Product Details
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                      {selectedRequest.products.some((p) => p.hsnSac) && (
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">HSN/SAC</th>
                      )}
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">System Stock</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Physical</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Adjustment</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">New Total</th>
                      {selectedRequest.products.some((p) => p.category) && (
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                      )}
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.products.map((product, index) => {
                      const adjQty =
                        product.adjustment ??
                        product.adjustQty ??
                        (product.physicalQty !== undefined
                          ? product.physicalQty - (product.systemStock || 0)
                          : 0);
                      const newTotal =
                        product.newTotal ?? (product.systemStock || 0) + adjQty;
                      const physical =
                        product.physicalQty ?? product.physicalStock;

                      return (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">
                              {product.productCode || product.code || "—"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.productName || product.name || product.description || ""}
                            </div>
                          </td>
                          {selectedRequest.products.some((p) => p.hsnSac) && (
                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                              {renderField(product.hsnSac)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right text-gray-800">
                            {renderField(product.systemStock)} {product.unit || ""}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-800">
                            {physical !== undefined ? `${physical} ${product.unit || ""}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={
                                adjQty < 0
                                  ? "text-red-600 font-semibold"
                                  : adjQty > 0
                                  ? "text-green-600 font-semibold"
                                  : "text-gray-400"
                              }
                            >
                              {adjQty > 0 ? "+" : ""}
                              {adjQty} {product.unit || ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-700">
                            {newTotal} {product.unit || ""}
                          </td>
                          {selectedRequest.products.some((p) => p.category) && (
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {renderField(product.category)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px]">
                            {renderField(product.reason)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approval Decision */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Approval Decision</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-green-200 bg-green-50 rounded-lg p-5 text-center">
                <div className="text-4xl mb-3"></div>
                <h4 className="font-semibold text-gray-800 mb-2">Approve Request</h4>
                <p className="text-sm text-gray-600 mb-4">Stock will be updated immediately</p>
                <button
                  onClick={approveRequest}
                  disabled={actionLoading}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors w-full disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Approve"}
                </button>
              </div>

              <div className="border-2 border-red-200 bg-red-50 rounded-lg p-5 text-center">
                <div className="text-4xl mb-3"></div>
                <h4 className="font-semibold text-gray-800 mb-2">Reject Request</h4>
                <p className="text-sm text-gray-600 mb-4">Provide a reason for rejection</p>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={actionLoading}
                  className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors w-full disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="text-4xl mb-3 text-center">✗</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Reject Request</h2>
            <p className="text-sm text-gray-500 mb-4 text-center">
              Reason for rejecting{" "}
              <span className="font-semibold text-gray-700">
                {selectedRequest?.docId || selectedRequest?.id}
              </span>
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm mb-4 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={rejectRequest}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;