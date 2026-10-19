// Tournage automatisé de la vidéo tutoriel DjiSea (format vertical 1080×1920),
// synchronisé avec la voix off : chaque étape dure au moins le temps de sa phrase.
//
// Usage : node record.mjs <dossier-de-sortie> <segments.json>
//   segments.json : [{ "text": "…", "duration": 4.2 }, …] (voir README.md)
// Produit : images JPEG, frames.ffconcat (montage), timeline.json (début de chaque phrase),
//           sous-titres.srt.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';

const [outDir, segmentsFile] = process.argv.slice(2);
const segments = JSON.parse(readFileSync(segmentsFile, 'utf8'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, locale: 'fr-FR' });
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const app = page.frameLocator('#app');

// --- Capture des images (protocole de débogage de Chromium) -------------------
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = `${outDir}/f${String(frames.length).padStart(6, '0')}.jpg`;
  writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

// --- Narration : sous-titres + horodatage ---------------------------------------
const timeline = [];
let narrationEnd = 0;
/** Découpe une phrase longue en sous-titres d'au plus ~70 caractères, au fil des phrases et virgules. */
function chunks(text) {
  const parts = text.match(/[^.:!?]+[.:!?]?/g).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (out.length && (out.at(-1) + ' ' + p).length <= 70) out[out.length - 1] += ' ' + p;
    else out.push(p);
  }
  return out;
}
async function narrate(index) {
  await waitNarration(); // ne jamais chevaucher la phrase précédente
  const seg = segments[index];
  const start = Date.now() / 1000;
  timeline.push({ index, start });
  narrationEnd = Date.now() + seg.duration * 1000 + 350;
  const parts = chunks(seg.text);
  const total = parts.reduce((n, p) => n + p.length, 0);
  let offset = 0;
  for (const part of parts) {
    const at = (offset / total) * seg.duration * 1000;
    setTimeout(() => page.evaluate((t) => window.setSubtitle(t), part).catch(() => {}), at);
    offset += part.length;
  }
  setTimeout(() => page.evaluate(() => window.setSubtitle('')).catch(() => {}), seg.duration * 1000 + 150);
}
async function waitNarration() {
  const left = narrationEnd - Date.now();
  if (left > 0) await wait(left);
}

// --- Gestes ---------------------------------------------------------------------
const caption = (chip, title, sub) => page.evaluate(([a, b, c]) => window.setCaption(a, b, c), [chip, title, sub]);
async function tap(locator, pause = 700) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  await page.evaluate(([x, y]) => window.tapAt(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
  await wait(250);
  await locator.click();
  await wait(pause);
}
async function scroll(total, steps = 25) {
  await page.mouse.move(540, 1000);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, total / steps);
    await wait(30);
  }
  await wait(400);
}
const field = async (label, text) => {
  const loc = app.getByLabel(label, { exact: true });
  await tap(loc, 200);
  await loc.pressSequentially(text, { delay: 45 });
  await wait(250);
};
const LOGO = '<img src="mark.svg" alt="">';

// --- 0. Ouverture -----------------------------------------------------------------
await page.goto('http://localhost:8099/promo/index.html');
await page.evaluate((logo) => window.showCard(`${logo}<h1>DjiSea</h1><div class="line"></div><p>Traversées et escapades à Djibouti</p>`), LOGO);
await app.getByText('Rechercher une traversée').waitFor();
await wait(500);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
const captureStart = Date.now() / 1000;
await wait(800);
await narrate(0);
await wait(2600);
await page.evaluate(() => window.showCard(`<p class="big">Réservez votre traversée<br>du golfe de Tadjourah<br>en quelques gestes.</p><span class="demo">DÉMONSTRATION — OFFRES FICTIVES</span>`));
await waitNarration();

// --- 1. Recherche -------------------------------------------------------------------
await caption('ÉTAPE 1', 'Choisissez votre trajet', 'Départ, arrivée, date et passagers.');
await page.evaluate(() => window.hideCard());
await narrate(1);
await wait(600);
await scroll(330);
await tap(app.getByRole('radio', { name: 'Djibouti-ville' }).first(), 400);
await tap(app.getByRole('radio', { name: 'Tadjourah' }).nth(1), 500);
const radios = app.getByRole('radio', { name: /^\d{4}-\d{2}-\d{2}$/ });
const wed = await radios.evaluateAll((els) =>
  els.findIndex((e) => new Date(e.getAttribute('aria-label') + 'T00:00:00Z').getUTCDay() === 3),
);
await tap(radios.nth(wed), 500);
await tap(app.getByRole('button', { name: 'Passagers +' }), 400);
await waitNarration();
await tap(app.getByRole('button', { name: 'Voir les départs' }), 800);

// --- 2. Départs ---------------------------------------------------------------------
await caption('ÉTAPE 2', 'Comparez les départs', 'Horaire, durée, tarif, places restantes.');
await narrate(2);
await app.getByRole('button', { name: /^\d{2}:\d{2} / }).first().waitFor();
await scroll(1000, 30);
await waitNarration();
await tap(app.getByRole('button', { name: /^\d{2}:\d{2} / }).first(), 900);

// --- 3. Détail ----------------------------------------------------------------------
await caption('ÉTAPE 3', 'Vérifiez les détails', 'Conditions de transport et prestataire.');
await narrate(3);
await wait(900);
await scroll(700, 30);
await wait(600);
await scroll(700, 30);
await waitNarration();
await tap(app.getByRole('button', { name: 'Demander une réservation' }), 1000);

// --- 4. Passagers et contact --------------------------------------------------------
await caption('ÉTAPE 4', 'Indiquez les passagers', 'Un nom par passager et votre téléphone.');
await narrate(4);
await wait(400);
await tap(app.getByRole('button', { name: 'Nombre de personnes +' }), 400);
await field('Nom complet du passager 1', 'Amina Hassan');
await field('Nom complet du passager 2', 'Omar Hassan');
await tap(app.getByRole('radio', { name: 'Enfant' }).nth(1), 300);
await field('Votre nom', 'Amina Hassan');
await field('Téléphone', '77 12 34 56');
await waitNarration();

// --- 5. Paiement ----------------------------------------------------------------------
await caption('ÉTAPE 5', 'Choisissez le paiement', 'CAC Pay, Waafi, D-Money ou espèces à l’agence.');
await narrate(5);
const payment = app.getByText('Mode de paiement souhaité');
await payment.scrollIntoViewIfNeeded();
await scroll(260, 15);
await wait(700);
for (const name of ['CAC Pay', 'Waafi', 'Espèces à l’agence']) {
  await tap(app.getByRole('radio', { name }), 650);
}
await tap(app.getByRole('radio', { name: 'D-Money' }), 900);
await waitNarration();

// --- 6. Envoi et référence ------------------------------------------------------------
await caption('ÉTAPE 6', 'Recevez votre référence', 'Le prestataire confirme ensuite.');
await narrate(6);
await tap(app.getByRole('checkbox'), 500);
await tap(app.getByRole('button', { name: 'Envoyer la demande' }), 300);
await app.getByText('Demande envoyée').first().waitFor();
await waitNarration();
await wait(500);
await tap(app.getByRole('button', { name: 'Suivre ma demande' }), 800);

// --- 7. Suivi --------------------------------------------------------------------------
await caption('ÉTAPE 7', 'Suivez votre demande', 'Chaque étape jusqu’à la confirmation.');
await narrate(7);
await wait(1000);
await scroll(500, 25);
await waitNarration();

// --- 8. Découvrir et séjours --------------------------------------------------------------
await caption('ET AUSSI', 'Découvrez Djibouti', 'Sites, excursions et hébergements.');
await app.locator('body').evaluate(() => { window.location.href = '/'; });
await app.getByText('Rechercher une traversée').waitFor();
await narrate(8);
await tap(app.getByText('Découvrir', { exact: true }).last(), 900);
await scroll(450, 20);
await tap(app.getByRole('button', { name: 'Lac Assal', exact: true }), 1100);
await scroll(500, 25);
await app.locator('body').evaluate(() => history.back());
await wait(500);
await tap(app.getByText('Séjours', { exact: true }).last(), 900);
await scroll(400, 20);
await waitNarration();

// --- 9. Fin -----------------------------------------------------------------------------------
await page.evaluate((logo) => window.showCard(
  `${logo}<h1>DjiSea</h1><div class="line"></div>
   <p>Bientôt sur Google Play<br>et l’App Store</p>
   <p class="note">Plateforme indépendante de mise en relation.<br>Les traversées et prestations sont assurées par leurs exploitants.<br>Paiement au prestataire après confirmation de la demande.</p>
   <span class="demo">IMAGES DE DÉMONSTRATION — OFFRES FICTIVES</span>`), LOGO);
await wait(400);
await narrate(9);
await waitNarration();
await wait(1500);

// --- Exports ---------------------------------------------------------------------------
await cdp.send('Page.stopScreencast');
const t0 = frames[0].t;
const lines = ['ffconcat version 1.0'];
frames.forEach((f, i) => {
  const next = frames[i + 1]?.t ?? f.t + 0.5;
  lines.push(`file '${f.file}'`, `duration ${(next - f.t).toFixed(4)}`);
});
lines.push(`file '${frames.at(-1).file}'`);
writeFileSync(`${outDir}/frames.ffconcat`, lines.join('\n'));

// Horloges : les horodatages Chromium et Node partagent l'horloge système.
const rel = timeline.map(({ index, start }) => ({ index, start: start - t0, duration: segments[index].duration }));
writeFileSync(`${outDir}/timeline.json`, JSON.stringify(rel, null, 2));

const srtTime = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
};
const srt = [];
for (const { index, start, duration } of rel) {
  const parts = chunks(segments[index].text);
  const total = parts.reduce((n, p) => n + p.length, 0);
  let offset = 0;
  for (const part of parts) {
    const a = start + (offset / total) * duration;
    offset += part.length;
    const b = start + (offset / total) * duration;
    srt.push(`${srt.length + 1}\n${srtTime(a)} --> ${srtTime(b)}\n${part}\n`);
  }
}
writeFileSync(`${outDir}/sous-titres.srt`, srt.join('\n'));
console.log('images', frames.length, 'durée', (frames.at(-1).t - t0).toFixed(1), 's', 'début capture', (captureStart - t0).toFixed(2));
await context.close();
await browser.close();
