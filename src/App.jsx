import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Sales-ManagerPages/authntication/Login";
import SalesLayout from "./Sales-ManagerPages/SalesComponent/layout/Layout";
import Dashboard from "./Sales-ManagerPages/Sales-Pages/Dashboard";
import LowStockManagement from "./Sales-ManagerPages/Sales-Pages/LowStockManagement";
import CategoryManagement from "./Sales-ManagerPages/Sales-Pages/CategoryManagement";
import ProductManagement from "./Sales-ManagerPages/Sales-Pages/ProductManagement";
import SalesOrders from "./Sales-ManagerPages/Sales-Pages/SalesOrders";
import ReadyToDispatch from "./Sales-ManagerPages/Sales-Pages/ReadyToDispatch";
import DispatchOnChallan from "./Sales-ManagerPages/Sales-Pages/DispatchOnChallan";
import DispatchOnInvoice from "./Sales-ManagerPages/Sales-Pages/DispatchOnInvoice";
import UnbilledChallans from "./Sales-ManagerPages/Sales-Pages/UnbilledChallans";
import InvoiceHistory from "./Sales-ManagerPages/Sales-Pages/InvoiceHistory";
import CreatePurchaseOrder from "./Sales-ManagerPages/Sales-Pages/CreatePurchaseOrder";
import PurchaseOrderList from "./Sales-ManagerPages/Sales-Pages/PurchaseOrderList";
import UploadVendorInvoice from "./Sales-ManagerPages/Sales-Pages/UploadVendorInvoice";
import DebitCreditNotes from "./Sales-ManagerPages/Sales-Pages/DebitCreditNotes";
import StockSummary from "./Sales-ManagerPages/Sales-Pages/StockSummary";
import ItemsMaster from "./Sales-ManagerPages/Sales-Pages/ItemsMaster";
import StockAlerts from "./Sales-ManagerPages/Sales-Pages/StockAlerts";
import ReportsAnalytics from "./Sales-ManagerPages/Sales-Pages/ReportsAnalytics";
import UploadSalesOrder from "./Sales-ManagerPages/Sales-Pages/UploadSalesOrder";
// import ViewExcelSheetData from "./Sales-ManagerPages/Sales-Pages/ViewExcelSheetData";
import UploadPurchaseOrder from "./Sales-ManagerPages/Sales-Pages/UploadPurchaseOrder";
import PurchaseOrders from "./Sales-ManagerPages/Sales-Pages/Purchaseorders";
import CreateSalesOrder from "./Sales-ManagerPages/Sales-Pages/CreateSalesOrder";
import SalesOrderList from "./Sales-ManagerPages/Sales-Pages/SalesOrderList";
import SalesOrderDetails from "./Sales-ManagerPages/Sales-Pages/SalesOrderDetails";
import POCompleteDetails from "./Sales-ManagerPages/Sales-Pages/POCompleteDetails";
// import UploadSalesInvoice from "./Sales-ManagerPages/Sales-Pages/UploadSalesInvoice";
import SOCompleteDetails from "./Sales-ManagerPages/Sales-Pages/SOCompleteDetails";
import UploadSalesInvoice from "./Sales-ManagerPages/Sales-Pages/UploadSalesInvoice";
import ReadyToDispatchDeatils from "./Sales-ManagerPages/Sales-Pages/ReadyToDispatchDeatils";
import DispatchOnChallanList from "./Sales-ManagerPages/Sales-Pages/Dispatchonchallanlist";
import StoreDashboard from "./Store-ManagerPages/Store-Page/StoreDashboard";
import StoreLowStockManagement from "./Store-ManagerPages/Store-Page/StoreLowStockManagement";
import StoreCategoryManagement from "./Store-ManagerPages/Store-Page/StoreCategoryManagement";
import StoreProductManagement from "./Store-ManagerPages/Store-Page/StoreProductManagement";
import StoreLayout from "./Store-ManagerPages/StoreComponent/Layout/StoreLayout";
import StoreHeader from "./Store-ManagerPages/StoreComponent/Layout/StoreHeader";
import StoreVerifyQuality from "./Store-ManagerPages/Store-Page/StoreVerifyQuality";
import ReceivedOnChallan from "./Sales-ManagerPages/Sales-Pages/ReceivedOnChallan";
import VendorInvoiceHistory from "./Sales-ManagerPages/Sales-Pages/VendorInvoiceHistory";
const App = () => {
  return (
    <Routes>
      {/* All for sales */}
      <Route path="/" element={<Navigate to="/Login" replace />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/sales/*" element={<SalesLayout />}>
        {/* Dashboard */}
        <Route path="dashboard" element={<Dashboard />} />
        {/* STOCK MANAGEMENT */}
        <Route path="low-stock-management" element={<LowStockManagement />} />
        <Route path="category-management" element={<CategoryManagement />} />
        <Route path="product-management" element={<ProductManagement />} />
        <Route path="stock-summary" element={<StockSummary />} />

        {/* SALES ORDERS */}
        <Route path="sales-orders" element={<SalesOrders />} />
        <Route path="sales-orders/upload" element={<UploadSalesOrder />} />
        {/* <Route path="viewExcelSheet" element={<ViewExcelSheetData />} /> */}
        <Route path="ready-to-dispatch" element={<ReadyToDispatch />} />
        <Route path="sales-orders/create" element={<CreateSalesOrder />} />
        <Route path="sales-orders/list" element={<SalesOrderList />} />
        <Route path="sales-orders/:id" element={<SalesOrderDetails />} />
        <Route
          path="purchase-orders/complete/:poId"
          element={<POCompleteDetails />}
        />
        <Route
          path="sales-orders/complete/:soId"
          element={<SOCompleteDetails />}
        />
        <Route path="debit-credit-notes" element={<DebitCreditNotes />} />
        {/* DISPATCH */}
        {/* <Route path="/sales/dispatch-on-challan"        element={<DispatchOnChallanList />} /> */}
        <Route path="dispatch-on-challan" element={<DispatchOnChallan />} />
        <Route
          path="dispatch-on-challan-list"
          element={<DispatchOnChallanList />}
        />
        <Route path="dispatch-on-invoice" element={<DispatchOnInvoice />} />
        <Route
          path="dispatch-detail/:soId"
          element={<ReadyToDispatchDeatils />}
        />
        {/* INVOICING */}
        <Route path="unbilled-challans" element={<UnbilledChallans />} />
        <Route path="invoice-history" element={<InvoiceHistory />} />
        {/* PURCHASES */}
        <Route path="purchase-orders" element={<PurchaseOrderList />} />
        <Route
          path="purchase-orders/create"
          element={<CreatePurchaseOrder />}
        />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route
          path="purchase-orders/upload"
          element={<UploadPurchaseOrder />}
        />
        <Route path="upload-vendor-invoice" element={<UploadVendorInvoice />} />
        <Route path="upload-sales-invoice" element={<UploadSalesInvoice />} />
        <Route path="debit-credit-notes" element={<DebitCreditNotes />} />
        <Route path="recieved-on-challan" element={<ReceivedOnChallan />} />
        <Route
          path="vendor-invoice-history"
          element={<VendorInvoiceHistory />}
        />
        {/* INVENTORY */}
        <Route path="items-master" element={<ItemsMaster />} />
        <Route path="stock-alerts" element={<StockAlerts />} />
        {/* REPORTS */}
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="*" element={<Navigate to="/Login" replace />} />
        {/* Catch all */}
        {/* <Route path="*" element={<Navigate to="/sales/dashboard" replace />} /> */}
      </Route>
    
      {/* STORE ROUTES */}
      <Route path="/store/*" element={<StoreLayout />}>
        <Route path="dashboard" element={<StoreDashboard />} />
        <Route path="verify-quality" element={<StoreVerifyQuality />} />
        <Route path="stock-alerts" element={<StockAlerts />} />
        <Route
          path="low-stock-management"
          element={<StoreLowStockManagement />}
        />
        <Route
          path="category-management"
          element={<StoreCategoryManagement />}
        />
        <Route path="product-management" element={<StoreProductManagement />} />
        
      {/* <Route path="store-header" element={<StoreHeader />} /> */}
      </Route>
    </Routes>
  );
};
export default App;
