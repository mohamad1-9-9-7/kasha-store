import React, { createContext, useState, useEffect } from "react";
import { setToken } from "../api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const adminFlag  = localStorage.getItem("isAdmin") === "true";
    setUser(storedUser);
    setIsAdmin(adminFlag);
  }, []);

  const login = (userData, token = null, adminFlag = false) => {
    localStorage.setItem("user", JSON.stringify(userData));
    if (token) setToken(token);
    if (adminFlag) {
      localStorage.setItem("isAdmin", "true");
      setIsAdmin(true);
    } else {
      localStorage.removeItem("isAdmin");
      setIsAdmin(false);
    }
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("isAdmin");
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
