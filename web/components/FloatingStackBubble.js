"use client";

import { useState, useEffect } from "react";

const FloatingStackBubble = ({ products, pendingAddProduct, onProductAdded, onProductRemoved }) => {
  const [stackItems, setStackItems] = useState([]);

  useEffect(() => {
    if (pendingAddProduct && !stackItems.find((p) => p.id === pendingAddProduct.id)) {
      setStackItems((prev) => [...prev, pendingAddProduct]);
      onProductAdded?.(pendingAddProduct);
    }
  }, [pendingAddProduct]);

  const handleRemove = (product) => {
    setStackItems((prev) => prev.filter((p) => p.id !== product.id));
    onProductRemoved?.(product);
  };

  if (stackItems.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-base-100 border border-base-300 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
      <span className="text-sm font-semibold">{stackItems.length} in stack</span>
      <div className="flex gap-1">
        {stackItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => handleRemove(item)}
            className="btn btn-ghost btn-xs"
            title={`Remove ${item.name}`}
          >
            {item.name?.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FloatingStackBubble;
