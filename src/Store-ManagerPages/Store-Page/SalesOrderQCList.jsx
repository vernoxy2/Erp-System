import React from "react";
import { FiFileText, FiShield, FiClock, FiEye, FiPrinter } from "react-icons/fi";
import { Card, CardHeader } from "../StoreComponent/ui/index";
import { printSODetails } from "./PrintUtils";

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

export default function SalesOrderQCList({
  pendingSalesOrders,
  loadingSO,
  loadingSO2,
  handleSelectSO,
}) {
  return (
    <Card>
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <FiFileText size={14} className="text-violet-600" />
            </div>
            <span>Sales Orders — Waiting for QC</span>
          </div>
        }
        subtitle={
          loadingSO
            ? "Loading..."
            : `${pendingSalesOrders.length} SO(s) awaiting quality check`
        }
      />

      {loadingSO ? (
        <div className="divide-y divide-slate-50 min-h-[200px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-6 py-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-28 bg-slate-200 rounded-md" />
                    <div className="h-4 w-24 bg-violet-100 rounded-full" />
                  </div>
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
            const soNumber =
              header.reference || so.invoiceNo || so.woNumber ||
              `SO-${so.id.slice(0, 8).toUpperCase()}`;
            const customer = so.customer || header.consignee || header.buyer || "—";
            const totalItems = (so.items || []).length;
            const totalQty = (so.items || []).reduce(
              (s, i) => s + (i.quantity || i.orderedQty || 0), 0,
            );
            const deliveryDate = so.deliveryDate || header.dated || so.eta || "";
            const hasQcIssues = so.soQcIssues?.length > 0;
            const prevShortageItems = (so.soQcIssues || []).filter(
              (i) => i.issue === "shortage"
            );
            const isComplete =
              so.soStatus === "ready_for_dispatch" || so.soStatus === "complete";

            return (
              <div
                key={so.id}
                className={`px-6 py-4 transition-colors cursor-pointer ${
                  isComplete
                    ? "bg-emerald-50/30 hover:bg-emerald-50/50"
                    : hasQcIssues
                      ? "bg-orange-50/40 hover:bg-orange-50 border-l-4 border-l-orange-400"
                      : "hover:bg-violet-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">{soNumber}</p>
                      {isComplete ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full uppercase">
                          ✅ Approved
                        </span>
                      ) : hasQcIssues ? (
                        <>
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 rounded-full uppercase">
                            ⚠ Partial — Shortage
                          </span>
                          {prevShortageItems.length > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 rounded-full">
                              {prevShortageItems.reduce((s, i) => s + (i.shortage || 0), 0)} units short
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 rounded-full uppercase">
                          Waiting for QC
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600">{customer}</p>

                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{totalItems} items · {totalQty} units</span>
                      {deliveryDate && (
                        <span>Delivery: {formatDate(deliveryDate)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <FiClock size={10} />
                        {formatDateTime(so.createdAt)}
                      </span>
                    </div>

                    {hasQcIssues && !isComplete && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(so.soQcIssues || []).map((iss, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] font-bold bg-white border border-orange-200 text-orange-700 rounded-md"
                          >
                            {iss.productCode}: {iss.issue?.replace("_", " ")}
                            {iss.shortage > 0 && ` (${iss.shortage} short)`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    {isComplete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printSODetails(so);
                        }}
                        className="px-3 py-2 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap flex items-center gap-1.5"
                      >
                        <FiPrinter size={12} /> Print
                      </button>
                    )}

                    {isComplete ? (
                      <button
                        onClick={() => handleSelectSO(so)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors whitespace-nowrap"
                      >
                        <FiEye size={12} /> View Details
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectSO(so)}
                        disabled={loadingSO2}
                        className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-60 ${
                          hasQcIssues
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-violet-600 hover:bg-violet-700"
                        }`}
                      >
                        <FiShield size={12} />
                        {loadingSO2 ? "Loading..." : hasQcIssues ? "Re-verify →" : "Verify SO →"}
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