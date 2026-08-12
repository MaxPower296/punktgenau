# 📱 Punktgenau auf Dauerhaft betreiben – EXAKTE Anleitung

Die App muss einmalig auf einen dauerhaften Server hochgeladen werden.
Danach läuft sie 24/7, auch wenn du dein Handy ausschaltest.

**Dauer: ~15 Minuten. Kosten: $0.**

---

## SCHRITT 1: GitHub-Konto erstellen (2 Min.)

1. Öffne **https://github.com** auf deinem PC
2. Klicke **"Sign up"**
3. Erstelle ein kostenloses Konto

---

## SCHRITT 2: Projekt-Dateien auf GitHub laden (3 Min.)

1. Öffne https://github.com/new
2. **Repository name:** `punktgenau`
3. Klicke **"Create repository"**
4. Auf der nächsten Seite siehst du Befehle. Kopiere diese Befehle **einen nach dem anderen** in dein Terminal:

```bash
cd /pfad/zu/deinem/projekt
git init
git add .
git commit -m "Punktgenau App"
git branch -M main
git remote add origin https://github.com/DEIN_USERNAME/punktgenau.git
git push -u origin main
```

**Ersetze `DEIN_USERNAME` mit deinem GitHub-Benutzernamen!**

Falls du **kein Terminal** hast, kannst du auch:
- Auf GitHub die Dateien **manuell hochladen** (Upload-Button)
- Oder die **GitHub Desktop App** verwenden (https://desktop.github.com)

---

## SCHRITT 3: PostgreSQL Datenbank erstellen (3 Min.)

1. Öffne **https://neon.tech** 
2. Klicke **"Sign up"** → Melde dich mit GitHub an
3. Klicke **"Create a project"**
4. **Region wählen:** `AWS Eu-central-1 (Frankfurt)` ← das ist wichtig für Geschwindigkeit!
5. **Projektname:** `punktgenau`
6. Klicke **"Create project"**
7. Kopiere den **Connection String** (PostgreSQL URI):
   ```
   postgresql://neondb_owner:PASSWORT@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   **Diesen String brauchst du in Schritt 4!**

---

## SCHRITT 4: Auf Vercel deployen (5 Min.)

1. Öffne **https://vercel.com**
2. Klicke **"Sign up"** → Melde dich mit **GitHub** an
3. Klicke **"Add New..."** → **"Project"**
4. Wähle dein `punktgenau` Repository aus
5. **VOR dem Klick auf "Deploy":**
   - Klicke auf **"Environment Variables"**
   - Füge hinzu:
     - **Name:** `DATABASE_URL`
     - **Wert:** Den Connection String aus Schritt 3
   - Klicke **"Add"**
6. Klicke jetzt **"Deploy"**
7. Warte ~2 Minuten bis der Build fertig ist

**Fertig!** Deine App läuft jetzt unter:
```
https://punktgenau-DEIN_NAME.vercel.app
```

---

## SCHRITT 5: App auf Handy installieren (1 Min.)

1. Öffne **Google Chrome** auf deinem Android
2. Tippe die URL ein: `https://punktgenau-DEIN_NAME.vercel.app`
3. Warte bis die Seite geladen ist
4. Tippe **drei Punkte** oben rechts → **"App installieren"**
5. Bestätige mit **"Installieren"**

**Die App läuft jetzt permanent auf deinem Handy!**

---

## Häufige Fragen

### Was kostet das?
**Gar nichts.** Vercel und Neon haben kostenlose Pläne.

### Was passiert, wenn ich etwas ändern will?
Ändere die Dateien, pushe zu GitHub → Vercel updated automatisch.

### Was passiert, wenn die Datenbank voll wird?
Neon Free hat 0.5 GB. Das reicht für ~5000 Punkte mit Fotos.

### Kann ich mehrere Geräte nutzen?
Ja! Die App ist webbasiert. Öffne die URL auf jedem Gerät.

### Was wenn ich den Link vergesse?
Lese ihn aus der Vercel-App oder tippe `punktgenau.vercel.app`.
