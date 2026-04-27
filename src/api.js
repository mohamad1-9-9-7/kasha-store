export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
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
    const isAdminAction = localStorage.getItem("isAdmin") === "true";
    // امسح الجلسة التالفة
    setToken(null);
    if (isAdminAction) {
      localStorage.removeItem("isAdmin");
      if (!location.pathname.includes("/user-login")) {
        // وجّه الأدمن لتسجيل الدخول الموحّد
        alert(res.status === 401 ? "⏰ انتهت جلسة الأدمن — سجّل دخول من جديد" : "🔒 هالحساب مو أدمن — سجّل دخول بحساب الأدمن");
        location.href = "/user-login";
      }
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
