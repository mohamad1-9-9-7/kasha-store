import React, { useContext, useState } from "react";
import { CartContext } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const Checkout = () => {
  const { cart, clearCart } = useContext(CartContext);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) {
      alert("⚠️ يرجى تعبئة جميع الحقول");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/orders", {
        method: "POST",
        body: {
          customer: { name: form.name, phone: form.phone, address: form.address },
          items: cart,
          totals: { grandTotal: total },
          total,
        },
      });
      alert("✅ تم استلام طلبك بنجاح! سنتواصل معك قريباً");
      clearCart();
      navigate("/");
    } catch {
      alert("❌ حدث خطأ، حاول مرة ثانية");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div style={{ padding: "30px", direction: "rtl", fontFamily: "Arial" }}>
        <h3>🚫 السلة فارغة.</h3>
        <Link to="/">← العودة للتسوق</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px", direction: "rtl", fontFamily: "Arial", maxWidth: "600px", margin: "auto" }}>
      <h2>🧾 تأكيد الطلب</h2>
      <h4>محتويات السلة:</h4>
      {cart.map((item) => (
        <p key={item.id}>🛒 {item.name} × {item.quantity} — {item.price * item.quantity} درهم</p>
      ))}
      <p><strong>المجموع: {total} درهم</strong></p>
      <hr />
      <form onSubmit={handleSubmit}>
        <label>الاسم الكامل:</label><br />
        <input name="name" value={form.name} onChange={handleChange} required style={inputStyle} /><br /><br />
        <label>رقم الهاتف:</label><br />
        <input name="phone" value={form.phone} onChange={handleChange} required style={inputStyle} /><br /><br />
        <label>العنوان:</label><br />
        <textarea name="address" value={form.address} onChange={handleChange} required style={inputStyle} /><br /><br />
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "⏳ جاري الإرسال..." : "✅ تأكيد الطلب"}
        </button>
      </form>
    </div>
  );
};

const inputStyle = { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", marginBottom: "4px" };
const btnStyle = { backgroundColor: "green", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" };

export default Checkout;
