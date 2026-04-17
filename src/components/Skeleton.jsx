import React from "react";

/** كارت skeleton للمنتجات */
export function ProductSkeleton() {
  return (
    <div className="skeleton-card" style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", overflow: "hidden" }}>
      <div className="skeleton" style={{ height: 200, width: "100%" }} />
      <div style={{ padding: "16px" }}>
        <div className="skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 10, width: "80%" }} />
        <div className="skeleton" style={{ height: 20, borderRadius: 6, marginBottom: 12, width: "50%" }} />
        <div className="skeleton" style={{ height: 38, borderRadius: 10 }} />
      </div>
    </div>
  );
}

/** كارت skeleton للأقسام */
export function CategorySkeleton() {
  return (
    <div className="skeleton-card" style={{ background: "#fff", borderRadius: 20, overflow: "hidden", border: "1px solid #F1F5F9" }}>
      <div className="skeleton" style={{ aspectRatio: "1/1", width: "100%" }} />
      <div style={{ padding: "14px 16px" }}>
        <div className="skeleton" style={{ height: 16, borderRadius: 6, width: "60%" }} />
      </div>
    </div>
  );
}

/** صف skeleton للجداول */
export function RowSkeleton({ cols = 4 }) {
  return (
    <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          <div className="skeleton" style={{ height: 14, borderRadius: 6, width: i === 0 ? "80%" : i === cols - 1 ? "60%" : "70%" }} />
        </td>
      ))}
    </tr>
  );
}

/** صندوق skeleton عام */
export function BoxSkeleton({ height = 80, borderRadius = 12 }) {
  return <div className="skeleton" style={{ height, borderRadius, width: "100%" }} />;
}

export default { ProductSkeleton, CategorySkeleton, RowSkeleton, BoxSkeleton };
