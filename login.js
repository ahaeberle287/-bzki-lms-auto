// login.js
// Automatischer Login bei lms.bzki.de + Beitritt zum "Schulungsraum".
// Läuft lokal ODER via GitHub Actions (siehe .github/workflows/daily-login.yml)

const { chromium } = require('playwright');

const LMS_USER = process.env.LMS_USER;
const LMS_PASS = process.env.LMS_PASS;

if (!LMS_USER || !LMS_PASS) {
  console.error('Fehler: LMS_USER und LMS_PASS müssen als Umgebungsvariablen gesetzt sein.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Öffne Login-Seite...');
    await page.goto('https://lms.bzki.de/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // --- Login-Feld für Benutzername/E-Mail finden ---
    // Versucht mehrere gängige Selektor-Varianten, bis eine passt.
    const userFieldCandidates = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[id*="email" i]',
      'input[id*="username" i]',
      'input[placeholder*="mail" i]',
      'input[placeholder*="benutzer" i]',
    ];
    const userField = await findFirstVisible(page, userFieldCandidates);
    if (!userField) throw new Error('Login-Feld (E-Mail/Benutzername) nicht gefunden.');
    await userField.fill(LMS_USER);

    // --- Passwort-Feld ---
    const passField = await page.$('input[type="password"]');
    if (!passField) throw new Error('Passwort-Feld nicht gefunden.');
    await passField.fill(LMS_PASS);

    // --- Login-Button klicken ---
    const loginButtonCandidates = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Anmelden")',
      'input[type="submit"]',
    ];
    const loginButton = await findFirstVisible(page, loginButtonCandidates);
    if (!loginButton) throw new Error('Login-Button nicht gefunden.');

    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}),
      loginButton.click(),
    ]);

    console.log('Login abgeschickt, warte auf Dashboard...');
    await page.waitForTimeout(3000);

    // --- Prüfen, ob Login erfolgreich war ---
    const stillOnLoginPage = page.url().includes('/login');
    if (stillOnLoginPage) {
      await page.screenshot({ path: 'login-failed.png', fullPage: true });
      throw new Error('Login fehlgeschlagen — vermutlich falsche Zugangsdaten oder unerwartetes Formular. Screenshot: login-failed.png');
    }

    console.log('Login erfolgreich. Navigiere zum Schulungsraum...');

    // --- Direkt zur Schulungsraum-Seite navigieren (zuverlässiger als Klick auf Nav-Link) ---
    await page.goto('https://lms.bzki.de/live', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Bestätigungs-Screenshot vor dem Video-Start
    await page.screenshot({ path: 'schulungsraum-erfolg.png', fullPage: true });
    console.log('Schulungsraum betreten. Versuche Video zu starten...');

    // --- Video starten ---
    // Der Player (webinargeek) läuft evtl. in einem iframe. Wir versuchen beide Fälle:
    // 1) Play-Button direkt auf der Seite
    // 2) Play-Button innerhalb eines iframes
    let played = false;
    const playSelectors = [
      'button[aria-label*="play" i]',
      'button[aria-label*="wiedergabe" i]',
      '[class*="play" i]',
      'text=Bitte klicke auf das Video',
    ];

    // Versuch 1: direkt auf der Hauptseite
    for (const sel of playSelectors) {
      const el = await page.$(sel);
      if (el && await el.isVisible().catch(() => false)) {
        await el.click().catch(() => {});
        played = true;
        break;
      }
    }

    // Versuch 2: in allen iframes suchen
    if (!played) {
      for (const frame of page.frames()) {
        for (const sel of playSelectors) {
          const el = await frame.$(sel).catch(() => null);
          if (el && await el.isVisible().catch(() => false)) {
            await el.click().catch(() => {});
            played = true;
            break;
          }
        }
        if (played) break;
      }
    }

    // Versuch 3: einfach in die Bildschirmmitte klicken (viele Player reagieren darauf)
    if (!played) {
      console.log('Kein Play-Button per Selektor gefunden, klicke stattdessen mittig auf den Videobereich.');
      await page.mouse.click(400, 330).catch(() => {});
    } else {
      console.log('Play-Button geklickt.');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'video-gestartet.png', fullPage: true });

    // --- Session offen halten (Standard: 3 Stunden) ---
    const SESSION_MINUTES = parseInt(process.env.SESSION_MINUTES || '180', 10);
    const totalMs = SESSION_MINUTES * 60 * 1000;
    const heartbeatMs = 5 * 60 * 1000; // alle 5 Minuten eine kleine Aktion, um Inaktivitäts-Logout zu vermeiden
    let elapsed = 0;

    console.log(`Halte Sitzung ${SESSION_MINUTES} Minuten offen...`);

    while (elapsed < totalMs) {
      const wait = Math.min(heartbeatMs, totalMs - elapsed);
      await page.waitForTimeout(wait);
      elapsed += wait;

      // Kleine "Lebenszeichen"-Aktion: Mausbewegung + minimaler Scroll
      await page.mouse.move(100 + Math.random() * 300, 100 + Math.random() * 300).catch(() => {});
      await page.mouse.wheel(0, 1).catch(() => {});

      console.log(`... ${Math.round(elapsed / 60000)} von ${SESSION_MINUTES} Minuten vergangen`);
    }

    await page.screenshot({ path: 'session-ende.png', fullPage: true });
    console.log('Fertig! Sitzungsdauer erreicht, Skript beendet sich.');

  } catch (err) {
    console.error('FEHLER:', err.message);
    try {
      await page.screenshot({ path: 'error.png', fullPage: true });
      console.log('Fehler-Screenshot gespeichert: error.png');
    } catch (_) {}
    await browser.close();
    process.exit(1);
  }

  await browser.close();
})();

// Hilfsfunktion: gibt das erste sichtbare Element zurück, das zu einem der Selektoren passt
async function findFirstVisible(page, selectors) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el && await el.isVisible()) return el;
  }
  return null;
}
