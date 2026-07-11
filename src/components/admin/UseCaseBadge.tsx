import type { UseCase } from "@/lib/types";
import { USE_CASE_COLORS, USE_CASE_LABELS } from "@/lib/admin/usecase";

export function UseCaseBadge({
  useCase,
  className = "",
}: {
  useCase: UseCase;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${USE_CASE_COLORS[useCase]} ${className}`}
    >
      {USE_CASE_LABELS[useCase]}
    </span>
  );
}
