import React from "react";
import { Outlet } from "react-router-dom";
import StoreSideBar from "../../StoreComponent/Layout/StoreSideBar";
import StoreHeader from "../../StoreComponent/Layout/StoreHeader";


export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      <StoreSideBar />
      <div className="flex-1 flex flex-col overflow-hidden">
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
