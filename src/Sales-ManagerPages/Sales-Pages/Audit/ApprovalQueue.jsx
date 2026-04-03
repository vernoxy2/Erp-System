import React, { useState } from 'react';

const ApprovalQueue = () => {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const pendingRequests = [
    {
      id: 'ADJ-2026-001',
      type: 'Stock Adjustment',
      requestedBy: 'Rajesh Kumar',
      requestedAt: '2026-08-15 14:00',
      totalProducts: 1,
      totalValue: 2500,
      approvalLevel: 'Store Manager',
      products: [
        {
          code: 'MS ANGLE',
          name: 'MS Angle 50x50x6mm',
          systemStock: 450,
          physicalStock: 445,
          adjustment: -5,
          unit: 'KG',
          reason: 'Physical verification - monthly audit shortage'
        }
      ]
    },
    {
      id: 'ADJ-2026-002',
      type: 'Stock Adjustment',
      requestedBy: 'Priya Sharma',
      requestedAt: '2026-08-16 10:30',
      totalProducts: 3,
      totalValue: 8500,
      approvalLevel: 'Admin',
      products: [
        {
          code: 'GI BOLT',
          name: 'GI Bolt M12x100',
          systemStock: 100,
          physicalStock: 97,
          adjustment: -3,
          unit: 'KG',
          reason: 'Found damaged during inspection'
        },
        {
          code: 'PPCH PIPE',
          name: 'PPCH Pipe 2 inch',
          systemStock: 195,
          physicalStock: 205,
          adjustment: 10,
          unit: 'MTR',
          reason: 'Found additional stock in warehouse section B'
        },
        {
          code: 'MS CHANNEL',
          name: 'MS Channel 100x50x6mm',
          systemStock: 280,
          physicalStock: 275,
          adjustment: -5,
          unit: 'KG',
          reason: 'Scrap/wastage during cutting'
        }
      ]
    },
    {
      id: 'OS-2026-001',
      type: 'Opening Stock',
      requestedBy: 'Admin User',
      requestedAt: '2026-07-01 09:00',
      totalProducts: 1245,
      totalValue: 4500000,
      approvalLevel: 'Owner',
      products: []
    }
  ];

  const approveRequest = (requestId) => {
    alert(`Request ${requestId} approved successfully!`);
    setSelectedRequest(null);
  };

  const rejectRequest = (requestId) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      alert(`Request ${requestId} rejected. Reason: ${reason}`);
      setSelectedRequest(null);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Approval Queue</h1>
        <p className="text-gray-600 mt-1">Review and approve stock adjustment requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-800">{pendingRequests.length}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority (Owner)</p>
              <p className="text-2xl font-bold text-red-600">
                {pendingRequests.filter(r => r.approvalLevel === 'Owner').length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <span className="text-2xl">🔴</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      {!selectedRequest && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Requests</h2>
          
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-5 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{request.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        request.approvalLevel === 'Owner' 
                          ? 'bg-red-100 text-red-800'
                          : request.approvalLevel === 'Admin'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {request.approvalLevel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Type: {request.type}</p>
                    <p className="text-sm text-gray-600">Requested by: {request.requestedBy}</p>
                    <p className="text-sm text-gray-600">Date: {request.requestedAt}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Products</p>
                    <p className="text-2xl font-bold text-gray-800 mb-2">{request.totalProducts}</p>
                    <p className="text-sm text-gray-600 mb-1">Value Impact</p>
                    <p className="text-xl font-bold text-indigo-600">₹{request.totalValue.toLocaleString()}</p>
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
            ))}
          </div>
        </div>
      )}

      {/* Request Detail View */}
      {selectedRequest && (
        <div className="space-y-6">
          {/* Back Button */}
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
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{selectedRequest.id}</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-semibold text-gray-800">{selectedRequest.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested By:</span>
                    <span className="font-semibold text-gray-800">{selectedRequest.requestedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold text-gray-800">{selectedRequest.requestedAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Approval Level:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedRequest.approvalLevel === 'Owner' 
                        ? 'bg-red-100 text-red-800'
                        : selectedRequest.approvalLevel === 'Admin'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedRequest.approvalLevel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
                <p className="text-sm text-indigo-700 mb-2">Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-indigo-800 font-medium">Total Products:</span>
                    <span className="text-2xl font-bold text-indigo-900">{selectedRequest.totalProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-800 font-medium">Value Impact:</span>
                    <span className="text-2xl font-bold text-indigo-900">₹{selectedRequest.totalValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          {selectedRequest.products.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Product Details</h3>
              
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
                    {selectedRequest.products.map((product, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{product.code}</div>
                          <div className="text-sm text-gray-600">{product.name}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800">
                          {product.systemStock} {product.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800">
                          {product.physicalStock} {product.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={product.adjustment < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                            {product.adjustment > 0 ? '+' : ''}{product.adjustment} {product.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{product.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approval Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Approval Decision</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-green-200 bg-green-50 rounded-lg p-5 text-center">
                <div className="text-4xl mb-3">✓</div>
                <h4 className="font-semibold text-gray-800 mb-2">Approve Request</h4>
                <p className="text-sm text-gray-600 mb-4">Stock will be updated immediately</p>
                <button
                  onClick={() => approveRequest(selectedRequest.id)}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors w-full"
                >
                  Approve
                </button>
              </div>

              <div className="border-2 border-red-200 bg-red-50 rounded-lg p-5 text-center">
                <div className="text-4xl mb-3">✗</div>
                <h4 className="font-semibold text-gray-800 mb-2">Reject Request</h4>
                <p className="text-sm text-gray-600 mb-4">Provide a reason for rejection</p>
                <button
                  onClick={() => rejectRequest(selectedRequest.id)}
                  className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors w-full"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
