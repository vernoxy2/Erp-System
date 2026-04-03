import React, { useState } from 'react';

const ManualStockAdjustment = () => {
  const [mode, setMode] = useState(''); // '', 'single', 'bulk'
  const [adjustments, setAdjustments] = useState([]);
  const [currentAdjustment, setCurrentAdjustment] = useState({
    productCode: '',
    productName: '',
    systemStock: 0,
    physicalStock: 0,
    unit: 'KG',
    category: '',
    reason: ''
  });

  const categories = [
    'Physical Verification Mismatch',
    'Damaged Stock',
    'Expired Stock',
    'Found in Storage',
    'Theft/Loss',
    'Data Entry Error',
    'Other'
  ];

  const addAdjustment = () => {
    if (!currentAdjustment.reason) {
      alert('Reason is mandatory!');
      return;
    }

    const adjustment = currentAdjustment.physicalStock - currentAdjustment.systemStock;
    const adjustmentValue = Math.abs(adjustment * 500); // Assuming ₹500 per unit

    setAdjustments([...adjustments, {
      ...currentAdjustment,
      adjustment,
      adjustmentType: adjustment < 0 ? 'decrease' : 'increase',
      adjustmentValue
    }]);

    setCurrentAdjustment({
      productCode: '',
      productName: '',
      systemStock: 0,
      physicalStock: 0,
      unit: 'KG',
      category: '',
      reason: ''
    });
  };

  const submitForApproval = () => {
    const totalValue = adjustments.reduce((sum, adj) => sum + adj.adjustmentValue, 0);
    
    let approver = 'Store Manager';
    if (totalValue > 25000) {
      approver = 'Owner';
    } else if (totalValue > 5000) {
      approver = 'Admin';
    }

    alert(`Adjustment submitted for ${approver} approval!\nTotal Value Impact: ₹${totalValue.toLocaleString()}`);
  };

  const totalValueImpact = adjustments.reduce((sum, adj) => sum + adj.adjustmentValue, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manual Stock Adjustment</h1>
        <p className="text-gray-600 mt-1">Create stock corrections with manager approval</p>
      </div>

      {/* Mode Selection */}
      {!mode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onClick={() => setMode('single')}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-lg cursor-pointer transition-all"
          >
            <div className="flex items-start space-x-4">
              <span className="text-4xl">📝</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Single Product Mode</h3>
                <p className="text-sm text-gray-600 mt-1">For daily use, 1-10 products, manual entry</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>• Quick product selection</li>
                  <li>• Enter physical count</li>
                  <li>• Specify reason</li>
                  <li>• Submit for approval</li>
                </ul>
                <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Start Single Mode
                </button>
              </div>
            </div>
          </div>

          <div
            onClick={() => setMode('bulk')}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-lg cursor-pointer transition-all"
          >
            <div className="flex items-start space-x-4">
              <span className="text-4xl">📊</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Bulk Upload Mode</h3>
                <p className="text-sm text-gray-600 mt-1">For opening stock, annual audits, 10+ products via Excel</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>• Download Excel template</li>
                  <li>• Fill product details</li>
                  <li>• Upload & validate</li>
                  <li>• Submit for approval</li>
                </ul>
                <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Start Bulk Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Product Mode */}
      {mode === 'single' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-800">{adjustments.length}</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value Impact</p>
                  <p className="text-2xl font-bold text-gray-800">₹{totalValueImpact.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adjustment Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Product Adjustment</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Code *</label>
                <input
                  type="text"
                  value={currentAdjustment.productCode}
                  onChange={(e) => setCurrentAdjustment({...currentAdjustment, productCode: e.target.value})}
                  placeholder="MS ANGLE"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={currentAdjustment.productName}
                  onChange={(e) => setCurrentAdjustment({...currentAdjustment, productName: e.target.value})}
                  placeholder="MS Angle 50x50x6mm"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Stock *</label>
                <input
                  type="number"
                  value={currentAdjustment.systemStock}
                  onChange={(e) => setCurrentAdjustment({...currentAdjustment, systemStock: parseFloat(e.target.value) || 0})}
                  placeholder="450"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Physical Stock *</label>
                <input
                  type="number"
                  value={currentAdjustment.physicalStock}
                  onChange={(e) => setCurrentAdjustment({...currentAdjustment, physicalStock: parseFloat(e.target.value) || 0})}
                  placeholder="445"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                <select
                  value={currentAdjustment.unit}
                  onChange={(e) => setCurrentAdjustment({...currentAdjustment, unit: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="KG">KG</option>
                  <option value="MTR">MTR</option>
                  <option value="PCS">PCS</option>
                  <option value="LTR">LTR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={currentAdjustment.category}
                  onChange={(e) => setCurrentAdjustment({...currentAdjustment, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason * <span className="text-red-600">(Mandatory)</span>
                </label>
                <textarea
                  value={currentAdjustment.reason}
                  onChange={(e) => setCurrentAdjustment({...currentAdjustment, reason: e.target.value})}
                  placeholder="Explain the reason for this adjustment..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={addAdjustment}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Adjustment
              </button>
              <button
                onClick={() => setMode('')}
                className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Adjustments List */}
          {adjustments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Adjustments</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">System</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Physical</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Adjustment</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.map((adj, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{adj.productCode}</div>
                          <div className="text-sm text-gray-600">{adj.productName}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800">{adj.systemStock} {adj.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-800">{adj.physicalStock} {adj.unit}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={adj.adjustmentType === 'decrease' ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                            {adj.adjustment > 0 ? '+' : ''}{adj.adjustment} {adj.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{adj.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {totalValueImpact < 5000 && <span>✓ Manager approval required (Value: ₹{totalValueImpact.toLocaleString()})</span>}
                  {totalValueImpact >= 5000 && totalValueImpact < 25000 && <span>⚠️ Admin approval required (Value: ₹{totalValueImpact.toLocaleString()})</span>}
                  {totalValueImpact >= 25000 && <span className="text-red-600">🔴 Owner approval required (Value: ₹{totalValueImpact.toLocaleString()})</span>}
                </div>
                <button
                  onClick={submitForApproval}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Submit for Approval
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Upload Mode */}
      {mode === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Bulk Upload via Excel</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">📥</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Step 1: Download Template</h3>
                  <p className="text-sm text-gray-600 mb-4">Download the Excel template with required columns</p>
                  <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    Download Template
                  </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">📝</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Step 2: Fill Template</h3>
                  <p className="text-sm text-gray-600 mb-4">Fill in product details in the template</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Product Code</p>
                    <p>• Product Name</p>
                    <p>• Unit</p>
                    <p>• Quantity</p>
                    <p>• Storage Location</p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-lg p-8 text-center">
                <div className="text-5xl mb-3">📤</div>
                <h3 className="font-semibold text-gray-800 mb-2">Step 3: Upload File</h3>
                <p className="text-sm text-gray-600 mb-4">Upload the completed Excel file</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Choose File
                </label>
                <p className="text-xs text-gray-500 mt-2">Supported formats: .xlsx, .xls</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setMode('')}
                  className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualStockAdjustment;
