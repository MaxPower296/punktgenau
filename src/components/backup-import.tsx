"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileJson, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui";

export function BackupImport({ mapId }: { mapId?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const exportBackup = () => {
    if (!mapId) {
      toast("Bitte zuerst eine Karte auswählen", "err");
      return;
    }
    window.open(`/api/maps/${mapId}/export?format=json`, "_blank");
    toast("Backup wird heruntergeladen");
  };

  const importBackup = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/maps/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast(data.message || "Import erfolgreich");
        // Seite neu laden um neue Karte anzuzeigen
        window.location.href = `/maps/${data.mapId}`;
      } else {
        toast(data.error ?? "Import fehlgeschlagen", "err");
      }
    } catch {
      toast("Datei konnte nicht gelesen werden", "err");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Export */}
      <button className="btn btn-ghost !px-3 !py-1.5 !text-xs" onClick={exportBackup} title="Karte als JSON-Backup exportieren">
        <Download className="size-3.5" />
        Backup
      </button>

      {/* Import */}
      <button
        className="btn btn-ghost !px-3 !py-1.5 !text-xs"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        title="Backup-Datei importieren (JSON)"
      >
        <Upload className="size-3.5" />
        {importing ? "Importiere …" : "Import"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importBackup(f);
        }}
      />
    </div>
  );
}
