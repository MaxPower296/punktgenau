#!/bin/bash
# Punktgenau Deployment-Helper
# Führe dieses Script aus, um die App für Deploy vorzubereiten

echo "=== ⌖ Punktgenau Deployment Vorbereitung ==="
echo ""

# 1. Git Repository initialisieren
if [ ! -d ".git" ]; then
  echo "📦 Initialisiere Git Repository..."
  git init
  git add .
  git commit -m "Initial: Punktgenau Reiseführer-GPS-Scanner"
  echo "✅ Git Repository erstellt"
else
  echo "✅ Git Repository existiert bereits"
fi

# 2. .gitignore prüfen
if [ ! -f ".gitignore" ]; then
  echo "📝 Erstelle .gitignore..."
  cat > .gitignore << 'EOF'
node_modules/
.next/
.tessdata-cache/
.env
.env.local
*.log
EOF
  echo "✅ .gitignore erstellt"
fi

# 3. Build testen
echo "🔨 Teste Build..."
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Build erfolgreich"
else
  echo "❌ Build fehlgeschlagen - bitte Fehler beheben"
  exit 1
fi

echo ""
echo "=== ✅ Deployment-vorbereitung abgeschlossen ==="
echo ""
echo "Nächste Schritte:"
echo "1. Erstelle ein GitHub-Repository auf github.com/new"
echo "2. Lade dieses Projekt hoch:"
echo "   git remote add origin https://github.com/DEIN_USER/punktgenau.git"
echo "   git push -u origin main"
echo ""
echo "3. Erstelle eine Neon-PostgreSQL Datenbank auf neon.tech"
echo "   -> Kopiere den Connection String"
echo ""
echo "4. Deploye auf vercel.com:"
echo "   -> Importiere dein GitHub Repository"
echo "   -> Füge DATABASE_URL hinzu"
echo "   -> Klicke Deploy"
echo ""
echo "详细>Anleitung findest du in DEPLOYMENT.md"
