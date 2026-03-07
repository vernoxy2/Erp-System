import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTruck, FiCheck, FiPrinter } from "react-icons/fi";
import {
  Card,
  CardHeader,
  Input,
  Select,
  BtnPrimary,
  BtnSecondary,
  Alert,
  Table,
  Modal,
} from "../SalesComponent/ui/index";
import { WORK_ORDERS_ENHANCED } from "../data/salesData";

export default function CreateChallan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Select WO, 2: Fill Details, 3: Preview
  const [selectedWO, setSelectedWO] = useState(null);
  const [challan, setChallan] = useState({
    challanNo: `CH-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    driverName: "",
    driverPhone: "",
    notes: "",
  });
  const [showPreview, setShowPreview] = useState(false);

  const readyWorkOrders = WORK_ORDERS_ENHANCED.filter(
    (wo) => wo.status === "ready",
  );

  const handleSelectWO = (wo) => {
    setSelectedWO(wo);
    setStep(2);
  };

  const handleSubmit = () => {
    setShowPreview(true);
  };

  const handleConfirm = () => {
    // In real app: Save challan and update WO status
    navigate("/sales/challans");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            Create Delivery Challan
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate challan for prepared work orders
          </p>
        </div>
        <BtnSecondary onClick={() => navigate("/sales/challans")}>
          Cancel
        </BtnSecondary>
      </div>

      {/* Step 1: Select Work Order */}
      {step === 1 && (
        <Card>
          <CardHeader
            title="Select Work Order"
            subtitle={`${readyWorkOrders.length} orders ready for dispatch`}
          />
          {readyWorkOrders.length === 0 ? (
            <div className="p-12 text-center">
              <FiTruck size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">
                No Work Orders Ready
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Wait for store to prepare material
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {readyWorkOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleSelectWO(wo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-sm font-bold text-slate-800">
                          {wo.woNumber}
                        </p>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                          READY
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{wo.customer}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {wo.items.length} items • Delivery: {wo.deliveryDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">
                        ₹{(wo.totalValue / 1000).toFixed(0)}K
                      </p>
                      <button className="mt-2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">
                        Select →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Step 2: Fill Challan Details */}
      {step === 2 && selectedWO && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Work Order Summary */}
          <Card>
            <CardHeader title="Work Order Details" />
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold mb-1">WO Number</p>
                    <p className="text-slate-800 font-bold">
                      {selectedWO.woNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Customer</p>
                    <p className="text-slate-800 font-bold">
                      {selectedWO.customer}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Contact</p>
                    <p className="text-slate-800">
                      {selectedWO.customerContact}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold mb-1">Phone</p>
                    <p className="text-slate-800">{selectedWO.customerPhone}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">
                  Items ({selectedWO.items.length})
                </p>
                <div className="space-y-2">
                  {selectedWO.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800 font-mono">
                          {item.productCode}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          {item.description}
                        </p>
                      </div>
                      <p className="font-bold text-slate-800">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Challan Information */}
          <Card>
            <CardHeader title="Challan Information" />
            <div className="p-6 space-y-4">
              <Input
                label="Challan Number"
                value={challan.challanNo}
                onChange={(e) =>
                  setChallan({ ...challan, challanNo: e.target.value })
                }
                required
                disabled
              />
              <Input
                label="Date"
                type="date"
                value={challan.date}
                onChange={(e) =>
                  setChallan({ ...challan, date: e.target.value })
                }
                required
              />
              <Input
                label="Vehicle Number"
                value={challan.vehicleNo}
                onChange={(e) =>
                  setChallan({ ...challan, vehicleNo: e.target.value })
                }
                placeholder="GJ-01-AB-1234"
                required
              />
              <Input
                label="Driver Name"
                value={challan.driverName}
                onChange={(e) =>
                  setChallan({ ...challan, driverName: e.target.value })
                }
                placeholder="Rajesh Kumar"
                required
              />
              <Input
                label="Driver Phone"
                value={challan.driverPhone}
                onChange={(e) =>
                  setChallan({ ...challan, driverPhone: e.target.value })
                }
                placeholder="+91 98765 43210"
                required
              />
              <Input
                label="Notes (Optional)"
                value={challan.notes}
                onChange={(e) =>
                  setChallan({ ...challan, notes: e.target.value })
                }
                placeholder="Any special instructions..."
              />

              <Alert type="info">
                <p className="text-xs">
                  📋 After challan creation, you can upload customer invoice to
                  deduct stock from inventory.
                </p>
              </Alert>

              <div className="flex gap-3 pt-4">
                <button onClick={() => navigate("/sales/dispatch-on-challan")}>
                  ← back
                </button>
                <BtnPrimary onClick={handleSubmit} className="flex-1">
                  Generate Challan
                </BtnPrimary>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Modal
          title="Challan Preview"
          onClose={() => setShowPreview(false)}
          size="lg"
        >
          <div className="space-y-6">
            {/* Challan Header */}
            <div className="text-center border-b border-slate-200 pb-6">
              <h2 className="text-2xl font-black text-slate-800">
                DELIVERY CHALLAN
              </h2>
              <p className="text-sm text-slate-500 mt-1">{challan.challanNo}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">
                  From
                </p>
                <p className="font-bold text-slate-800">Your Company Name</p>
                <p className="text-sm text-slate-600">123 Business Street</p>
                <p className="text-sm text-slate-600">City, State - 123456</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">
                  To
                </p>
                <p className="font-bold text-slate-800">
                  {selectedWO.customer}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedWO.customerContact}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedWO.customerPhone}
                </p>
              </div>
            </div>

            {/* Challan Info */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-400 font-bold">Date</p>
                <p className="text-sm text-slate-800 font-bold">
                  {challan.date}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Vehicle</p>
                <p className="text-sm text-slate-800 font-bold">
                  {challan.vehicleNo}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Driver</p>
                <p className="text-sm text-slate-800 font-bold">
                  {challan.driverName}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <Table
              headers={[
                { label: "#" },
                { label: "Product Code" },
                { label: "Description" },
                { label: "Quantity", align: "right" },
              ]}
            >
              {selectedWO.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-2 text-sm font-bold font-mono">
                    {item.productCode}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {item.description}
                  </td>
                  <td className="px-4 py-2 text-sm font-bold text-right">
                    {item.quantity} {item.unit}
                  </td>
                </tr>
              ))}
            </Table>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <BtnSecondary onClick={() => setShowPreview(false)}>
                Edit
              </BtnSecondary>
              <BtnSecondary>
                <FiPrinter size={14} /> Print
              </BtnSecondary>
              <BtnPrimary onClick={handleConfirm}>
                <FiCheck size={14} /> Confirm & Save
              </BtnPrimary>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
