import React from "react";

// All reusable UI components for Sales Module
export const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action }) => (
  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
    <div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
export function FormSection({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
export function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-xs font-bold text-slate-600">{label}</span>
      )}
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-indigo-600" : "bg-slate-200"}`}
      >
        <span
          className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 mt-0.5 ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
      {checked && (
        <span className="text-xs font-semibold text-indigo-600">YES</span>
      )}
      {!checked && (
        <span className="text-xs font-semibold text-slate-400">NO</span>
      )}
    </div>
  );
}

export const KPICard = ({
  label,
  value,
  icon: Icon,
  color = "indigo",
  trend,
  onClick,
}) => {
  const colors = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  };
  return (
    <Card
      className={`p-5 hover:shadow-md transition-all ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className="text-white" size={20} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-slate-800">{value}</p>
            {trend && (
              <span
                className={`text-xs font-semibold ${trend > 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export const StatusBadge = ({ status, label }) => {
  const styles = {
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
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles[status] || styles.pending}`}
    >
      {label || status.replace("_", " ")}
    </span>
  );
};

export const BtnPrimary = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${className}`}
  >
    {children}
  </button>
);

export const BtnSecondary = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 ${className}`}
  >
    {children}
  </button>
);

export const BtnDanger = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5 ${className}`}
  >
    {children}
  </button>
);

export const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  className = "",
}) => (
  <div className={className}>
    {label && (
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      required={required}
    />
  </div>
);

export const Select = ({
  label,
  value,
  onChange,
  options,
  required,
  className = "",
}) => (
  <div className={className}>
    {label && (
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={onChange}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      required={required}
    >
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const Textarea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
}) => (
  <div className={className}>
    {label && (
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}
      </label>
    )}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);

export const Modal = ({ title, children, onClose, size = "md" }) => {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

export const Alert = ({ type = "info", children, onClose }) => {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    error: "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div
      className={`p-4 rounded-lg border ${styles[type]} flex items-start justify-between gap-3`}
    >
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current opacity-50 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export const Table = ({ headers, children, className = "" }) => (
  <div className="overflow-x-auto">
    <table className={`w-full text-sm ${className}`}>
      <thead>
        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {headers.map((header, idx) => (
            <th
              key={idx}
              className={`px-5 py-3 text-${header.align || "left"}`}
            >
              {header.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">{children}</tbody>
    </table>
  </div>
);

export const FileUpload = ({
  label,
  accept,
  onChange,
  file,
  className = "",
}) => (
  <div className={className}>
    {label && (
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}
      </label>
    )}
    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-indigo-300 transition-colors">
      <input
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        {file ? (
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              ✓ {file.name}
            </p>
            <p className="text-xs text-slate-400 mt-1">Click to change</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-600">
              📁 Click to upload
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {accept || "Any file"}
            </p>
          </div>
        )}
      </label>
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-12">
    {Icon && <Icon size={48} className="mx-auto mb-3 text-slate-300" />}
    <p className="text-sm font-bold text-slate-600">{title}</p>
    {description && (
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const NotificationBadge = ({ type, title, message, time, onClick }) => {
  const types = {
    success: "bg-emerald-50 border-emerald-200",
    warning: "bg-amber-50 border-amber-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border ${types[type]} hover:shadow-md transition-all cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-600 mt-1">{message}</p>
          <p className="text-xs text-slate-400 mt-2">{time}</p>
        </div>
      </div>
    </div>
  );
};
