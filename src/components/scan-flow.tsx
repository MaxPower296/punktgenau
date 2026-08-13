"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Camera,
  Upload,
  ClipboardType,
  ScanLine,
  Sparkles,
  Check,
  RotateCw,
  AlertTriangle,
  Navigation,
  MapPin,
  ChevronLeft,
  Plus,
  LocateFixed,
  FileText,
  X,
} from "lucide-react";
import type { MapWithCount, OcrResponse, ParsedGuide } from "@/lib/types";
import {
  PointForm,
  EMPTY_DRAFT,
  draftLatLng,
  parseDraftNumber,
  type PointDraft,
} from "@/components/point-form";
import { CropEditor } from "@/components/crop-editor";
import { CoordChips, googleMapsUrl } from "@/components/coord-chips";
import { Field, SectionTitle, toast, vibrate } from "@/components/ui";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-panel text-dim">
      <ScanLine className="size-6 animate-pulse" />
    </div>
  ),
});

const DEMO_TEXT = ` (003) Offizieller WOMO-Stellplatz: Lörrach
Laguna Badeland

GPS: N 47°35'10.0", E 7°37'04.4", 260m.                    max. WOMOs: 6
Ausstattung: Keine.
Beschreibung: Ebener, mit Bäumen unterteilter Schotterplatz am Rand
des Parkplatzes, der von einer Grünanlage umgeben ist. Die Autobahn ist
nahe und hörbar. Zufahrt auf den Parkplatz durch eine Schranke.
Preise: € 9, zahlbar an der Kasse des Bades.
Anfahrt: Direkt vor der Grenze zwischen Lörrach und Basel gelegen. Von
Lörrach auf der B 317 in Richtung Schweiz und kurz vor der Grenze links
den Hinweisschildern zum Bad folgen.`;

const STAGES = [
  "Bild wird vorbereitet …",
  "Ausrichtung wird geprüft …",
  "Text wird erkannt (OCR) …",
  "Koordinaten werden gesucht …",
  "Felder werden extrahiert …",
];

type Step = "capture" | "processing" | "review" | "saved";

interface DuplicateInfo {
  name: string;
  distanceM: number;
}

export default function ScanFlow() {
  const [step, setStep] = useState<Step>("capture");
  const [tab, setTab] = useState<"foto" | "text">("foto");
  const [maps, setMaps] = useState<MapWithCount[]>([]);
  const [mapId, setMapId] = useState<string>("");
  const [newMapName, setNewMapName] = useState("");
  const [makingMap, setMakingMap] = useState(false);

  const [image, setImage] = useState<{ url: string; name: string } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [photoGps, setPhotoGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [parsed, setParsed] = useState<ParsedGuide | null>(null);
  const [draft, setDraft] = useState<PointDraft>(EMPTY_DRAFT);
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dup, setDup] = useState<DuplicateInfo | null>(null);
  const [savedPointId, setSavedPointId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [detectedColor, setDetectedColor] = useState<string | null>(null);

  // Warteschlange für mehrere Fotos
  const [queue, setQueue] = useState<File[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  /* Karten laden */
  useEffect(() => {
    fetch("/api/maps")
      .then((r) => r.json())
      .then((d: { maps: MapWithCount[] }) => {
        setMaps(d.maps);
        if (d.maps.length > 0) setMapId((cur) => cur || d.maps[0].id);
      })
      .catch(() => toast("Karten konnten nicht geladen werden", "err"));
  }, []);

  /* Fortschritts-Animation während OCR */
  useEffect(() => {
    if (step !== "processing") return;
    const t = setInterval(() => setStageIdx((i) => (i + 1) % STAGES.length), 2600);
    return () => clearInterval(t);
  }, [step]);

  const draftFromParsed = useCallback((p: ParsedGuide): PointDraft => {
    return {
      ...EMPTY_DRAFT,
      name: p.name,
      refNumber: p.refNumber,
      category: p.category,
      lat: p.lat != null ? p.lat.toFixed(7) : "",
      lng: p.lng != null ? p.lng.toFixed(7) : "",
      altitude: p.altitude != null ? String(p.altitude) : "",
      maxWomos: p.maxWomos,
      equipment: p.equipment,
      description: p.description,
      prices: p.prices,
      directions: p.directions,
      phone: p.phone,
      rawGps: p.rawGps,
    };
  }, []);

  // Browser-Fallback OCR wenn Vercel Server fehlschlägt (tesseract.js im Browser)
  const runClientOcrFallback = async (file: File, index: number, currentQueue: File[]): Promise<boolean> => {
    try {
      setStageIdx(2);
      toast("Browser-OCR lädt Sprachdaten (einmalig ~8MB)…");
      const { createWorker } = await import("tesseract.js");
      const worker: any = await createWorker("deu", 1, {
        logger: () => {},
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const text: string = data.text || "";
      // Nutze lokalen parse-API statt doppelter Logik
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const parsedData = await res.json();
      const parsed: ParsedGuide = parsedData.parsed;
      setRotation(0);
      setConfidence(Math.round(data.confidence || 0));
      setOcrText(text);
      setParsed(parsed);
      const base64: string = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => resolve("");
        r.readAsDataURL(file);
      });
      const baseDraft = draftFromParsed(parsed);
      baseDraft.imageUrl = base64.slice(0, 500000);
      setDraft(baseDraft);
      if (!parsed.lat) {
        vibrate([100, 80, 100]);
        toast(`Browser-OCR: Keine Koordinaten erkannt – bitte Zuschnitt nutzen`, "err");
      } else {
        vibrate(60);
        toast(`Browser-OCR: Bild ${index + 1} von ${currentQueue.length} analysiert`, "ok");
      }
      setStep("review");
      return true;
    } catch (e: any) {
      console.error("[client ocr fallback failed]", e);
      toast("Browser-OCR fehlgeschlagen: " + (e?.message || e), "err");
      return false;
    }
  };

  // Client-seitig vor dem Upload verkleinern: vermeidet Vercel 4.5MB Limit & 3x schneller
  const compressForUpload = async (file: File): Promise<File> => {
    if (file.size < 900 * 1024) return file;
    // Nur Bilder komprimieren
    if (!file.type.startsWith("image/")) return file;
    return new Promise<File>((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxW = 1600;
        let w = img.naturalWidth; let h = img.naturalHeight;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); resolve(file); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => {
          URL.revokeObjectURL(url);
          if (b && b.size < file.size) {
            resolve(new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
          } else resolve(file);
        }, "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const processQueueItem = async (index: number, currentQueue: File[]) => {
    const file = currentQueue[index];
    if (!file) return;

    setError("");
    setDup(null);
    setStep("processing");
    setStageIdx(0);
    const objectUrl = URL.createObjectURL(file);
    setImage({ url: objectUrl, name: file.name });
    try {
      const uploadFile = await compressForUpload(file);
      const form = new FormData();
      form.append("file", uploadFile);
        // Timeout nach 55s - Vercel Hobby hat 10s Limit, dann schnell auf Browser umschalten
        const controller = new AbortController();
        const timeout = setTimeout(()=> controller.abort(), 55000);
        let res: Response;
        try {
          res = await fetch("/api/ocr", { method: "POST", body: form, signal: controller.signal });
        } catch (e:any) {
          clearTimeout(timeout);
          if (e?.name==="AbortError") {
            toast("Server braucht zu lange (Vercel Hobby 10s Limit) - starte Browser-OCR…", "err");
            const ok = await runClientOcrFallback(uploadFile, index, currentQueue);
            if (ok) return;
          }
          throw e;
        }
        clearTimeout(timeout);
        const data: any = await res.json().catch(()=> ({}));
        if (!res.ok) {
          const isFallback = data?.fallback || res.status===503 || res.status===500 || res.status===504;
          if (isFallback) {
            toast(`Server meldet: ${data?.error || "503"} - versuche Browser-OCR…`, "err");
            const ok = await runClientOcrFallback(uploadFile, index, currentQueue);
            if (ok) return;
          }
          setError(data?.error ?? `Analyse fehlgeschlagen (HTTP ${res.status})`);
          setStep("capture");
          toast(data?.error ?? `Analyse von Bild ${index + 1} fehlgeschlagen`, "err");
          return;
        }
        if (data?.error) {
          if (data.fallback) {
            const ok = await runClientOcrFallback(uploadFile, index, currentQueue);
            if (ok) return;
          }
          setError(data.error);
          setStep("capture");
          toast(data.error, "err");
          return;
        }
      setRotation(data.rotation);
      setConfidence(data.confidence);
      setOcrText(data.ocrText);
      setPhotoGps(data.photoGps);
      setDetectedColor(data.detectedColorCategory ?? null);
      setParsed(data.parsed);
      // Bild als base64 für Speicherung am Punkt merken (kleine Vorschau)
      const base64: string = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => resolve("");
        r.readAsDataURL(file);
      });
      const baseDraft = draftFromParsed(data.parsed);
      baseDraft.imageUrl = base64.slice(0, 500000); // limit ~500KB
      setDraft(baseDraft);
      if (!data.parsed.lat) {
        vibrate([100, 80, 100]); // Fehler-Vibrationsmuster
        toast(`Bild ${index + 1}: Keine Koordinaten erkannt – bitte prüfen/ergänzen`, "err");
      } else {
        vibrate(60); // Kurzes haptisches Bestätigungssignal auf Android
        toast(`Bild ${index + 1} von ${currentQueue.length} analysiert`, "ok");
      }
      setStep("review");
    } catch {
      setError("Netzwerkfehler bei der Analyse");
      setStep("capture");
      toast("Netzwerkfehler bei der Analyse", "err");
    }
  };

  const handleMultipleFiles = (files: File[]) => {
    if (files.length === 0) return;
    if (files.length === 1) {
      const url = URL.createObjectURL(files[0]);
      setCropSrc(url);
      setPendingFiles(files);
      return;
    }
    setQueue(files);
    setQueueIndex(0);
    processQueueItem(0, files);
  };

  const confirmCrop = async (blob: Blob) => {
    const files = pendingFiles || [];
    const croppedFile = new File([blob], files[0].name, { type: "image/jpeg" });
    setCropSrc(null);
    setPendingFiles(null);
    setQueue([croppedFile]);
    setQueueIndex(0);
    processQueueItem(0, [croppedFile]);
  };
  const skipCrop = () => {
    const files = pendingFiles || [];
    setCropSrc(null);
    setPendingFiles(null);
    setQueue(files);
    setQueueIndex(0);
    processQueueItem(0, files);
  };

  const runOcr = async (file: File) => {
    handleMultipleFiles([file]);
  };

  const runParseText = async (text: string) => {
    if (!text.trim()) return;
    setError("");
    setDup(null);
    setStep("processing");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as { parsed: ParsedGuide; error?: string };
      if (!res.ok) {
        toast(data.error ?? "Analyse fehlgeschlagen", "err");
        setStep("capture");
        return;
      }
      setImage(null);
      setRotation(0);
      setConfidence(null);
      setPhotoGps(null);
      setOcrText(text);
      setParsed(data.parsed);
      setDraft(draftFromParsed(data.parsed));
      if (!data.parsed.lat) {
        toast("Keine Koordinaten im Text gefunden", "err");
      }
      setStep("review");
    } catch {
      toast("Netzwerkfehler", "err");
      setStep("capture");
    }
  };

  const createMap = async () => {
    const name = newMapName.trim();
    if (!name) return;
    setMakingMap(true);
    try {
      const res = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = (await res.json()) as { map: MapWithCount };
      setMaps((m) => [...m, { ...d.map, pointCount: 0 }]);
      setMapId(d.map.id);
      setNewMapName("");
      toast(`Karte „${d.map.name}" angelegt`);
    } catch {
      toast("Karte konnte nicht angelegt werden", "err");
    } finally {
      setMakingMap(false);
    }
  };

  const save = async (force = false) => {
    const coords = draftLatLng(draft);
    if (!mapId) {
      toast("Bitte zuerst eine Karte auswählen", "err");
      return;
    }
    if (!coords) {
      toast("Bitte gültige Koordinaten eingeben", "err");
      return;
    }
    if (!draft.name.trim()) {
      toast("Bitte einen Namen vergeben", "err");
      return;
    }
    setSaving(true);
    setDup(null);
    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapId,
          name: draft.name.trim(),
          refNumber: draft.refNumber.trim(),
          category: draft.category.trim(),
          lat: coords.lat,
          lng: coords.lng,
          altitude: parseDraftNumber(draft.altitude),
          maxWomos: draft.maxWomos.trim(),
          equipment: draft.equipment.trim(),
          description: draft.description.trim(),
          prices: draft.prices.trim(),
          directions: draft.directions.trim(),
          phone: draft.phone.trim(),
          notes: draft.notes.trim(),
          rawGps: draft.rawGps.trim(),
          rawText: ocrText.slice(0, 8000),
          source: image ? "ocr" : "manual",
          imageUrl: draft.imageUrl || undefined,
          force,
        }),
      });
      if (res.status === 409) {
        const d = (await res.json()) as { duplicate: DuplicateInfo };
        vibrate([60, 50, 60]); // Doppeltes Warn-Vibrationsmuster bei möglichem Duplikat
        setDup(d.duplicate);
        return;
      }
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        vibrate([150, 50, 150]);
        toast(d.error ?? "Speichern fehlgeschlagen", "err");
        return;
      }
      const d = (await res.json()) as { point: { id: string } };
      
      // Wenn wir in einer Warteschlange sind und noch nicht am Ende angelangt sind
      if (queue.length > 1 && queueIndex < queue.length - 1) {
        vibrate(70); // Erfolgs-Vibration
        const next = queueIndex + 1;
        setQueueIndex(next);
        toast(`Erfolgreich gespeichert! Lade Bild ${next + 1} von ${queue.length} …`, "ok");
        processQueueItem(next, queue);
      } else {
        // Letztes Bild oder Einzelbild erfolgreich gespeichert
        vibrate([120, 80, 120]); // Sattes Erfolgsmuster für das Ende
        setSavedPointId(d.point.id);
        setStep("saved");
        setQueue([]);
        setQueueIndex(0);
        toast("Punkt gespeichert");
      }
    } catch {
      toast("Netzwerkfehler beim Speichern", "err");
    } finally {
      setSaving(false);
    }
  };

  const skipCurrent = () => {
    if (queue.length > 1 && queueIndex < queue.length - 1) {
      const next = queueIndex + 1;
      setQueueIndex(next);
      toast(`Bild übersprungen. Lade Bild ${next + 1} von ${queue.length} …`);
      processQueueItem(next, queue);
    } else {
      reset();
    }
  };

  const reset = () => {
    setStep("capture");
    setImage(null);
    setParsed(null);
    setDraft(EMPTY_DRAFT);
    setOcrText("");
    setPasteText("");
    setDup(null);
    setSavedPointId(null);
    setRotation(0);
    setConfidence(null);
    setPhotoGps(null);
    setDetectedColor(null);
    setQueue([]);
    setQueueIndex(0);
    setError("");
  };

  const coords = useMemo(() => draftLatLng(draft), [draft]);
  const activeMap = maps.find((m) => m.id === mapId);

  /* ============================ RENDER ============================ */
  return (
    <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6">
      {/* Zielkarte auswählen */}
      {step !== "saved" && (
        <div className="card anim-fade-up mb-6 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-52 flex-1">
            <Field label="Zielkarte">
              <select
                className="field appearance-none"
                value={mapId}
                onChange={(e) => setMapId(e.target.value)}
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id} className="bg-panel">
                    {m.name} ({m.pointCount})
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex min-w-64 flex-1 items-end gap-2">
            <div className="flex-1">
              <Field label="Neue Karte">
                <input
                  className="field"
                  placeholder="z. B. Norwegen-Tour 2026"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createMap()}
                />
              </Field>
            </div>
            <button
              className="btn btn-ghost"
              onClick={createMap}
              disabled={!newMapName.trim() || makingMap}
            >
              <Plus className="size-4" />
              Anlegen
            </button>
          </div>
        </div>
      )}

      {/* -------- Schritt 1: Aufnahme -------- */}
      {step === "capture" && (
        <div className="anim-fade-up">
          <div className="mb-5 flex items-center gap-2">
            <button
              className={`btn ${tab === "foto" ? "btn-amber" : "btn-ghost"}`}
              onClick={() => setTab("foto")}
            >
              <Camera className="size-4" />
              Foto / Datei
            </button>
            <button
              className={`btn ${tab === "text" ? "btn-amber" : "btn-ghost"}`}
              onClick={() => setTab("text")}
            >
              <ClipboardType className="size-4" />
              Text einfügen
            </button>
          </div>

          {tab === "foto" ? (
            <div
              className="card group relative grid min-h-[420px] cursor-pointer place-items-center overflow-hidden border-dashed !border-line-2 p-8 text-center transition-colors hover:!border-amber"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  handleMultipleFiles(Array.from(files));
                }
              }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background:radial-gradient(circle_at_50%_50%,#e9a13b_1px,transparent_1px)] [background-size:26px_26px]" />
              <div className="stagger flex max-w-md flex-col items-center text-center">
                <div className="mb-6 flex size-24 items-center justify-center rounded-full border border-line-2 bg-panel text-amber transition-transform duration-500 group-hover:scale-105">
                  <ScanLine className="size-10 shrink-0" strokeWidth={1.6} />
                </div>
                <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                  Infotafel <span className="text-amber italic">abfotografieren</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-mute">
                  GPS-Zeile des Reiseführers fotografieren oder Bild hierher ziehen. Die OCR
                  erkennt <span className="font-mono text-paper">DMS</span>,{" "}
                  <span className="font-mono text-paper">DDM</span> und{" "}
                  <span className="font-mono text-paper">DD</span> – auch bei kopfstehenden
                  Fotos.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <button
                    className="btn btn-amber"
                    onClick={(e) => {
                      e.stopPropagation();
                      camRef.current?.click();
                    }}
                  >
                    <Camera className="size-4" />
                    Kamera öffnen
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current?.click();
                    }}
                  >
                    <Upload className="size-4" />
                    Bild auswählen
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      runParseText(DEMO_TEXT);
                    }}
                  >
                    <Sparkles className="size-4" />
                    Demo ohne Foto
                  </button>
                </div>
                {error && (
                  <p className="mt-5 flex items-center justify-center gap-2 text-sm text-clay">
                    <AlertTriangle className="size-4" />
                    {error}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-6">
              <SectionTitle>
                Koordinaten-Text einfügen
                <button className="btn btn-ghost !px-3 !py-1 !text-xs" onClick={() => runParseText(DEMO_TEXT)}>
                  <Sparkles className="size-3.5" />
                  Demo-Text
                </button>
              </SectionTitle>
              <textarea
                className="field mt-4 !min-h-56 font-mono !text-[13px] leading-relaxed"
                placeholder={'Z. B.: GPS: N 47°35' + "'" + '10.0", E 7°37' + "'" + '04.4", 260m  –  oder  47.586111, 7.617889  –  oder kopierten Fließtext einfügen'}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <div className="mt-4 flex justify-end">
                <button
                  className="btn btn-amber"
                  disabled={!pasteText.trim()}
                  onClick={() => runParseText(pasteText)}
                >
                  <ScanLine className="size-4" />
                  Text analysieren
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                handleMultipleFiles(Array.from(files));
              }
              e.target.value = "";
            }}
          />
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) runOcr(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* -------- Schritt 2: Verarbeitung -------- */}
      {step === "processing" && (
        <div className="anim-fade-in card mx-auto grid max-w-xl place-items-center p-14 text-center">
          <div className="relative mb-8 flex size-40 items-center justify-center">
            <div className="radar-sweep absolute inset-0 rounded-full opacity-60" />
            <div className="absolute inset-3 rounded-full border border-line-2" />
            <div className="absolute inset-10 rounded-full border border-line" />
            <div className="relative z-10 size-2 rounded-full bg-amber shadow-[0_0_10px_rgba(233,161,59,0.9)]" />
          </div>
          <p className="shimmer-text font-mono text-sm tracking-wide">{STAGES[stageIdx]}</p>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-dim">
            Die Erkennung läuft vollständig lokal auf dem Server – inklusive Drehung,
            Kontrastkorrektur und Format-Erkennung.
          </p>
        </div>
      )}

      {/* -------- Schritt 3: Prüfen & Bearbeiten -------- */}
      {step === "review" && (
        <div className="anim-fade-up grid gap-5 lg:grid-cols-[420px_1fr]">
          {queue.length > 1 && (
            <div className="card col-span-full border-amber-soft/20 bg-amber/5 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-6 place-items-center rounded-full bg-amber text-xs font-bold text-ink">
                  {queueIndex + 1}
                </span>
                <span className="text-sm font-semibold text-paper">
                  Foto-Warteschlange: Bild {queueIndex + 1} von {queue.length}
                </span>
                <span className="text-xs text-mute font-mono hidden sm:inline">({queue[queueIndex]?.name})</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost !py-1.5 !px-3 !text-xs" onClick={skipCurrent}>
                  Bild überspringen
                </button>
                <button className="btn btn-ghost btn-danger !py-1.5 !px-3 !text-xs" onClick={reset}>
                  Warteschlange abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Linke Spalte: Beleg */}
          <div className="space-y-4">
            {image ? (
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                    <FileText className="size-3.5" />
                    Aufnahme
                  </span>
                  {confidence != null && (
                    <span
                      className={`chip ${confidence >= 60 ? "text-sage" : "text-clay"}`}
                      title="OCR-Konfidenz"
                    >
                      OCR {confidence}%
                    </span>
                  )}
                </div>
                <div className="grid max-h-72 place-items-center overflow-hidden bg-ink/50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt="Scan"
                    className="max-h-64 rounded-md object-contain"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </div>
                {rotation !== 0 && (
                  <p className="border-t border-line px-4 py-2 font-mono text-[10px] text-dim">
                    Bild wurde um {rotation}° gedreht erkannt
                  </p>
                )}
              </div>
            ) : null}

            {/* Farbbasierte Kategorie-Erkennung */}
            <div className="card p-4">
              <SectionTitle>Buch-Hintergrundfarbe</SectionTitle>
              <p className="mt-2 text-xs text-mute">
                Die Kategorie bestimmt sich nach der Hintergrundfarbe des Textes im Reiseführer:
              </p>
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                {[
                  { key: "Badeplatz", color: "#38bdf8", text: "Badeplatz (Blau)", cat: "Badeplatz" },
                  { key: "Picknickplatz", color: "#c084fc", text: "Picknickplatz (Violett)", cat: "WOMO-Picknickplatz" },
                  { key: "Wanderparkplatz", color: "#22c55e", text: "Wanderparkplatz (Grün)", cat: "WOMO-Wanderparkplatz" },
                  { key: "Campingplatz", color: "#a3e635", text: "Campingplatz (Hellgrün)", cat: "WOMO-Campingplatz" },
                  { key: "Stellplatz", color: "#fbbf24", text: "Stellplatz (Gelb)", cat: "Offizieller WOMO-Stellplatz" },
                ].map((item) => {
                  const active = draft.category.toLowerCase().includes(item.key.slice(0, 5).toLowerCase()) || detectedColor === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setDraft({ ...draft, category: item.cat });
                        setDetectedColor(item.key);
                        vibrate(35); // Leichte Vibration auf Android bei Kategoriewahl
                        toast(`Kategorie auf „${item.cat}“ gesetzt`);
                      }}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${
                        active
                          ? "border-amber bg-panel shadow-md scale-[1.02]"
                          : "border-line bg-ink/30 hover:border-line-2"
                      }`}
                    >
                      <span className="size-3.5 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-paper">
                        {item.text}
                      </span>
                      {active && <span className="text-[10px] font-mono text-amber">✓</span>}
                    </button>
                  );
                })}
              </div>
              {detectedColor && (
                <p className="mt-2 text-[10px] font-mono text-sage text-center">
                  Erkannte Farbe: <span className="text-amber">{detectedColor}</span>
                </p>
              )}
            </div>

            {/* Koordinaten-Kontrolle */}
            <div className="card p-4">
              <SectionTitle
                right={
                  parsed?.format ? (
                    <span className="chip text-amber">Format: {parsed.format}</span>
                  ) : undefined
                }
              >
                Kontrolle
              </SectionTitle>
              <div className="mt-3">
                {coords ? (
                  <CoordChips
                    lat={coords.lat}
                    lng={coords.lng}
                    altitude={parseDraftNumber(draft.altitude)}
                    format={parsed?.format}
                  />
                ) : (
                  <p className="flex items-center gap-2 rounded-lg border border-clay/40 bg-clay/10 px-3 py-2.5 text-xs text-clay">
                    <AlertTriangle className="size-4 shrink-0" />
                    Keine gültigen Koordinaten – bitte unten manuell eingeben.
                  </p>
                )}
              </div>

              {photoGps && (
                <div className="mt-3 rounded-lg border border-sky/30 bg-sky/10 p-3">
                  <p className="flex items-center gap-2 text-xs text-sky">
                    <LocateFixed className="size-4 shrink-0" />
                    Das Foto enthält einen eigenen GPS-Standort (
                    {photoGps.latitude.toFixed(5)}, {photoGps.longitude.toFixed(5)})
                  </p>
                  <button
                    className="btn btn-ghost mt-2 w-full !py-1.5 !text-xs"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        lat: photoGps.latitude.toFixed(7),
                        lng: photoGps.longitude.toFixed(7),
                      })
                    }
                  >
                    Foto-Standort stattdessen übernehmen
                  </button>
                </div>
              )}

              {parsed && parsed.coordinates.length > 1 && (
                <div className="mt-3">
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                    Weitere Fundstellen
                  </p>
                  <div className="space-y-1">
                    {parsed.coordinates.slice(1, 4).map((c, i) => (
                      <button
                        key={i}
                        className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-left font-mono text-[11px] text-mute transition-colors hover:border-amber hover:text-paper"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            lat: c.lat.toFixed(7),
                            lng: c.lng.toFixed(7),
                            rawGps: c.raw,
                          })
                        }
                      >
                        <MapPin className="size-3.5 shrink-0" />
                        {c.raw}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini-Karte */}
              <div className="mt-4 h-44 overflow-hidden rounded-lg border border-line">
                {coords ? (
                  <LeafletMap
                    points={[{ id: "draft", name: draft.name || "Neuer Punkt", lat: coords.lat, lng: coords.lng, refNumber: draft.refNumber, category: draft.category }]}
                    fitKey={`draft-${coords.lat}-${coords.lng}`}
                    selectedId="draft"
                    interactive={false}
                    color={activeMap?.color ?? "#E9A13B"}
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-panel text-xs text-dim">
                    Vorschau erscheint bei gültigen Koordinaten
                  </div>
                )}
              </div>
            </div>

            {/* Rohtext */}
            <details className="card group">
              <summary className="cursor-pointer list-none px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-dim transition-colors hover:text-paper">
                Erkannter Text (OCR)
              </summary>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-line px-4 py-3 font-mono text-[11px] leading-relaxed text-mute">
                {ocrText || "—"}
              </pre>
            </details>
          </div>

          {/* Rechte Spalte: Formular */}
          <div className="card h-fit p-5">
            <SectionTitle
              right={
                <button className="btn btn-ghost !px-3 !py-1 !text-xs" onClick={reset}>
                  <ChevronLeft className="size-3.5" />
                  Neuer Scan
                </button>
              }
            >
              Ergebnis prüfen & bearbeiten
            </SectionTitle>

            <div className="mt-4">
              <PointForm draft={draft} onChange={setDraft} />
            </div>

            {dup && (
              <div className="mt-4 rounded-lg border border-clay/50 bg-clay/10 p-3.5">
                <p className="flex items-start gap-2 text-sm text-clay">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Achtung: Der Punkt „{dup.name}“ liegt bereits {dup.distanceM} m von dieser
                  Position entfernt. Möglicherweise ein Duplikat.
                </p>
                <button
                  className="btn btn-ghost mt-2.5 !py-1.5 !text-xs"
                  onClick={() => save(true)}
                  disabled={saving}
                >
                  <Check className="size-3.5" />
                  Trotzdem speichern
                </button>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="btn btn-amber flex-1 !py-3"
                  onClick={() => save(false)}
                  disabled={saving || !coords}
                >
                  <Check className="size-4.5" strokeWidth={2.6} />
                  {saving
                    ? "Speichere …"
                    : queue.length > 1
                    ? queueIndex < queue.length - 1
                      ? `Speichern & Weiter (${queueIndex + 1}/${queue.length})`
                      : "Letztes Bild speichern"
                    : `Punkt in „${activeMap?.name ?? "Karte"}" speichern`}
                </button>
                {queue.length > 1 && (
                  <button
                    className="btn btn-ghost !py-3"
                    onClick={skipCurrent}
                    title="Dieses Bild überspringen"
                  >
                    Überspringen
                  </button>
                )}
              </div>
              {queue.length > 1 && (
                <div className="w-full bg-ink/60 rounded-full h-1.5 overflow-hidden border border-line">
                  <div
                    className="bg-amber h-full transition-all duration-300"
                    style={{ width: `${((queueIndex + 1) / queue.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------- Schritt 4: Gespeichert -------- */}
      {step === "saved" && (
        <div className="anim-fade-up mx-auto max-w-xl">
          <div className="card p-10 text-center">
            <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-amber/15 text-amber">
              <Check className="size-9" strokeWidth={2.4} />
            </div>
            <h2 className="font-display text-3xl tracking-tight">
              Punkt <span className="text-amber italic">gespeichert</span>
            </h2>
            <p className="mt-3 text-sm text-mute">
              „{draft.name}“ liegt jetzt auf der Karte{" "}
              <span className="text-paper">{activeMap?.name}</span>.
            </p>

            {coords && (
              <div className="mx-auto mt-6 max-w-sm text-left">
                <CoordChips lat={coords.lat} lng={coords.lng} altitude={parseDraftNumber(draft.altitude)} compact />
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {coords && (
                <a
                  href={googleMapsUrl(coords.lat, coords.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-amber"
                >
                  <Navigation className="size-4" />
                  Mit Google Maps navigieren
                </a>
              )}
              <Link href={`/maps/${mapId}${savedPointId ? `?point=${savedPointId}` : ""}`} className="btn btn-ghost">
                <MapPin className="size-4" />
                Zur Karte
              </Link>
              <button className="btn btn-ghost" onClick={reset}>
                <RotateCw className="size-4" />
                Nächstes Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schließen-Floating für Review (mobil) */}
      {step === "review" && (
        <button
          className="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full border border-line-2 bg-panel text-paper shadow-xl lg:hidden"
          onClick={reset}
          title="Verwerfen"
        >
          <X className="size-5" />
        </button>
      )}
      {cropSrc && (
        <CropEditor src={cropSrc} onCrop={confirmCrop} onCancel={skipCrop} />
      )}
    </div>
  );
}
