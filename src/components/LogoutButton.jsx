import React from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../api";

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("isAdmin");
    navigate("/");
  };

  return (
    <button
      onClick={handleLogout}
      style={{ backgroundColor: "#c00", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "5px", cursor: "pointer" }}
    >
      🚪 تسجيل الخروج
    </button>
  );
};

export default LogoutButton;
