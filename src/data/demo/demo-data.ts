/**
 * ⚠️ DONNÉES DE DÉMONSTRATION.
 *
 * - Prestataires, trajets, horaires, tarifs, capacités, hébergements, excursions
 *   et offres sponsorisées : ENTIÈREMENT FICTIFS (reliability: 'demo').
 *   Les noms contiennent « Exemple » pour éviter toute confusion avec une entreprise réelle.
 * - Destinations : lieux réels, descriptions générales issues de sources publiques,
 *   NON vérifiées (reliability: 'unverified'). À relire avant toute publication.
 * - Aucune liaison maritime n'est présentée comme existante ou régulière.
 */
import { addDays } from '@/domain/time';
import type { Departure, Destination, Experience, Provider, Route, SponsoredPlacement, Stay } from '@/domain/models';

export const demoProviders: Provider[] = [
  {
    id: 'prv-demo-marine',
    name: 'Navettes Exemple du Golfe (fictif)',
    kind: 'maritime_operator',
    description: 'Opérateur maritime fictif servant à illustrer la recherche de traversées.',
    phone: '+253 00 00 00 00',
    email: 'contact@exemple.invalid',
    verified: false,
    reliability: 'demo',
  },
  {
    id: 'prv-demo-agence',
    name: 'Agence Exemple Découverte (fictif)',
    kind: 'agency',
    description: 'Agence fictive proposant des excursions de démonstration.',
    phone: '+253 00 00 00 01',
    email: 'agence@exemple.invalid',
    verified: false,
    reliability: 'demo',
  },
  {
    id: 'prv-demo-hotel',
    name: 'Groupe Hôtelier Exemple (fictif)',
    kind: 'hotel',
    description: 'Établissements fictifs utilisés pour la démonstration.',
    phone: '+253 00 00 00 02',
    email: 'hotel@exemple.invalid',
    verified: false,
    reliability: 'demo',
  },
];

export const demoDestinations: Destination[] = [
  {
    id: 'dst-djibouti',
    name: 'Djibouti-ville',
    region: 'djibouti',
    summary: 'La capitale, son port et ses quartiers historiques.',
    description:
      'Capitale et principal port du pays, au sud du golfe de Tadjourah. Point de départ naturel des excursions vers les îles et la rive nord du golfe.',
    highlights: ['Quartiers historiques du centre', 'Marchés', 'Front de mer'],
    practicalInfo: ['Chaleur intense de mai à septembre : privilégier les sorties tôt le matin.'],
    isPort: true,
    imageUrl: null,
    reliability: 'unverified',
  },
  {
    id: 'dst-tadjourah',
    name: 'Tadjourah',
    region: 'tadjourah',
    summary: 'L’une des plus anciennes villes de la région, sur la rive nord du golfe.',
    description:
      'Surnommée « la ville blanche », Tadjourah fait face à Djibouti-ville de l’autre côté du golfe. Elle sert de base pour découvrir les plages et les reliefs du nord.',
    highlights: ['Vieille ville et mosquées', 'Plages de la rive nord', 'Accès aux massifs du nord'],
    practicalInfo: ['Les liaisons maritimes et leurs horaires doivent être confirmés auprès des opérateurs.'],
    isPort: true,
    imageUrl: null,
    reliability: 'unverified',
  },
  {
    id: 'dst-obock',
    name: 'Obock',
    region: 'obock',
    summary: 'Ville historique à l’entrée du golfe, porte du nord du pays.',
    description:
      'Située à l’entrée du golfe de Tadjourah, Obock est chargée d’histoire et donne accès aux côtes peu fréquentées du nord et aux sites de plongée.',
    highlights: ['Patrimoine historique', 'Côtes sauvages', 'Départ vers les sites de plongée du nord'],
    practicalInfo: ['Hébergements limités : réserver et confirmer à l’avance.'],
    isPort: true,
    imageUrl: null,
    reliability: 'unverified',
  },
  {
    id: 'dst-moucha',
    name: 'Îles Moucha et Maskali',
    region: 'djibouti',
    summary: 'Plages et récifs à courte distance de la capitale.',
    description:
      'Petites îles au large de Djibouti-ville, appréciées pour la baignade, le snorkeling et les sorties à la journée.',
    highlights: ['Snorkeling', 'Plages', 'Sorties à la journée'],
    practicalInfo: ['Accès uniquement par bateau, via un prestataire.', 'Respecter les récifs : ne pas toucher le corail.'],
    isPort: false,
    imageUrl: null,
    reliability: 'unverified',
  },
  {
    id: 'dst-assal',
    name: 'Lac Assal',
    region: 'tadjourah',
    summary: 'Lac salé situé sous le niveau de la mer, banquise de sel.',
    description:
      'Souvent présenté comme le point le plus bas d’Afrique, le lac Assal offre des paysages minéraux spectaculaires : sel blanc, eau turquoise et coulées volcaniques.',
    highlights: ['Banquise de sel', 'Paysages volcaniques', 'Point de vue sur le Ghoubbet'],
    practicalInfo: ['Prévoir beaucoup d’eau et une protection solaire.', 'Ne pas marcher sur le sel sans chaussures adaptées.'],
    isPort: false,
    imageUrl: null,
    reliability: 'unverified',
  },
  {
    id: 'dst-abbe',
    name: 'Lac Abbé',
    region: 'dikhil',
    summary: 'Cheminées calcaires et flamants à la frontière éthiopienne.',
    description:
      'Le lac Abbé est réputé pour ses cheminées de calcaire, particulièrement saisissantes au lever du soleil, et pour ses flamants.',
    highlights: ['Cheminées calcaires', 'Lever de soleil', 'Avifaune'],
    practicalInfo: ['Véhicule tout-terrain et guide recommandés.', 'Nuit en campement fréquente pour voir le lever du jour.'],
    isPort: false,
    imageUrl: null,
    reliability: 'unverified',
  },
  {
    id: 'dst-day',
    name: 'Forêt du Day',
    region: 'tadjourah',
    summary: 'Forêt d’altitude du massif du Goda.',
    description:
      'Rare forêt d’altitude du pays, la forêt du Day offre une fraîcheur relative et des randonnées dans le massif du Goda.',
    highlights: ['Randonnée', 'Panoramas', 'Villages de montagne'],
    practicalInfo: ['Pistes de montagne : s’informer de leur état avant le départ.'],
    isPort: false,
    imageUrl: null,
    reliability: 'unverified',
  },
  {
    id: 'dst-arta',
    name: 'Arta Plage',
    region: 'arta',
    summary: 'Littoral du golfe, connu pour l’observation saisonnière des requins-baleines.',
    description:
      'Le littoral d’Arta, au bord du golfe de Tadjourah, est un lieu fréquent d’observation des requins-baleines. La saison est généralement annoncée en hiver ; les dates exactes varient chaque année.',
    highlights: ['Requins-baleines (saisonnier)', 'Baignade', 'Snorkeling'],
    practicalInfo: [
      'Saison et conditions d’observation à confirmer chaque année.',
      'Choisir un prestataire qui respecte les règles d’approche des animaux.',
    ],
    isPort: false,
    imageUrl: null,
    reliability: 'unverified',
  },
];

export const demoRoutes: Route[] = [
  {
    id: 'rte-djib-tadj',
    originId: 'dst-djibouti',
    destinationId: 'dst-tadjourah',
    providerId: 'prv-demo-marine',
    durationMinutes: 150,
    adultFareDjf: 2000,
    conditions: ['Exemple fictif : présentation 30 min avant le départ.', 'Exemple fictif : pièce d’identité exigée.'],
    reliability: 'demo',
  },
  {
    id: 'rte-tadj-djib',
    originId: 'dst-tadjourah',
    destinationId: 'dst-djibouti',
    providerId: 'prv-demo-marine',
    durationMinutes: 150,
    adultFareDjf: 2000,
    conditions: ['Exemple fictif : présentation 30 min avant le départ.'],
    reliability: 'demo',
  },
  {
    id: 'rte-djib-obock',
    originId: 'dst-djibouti',
    destinationId: 'dst-obock',
    providerId: 'prv-demo-marine',
    durationMinutes: 240,
    adultFareDjf: null,
    conditions: [],
    reliability: 'demo',
  },
  {
    id: 'rte-obock-djib',
    originId: 'dst-obock',
    destinationId: 'dst-djibouti',
    providerId: 'prv-demo-marine',
    durationMinutes: 240,
    adultFareDjf: null,
    conditions: [],
    reliability: 'demo',
  },
];

/** Jours de la semaine (0 = dimanche) et heure locale de départ, fictifs. */
const demoSchedule: Record<string, { weekdays: number[]; hourLocal: number; capacity: number }> = {
  'rte-djib-tadj': { weekdays: [1, 3, 6], hourLocal: 9, capacity: 40 },
  'rte-tadj-djib': { weekdays: [1, 3, 6], hourLocal: 15, capacity: 40 },
  'rte-djib-obock': { weekdays: [0, 3], hourLocal: 8, capacity: 30 },
  'rte-obock-djib': { weekdays: [0, 3], hourLocal: 14, capacity: 30 },
};

/** Génère les départs fictifs des 21 prochains jours à partir de la date du jour (Djibouti). */
export function buildDemoDepartures(today: string): Departure[] {
  const departures: Departure[] = [];
  for (let offset = 0; offset < 21; offset++) {
    const date = addDays(today, offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    for (const [routeId, s] of Object.entries(demoSchedule)) {
      if (!s.weekdays.includes(weekday)) continue;
      const utcHour = (s.hourLocal - 3).toString().padStart(2, '0');
      const id = `dep-${routeId}-${date}`;
      // Remplissage pseudo-aléatoire stable pour illustrer « places restantes » et « complet ».
      const taken = (offset * 7 + routeId.length * 3) % (s.capacity + 6);
      departures.push({
        id,
        routeId,
        departsAt: `${date}T${utcHour}:00:00Z`,
        capacity: s.capacity,
        seatsAvailable: Math.max(s.capacity - taken, 0),
        reliability: 'demo',
      });
    }
  }
  return departures;
}

export const demoExperiences: Experience[] = [
  {
    id: 'exp-moucha-snorkel',
    title: 'Journée snorkeling à Moucha (exemple)',
    kind: 'excursion',
    destinationId: 'dst-moucha',
    providerId: 'prv-demo-agence',
    summary: 'Traversée, baignade et exploration des récifs.',
    description: 'Offre fictive de démonstration : programme, durée et prix ne correspondent à aucune prestation réelle.',
    durationLabel: 'Journée',
    priceFromDjf: 9000,
    included: ['Transfert en bateau (fictif)', 'Masque et tuba (fictif)'],
    imageUrl: null,
    reliability: 'demo',
  },
  {
    id: 'exp-assal-day',
    title: 'Lac Assal et Ghoubbet (exemple)',
    kind: 'excursion',
    destinationId: 'dst-assal',
    providerId: 'prv-demo-agence',
    summary: 'Excursion à la journée vers le lac salé.',
    description: 'Offre fictive de démonstration.',
    durationLabel: 'Journée',
    priceFromDjf: 15000,
    included: ['Véhicule avec chauffeur (fictif)', 'Eau (fictif)'],
    imageUrl: null,
    reliability: 'demo',
  },
  {
    id: 'exp-abbe-camp',
    title: 'Lac Abbé, nuit en campement (exemple)',
    kind: 'circuit',
    destinationId: 'dst-abbe',
    providerId: 'prv-demo-agence',
    summary: 'Deux jours pour assister au lever du soleil sur les cheminées.',
    description: 'Circuit fictif de démonstration.',
    durationLabel: '2 jours / 1 nuit',
    priceFromDjf: null,
    included: [],
    imageUrl: null,
    reliability: 'demo',
  },
  {
    id: 'exp-whale-shark',
    title: 'Observation des requins-baleines (exemple)',
    kind: 'activity',
    destinationId: 'dst-arta',
    providerId: 'prv-demo-agence',
    summary: 'Sortie en mer encadrée, selon la saison.',
    description: 'Activité fictive de démonstration. La présence des animaux n’est jamais garantie.',
    durationLabel: 'Demi-journée',
    priceFromDjf: 12000,
    included: ['Briefing sur l’approche respectueuse (fictif)'],
    imageUrl: null,
    reliability: 'demo',
  },
  {
    id: 'exp-day-hike',
    title: 'Randonnée en forêt du Day (exemple)',
    kind: 'guide',
    destinationId: 'dst-day',
    providerId: 'prv-demo-agence',
    summary: 'Randonnée accompagnée d’un guide local.',
    description: 'Prestation fictive de démonstration.',
    durationLabel: 'Journée',
    priceFromDjf: null,
    included: [],
    imageUrl: null,
    reliability: 'demo',
  },
];

export const demoStays: Stay[] = [
  {
    id: 'sty-city',
    name: 'Hôtel Exemple Corniche (fictif)',
    destinationId: 'dst-djibouti',
    providerId: 'prv-demo-hotel',
    category: 'hotel',
    summary: 'Hôtel fictif en centre-ville, pour la démonstration.',
    address: null,
    amenities: ['Climatisation', 'Wi-Fi', 'Restaurant'],
    nightlyFromDjf: 25000,
    imageUrl: null,
    reliability: 'demo',
  },
  {
    id: 'sty-tadj',
    name: 'Maison d’hôtes Exemple de Tadjourah (fictif)',
    destinationId: 'dst-tadjourah',
    providerId: 'prv-demo-hotel',
    category: 'guesthouse',
    summary: 'Maison d’hôtes fictive sur la rive nord.',
    address: null,
    amenities: ['Petit-déjeuner', 'Terrasse'],
    nightlyFromDjf: null,
    imageUrl: null,
    reliability: 'demo',
  },
  {
    id: 'sty-abbe',
    name: 'Campement Exemple du Lac Abbé (fictif)',
    destinationId: 'dst-abbe',
    providerId: 'prv-demo-hotel',
    category: 'camp',
    summary: 'Campement fictif proche des cheminées.',
    address: null,
    amenities: ['Dîner', 'Huttes traditionnelles'],
    nightlyFromDjf: null,
    imageUrl: null,
    reliability: 'demo',
  },
  {
    id: 'sty-day',
    name: 'Écolodge Exemple du Day (fictif)',
    destinationId: 'dst-day',
    providerId: 'prv-demo-hotel',
    category: 'lodge',
    summary: 'Lodge fictif en altitude.',
    address: null,
    amenities: ['Randonnées', 'Repas'],
    nightlyFromDjf: null,
    imageUrl: null,
    reliability: 'demo',
  },
];

export const demoSponsored: SponsoredPlacement[] = [
  {
    id: 'spn-1',
    providerId: 'prv-demo-agence',
    title: 'Saison des requins-baleines (exemple)',
    body: 'Annonce fictive : illustre l’emplacement réservé aux offres sponsorisées.',
    target: { kind: 'experience', id: 'exp-whale-shark' },
    reliability: 'demo',
  },
];
