import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import ProductDetails from "./pages/ProductDetails";
import CartPage from "./pages/CartPage";
import UserLogin from "./pages/UserLogin";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import AddProduct from "./pages/AddProduct";
import UsersList from "./pages/UsersList";
import ManageCategories from "./pages/ManageCategories";
import AdminOrders from "./pages/AdminOrders";
import CouponsPage from "./pages/CouponsPage";
import MyOrders from "./pages/MyOrders";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import WishlistPage from "./pages/WishlistPage";
import NotFound from "./pages/NotFound";
import BundlePage from "./pages/BundlePage";
import AdminLogin from "./pages/AdminLogin";

// ✅ قراءة آمنة من localStorage (تمنع كسر التطبيق لو JSON فاسد)
const safeGetUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function App() {
  useLocation(); // ✅ يخلي المكون يعمل re-render لما تتغير الصفحة

  // ✅ قراءة مباشرة من localStorage بكل رندر (بتمنع race condition بعد تسجيل الدخول)
  const user = safeGetUser();
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  // ✅ عرض مؤقت أثناء جلب المستخدم
  if (user === null && localStorage.getItem("user")) {
    return <div style={{ textAlign: "center", padding: "50px" }}>⏳ جاري تحميل الحساب...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/user-login" replace />} />
      <Route path="/user-login" element={<UserLogin />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/home"
        element={user ? <HomePage /> : <Navigate to="/user-login" replace />}
      />
      <Route
        path="/category/:categoryId"
        element={user ? <CategoryPage /> : <Navigate to="/user-login" replace />}
      />
      <Route
        path="/product/:id"
        element={user ? <ProductDetails /> : <Navigate to="/user-login" replace />}
      />
      <Route
        path="/cart"
        element={user ? <CartPage /> : <Navigate to="/user-login" replace />}
      />

      <Route
        path="/admin-dashboard"
        element={isAdmin ? <AdminDashboard /> : <Navigate to="/admin-login" replace />}
      />
      <Route
        path="/add-product"
        element={isAdmin ? <AddProduct /> : <Navigate to="/admin-login" replace />}
      />
      <Route
        path="/customers"
        element={isAdmin ? <UsersList /> : <Navigate to="/admin-login" replace />}
      />
      <Route
        path="/manage-categories"
        element={isAdmin ? <ManageCategories /> : <Navigate to="/admin-login" replace />}
      />
      <Route
        path="/admin-orders"
        element={isAdmin ? <AdminOrders /> : <Navigate to="/admin-login" replace />}
      />
      <Route
        path="/coupons"
        element={isAdmin ? <CouponsPage /> : <Navigate to="/admin-login" replace />}
      />

      {/* ✅ صفحات المستخدم */}
      <Route
        path="/my-orders"
        element={user ? <MyOrders /> : <Navigate to="/user-login" replace />}
      />
      <Route
        path="/profile"
        element={user ? <ProfilePage /> : <Navigate to="/user-login" replace />}
      />
      <Route
        path="/wishlist"
        element={user ? <WishlistPage /> : <Navigate to="/user-login" replace />}
      />
      <Route path="/search" element={<SearchPage />} />
      <Route
        path="/bundle"
        element={user ? <BundlePage /> : <Navigate to="/user-login" replace />}
      />

      {/* ✅ 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
