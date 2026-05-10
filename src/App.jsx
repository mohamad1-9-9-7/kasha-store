import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AnalyticsPixels from "./components/AnalyticsPixels";

// Eager: pages that load on first paint (homepage + most-visited storefront pages)
import HomePage from "./pages/HomePage";

// Lazy: split bundles per route. Admin and seldom-visited pages are deferred so
// first-time visitors don't download the admin dashboard / PDF lib / etc. just to
// browse products. Each route loads its own chunk on demand.
const CategoryPage      = lazy(() => import("./pages/CategoryPage"));
const ProductDetails    = lazy(() => import("./pages/ProductDetails"));
const CartPage          = lazy(() => import("./pages/CartPage"));
const SearchPage        = lazy(() => import("./pages/SearchPage"));
const UserLogin         = lazy(() => import("./pages/UserLogin"));
const Register          = lazy(() => import("./pages/Register"));
const MyOrders          = lazy(() => import("./pages/MyOrders"));
const ProfilePage       = lazy(() => import("./pages/ProfilePage"));
const WishlistPage      = lazy(() => import("./pages/WishlistPage"));
const BundlePage        = lazy(() => import("./pages/BundlePage"));
const NotFound          = lazy(() => import("./pages/NotFound"));

// Admin-only — never loaded for storefront visitors. Admin signs in through
// the same /user-login page; the server returns a JWT with role:"admin" and
// the client routes them to /admin-dashboard from there.
const AdminDashboard    = lazy(() => import("./pages/AdminDashboard"));
const AddProduct        = lazy(() => import("./pages/AddProduct"));
const UsersList         = lazy(() => import("./pages/UsersList"));
const AdminOrders       = lazy(() => import("./pages/AdminOrders"));
const BulkImport        = lazy(() => import("./pages/BulkImport"));
// Categories live as `?tab=cats` inside AdminDashboard, coupons as a section
// inside `?tab=settings` (see CouponsManager). The standalone routes have been
// removed to eliminate two-implementations-of-the-same-thing drift.

// Safe localStorage read. If the JSON is corrupted we DROP the bad value (so
// the next render shows the logged-out state) instead of returning null and
// hanging on the loading screen.
const safeGetUser = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Treat anything that isn't a real object as corrupt
    if (!parsed || typeof parsed !== "object") {
      try { localStorage.removeItem("user"); } catch {}
      return null;
    }
    return parsed;
  } catch {
    try { localStorage.removeItem("user"); } catch {}
    return null;
  }
};

const RouteFallback = () => (
  <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontFamily: "'Tajawal',sans-serif" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
      <span style={{ display: "inline-block", width: 18, height: 18, border: "2.5px solid #E2E8F0", borderTopColor: "#6366F1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <span>...</span>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  useLocation(); // forces re-render on route change

  const user = safeGetUser();
  // Admin gate: every signal must agree — `isAdmin` flag, valid token, and
  // the cached user object's `isAdmin: true`. Earlier we accepted just flag +
  // token, which let a regular user with a stale `isAdmin=true` flag from a
  // shared browser see the admin UI shell (server still blocked their
  // requests, but the experience was confusing). Server JWT remains the final
  // authority for any actual data access.
  const isAdmin =
    localStorage.getItem("isAdmin") === "true" &&
    !!localStorage.getItem("token") &&
    user?.isAdmin === true;

  if (user === null && localStorage.getItem("user")) {
    return <div style={{ textAlign: "center", padding: "50px" }}>⏳ جاري تحميل الحساب...</div>;
  }

  return (
    <>
      <AnalyticsPixels />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/user-login" element={<UserLogin />} />
          {/* Legacy /admin-login → unified login. Old bookmarks keep working. */}
          <Route path="/admin-login" element={<Navigate to="/user-login" replace />} />
          <Route path="/register" element={<Register />} />

          <Route path="/home" element={<HomePage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<CartPage />} />

          <Route path="/admin-dashboard"  element={isAdmin ? <AdminDashboard /> : <Navigate to="/user-login" replace />} />
          <Route path="/add-product"      element={isAdmin ? <AddProduct />     : <Navigate to="/user-login" replace />} />
          <Route path="/customers"        element={isAdmin ? <UsersList />      : <Navigate to="/user-login" replace />} />
          <Route path="/admin-orders"     element={isAdmin ? <AdminOrders />    : <Navigate to="/user-login" replace />} />
          <Route path="/bulk-import"      element={isAdmin ? <BulkImport />     : <Navigate to="/user-login" replace />} />
          {/* Legacy redirects — old bookmarks land in the consolidated places. */}
          <Route path="/manage-categories" element={<Navigate to="/admin-dashboard?tab=cats" replace />} />
          <Route path="/coupons"           element={<Navigate to="/admin-dashboard?tab=settings" replace />} />

          <Route path="/my-orders" element={user ? <MyOrders />     : <Navigate to="/user-login" replace />} />
          <Route path="/profile"   element={user ? <ProfilePage />  : <Navigate to="/user-login" replace />} />
          <Route path="/wishlist"  element={user ? <WishlistPage /> : <Navigate to="/user-login" replace />} />
          <Route path="/search"    element={<SearchPage />} />
          <Route path="/bundle"    element={user ? <BundlePage />   : <Navigate to="/user-login" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
