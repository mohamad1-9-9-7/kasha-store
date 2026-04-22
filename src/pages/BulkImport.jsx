import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { shadow, inputBase, btnPrimary } from "../Theme";
import { csvToObjects, objectsToCSV } from "../utils/csvParser";
import { matrixToObjects, normalizeObjects } from "../utils/productImportMap";
import { apiFetch } from "../api";
import { useToast } from "../context/ToastContext";
import { useCategories } from "../hooks/useCategories";

const CARD = { background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "24px" };

const HEADERS = [
  "name", "nameEn", "price", "oldPrice", "costPrice", "priceWithoutTax", "category", "brand",
  "stock", "weight", "packageWeight", "volumetricWeight",
  "productDimensions", "packageDimensions",
  "targetGender", "recommendedAge", "color", "material", "returns",
  "description", "descriptionEn", "badges",
  "image", "images", "metaTitle", "metaDescription", "sku",
];

const SAMPLE = [
  {
    name: "سماعات لاسلكية",
    nameEn: "Wireless Headphones",
    price: "199",
    oldPrice: "249",
    costPrice: "120",
    priceWithoutTax: "189",
    category: "إلكترونيات",
    brand: "Sony",
    stock: "25",
    weight: "0.3",
    packageWeight: "0.4",
    volumetricWeight: "0.5",
    productDimensions: "20 x 15 x 8",
    packageDimensions: "25 x 18 x 10",
    targetGender: "Unisex",
    recommendedAge: "12+",
    color: "أسود",
    material: "بلاستيك",
    returns: "Returnable",
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
  const { categories } = useCategories();
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [translate, setTranslate] = useState(true);
  const [targetCategory, setTargetCategory] = useState("");
  const [markFeatured, setMarkFeatured] = useState(true);

  React.useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") navigate("/admin-login");
  }, []);

  const existingCatNames = categories
    .map((c) => typeof c === "string" ? c : c?.name)
    .filter(Boolean);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    try {
      const isExcel = /\.(xlsx|xls|xlsm)$/i.test(f.name);
      let data = [];
      if (isExcel) {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true, blankrows: false });
        data = matrixToObjects(matrix);
      } else {
        const text = await f.text();
        const raw = csvToObjects(text);
        data = normalizeObjects(raw);
      }
      setRows(data);
      if (!data.length) toast("الملف فارغ أو بصيغة غير متوقعة", "error");
      else toast(`تمت قراءة ${data.length} صف`, "success");
    } catch (err) {
      console.error(err);
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
    const cat = targetCategory.trim();
    if (!cat) return toast("اختر أو اكتب اسم القسم أولاً", "error");
    setLoading(true);
    try {
      const params = new URLSearchParams({
        translate: translate ? "1" : "0",
        targetCategory: cat,
        markFeatured: markFeatured ? "1" : "0",
      });
      const res = await apiFetch(`/api/products/bulk?${params}`, {
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

  const previewKeys = rows.length
    ? ["nameEn", "name", "sku", "price", "priceWithoutTax", "costPrice", "category", "brand",
       "weight", "packageWeight", "productDimensions", "targetGender", "recommendedAge",
       "color", "material", "returns"]
      .filter((k) => rows.some((r) => r[k] !== undefined && r[k] !== ""))
    : [];

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
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>📥 استيراد منتجات (CSV / Excel)</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 14, lineHeight: 1.8 }}>
            ارفع ملف <b>CSV</b> أو <b>Excel (.xlsx)</b>. الحد الأدنى: <b>اسم المنتج</b> و<b>السعر</b>.
            <br />
            يدعم تلقائياً ملفات الموردين (أعمدة مثل <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>Product Name</code>, <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>Vendor Sku</code>, <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>Price Without Tax</code>).
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={downloadTemplate} style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #C7D2FE", borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              📄 تحميل قالب CSV
            </button>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px dashed #6366F1", borderRadius: 12, padding: "10px 18px", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#6366F1" }}>
              📁 اختر ملف (CSV / Excel)
              <input type="file" accept=".csv,.xlsx,.xls,.xlsm,text/csv" onChange={handleFile} style={{ display: "none" }} />
            </label>
            {file && <span style={{ fontSize: 13, color: "#64748B" }}>{file.name} — {rows.length} صف</span>}
          </div>

          <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>
              📂 القسم اللي رح تتخزن فيه كل المنتجات <span style={{ color: "#DC2626" }}>*</span>
            </label>
            {existingCatNames.length === 0 ? (
              <>
                <div style={{ fontSize: 12, color: "#B45309", marginBottom: 6 }}>
                  ما في أقسام محفوظة. <Link to="/manage-categories" style={{ color: "#B45309", fontWeight: 800, textDecoration: "underline" }}>روح أضف قسم أولاً</Link>.
                </div>
              </>
            ) : (
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                style={{ ...inputBase, background: "#fff", cursor: "pointer" }}
              >
                <option value="">-- اختر قسم --</option>
                {existingCatNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}
            <div style={{ fontSize: 11, color: "#92400E", marginTop: 6, opacity: 0.8 }}>
              كل المنتجات بهاد الاستيراد رح تتحط بهاد القسم.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={translate} onChange={(e) => setTranslate(e.target.checked)} style={{ accentColor: "#16A34A" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>🌐 ترجم تلقائياً للعربية</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FEFCE8", border: "1.5px solid #FDE68A", borderRadius: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={markFeatured} onChange={(e) => setMarkFeatured(e.target.checked)} style={{ accentColor: "#CA8A04" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#A16207" }}>⭐ اعرضهم كمنتجات مميزة بالصفحة الرئيسية</span>
            </label>
          </div>

          {rows.length > 0 && (
            <>
              <div style={{ maxHeight: 340, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#F8FAFC" }}>
                    <tr>
                      {previewKeys.map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#64748B", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        {previewKeys.map((h) => (
                          <td key={h} style={{ padding: "8px 12px", color: "#334155" }}>
                            {String(r[h] ?? "").slice(0, 40)}
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
                {loading ? (translate ? "⏳ جاري الترجمة والرفع..." : "⏳ جاري الرفع...") : `🚀 رفع ${rows.length} منتج`}
              </button>
            </>
          )}

          {result && (
            <div style={{ marginTop: 20, padding: "16px 20px", background: "#ECFDF5", border: "1.5px solid #6EE7B7", borderRadius: 14 }}>
              <div style={{ fontWeight: 800, color: "#059669", fontSize: 15, marginBottom: 8 }}>✅ تم الاستيراد</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#065F46" }}>
                <span>🆕 جديد: <b>{result.inserted}</b></span>
                <span>♻️ محدّث: <b>{result.updated}</b></span>
                {result.skipped > 0 && <span>⚠️ متخطّى: <b>{result.skipped}</b></span>}
                {result.translated > 0 && <span>🌐 مُترجَم: <b>{result.translated}</b></span>}
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
            <li><b>الحقول الأساسية:</b> اسم المنتج والسعر — باقي الحقول اختيارية</li>
            <li><b>سعر التكلفة (costPrice):</b> يظهر للأدمن فقط — العميل يشوف سعر البيع</li>
            <li><b>الترجمة التلقائية:</b> لو المنتج باسم/وصف إنكليزي فقط، يترجمها للعربي عند الرفع</li>
            <li><b>ملفات الموردين:</b> يتعرف تلقائياً على أعمدة مثل Product Name / Vendor Sku / Cost Price</li>
            <li><b>الصور:</b> تُتجاهل من ملف المورد — ضيفها يدوياً من صفحة تعديل المنتج</li>
            <li>إذا كان هناك منتج بنفس <b>sku</b> فسيتم تحديثه بدل إضافته</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
