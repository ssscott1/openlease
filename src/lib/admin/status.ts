import type { LeadStatus } from "@/lib/types";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  application: "Application",
  approved: "Approved",
  delivered: "Delivered",
  active: "Active",
  ended: "Ended",
  lost: "Lost",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-sky-100 text-sky-800",
  application: "bg-amber-100 text-amber-800",
  approved: "bg-violet-100 text-violet-800",
  delivered: "bg-teal-100 text-teal-800",
  active: "bg-emerald-100 text-emerald-800",
  ended: "bg-gray-200 text-gray-700",
  lost: "bg-red-100 text-red-700",
};

/** Board column order: the pipeline plus Lost as a parking lane. */
export const PIPELINE_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "application",
  "approved",
  "delivered",
  "active",
  "ended",
  "lost",
];

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
