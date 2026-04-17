// ══════════════════════════════════════════
// إعدادات Cloudinary — عدّل القيمتين هنا
// بعد إنشاء حساب على cloudinary.com
// ══════════════════════════════════════════
export const CLOUD_NAME    = "dznmc7amw";
export const UPLOAD_PRESET = "kashaha store";

export const isConfigured = () =>
  CLOUD_NAME !== "YOUR_CLOUD_NAME" && UPLOAD_PRESET !== "YOUR_UPLOAD_PRESET";

/**
 * يرفع ملف صورة إلى Cloudinary ويرجع الرابط
 * @param {File} file
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<string>} - رابط الصورة
 */
export async function uploadToCloudinary(file, onProgress = () => {}) {
  if (!isConfigured()) throw new Error("Cloudinary غير مُعدّ — أدخل CLOUD_NAME و UPLOAD_PRESET في src/utils/cloudinary.js");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", "kashkha-store");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
      else reject(new Error("فشل الرفع: " + xhr.statusText));
    };
    xhr.onerror = () => reject(new Error("خطأ في الشبكة"));
    xhr.send(fd);
  });
}

/**
 * رفع متعدد بالتوازي
 * @param {File[]} files
 * @param {function} onEachProgress - (index, percent) => void
 * @returns {Promise<string[]>}
 */
export async function uploadMultiple(files, onEachProgress = () => {}) {
  return Promise.all(
    files.map((f, i) => uploadToCloudinary(f, (p) => onEachProgress(i, p)))
  );
}
