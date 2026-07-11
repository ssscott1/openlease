"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle } from "@/lib/types";

const EMPTY: Partial<Vehicle> = {
  name: "",
  slug: "",
  descriptor: "",
  long_description: "",
  base_weekly_rate: 300,
  sort_order: 0,
  active: true,
  body_type: "",
  fuel_economy: "",
  seats: 5,
};

export function VehicleManager({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [editing, setEditing] = useState<Partial<Vehicle> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);

    const patch = {
      name: String(fd.get("name") ?? "").trim(),
      slug: String(fd.get("slug") ?? "").trim().toLowerCase().replace(/\s+/g, "-"),
      descriptor: String(fd.get("descriptor") ?? "").trim(),
      long_description: String(fd.get("long_description") ?? "").trim(),
      base_weekly_rate: Number(fd.get("base_weekly_rate")),
      sort_order: Number(fd.get("sort_order")),
      body_type: String(fd.get("body_type") ?? "").trim(),
      fuel_economy: String(fd.get("fuel_economy") ?? "").trim(),
      seats: Number(fd.get("seats")),
      active: fd.get("active") === "on",
    };

    // Optional image upload to Supabase Storage
    const file = fd.get("image") as File | null;
    let image_url = editing.image_url ?? null;
    if (file && file.size > 0) {
      const path = `${patch.slug || "vehicle"}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("vehicles")
        .upload(path, file, { upsert: true });
      if (uploadError) {
        setBusy(false);
        flash(`Image upload failed: ${uploadError.message}`);
        return;
      }
      image_url = supabase.storage.from("vehicles").getPublicUrl(path).data.publicUrl;
    }

    if (editing.id) {
      const { data, error } = await supabase
        .from("vehicles")
        .update({ ...patch, image_url })
        .eq("id", editing.id)
        .select()
        .single();
      setBusy(false);
      if (error || !data) return flash(`Save failed: ${error?.message}`);
      setVehicles((vs) => vs.map((v) => (v.id === editing.id ? (data as Vehicle) : v)));
    } else {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({ ...patch, image_url })
        .select()
        .single();
      setBusy(false);
      if (error || !data) return flash(`Create failed: ${error?.message}`);
      setVehicles((vs) =>
        [...vs, data as Vehicle].sort((a, b) => a.sort_order - b.sort_order),
      );
    }
    setEditing(null);
    flash("Saved. The public site reflects this immediately.");
  }

  async function toggleActive(vehicle: Vehicle) {
    const { error } = await supabase
      .from("vehicles")
      .update({ active: !vehicle.active })
      .eq("id", vehicle.id);
    if (error) return flash(`Update failed: ${error.message}`);
    setVehicles((vs) =>
      vs.map((v) => (v.id === vehicle.id ? { ...v, active: !v.active } : v)),
    );
  }

  async function remove(vehicle: Vehicle) {
    if (!confirm(`Delete ${vehicle.name}? Quotes referencing it will block deletion — deactivate instead if it has history.`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", vehicle.id);
    if (error) return flash(`Delete failed: ${error.message}`);
    setVehicles((vs) => vs.filter((v) => v.id !== vehicle.id));
  }

  const input =
    "mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Changes go live on the public quoting tool instantly — no deploy.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(EMPTY)}
          className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          Add vehicle
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <div key={v.id} className={`overflow-hidden rounded-xl border bg-white ${v.active ? "border-line" : "border-dashed border-line opacity-60"}`}>
            <div className="relative aspect-[16/10] bg-accent-soft">
              {v.image_url && (
                <Image
                  src={v.image_url}
                  alt={v.name}
                  fill
                  sizes="24rem"
                  className="object-cover"
                  unoptimized={v.image_url.endsWith(".svg")}
                />
              )}
              {!v.active && (
                <span className="absolute start-3 top-3 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">
                  Inactive
                </span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{v.name}</h2>
                  <p className="text-xs text-ink-soft">{v.descriptor}</p>
                </div>
                <p className="text-sm font-semibold">${Math.round(Number(v.base_weekly_rate))}<span className="text-xs font-normal text-ink-soft">/wk</span></p>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                {v.body_type} · {v.seats} seats · {v.fuel_economy} · order {v.sort_order}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                <a
                  href={`/cars/${v.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-accent-strong hover:underline"
                  title="Open the public car details page"
                >
                  /cars/{v.slug} ↗
                </a>
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setEditing(v)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:border-ink-soft">
                  Edit
                </button>
                <button type="button" onClick={() => toggleActive(v)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:border-ink-soft">
                  {v.active ? "Deactivate" : "Activate"}
                </button>
                <button type="button" onClick={() => remove(v)} className="ms-auto rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
            No vehicles yet — add your first one.
          </p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setEditing(null)} role="dialog" aria-modal="true">
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">{editing.id ? `Edit ${editing.name}` : "Add vehicle"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">
                Name *
                <input name="name" required defaultValue={editing.name} className={input} />
              </label>
              <label className="text-sm font-medium">
                Slug *
                <input name="slug" required defaultValue={editing.slug} className={input} />
              </label>
              <label className="text-sm font-medium">
                Descriptor
                <input name="descriptor" defaultValue={editing.descriptor} placeholder="The family all-rounder" className={input} />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Detailed description (shown on the /cars/[slug] page)
                <textarea
                  name="long_description"
                  rows={4}
                  defaultValue={editing.long_description}
                  className={input}
                />
              </label>
              <label className="text-sm font-medium">
                Base weekly rate (24m, AUD) *
                <input name="base_weekly_rate" type="number" step="1" min="0" required defaultValue={editing.base_weekly_rate} className={input} />
              </label>
              <label className="text-sm font-medium">
                Sort order
                <input name="sort_order" type="number" defaultValue={editing.sort_order} className={input} />
              </label>
              <label className="text-sm font-medium">
                Body type
                <input name="body_type" defaultValue={editing.body_type} className={input} />
              </label>
              <label className="text-sm font-medium">
                Fuel economy
                <input name="fuel_economy" defaultValue={editing.fuel_economy} placeholder="4.7 L/100km" className={input} />
              </label>
              <label className="text-sm font-medium">
                Seats
                <input name="seats" type="number" min="1" defaultValue={editing.seats} className={input} />
              </label>
              <label className="text-sm font-medium">
                Image (uploads to Storage)
                <input name="image" type="file" accept="image/*" className={`${input} file:me-2 file:rounded-lg file:border-0 file:bg-mist file:px-2 file:py-1 file:text-xs`} />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input name="active" type="checkbox" defaultChecked={editing.active ?? true} />
                Visible on the public site
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-line px-4 py-2 text-sm font-medium">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? "Saving…" : "Save vehicle"}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-4 start-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
