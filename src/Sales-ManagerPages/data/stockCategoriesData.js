// Stock Categories and Low Stock Management Data
// Based on your Excel file with 21 categories

export const stockCategories = [
  { id: 1, name: "CHANNEL", productCount: 6, lowStockCount: 2, criticalCount: 1, icon: "" },
  { id: 2, name: "FRP", productCount: 28, lowStockCount: 5, criticalCount: 2, icon: "" },
  { id: 3, name: "FRP MATERIAL", productCount: 20, lowStockCount: 3, criticalCount: 0, icon: "" },
  { id: 4, name: "GRIDER & CLAMP ITEM", productCount: 59, lowStockCount: 8, criticalCount: 3, icon: "" },
  { id: 5, name: "HARDWARE ITEM", productCount: 94, lowStockCount: 12, criticalCount: 5, icon: "" },
  { id: 6, name: "HDPE", productCount: 160, lowStockCount: 15, criticalCount: 6, icon: "" },
  { id: 7, name: "INSULATION", productCount: 13, lowStockCount: 3, criticalCount: 1, icon: "" },
  { id: 8, name: "MACHINE", productCount: 22, lowStockCount: 2, criticalCount: 0, icon: "" },
  { id: 9, name: "M.S FLANGES", productCount: 19, lowStockCount: 4, criticalCount: 1, icon: "" },
  { id: 10, name: "OTHER ITEMS", productCount: 28, lowStockCount: 6, criticalCount: 2, icon: "" },
  { id: 11, name: "PPCH FITTINGS", productCount: 153, lowStockCount: 18, criticalCount: 8, icon: "" },
  { id: 12, name: "PPCH PIPES", productCount: 24, lowStockCount: 5, criticalCount: 2, icon: "" },
  { id: 13, name: "PP FITTINGS", productCount: 65, lowStockCount: 7, criticalCount: 3, icon: "🔌" },
  { id: 14, name: "PPH PIPE", productCount: 6, lowStockCount: 1, criticalCount: 0, icon: "" },
  { id: 15, name: "PP PIPES", productCount: 16, lowStockCount: 2, criticalCount: 1, icon: "" },
  { id: 16, name: "PPRCT FITTINGS", productCount: 304, lowStockCount: 25, criticalCount: 10, icon: "" },
  { id: 17, name: "PPRCT PIPES", productCount: 40, lowStockCount: 8, criticalCount: 4, icon: "" },
  { id: 18, name: "PPRC VALVES", productCount: 9, lowStockCount: 1, criticalCount: 0, icon: "" },
  { id: 19, name: "THERMAL PIPES", productCount: 12, lowStockCount: 3, criticalCount: 1, icon: "" },
  { id: 20, name: "UPVC & PVC MATERIAL", productCount: 44, lowStockCount: 6, criticalCount: 2, icon: "" },
  { id: 21, name: "VALVES", productCount: 139, lowStockCount: 14, criticalCount: 6, icon: "" }
];

export const lowStockProducts = [
  // CHANNEL (2 low, 1 critical)
  { id: 1, categoryId: 1, categoryName: "CHANNEL", code: "MS ANGLE", unit: "KG", currentStock: 45, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-18" },
  { id: 2, categoryId: 1, categoryName: "CHANNEL", code: "MS CHANNEL", unit: "KG", currentStock: 75, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-19" },
  
  // FRP (5 low, 2 critical)
  { id: 3, categoryId: 2, categoryName: "FRP", code: "G.P. RESIN", unit: "KG", currentStock: 120, lowLevel: 200, reorderLevel: 300, lastUpdated: "2024-02-17" },
  { id: 4, categoryId: 2, categoryName: "FRP", code: "FIBERGLASS MATT", unit: "KG", currentStock: 35, lowLevel: 150, reorderLevel: 200, lastUpdated: "2024-02-18" },
  { id: 5, categoryId: 2, categoryName: "FRP", code: "M.E.K.P", unit: "KG", currentStock: 25, lowLevel: 50, reorderLevel: 75, lastUpdated: "2024-02-19" },
  { id: 6, categoryId: 2, categoryName: "FRP", code: "COBALT/ACCELATOR", unit: "KG", currentStock: 90, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-16" },
  { id: 7, categoryId: 2, categoryName: "FRP", code: "PPH WELDING ROD", unit: "KG", currentStock: 65, lowLevel: 100, reorderLevel: 120, lastUpdated: "2024-02-18" },
  
  // FRP MATERIAL (3 low, 0 critical)
  { id: 8, categoryId: 3, categoryName: "FRP MATERIAL", code: "FRP MOULDED GRATING 25mm", unit: "SQ.M", currentStock: 180, lowLevel: 200, reorderLevel: 250, lastUpdated: "2024-02-17" },
  { id: 9, categoryId: 3, categoryName: "FRP MATERIAL", code: "FRP MOULDED GRATING 38MM", unit: "SQ.M", currentStock: 150, lowLevel: 180, reorderLevel: 220, lastUpdated: "2024-02-18" },
  { id: 10, categoryId: 3, categoryName: "FRP MATERIAL", code: "FRP SHEET", unit: "NOS", currentStock: 85, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-19" },
  
  // GRIDER & CLAMP ITEM (8 low, 3 critical)
  { id: 11, categoryId: 4, categoryName: "GRIDER & CLAMP ITEM", code: "GRIDER CLAMP 110MM", unit: "NOS", currentStock: 25, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-18" },
  { id: 12, categoryId: 4, categoryName: "GRIDER & CLAMP ITEM", code: "GRIDER CLAMP 160MM", unit: "NOS", currentStock: 35, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-19" },
  { id: 13, categoryId: 4, categoryName: "GRIDER & CLAMP ITEM", code: "GRIDER CLAMP 200MM", unit: "NOS", currentStock: 40, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-17" },
  { id: 14, categoryId: 4, categoryName: "GRIDER & CLAMP ITEM", code: "SLOTTED CHANNEL", unit: "MTR", currentStock: 180, lowLevel: 200, reorderLevel: 300, lastUpdated: "2024-02-18" },
  { id: 15, categoryId: 4, categoryName: "GRIDER & CLAMP ITEM", code: "GRIDER SUPPORT 300MM L", unit: "NOS", currentStock: 75, lowLevel: 100, reorderLevel: 120, lastUpdated: "2024-02-19" },
  
  // HARDWARE ITEM (12 low, 5 critical)
  { id: 16, categoryId: 5, categoryName: "HARDWARE ITEM", code: "GI BOLT", unit: "KG", currentStock: 15, lowLevel: 50, reorderLevel: 75, lastUpdated: "2024-02-18" },
  { id: 17, categoryId: 5, categoryName: "HARDWARE ITEM", code: "GI NUT", unit: "KG", currentStock: 20, lowLevel: 50, reorderLevel: 75, lastUpdated: "2024-02-19" },
  { id: 18, categoryId: 5, categoryName: "HARDWARE ITEM", code: "GI WASHER", unit: "KG", currentStock: 25, lowLevel: 50, reorderLevel: 75, lastUpdated: "2024-02-17" },
  { id: 19, categoryId: 5, categoryName: "HARDWARE ITEM", code: "MS BOLT", unit: "KG", currentStock: 35, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-18" },
  { id: 20, categoryId: 5, categoryName: "HARDWARE ITEM", code: "RING GASKET-4\"", unit: "NOS", currentStock: 45, lowLevel: 100, reorderLevel: 150, lastUpdated: "2024-02-19" },
];

// Helper function to calculate stock status
export const getStockStatus = (currentStock, lowLevel) => {
  const percentage = (currentStock / lowLevel) * 100;
  if (percentage <= 50) return { status: "critical", color: "red", label: "Critical", bgColor: "bg-red-50", textColor: "text-red-700", borderColor: "border-red-200" };
  if (percentage <= 75) return { status: "low", color: "yellow", label: "Low Stock", bgColor: "bg-yellow-50", textColor: "text-yellow-700", borderColor: "border-yellow-200" };
  return { status: "normal", color: "green", label: "Normal", bgColor: "bg-green-50", textColor: "text-green-700", borderColor: "border-green-200" };
};

// Helper to get category alert level
export const getCategoryAlert = (category) => {
  if (category.criticalCount > 0) return { level: "critical", color: "red", bgColor: "bg-red-50", borderColor: "border-red-300", icon: "🔴" };
  if (category.lowStockCount > 5) return { level: "high", color: "orange", bgColor: "bg-orange-50", borderColor: "border-orange-300", icon: "🟠" };
  if (category.lowStockCount > 0) return { level: "medium", color: "yellow", bgColor: "bg-yellow-50", borderColor: "border-yellow-300", icon: "🟡" };
  return { level: "normal", color: "green", bgColor: "bg-green-50", borderColor: "border-green-300", icon: "🟢" };
};

// Sample products for each category (for demo purposes)
export const sampleProducts = {
  1: ["MS ANGLE", "MS CHANNEL", "MS SQUARE PIPE", "ANGLE", "SQUARE TUBE", "ANGEL/CHANNEL/BEAM"],
  2: ["BRUSH", "COBALT/ACCELATOR", "E-GLASS CHOPPED STRAND MAT", "FIBERGLASS MATT", "G.P. RESIN"],
  3: ["FRP CABLE TRAY", "FRP COVER", "FRP MOTOR CANOPY", "FRP MOULDED GRATING", "FRP SHEET"],
  4: ["BASE PLATE FOR STRUT", "BEAM CLAMP 10MM", "GRIDER CLAMP 110MM", "GRIDER CLAMP 125MM"],
  5: ["ANCHER FASTNER", "BOLT", "BRASS BUSHING", "GI BOLT", "GI NUT", "GI WASHER"]
};
