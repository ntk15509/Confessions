import { LIKED_KEY } from "./constants";

export const readStoredLikes = () => {
  try {
    const value = JSON.parse(localStorage.getItem(LIKED_KEY) || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
};

export const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Khác" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
