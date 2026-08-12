"use client";
export type Theme = "dark" | "light";
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("pg-theme", theme);
}
export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("pg-theme") as Theme) || "dark";
}
