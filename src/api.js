export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

// Single source of truth for clearing all auth-related localStorage keys.
// Three sites (AdminLayout dropdown, ProfilePage logout, AdminPasswordCard
// post-change-password) used to clear different subsets and left the app in
// inconsistent zombie states (e.g. token gone but `user` still cached → UI
// showed "logged in" with no working API). Always use this helper.
export function clearAuth() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userName");
  } catch {}
}

export async function apiFetch(path, { body, ...options } = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // 401 = توكن منتهي/خاطئ، 403 = مفيش صلاحية
  if (res.status === 401 || res.status === 403) {
    const wasAdmin = localStorage.getItem("isAdmin") === "true";
    // Always clear the full auth set — partial clears caused zombie states.
    clearAuth();
    if (!location.pathname.includes("/user-login")) {
      const msg = wasAdmin
        ? (res.status === 401 ? "⏰ انتهت جلسة الأدمن — سجّل دخول من جديد" : "🔒 هالحساب مو أدمن — سجّل دخول بحساب الأدمن")
        : (res.status === 401 ? "⏰ انتهت الجلسة — سجّل دخول من جديد" : "🔒 ليس لديك صلاحية لهذا الإجراء");
      try { alert(msg); } catch {}
      location.href = "/user-login";
    }
    const err = await res.json().catch(() => ({ error: res.status === 401 ? "جلسة منتهية" : "ممنوع" }));
    throw new Error(err.error || "غير مصرح");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "خطأ في الخادم" }));
    throw new Error(err.error || "خطأ غير معروف");
  }
  return res.json();
}
