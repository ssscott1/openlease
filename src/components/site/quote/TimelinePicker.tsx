"use client";

import { useTranslations } from "next-intl";
import type { UseCase } from "@/lib/types";
import { SITUATION_ICONS } from "@/components/site/sections/Situations";

const OPTIONS: UseCase[] = [
  "visa",
  "contract",
  "project",
  "relocation",
  "car_delivery_bridge",
  "other",
];

const VISA_TYPE_KEYS = ["482", "485", "500", "400", "407", "408", "417", "600", "other"] as const;

const OTHER_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
  />
);

export interface TimelineValue {
  useCase: UseCase | null;
  /** ISO date the lease term should not outrun ("" while unset). */
  anchorDate: string;
  visaType: string;
  detail: string;
}

export const EMPTY_TIMELINE: TimelineValue = {
  useCase: null,
  anchorDate: "",
  visaType: "",
  detail: "",
};

/**
 * "What's setting your timeline?" — the required use-case step of every
 * apply flow. Emits the chosen use case plus the end date that anchors the
 * lease term. Field mix varies by selection (spec §3.2).
 */
export function TimelinePicker({
  value,
  onChange,
}: {
  value: TimelineValue;
  onChange: (next: TimelineValue) => void;
}) {
  const t = useTranslations("quote.situation");
  const tForm = useTranslations("quote.form");

  const input =
    "rounded-xl border border-line bg-white px-3.5 py-2.5 text-base font-normal focus:outline-2 focus:outline-accent";

  function set(patch: Partial<TimelineValue>) {
    onChange({ ...value, ...patch });
  }

  const dateField = (label: string) => (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        type="date"
        value={value.anchorDate}
        onChange={(e) => set({ anchorDate: e.target.value })}
        className={input}
      />
    </label>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("title")}>
        {OPTIONS.map((option) => {
          const selected = value.useCase === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                set({ useCase: option, anchorDate: "", visaType: "", detail: "" })
              }
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-start text-sm font-medium transition ${
                selected
                  ? "border-accent bg-accent-soft text-accent-strong ring-1 ring-accent"
                  : "border-line bg-white hover:border-ink-soft"
              }`}
            >
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  selected ? "bg-white text-accent" : "bg-mist text-ink-soft"
                }`}
              >
                <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  {SITUATION_ICONS[option === "car_delivery_bridge" ? "bridging" : option] ?? OTHER_ICON}
                </svg>
              </span>
              {t(`options.${option}`)}
            </button>
          );
        })}
      </div>

      {value.useCase && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {value.useCase === "visa" && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {tForm("visaType")}
                <select
                  value={value.visaType}
                  onChange={(e) => set({ visaType: e.target.value })}
                  className={input}
                >
                  <option value="" disabled>
                    {tForm("visaTypePlaceholder")}
                  </option>
                  {VISA_TYPE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {tForm(`visaTypes.${key}`)}
                    </option>
                  ))}
                </select>
              </label>
              {dateField(tForm("visaExpiry"))}
            </>
          )}
          {value.useCase === "contract" && dateField(t("fields.contractEnd"))}
          {value.useCase === "project" && dateField(t("fields.projectEnd"))}
          {value.useCase === "relocation" && dateField(t("fields.assignmentEnd"))}
          {value.useCase === "car_delivery_bridge" && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t("fields.deliveryMonth")}
                <input
                  type="month"
                  value={value.anchorDate.slice(0, 7)}
                  onChange={(e) =>
                    set({ anchorDate: e.target.value ? `${e.target.value}-01` : "" })
                  }
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t("fields.dealer")}
                <input
                  value={value.detail}
                  onChange={(e) => set({ detail: e.target.value })}
                  className={input}
                />
              </label>
            </>
          )}
          {value.useCase === "other" && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t("fields.reason")}
                <input
                  value={value.detail}
                  onChange={(e) => set({ detail: e.target.value })}
                  className={input}
                />
              </label>
              {dateField(t("fields.endDate"))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Months from today until the anchor date, sensibly rounded and clamped. */
export function monthsUntil(
  anchorDate: string,
  min: number,
  max: number,
): number | null {
  if (!anchorDate) return null;
  const anchor = new Date(anchorDate).getTime();
  if (!Number.isFinite(anchor)) return null;
  const months = Math.round((anchor - Date.now()) / (30.44 * 86_400_000));
  if (months < 1) return min;
  return Math.min(max, Math.max(min, months));
}
