import React from "react";

export default function StockSummary() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800">StockSummary</h2>
        {/* <p className="text-sm text-slate-500 mt-1">Module ready for implementation</p> */}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">StockSummary Page</h3>
           <p className="text-sm text-slate-600 leading-relaxed mt-5">
            This ERP module is currently under development.
            <br />
            Please check back soon for updates.
          </p>
        </div>
      </div>
    </div>
  );
}
