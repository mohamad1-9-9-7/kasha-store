import React, { createContext, useEffect, useState } from "react";

export const CartContext = createContext();

const safeParse = (k, fb = null) => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; }
  catch { return fb; }
};

export const CartProvider = ({ children }) => {
  // استيراد السلة من localStorage عند التحميل
  const [cart, setCart] = useState(() => safeParse("cart", []));

  // مزامنة السلة مع localStorage عند كل تغيير
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, qty) => {
    setCart(prev => {
      const existing = prev.find((item) => String(item.id) === String(product.id));
      if (existing) {
        return prev.map((item) =>
          String(item.id) === String(product.id)
            ? { ...item, qty: (Number(item.qty) || 0) + (Number(qty) || 1) }
            : item
        );
      }
      return [...prev, { ...product, qty: Number(qty) || 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter((item) => String(item.id) !== String(id)));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  return (
    <CartContext.Provider value={{ cart, setCart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
