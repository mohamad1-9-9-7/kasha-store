import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  const adminLoggedIn = localStorage.getItem("adminLoggedIn") === "true";
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  const handleLogout = () => {
    if (adminLoggedIn) {
      localStorage.removeItem("adminLoggedIn");
      navigate("/user-login");
    } else if (user) {
      localStorage.removeItem("loggedInUser");
      navigate("/user-login");
    }
  };

  return (
    <div style={{ backgroundColor: "#333", color: "white", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Link to="/" style={{ color: "white", textDecoration: "none", fontWeight: "bold" }}>
        🛍️ كشخة
      </Link>

      {(adminLoggedIn || user) && (
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span>
            {adminLoggedIn ? "مرحباً، الأدمن" : `مرحباً، ${user?.name}`}
          </span>
          <button onClick={handleLogout} style={buttonStyle}>
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
};

const buttonStyle = {
  backgroundColor: "#dc3545",
  color: "white",
  border: "none",
  padding: "5px 10px",
  borderRadius: "5px",
  cursor: "pointer"
};

export default Header;
