import React, { useState } from 'react';

const StockVerification = () => {
  const [verificationType, setVerificationType] = useState('');
  const [status, setStatus] = useState('not_started'); // not_started, in_progress, completed
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState({
    productCode: '',
    productName: '',
    systemStock: 0,
    physicalStock: 0,
    unit: 'KG',
    notes: ''
  });

  const verificationTypes = [
    { id: 'full', name: 'Full Count', description: 'Count all 1,261 products', icon: '' },
    { id: 'category', name: 'Category Count', description: 'Count one category at a time', icon: '' },
    { id: 'random', name: 'Random Sample', description: 'System picks 20% (252 products)', icon: '' },
    { id: 'specific', name: 'Specific Products', description: 'Manually select products', icon: '' }
  ];

  const sampleProducts = [
    { code: 'MS ANGLE', name: 'MS Angle 50x50x6mm', systemStock: 450, unit: 'KG' },
    { code: 'GI BOLT', name: 'GI Bolt M12x100', systemStock: 100, unit: 'KG' },
    { code: 'PPCH PIPE', name: 'PPCH Pipe 2 inch', systemStock: 195, unit: 'MTR' }
  ];

  const startVerification = (type) => {
    setVerificationType(type);
    setStatus('in_progress');
    // Load products based on type
    if (type === 'random') {
      setProducts(sampleProducts);
    }
  };

  const addProductCount = () => {
    const variance = currentProduct.physicalStock - currentProduct.systemStock;
    const variancePercent = ((variance / currentProduct.systemStock) * 100).toFixed(2);
    
    setProducts([...products, {
      ...currentProduct,
      variance,
      variancePercent,
      status: variance === 0 ? 'match' : 'mismatch'
    }]);
    
    setCurrentProduct({
      productCode: '',
      productName: '',
      systemStock: 0,
      physicalStock: 0,
      unit: 'KG',
      notes: ''
    });
  };

  const completeVerification = () => {
    setStatus('completed');
    alert('Verification completed! Report generated.');
  };

  const matched = products.filter(p => p.status === 'match').length;
  const mismatched = products.filter(p => p.status === 'mismatch').length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">
            Stock Verification
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Physical stock counting and comparison
          </p>
        </div>
      </div>

      {status === 'not_started' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {verificationTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => startVerification(type.id)}
              className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-lg cursor-pointer transition-all"
            >
              <div className="flex items-start space-x-4">
                <span className="text-4xl">{type.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{type.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    Start Verification
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'in_progress' && (
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-800">{products.length}</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <span className="text-2xl"></span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Matched / Mismatched</p>
                  <p className="text-2xl font-bold text-gray-800">
                    <span className="text-green-600">{matched}</span> / <span className="text-red-600">{mismatched}</span>
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <span className="text-2xl"></span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Entry Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Product Count</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Code</label>
                <input
                  type="text"
                  value={currentProduct.productCode}
                  onChange={(e) => setCurrentProduct({...currentProduct, productCode: e.target.value})}
                  placeholder="MS ANGLE"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                <input
                  type="text"
                  value={currentProduct.productName}
                  onChange={(e) => setCurrentProduct({...currentProduct, productName: e.target.value})}
                  placeholder="MS Angle 50x50x6mm"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Stock</label>
                <input
                  type="number"
                  value={currentProduct.systemStock}
                  onChange={(e) => setCurrentProduct({...currentProduct, systemStock: parseFloat(e.target.value) || 0})}
                  placeholder="450"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Physical Count</label>
                <input
                  type="number"
                  value={currentProduct.physicalStock}
                  onChange={(e) => setCurrentProduct({...currentProduct, physicalStock: parseFloat(e.target.value) || 0})}
                  placeholder="445"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                <select
                  value={currentProduct.unit}
                  onChange={(e) => setCurrentProduct({...currentProduct, unit: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="KG">KG</option>
                  <option value="MTR">MTR</option>
                  <option value="PCS">PCS</option>
                  <option value="LTR">LTR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (if mismatch)</label>
                <input
                  type="text"
                  value={currentProduct.notes}
                  onChange={(e) => setCurrentProduct({...currentProduct, notes: e.target.value})}
                  placeholder="Reason for variance..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={addProductCount}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Product
              </button>
              <button
                onClick={completeVerification}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Complete Verification
              </button>
            </div>
          </div>

          {/* Products List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Counted Products</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">System</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Physical</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Variance</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{product.productCode}</div>
                        <div className="text-sm text-gray-600">{product.productName}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">{product.systemStock} {product.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-800">{product.physicalStock} {product.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={product.variance < 0 ? 'text-red-600' : product.variance > 0 ? 'text-green-600' : 'text-gray-600'}>
                          {product.variance > 0 ? '+' : ''}{product.variance} ({product.variancePercent}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          product.status === 'match' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.status === 'match' ? 'MATCH' : 'MISMATCH'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Completed!</h2>
            <p className="text-gray-600 mb-6">Report ID: VR-2026-001</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">Matched Products</p>
                <p className="text-3xl font-bold text-green-800">{matched}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">Mismatched Products</p>
                <p className="text-3xl font-bold text-red-800">{mismatched}</p>
              </div>
            </div>

            <div className="space-x-3">
              <button
                onClick={() => {
                  setStatus('not_started');
                  setProducts([]);
                  setVerificationType('');
                }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                New Verification
              </button>
              <button className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockVerification;
