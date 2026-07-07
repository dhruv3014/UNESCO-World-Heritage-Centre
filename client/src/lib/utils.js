import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind class names, resolving conflicts sensibly.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format a raw DB value for display in tables and diffs.
export function formatValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleDateString();
  }
  return String(v);
}
