# 🚀 Punktgenau deployen – Schritt-für-Schritt-Anleitung

## Kostenloser dauerhafter Server

Die App besteht aus zwei Teilen:
1. **Next.js App** (Frontend + API) → kostenlos auf **Vercel**
2. **PostgreSQL Datenbank** → kostenlos auf **Neon**

---

## Schritt 1: GitHub-Repository erstellen

1. Gehe zu [github.com/new](https://github.com/new)
2. Erstelle ein neues Repository (z. B. `punktgenau`)
3. Lade alle Projektdateien hoch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/DEIN_USER/punktgenau.git
   git push -u origin main
   ```

---

## Schritt 2: Neon Datenbank erstellen (kostenlos)

1. Gehe zu [neon.tech](https://neon.tech)
2. Erstelle ein kostenloses Konto
3. Erstelle ein neues Projekt (Region: AWS Eu-central-1 Frankfurt)
4. Kopiere die **Connection String** (PostgreSQL URI):
   ```
   postgresql://neondb_owner:xxx@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

---

## Schritt 3: Auf Vercel deployen

1. Gehe zu [vercel.com](https://vercel.com)
2. Melde dich mit GitHub an
3. Klicke **"Add New Project"**
4. Wähle dein `punktgenau` Repository
5. Vercel erkennt Next.js automatisch
6. **WICHTIG: Environment Variables hinzufügen:**
   ```
   DATABASE_URL = postgresql://neondb_owner:xxx@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
7. Klicke **"Deploy"**

---

## Schritt 4: Datenbank initialisieren

Nach dem ersten Deploy:
1. Öffne das **Vercel Dashboard** → deinen Projekt → **Functions** Tab
2. Öffne einmal `https://DEINE-APP.vercel.app/api/health`
3. Die App erstellt die Tabellen automatisch beim ersten Start

Falls nicht, führe lokal aus:
```bash
DATABASE_URL="dein-neon-url" npx drizzle-kit push
```

---

## Schritt 5: App auf dem Handy installieren

1. Öffne `https://DEINE-APP.vercel.app` in Chrome
2. Tippe auf die drei Punkte → **"App installieren"**
3. Fertig! Die App läuft jetzt permanent und ohne Unterbrechung

---

## Automatische Updates

Jedes Git-Push aktualisiert die App automatisch:
```bash
git add .
git commit -m "Neues Feature"
git push
```

Vercel deployed innerhalb von ~30 Sekunden.

---

## Kosten

| Dienst | Kosten |
|---|---|
| Vercel Hobby | **$0** (unlimited) |
| Neon Free | **$0** (0.5 GB Speicher) |
| **Gesamt** | **$0 / Monat** |

---

## Alternative: Ein-Klick-Deploy

Falls du ein GitHub-Repo erstellt hast, füge diesen Button in die README ein:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DEIN_USER/punktgenau&env=DATABASE_URL)
