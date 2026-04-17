import React, { createContext, useContext, useCallback, useState } from "react";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wishlist") || "[]"); } catch { return []; }
  });

  const toggle = useCallback((product) => {
    setWishlist(prev => {
      const exists = prev.some(p => String(p.id) === String(product.id));
      const next = exists
        ? prev.filter(p => String(p.id) !== String(product.id))
        : [...prev, { id: product.id, name: product.name, price: product.price, oldPrice: product.oldPrice, image: product.image, category: product.category }];
      localStorage.setItem("wishlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const isWishlisted = useCallback((id) => {
    return wishlist.some(p => String(p.id) === String(id));
  }, [wishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, toggle, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
