import React from "react";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";

export default function LangToggle({ style = {} }) {
  const { lang, toggle } = useLang();
  return (
    <button onClick={toggle}
      style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.1)", border: "1.5px solid rgba(255,255,255,.2)", borderRadius: 10, padding: "7px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "'Tajawal',sans-serif", transition: "background .15s", whiteSpace: "nowrap", ...style }}
      onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
      onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}>
      {T[lang].lang_toggle}
    </button>
  );
}
