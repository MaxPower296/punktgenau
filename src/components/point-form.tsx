"use client";

import { Field } from "@/components/ui";

export interface PointDraft {
  name: string;
  refNumber: string;
  category: string;
  lat: string;
  lng: string;
  altitude: string;
  maxWomos: string;
  equipment: string;
  description: string;
  prices: string;
  directions: string;
  phone: string;
  notes: string;
  rawGps: string;
  visitedAt: string;
  imageUrl: string;
}

export const EMPTY_DRAFT: PointDraft = {
  name: "",
  refNumber: "",
  category: "",
  lat: "",
  lng: "",
  altitude: "",
  maxWomos: "",
  equipment: "",
  description: "",
  prices: "",
  directions: "",
  phone: "",
  notes: "",
  rawGps: "",
  visitedAt: "",
  imageUrl: "",
};

const CATEGORY_SUGGESTIONS = [
  "Offizieller WOMO-Stellplatz",
  "WOMO-Campingplatz",
  "WOMO-Picknickplatz",
  "WOMO-Wanderparkplatz",
  "Stellplatz",
  "Campingplatz",
  "Wanderparkplatz",
  "Aussichtspunkt",
  "Sehenswürdigkeit",
];

export function parseDraftNumber(s: string): number | null {
  const v = parseFloat(s.replace(",", ".").trim());
  return Number.isFinite(v) ? v : null;
}

export function draftLatLng(d: PointDraft): { lat: number; lng: number } | null {
  const lat = parseDraftNumber(d.lat);
  const lng = parseDraftNumber(d.lng);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function PointForm({
  draft,
  onChange,
}: {
  draft: PointDraft;
  onChange: (d: PointDraft) => void;
}) {
  const set = (k: keyof PointDraft, v: string) => onChange({ ...draft, [k]: v });
  const coords = draftLatLng(draft);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Name">
          <input
            className="field"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="z. B. Lörrach – Laguna Badeland"
          />
        </Field>
        <Field label="Nr.">
          <input
            className="field w-20 text-center font-mono"
            value={draft.refNumber}
            onChange={(e) => set("refNumber", e.target.value)}
            placeholder="003"
          />
        </Field>
      </div>

      <Field label="Kategorie">
        <input
          className="field"
          list="pg-categories"
          value={draft.category}
          onChange={(e) => set("category", e.target.value)}
          placeholder="z. B. WOMO-Stellplatz"
        />
        <datalist id="pg-categories">
          {CATEGORY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Breitengrad" hint="DD">
            <input
              className={`field font-mono ${draft.lat && !coords ? "border-clay" : ""}`}
              value={draft.lat}
              onChange={(e) => set("lat", e.target.value)}
              placeholder="47.586111"
              inputMode="decimal"
            />
          </Field>
          <Field label="Längengrad" hint="DD">
            <input
              className={`field font-mono ${draft.lng && !coords ? "border-clay" : ""}`}
              value={draft.lng}
              onChange={(e) => set("lng", e.target.value)}
              placeholder="7.617889"
              inputMode="decimal"
            />
          </Field>
        </div>
        {draft.rawGps && (
          <p className="mt-1.5 font-mono text-[11px] text-dim">
            erkannt aus: <span className="text-mute">{draft.rawGps}</span>
          </p>
        )}
        {draft.lat && !coords && (
          <p className="mt-1.5 text-[11px] text-clay">Koordinaten ungültig – bitte prüfen.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Höhe" hint="m">
          <input
            className="field font-mono"
            value={draft.altitude}
            onChange={(e) => set("altitude", e.target.value)}
            placeholder="260"
            inputMode="numeric"
          />
        </Field>
        <Field label="max. WOMOs">
          <input
            className="field"
            value={draft.maxWomos}
            onChange={(e) => set("maxWomos", e.target.value)}
            placeholder="6"
          />
        </Field>
      </div>

      <Field label="Ausstattung">
        <input
          className="field"
          value={draft.equipment}
          onChange={(e) => set("equipment", e.target.value)}
          placeholder="V/E, Strom, WLAN …"
        />
      </Field>

      <Field label="Beschreibung">
        <textarea
          className="field"
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Lage, Untergrund, Besonderheiten …"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Preise">
          <input
            className="field"
            value={draft.prices}
            onChange={(e) => set("prices", e.target.value)}
            placeholder="€ 9 / CHF 26–30 …"
          />
        </Field>
        <Field label="Telefon">
          <input
            className="field"
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+41 …"
          />
        </Field>
      </div>

      <Field label="Anfahrt">
        <textarea
          className="field !min-h-14"
          value={draft.directions}
          onChange={(e) => set("directions", e.target.value)}
          placeholder="Wegbeschreibung …"
        />
      </Field>

      <Field label="Notizen">
        <textarea
          className="field !min-h-14"
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="z. B. Gut für Kinder, Ruhig nach 22 Uhr …"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Besucht am" hint="Datum">
          <input
            type="date"
            className="field"
            value={draft.visitedAt}
            onChange={(e) => set("visitedAt", e.target.value)}
          />
        </Field>
        <Field label="Foto URL" hint="optional">
          <input
            className="field"
            value={draft.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="https://… oder base64"
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["V/E","Strom","WLAN","Wasser","Dusche","Toilette","Grill","Spielplatz"].map(eq=>(
          <button key={eq} type="button" onClick={()=>{
            const has = draft.equipment.includes(eq);
            const next = has ? draft.equipment.split(",").map(s=>s.trim()).filter(s=>s!==eq).join(", ") : draft.equipment ? draft.equipment+", "+eq : eq;
            set("equipment", next);
          }} className={`chip ${draft.equipment.includes(eq)?"!border-amber !text-amber":""}`}>{eq}</button>
        ))}
      </div>
    </div>
  );
}
