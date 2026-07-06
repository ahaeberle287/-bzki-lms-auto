# BZKI-LMS Auto-Login — Setup-Anleitung

Läuft **komplett in der Cloud (GitHub Actions)** — dein Laptop muss dafür nicht an sein.
Kosten: 0 € (im normalen Nutzungsrahmen für private Repos).

## 1. GitHub-Repository anlegen

1. Gehe zu github.com → neues **privates** Repository erstellen, z. B. `bzki-lms-auto`.
2. Lade diese drei Dateien in genau dieser Ordnerstruktur hoch:
   ```
   bzki-lms-auto/
   ├── login.js
   └── .github/
       └── workflows/
           └── daily-login.yml
   ```
   (Einfach per "Add file" → "Upload files" im Browser, GitHub erkennt die Ordnerstruktur automatisch.)

## 2. Zugangsdaten sicher hinterlegen (NIEMALS ins Skript schreiben!)

1. Im Repository: **Settings → Secrets and variables → Actions → New repository secret**
2. Zwei Secrets anlegen:
   - Name: `LMS_USER` → Wert: deine E-Mail/Benutzername für lms.bzki.de
   - Name: `LMS_PASS` → Wert: dein Passwort

## 3. Testen

1. Im Repository: Tab **Actions** öffnen
2. Workflow "Täglicher BZKI-LMS Login" auswählen
3. Rechts auf **"Run workflow"** klicken → manuell testen
4. Nach ca. 1–2 Minuten: Ergebnis prüfen (grüner Haken = erfolgreich)
5. Bei Fehler: unter dem Workflow-Lauf auf **"login-screenshots"** klicken →
   heruntergeladene Screenshots zeigen, wo es hakt (z. B. `error.png` oder `login-failed.png`)

## 4. Zeitplan anpassen (optional)

In `daily-login.yml` steht:
```yaml
- cron: '0 7 * * *'   # 07:00 UTC = 09:00 Uhr deutsche Zeit (Sommerzeit)
```
Zeit nach Wunsch ändern (Format: Minute Stunde * * *), z. B. `0 6 * * *` für 08:00 Uhr MESZ.
Achtung: GitHub Actions nutzt UTC, nicht deutsche Zeit — im Winter (Winterzeit) verschiebt sich das um 1 Stunde.

## Falls das Skript nicht auf Anhieb funktioniert

Das Login-Formular von lms.bzki.de kenne ich nicht im Detail (kein direkter technischer Zugriff
auf den HTML-Quellcode der Login-Seite von hier aus). Das Skript probiert mehrere gängige
Selektoren automatisch durch — falls trotzdem ein Fehler kommt:

1. Screenshot `login-failed.png` oder `error.png` aus dem Actions-Lauf herunterladen und mir zeigen
2. Oder: auf lms.bzki.de/login rechtsklicken auf das E-Mail-Feld → "Untersuchen" →
   den HTML-Ausschnitt (das `<input ...>`-Tag) kopieren und mir schicken

Dann passe ich die Selektoren im Skript gezielt an.

## Wichtiger Hinweis

Manche Lernplattformen tracken nicht nur den Login, sondern auch aktive Lernzeit/Fortschritt.
Falls beim BZKI-Kurs eine Mindestanwesenheit oder aktive Bearbeitung nachgewiesen werden muss,
ersetzt dieses Skript das nicht — es simuliert nur Login + Betreten des Schulungsraums,
nicht das eigentliche Lernen.
