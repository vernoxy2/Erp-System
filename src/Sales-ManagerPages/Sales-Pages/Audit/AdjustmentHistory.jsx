import React, { useState } from 'react';

const AdjustmentHistory = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const adjustments = [
    {
      id: 'ADJ-2026-001',
      date: '2026-08-15',
      type: 'Single',
      requestedBy: 'Rajesh Kumar',
      approvedBy: 'Amit Patel',
      status: 'approved',
      products: 1,
      totalValue: 2500,
      reason: 'Physical verification - monthly audit shortage'
    },
    {
      id: 'ADJ-2026-002',
      date: '2026-08-16',
      type: 'Bulk',
      requestedBy: 'Priya Sharma',
      approvedBy: 'Amit Patel',
      status: 'approved',
      products: 3,
      totalValue: 8500,
      reason: 'Multiple adjustments from inspection'
    },
    {
      id: 'ADJ-2026-003',
      date: '2026-08-17',
      type: 'Single',
      requestedBy: 'Rahul Verma',
      approvedBy: null,
      status: 'pending',
      products: 1,
      totalValue: 1200,
      reason: 'Damaged during handling'
    },
    {
      id: 'ADJ-2026-004',
      date: '2026-08-18',
      type: 'Single',
      requestedBy: 'Sneha Desai',
      approvedBy: 'Amit Patel',
      status: 'rejected',
      products: 1,
      totalValue: 15000,
      reason: 'Found in alternate location'
    },
    {
      id: 'OS-2026-001',
      date: '2026-07-01',
      type: 'Bulk',
      requestedBy: 'Admin User',
      approvedBy: 'Owner',
      status: 'approved',
      products: 1245,
      totalValue: 4500000,
      reason: 'System go-live opening stock'
    }
  ];

  const filteredAdjustments = adjustments.filter(adj => {
    if (filterStatus !== 'all' && adj.status !== filterStatus) return false;
    return true;
  });

  const statusCounts = {
    all: adjustments.length,
    approved: adjustments.filter(a => a.status === 'approved').length,
    pending: adjustments.filter(a => a.status === 'pending').length,
    rejected: adjustments.filter(a => a.status === 'rejected').length
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Adjustment History</h1>
        <p className="text-gray-600 mt-1">View all stock adjustments with filters</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Adjustments</p>
              <p className="text-2xl font-bold text-gray-800">{adjustments.length}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-800">
                {adjustments.filter(a => a.date.startsWith('2026-08')).length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Approved ({statusCounts.approved})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({statusCounts.pending})
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected ({statusCounts.rejected})
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>
      </div>

      {/* Adjustments List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Adjustments ({filteredAdjustments.length})
          </h2>
          <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
            Export to Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Requested By</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Products</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Value</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdjustments.map((adj) => (
                <tr key={adj.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-indigo-600">{adj.id}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{adj.date}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                      {adj.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{adj.requestedBy}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{adj.products}</td>
                  <td className="px-4 py-3 text-right text-gray-800">₹{adj.totalValue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      adj.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : adj.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {adj.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentHistory;
