// Tournage automatisé de la vidéo tutoriel DjiSea (format vertical 1080×1920).
import { chromium } from 'playwright-core';

const outDir = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, locale: 'fr-FR' });
const page = await context.newPage();

// Capture des images via le protocole de débogage de Chromium (JPEG + horodatage).
import { writeFileSync } from 'node:fs';
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = `${outDir}/f${String(frames.length).padStart(6, '0')}.jpg`;
  writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
const startCapture = () => cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
const wait = (ms) => page.waitForTimeout(ms);
const app = page.frameLocator('#app');

const caption = (chip, title, sub) => page.evaluate(([a, b, c]) => window.setCaption(a, b, c), [chip, title, sub]);
async function tap(locator, pause = 900) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  await page.evaluate(([x, y]) => window.tapAt(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
  await wait(250);
  await locator.click();
  await wait(pause);
}
async function scroll(total, steps = 25) {
  await page.mouse.move(540, 1100);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, total / steps);
    await wait(30);
  }
  await wait(500);
}

const LOGO = '<img src="mark.svg" alt="">';

// --- Ouverture -------------------------------------------------------------
await page.goto('http://localhost:8099/promo/index.html');
await page.evaluate((logo) => window.showCard(`${logo}<h1>DjiSea</h1><div class="line"></div><p>Traversées et escapades à Djibouti</p>`), LOGO);
await app.getByText('Rechercher une traversée').waitFor();
await wait(600);
await startCapture();
await wait(3200);
await page.evaluate(() => window.showCard(`<p class="big">Réservez votre traversée<br>du golfe de Tadjourah<br>en quelques gestes.</p><span class="demo">DÉMONSTRATION — OFFRES FICTIVES</span>`));
await wait(3000);
await caption('ÉTAPE 1', 'Choisissez votre trajet', 'Départ, arrivée, date et nombre de passagers.');
await page.evaluate(() => window.hideCard());
await wait(1500);

// --- Étape 1 : recherche ---------------------------------------------------
await scroll(330);
await tap(app.getByRole('radio', { name: 'Djibouti-ville' }).first(), 600);
await tap(app.getByRole('radio', { name: 'Tadjourah' }).nth(1), 700);
const radios = app.getByRole('radio', { name: /^\d{4}-\d{2}-\d{2}$/ });
const wed = await radios.evaluateAll((els) =>
  els.findIndex((e) => new Date(e.getAttribute('aria-label') + 'T00:00:00Z').getUTCDay() === 3),
);
await tap(radios.nth(wed), 700);
await tap(app.getByRole('button', { name: 'Passagers +' }), 500);
await tap(app.getByRole('button', { name: 'Voir les départs' }), 1200);

// --- Étape 2 : départs -----------------------------------------------------
await caption('ÉTAPE 2', 'Comparez les départs', 'Horaire, durée, tarif et places restantes.');
await app.getByRole('button', { name: /^\d{2}:\d{2} / }).first().waitFor();
await scroll(1100, 35);
await wait(1800);
await tap(app.getByRole('button', { name: /^\d{2}:\d{2} / }).first(), 1500);

// --- Étape 3 : détail ------------------------------------------------------
await caption('ÉTAPE 3', 'Vérifiez les détails', 'Conditions de transport et coordonnées du prestataire.');
await wait(1800);
await scroll(700, 30);
await wait(1500);
await scroll(700, 30);
await tap(app.getByRole('button', { name: 'Demander une réservation' }), 1500);

// --- Étape 4 : formulaire --------------------------------------------------
await caption('ÉTAPE 4', 'Envoyez votre demande', 'Un nom par passager, votre téléphone, et c’est parti.');
await wait(1200);
const field = async (label, text) => {
  const loc = app.getByLabel(label, { exact: true });
  await tap(loc, 300);
  await loc.pressSequentially(text, { delay: 55 });
  await wait(400);
};
await tap(app.getByRole('button', { name: 'Nombre de personnes +' }), 700);
await field('Nom complet du passager 1', 'Amina Hassan');
await field('Nom complet du passager 2', 'Omar Hassan');
await tap(app.getByRole('radio', { name: 'Enfant' }).nth(1), 600);
await field('Votre nom', 'Amina Hassan');
await field('Téléphone', '77 12 34 56');
await tap(app.getByRole('checkbox'), 900);
await tap(app.getByRole('button', { name: 'Envoyer la demande' }), 600);

// --- Étape 5 : confirmation ------------------------------------------------
await app.getByText('Demande envoyée').first().waitFor();
await caption('ÉTAPE 5', 'Recevez votre référence', 'Le prestataire confirme ensuite votre place.');
await wait(3500);
await tap(app.getByRole('button', { name: 'Suivre ma demande' }), 1200);

// --- Étape 6 : suivi -------------------------------------------------------
await caption('ÉTAPE 6', 'Suivez votre demande', 'Chaque étape s’affiche jusqu’à la confirmation.');
await wait(2200);
await scroll(900, 35);
await wait(1800);

// --- Découvrir -------------------------------------------------------------
await caption('ET AUSSI', 'Découvrez Djibouti', 'Lac Assal, lac Abbé, îles Moucha, forêt du Day…');
await app.locator('body').evaluate(() => { window.location.href = '/'; });
await app.getByText('Rechercher une traversée').waitFor();
await wait(400);
await tap(app.getByText('Découvrir', { exact: true }).last(), 1500);
await scroll(500, 25);
await tap(app.getByRole('button', { name: 'Lac Assal', exact: true }), 1500);
await scroll(800, 35);
await wait(1500);

// --- Séjours ---------------------------------------------------------------
await caption('ET AUSSI', 'Trouvez où dormir', 'Hôtels, campements et maisons d’hôtes.');
await app.locator('body').evaluate(() => history.back()); // retour de la fiche vers les onglets
await wait(800);
await tap(app.getByText('Séjours', { exact: true }).last(), 1500);
await scroll(600, 30);
await wait(1500);

// --- Fin -------------------------------------------------------------------
await page.evaluate((logo) => window.showCard(
  `${logo}<h1>DjiSea</h1><div class="line"></div>
   <p>Bientôt sur Google Play<br>et l’App Store</p>
   <p class="note">Plateforme indépendante de mise en relation.<br>Les traversées et prestations sont assurées par leurs exploitants.<br>Votre réservation est ferme après confirmation du prestataire.</p>
   <span class="demo">IMAGES DE DÉMONSTRATION — OFFRES FICTIVES</span>`), LOGO);
await wait(5000);

await cdp.send('Page.stopScreencast');
// Liste de montage ffmpeg : chaque image dure jusqu'à la suivante.
const lines = ['ffconcat version 1.0'];
frames.forEach((f, i) => {
  const next = frames[i + 1]?.t ?? f.t + 0.5;
  lines.push(`file '${f.file}'`, `duration ${(next - f.t).toFixed(4)}`);
});
lines.push(`file '${frames.at(-1).file}'`);
writeFileSync(`${outDir}/frames.ffconcat`, lines.join('\n'));
console.log('frames', frames.length, 'durée', (frames.at(-1).t - frames[0].t).toFixed(1), 's');
await context.close();
await browser.close();
console.log('ok');
