import api from "./api.js";

export const placeOrder = async (data) => {
  const payload = {
    ...data,
    items: data.items.map((item) => ({
      menuItemId: item.menuItemId || item._id, // ✅ handle both cases
      name: item.name,
      qty: item.qty || item.quantity,
    })),
  };

  console.log("Waiter payload:", payload); // 🔍 debug

  return api.post("/orders", payload);
};

export const getMyOrders = () =>
  api.get("/admin/orders", { params: { limit: 100 } });