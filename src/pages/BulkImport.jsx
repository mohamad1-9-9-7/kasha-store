import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { shadow, inputBase, btnPrimary } from "../Theme";
import { csvToObjects, objectsToCSV } from "../utils/csvParser";
import { apiFetch } from "../api";
import { useToast } from "../context/ToastContext";

const CARD = { background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "24px" };

const HEADERS = [
  "name", "nameEn", "price", "oldPrice", "category", "brand",
  "stock", "weight", "description", "descriptionEn", "badges",
  "image", "images", "metaTitle", "metaDescription", "sku",
];

const SAMPLE = [
  {
    name: "سماعات لاسلكية",
    nameEn: "Wireless Headphones",
    price: "199",
    oldPrice: "249",
    category: "إلكترونيات",
    brand: "Sony",
    stock: "25",
    weight: "0.3",
    description: "سماعات عالية الجودة مع عزل للضوضاء",
    descriptionEn: "High quality headphones with noise cancellation",
    badges: "جديد,الأكثر مبيعاً",
    image: "https://example.com/headphones.jpg",
    images: "https://example.com/h1.jpg,https://example.com/h2.jpg",
    metaTitle: "سماعات Sony لاسلكية",
    metaDescription: "أفضل سماعات لاسلكية من سوني",
    sku: "KSH-HEAD-001",
  },
];

export default function BulkImport() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  React.useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") navigate("/admin-login");
  }, []);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    try {
      const text = await f.text();
      const data = csvToObjects(text);
      setRows(data);
      if (!data.length) toast("الملف فارغ أو بصيغة خاطئة", "error");
    } catch {
      toast("فشل قراءة الملف", "error");
    }
  };

  const downloadTemplate = () => {
    const csv = objectsToCSV(SAMPLE, HEADERS);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!rows.length) return toast("لا توجد منتجات للرفع", "error");
    setLoading(true);
    try {
      const res = await apiFetch("/api/products/bulk", {
        method: "POST",
        body: { products: rows },
      });
      setResult(res);
      toast(`✅ تم: ${res.inserted} جديد، ${res.updated} محدّث، ${res.skipped} متخطّى`, "success");
    } catch (e) {
      toast("فشل الرفع: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: "rtl" }}>
      <nav style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/admin-dashboard" style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.8)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>← رجوع</Link>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>📥 استيراد منتجات جماعي</span>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: "28px auto", padding: "0 20px", display: "grid", gap: 22 }}>

        <div style={CARD}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>📥 استيراد منتجات عبر ملف CSV</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 18, lineHeight: 1.8 }}>
            ارفع ملف CSV يحوي المنتجات. الأعمدة المطلوبة كحد أدنى: <b>name</b>, <b>price</b>.
            باقي الأعمدة اختيارية: <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{HEADERS.join(", ")}</code>
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <button onClick={downloadTemplate} style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #C7D2FE", borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              📄 تحميل قالب CSV
            </button>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px dashed #6366F1", borderRadius: 12, padding: "10px 18px", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#6366F1" }}>
              📁 اختر ملف CSV
              <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} />
            </label>
            {file && <span style={{ fontSize: 13, color: "#64748B" }}>{file.name} — {rows.length} صف</span>}
          </div>

          {rows.length > 0 && (
            <>
              <div style={{ maxHeight: 340, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#F8FAFC" }}>
                    <tr>
                      {Object.keys(rows[0]).slice(0, 6).map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#64748B", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        {Object.keys(rows[0]).slice(0, 6).map((h) => (
                          <td key={h} style={{ padding: "8px 12px", color: "#334155" }}>
                            {String(r[h] || "").slice(0, 40)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <div style={{ padding: "10px", textAlign: "center", fontSize: 12, color: "#94A3B8", background: "#F8FAFC" }}>
                    + {rows.length - 20} صفوف إضافية...
                  </div>
                )}
              </div>

              <button onClick={submit} disabled={loading} style={{ ...btnPrimary, padding: "13px 30px", fontSize: 15, opacity: loading ? 0.6 : 1 }}>
                {loading ? "⏳ جاري الرفع..." : `🚀 رفع ${rows.length} منتج`}
              </button>
            </>
          )}

          {result && (
            <div style={{ marginTop: 20, padding: "16px 20px", background: "#ECFDF5", border: "1.5px solid #6EE7B7", borderRadius: 14 }}>
              <div style={{ fontWeight: 800, color: "#059669", fontSize: 15, marginBottom: 8 }}>✅ تم الاستيراد بنجاح</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#065F46" }}>
                <span>🆕 جديد: <b>{result.inserted}</b></span>
                <span>♻️ محدّث: <b>{result.updated}</b></span>
                {result.skipped > 0 && <span>⚠️ متخطّى: <b>{result.skipped}</b></span>}
              </div>
              {result.errors?.length > 0 && (
                <details style={{ marginTop: 12, fontSize: 12, color: "#B45309" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>أخطاء ({result.errors.length})</summary>
                  <ul style={{ paddingRight: 20, marginTop: 6 }}>
                    {result.errors.slice(0, 10).map((er, i) => (
                      <li key={i}>صف {er.row}: {er.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div style={CARD}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginBottom: 10 }}>📝 دليل سريع</h3>
          <ul style={{ paddingRight: 20, fontSize: 13, color: "#475569", lineHeight: 2 }}>
            <li><b>name</b>: اسم المنتج — مطلوب</li>
            <li><b>price</b>: السعر بالدرهم — مطلوب (مثال: 199)</li>
            <li><b>badges</b>: شارات مفصولة بفواصل (مثال: "جديد,مميز")</li>
            <li><b>images</b>: روابط صور مفصولة بفواصل</li>
            <li>إذا كان هناك منتج بنفس <b>sku</b> فسيتم تحديثه بدل إضافته</li>
            <li>يدعم الملف UTF-8 مع BOM (يفتح بشكل صحيح في Excel)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
