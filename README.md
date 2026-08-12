# ⌖ Punktgenau – Reiseführer-GPS-Scanner

Fotografiere GPS-Koordinaten aus deinem Reiseführer, erkenne sie per OCR und speichere sie auf interaktiven Karten. Navigiere direkt mit Google Maps, OsmAnd oder Organic Maps.

## 🚀 Live-Demo

👉 **[punktgenau.app](https://DEINE-APP.vercel.app)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DEIN_USER/punktgenau&env=DATABASE_URL)

## ✨ Features

### 📸 Scanner
- **OCR-Texterkennung** für GPS-Koordinaten (DMS, DDM, DD)
- **Farberkennung**: Hintergrundfarbe des Reiseführers = Kategorie
  - 🟢 Grün = Wanderparkplatz
  - 🟡 Gelb = Stellplatz
  - 🔵 Blau = Badeplatz
  - 🟣 Violett = Picknickplatz
  - 🟢 Hellgrün = Campingplatz
- **Multi-Photo Queue**: Mehrere Fotos nacheinander scannen
- **Auto-Rotation**: Erkennt kopfstehende Fotos
- **0.7s Scan-Zeit** dank Fast-Path-Optimierung

### 🗺️ Karte
- Interaktive Leaflet-Karte mit Satellit-Ansicht
- **Draggable Pins** zum manuellen Setzen
- **Kategorie-Filter** mit Emoji-Farbchips
- **Clustering** bei 100+ Punkten
- **Wetter + 3-Tage-Vorhersage** pro Punkt
- **Reverse-Geocoding** (automatische Adresse)

### 🧭 Navigation
- Google Maps, OsmAnd, Organic Maps, Apple Karten
- Entfernungsanzeige zum nächsten Punkt

### 💾 Daten
- **Backup & Import** als JSON
- **Export**: KML, CSV, GeoJSON, GPX
- **Besuche mit Datum** tracken
- **Persönliche Notizen** pro Punkt
- **Fotos** am Punkt ablegen

### 📱 Android PWA
- Installierbar auf dem Startbildschirm
- Offline-Fallback für gespeicherte Seiten
- Haptisches Feedback (Vibration)

## 🛠️ Technologie

| Komponente | Technologie |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Next.js API Routes, Node.js |
| Datenbank | PostgreSQL (Drizzle ORM) |
| OCR | Tesseract.js (Deutsch) |
| Karte | Leaflet + OpenStreetMap |
| Wetter | Open-Meteo API |
| Geocoding | Nominatim (OSM) |
| Hosting | Vercel + Neon |

## 📦 Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# PostgreSQL starten (Docker)
docker run -d --name punktgenau-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 postgres:16

# Schema anwenden
npx drizzle-kit push

# Server starten
npm run dev
```

## 📄 Lizenz

MIT
