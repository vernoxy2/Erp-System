import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import StoreSideBar from "../../StoreComponent/Layout/StoreSideBar";
import StoreHeader from "../../StoreComponent/Layout/StoreHeader";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <StoreSideBar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <StoreHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}