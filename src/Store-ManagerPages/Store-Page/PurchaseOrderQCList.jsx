import React from "react";
import { FiShoppingCart, FiShield, FiClock, FiEye, FiPrinter } from "react-icons/fi";
import { Card, CardHeader } from "../StoreComponent/ui/index";
import { printInvoiceDetails } from "./PrintUtils";

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

export default function PurchaseOrderQCList({
  pendingInvoices,
  loadingInvoices,
  loadingPO,
  handleSelectInvoice,
}) {
  return (
    <Card>
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FiShoppingCart size={14} className="text-emerald-600" />
            </div>
            <span>Purchase Orders — Pending QC</span>
          </div>
        }
        subtitle={
          loadingInvoices
            ? "Loading..."
            : `${pendingInvoices.length} invoice(s) awaiting store verification`
        }
      />

      {loadingInvoices || loadingPO ? (
        <div className="divide-y divide-slate-50 min-h-[200px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-6 py-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-36 bg-slate-200 rounded-md" />
                    <div className="h-4 w-20 bg-amber-100 rounded-full" />
                  </div>
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
          <p className="text-sm font-bold text-slate-500">No Invoices Found</p>
          <p className="text-xs text-slate-400 mt-1">Upload a vendor invoice to get started.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {pendingInvoices.map((inv) => {
            const totalItems = (inv.items || []).length;
            const totalQty = (inv.items || []).reduce(
              (s, i) => s + (i.newReceived || i.invoiceQty || 0), 0,
            );
            const isApproved = inv.storeQcStatus === "approved";
            const hasIssues = inv.storeQcStatus === "approved_with_issues";
            const isPending = !isApproved && !hasIssues;
            const issueItems = (inv.items || []).filter((i) => i.issue && i.issue !== "");
            const damagedItems = (inv.items || []).filter((i) => (i.damagedQty || 0) > 0);
            const shortageItems = (inv.items || []).filter((i) => i.issue === "shortage");

            return (
              <div
                key={inv.id}
                className={`px-6 py-4 transition-colors ${
                  isApproved
                    ? "bg-emerald-50/30 hover:bg-emerald-50/50"
                    : hasIssues
                      ? "bg-red-50/40 hover:bg-red-50 border-l-4 border-l-red-400 cursor-pointer"
                      : "hover:bg-slate-50 cursor-pointer"
                }`}
                onClick={() => !isApproved && handleSelectInvoice(inv)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">
                        Invoice: {inv.invoiceNo || "—"}
                      </p>
                      {isApproved && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full uppercase">
                          ✅ Approved
                        </span>
                      )}
                      {hasIssues && (
                        <>
                          {damagedItems.length > 0 && (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 rounded-full uppercase">
                              🔴 {damagedItems.reduce((s, i) => s + (i.damagedQty || 0), 0)} Damaged
                            </span>
                          )}
                          {shortageItems.length > 0 && (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 rounded-full uppercase">
                              🟠 Shortage
                            </span>
                          )}
                          {issueItems.filter(
                            (i) => i.issue !== "damage" && i.issue !== "shortage"
                          ).length > 0 && (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full uppercase">
                              ⚠ Issues
                            </span>
                          )}
                        </>
                      )}
                      {isPending && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full uppercase">
                          Pending QC
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600">
                      PO: <strong>{inv.linkedPoNo}</strong> · {inv.vendor}
                    </p>

                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{totalItems} items · {totalQty} units</span>
                      {inv.invoiceDate && (
                        <span>Invoice Date: {formatDate(inv.invoiceDate)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <FiClock size={10} />
                        Uploaded: {formatDateTime(inv.createdAt)}
                      </span>
                    </div>

                    {hasIssues && issueItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {issueItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] font-bold bg-white border border-red-200 text-red-700 rounded-md"
                          >
                            {item.productCode}: {item.issue?.replace("_", " ")}
                            {(item.damagedQty || 0) > 0 && ` (${item.damagedQty} dmg)`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    {isApproved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printInvoiceDetails(inv);
                        }}
                        className="px-3 py-2 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap flex items-center gap-1.5"
                      >
                        <FiPrinter size={12} /> Print
                      </button>
                    )}

                    {isApproved ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectInvoice(inv);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors whitespace-nowrap"
                      >
                        <FiEye size={12} /> View Details
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectInvoice(inv);
                        }}
                        className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          hasIssues
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        <FiShield size={12} />
                        {hasIssues ? "Review Issues →" : "Review & Approve →"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}