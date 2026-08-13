/**
 * Mock fixtures — ported verbatim from the design prototype so the app renders
 * exactly the numbers the approved design shows.
 *
 * Deleted in step 2 and replaced by supabase/seed.sql. The shape of the data
 * matters: 47 coasters across 10 countries, and 62 rides covering only 36 of
 * them — 15 coasters ridden more than once. That gap is the product — credits
 * count distinct coasters, rides count rides — so any replacement seed must
 * keep it, along with the duplicate "Icon" / "ICON" pair the catalogue's
 * duplicate filter exists to surface.
 */

import type { Coaster, CoasterType, LeaderboardRow, Ride } from "@/lib/types";

/** Fixed ids, no randomness — the same reason supabase/seed.sql will use fixed UUIDs. */
export const MOCK_ENTHUSIAST_ID = "00000000-0000-4000-8000-000000000001";
export const MOCK_ADMIN_ID = "00000000-0000-4000-8000-000000000002";

export const MOCK_ENTHUSIAST_NAME = "Cass Ferreira";
export const MOCK_ADMIN_NAME = "Rowan Selby";

type CoasterSeed = [
  id: string,
  name: string,
  park: string,
  country: string,
  manufacturer: string,
  type: CoasterType,
];

const COASTER_SEED: CoasterSeed[] = [
  ["nemesis", "Nemesis", "Alton Towers", "United Kingdom", "Bolliger & Mabillard", "Steel"],
  ["wickerman", "Wicker Man", "Alton Towers", "United Kingdom", "Great Coasters International", "Wooden"],
  ["smiler", "The Smiler", "Alton Towers", "United Kingdom", "Gerstlauer", "Steel"],
  ["oblivion", "Oblivion", "Alton Towers", "United Kingdom", "Bolliger & Mabillard", "Steel"],
  ["icon", "Icon", "Blackpool Pleasure Beach", "United Kingdom", "Mack Rides", "Steel"],
  ["bigone", "The Big One", "Blackpool Pleasure Beach", "United Kingdom", "Arrow Dynamics", "Steel"],
  ["grandnational", "Grand National", "Blackpool Pleasure Beach", "United Kingdom", "Charles Paige", "Wooden"],
  ["iconalt", "ICON", "Blackpool Pleasure Beach", "United Kingdom", "Mack Rides", "Steel"],
  ["stealth", "Stealth", "Thorpe Park", "United Kingdom", "Intamin", "Steel"],
  ["inferno", "Nemesis Inferno", "Thorpe Park", "United Kingdom", "Bolliger & Mabillard", "Steel"],
  ["colossus", "Colossus", "Thorpe Park", "United Kingdom", "Intamin", "Steel"],
  ["megafobia", "Megafobia", "Oakwood Theme Park", "United Kingdom", "Custom Coasters International", "Wooden"],
  ["steelvengeance", "Steel Vengeance", "Cedar Point", "United States", "Rocky Mountain Construction", "Hybrid"],
  ["millenniumforce", "Millennium Force", "Cedar Point", "United States", "Intamin", "Steel"],
  ["maverick", "Maverick", "Cedar Point", "United States", "Intamin", "Steel"],
  ["topthrill2", "Top Thrill 2", "Cedar Point", "United States", "Zamperla", "Steel"],
  ["eltoro", "El Toro", "Six Flags Great Adventure", "United States", "Intamin", "Wooden"],
  ["fury325", "Fury 325", "Carowinds", "United States", "Bolliger & Mabillard", "Steel"],
  ["velocicoaster", "VelociCoaster", "Universal Islands of Adventure", "United States", "Intamin", "Steel"],
  ["irongwazi", "Iron Gwazi", "Busch Gardens Tampa Bay", "United States", "Rocky Mountain Construction", "Hybrid"],
  ["twistedcolossus", "Twisted Colossus", "Six Flags Magic Mountain", "United States", "Rocky Mountain Construction", "Hybrid"],
  ["x2", "X2", "Six Flags Magic Mountain", "United States", "Arrow Dynamics", "Steel"],
  ["voyage", "The Voyage", "Holiday World", "United States", "The Gravity Group", "Wooden"],
  ["phoenix", "Phoenix", "Knoebels", "United States", "Herbert Schmeck", "Wooden"],
  ["boulderdash", "Boulder Dash", "Lake Compounce", "United States", "Custom Coasters International", "Wooden"],
  ["taron", "Taron", "Phantasialand", "Germany", "Intamin", "Steel"],
  ["blackmamba", "Black Mamba", "Phantasialand", "Germany", "Bolliger & Mabillard", "Steel"],
  ["wodan", "Wodan Timbur Coaster", "Europa-Park", "Germany", "Great Coasters International", "Wooden"],
  ["bluefire", "Blue Fire Megacoaster", "Europa-Park", "Germany", "Mack Rides", "Steel"],
  ["silverstar", "Silver Star", "Europa-Park", "Germany", "Bolliger & Mabillard", "Steel"],
  ["karnan", "Schwur des Kärnan", "Hansa-Park", "Germany", "Gerstlauer", "Steel"],
  ["shambhala", "Shambhala", "PortAventura Park", "Spain", "Bolliger & Mabillard", "Steel"],
  ["redforce", "Red Force", "Ferrari Land", "Spain", "Intamin", "Steel"],
  ["dragonkhan", "Dragon Khan", "PortAventura Park", "Spain", "Bolliger & Mabillard", "Steel"],
  ["helix", "Helix", "Liseberg", "Sweden", "Mack Rides", "Steel"],
  ["balder", "Balder", "Liseberg", "Sweden", "Intamin", "Wooden"],
  ["valkyria", "Valkyria", "Liseberg", "Sweden", "Bolliger & Mabillard", "Steel"],
  ["baron1898", "Baron 1898", "Efteling", "Netherlands", "Bolliger & Mabillard", "Steel"],
  ["joris", "Joris en de Draak", "Efteling", "Netherlands", "Great Coasters International", "Wooden"],
  ["untamed", "Untamed", "Walibi Holland", "Netherlands", "Rocky Mountain Construction", "Hybrid"],
  ["piraten", "Piraten", "Djurs Sommerland", "Denmark", "Intamin", "Steel"],
  ["steeldragon", "Steel Dragon 2000", "Nagashima Spa Land", "Japan", "Morgan", "Steel"],
  ["eejanaika", "Eejanaika", "Fuji-Q Highland", "Japan", "S&S Worldwide", "Steel"],
  ["toutatis", "Toutatis", "Parc Astérix", "France", "Intamin", "Steel"],
  ["oziris", "OzIris", "Parc Astérix", "France", "Bolliger & Mabillard", "Steel"],
  ["leviathan", "Leviathan", "Canada's Wonderland", "Canada", "Bolliger & Mabillard", "Steel"],
  ["yukonstriker", "Yukon Striker", "Canada's Wonderland", "Canada", "Bolliger & Mabillard", "Steel"],
];

export const MOCK_COASTERS: Coaster[] = COASTER_SEED.map(
  ([id, name, park, country, manufacturer, type]) => ({
    id,
    name,
    park,
    country,
    manufacturer,
    type,
  }),
);

type RideSeed = [coasterId: string, riddenOn: string, note: string];

const RIDE_SEED: RideSeed[] = [
  ["nemesis", "2023-05-20", "First credit. Front row, Forbidden Valley in the rain."],
  ["oblivion", "2023-05-20", ""],
  ["stealth", "2023-06-24", "Nought to eighty in under two seconds."],
  ["inferno", "2023-06-24", ""],
  ["colossus", "2023-06-24", "Ten inversions. Never again in the heat."],
  ["nemesis", "2023-08-11", ""],
  ["wickerman", "2023-08-11", ""],
  ["smiler", "2023-08-12", "Fourteen inversions, one headache."],
  ["shambhala", "2023-09-02", "Ninety metres over the Costa Daurada."],
  ["dragonkhan", "2023-09-02", ""],
  ["icon", "2023-10-07", "First Mack multi-launch. Sold immediately."],
  ["bigone", "2023-10-07", "Rattly, but the view over the Irish Sea is worth it."],
  ["taron", "2024-03-16", "Klugheim in the mist. Best themed area anywhere."],
  ["blackmamba", "2024-03-16", ""],
  ["taron", "2024-03-17", ""],
  ["nemesis", "2024-04-06", "Back row on the retrack — smoother than expected."],
  ["icon", "2024-05-25", ""],
  ["grandnational", "2024-05-25", "Racing the other train the whole way. Lost."],
  ["helix", "2024-06-29", "Seven inversions down a hillside."],
  ["balder", "2024-06-29", "Wooden, but it rides like glass."],
  ["stealth", "2024-07-13", ""],
  ["inferno", "2024-07-13", "Zero-G roll over the water."],
  ["megafobia", "2024-08-03", "Worth the drive to Pembrokeshire."],
  ["nemesis", "2024-09-14", ""],
  ["wickerman", "2024-09-14", "Night ride with the fire lit."],
  ["wodan", "2024-11-02", "Third row, ejector over the turnaround."],
  ["bluefire", "2024-11-02", ""],
  ["silverstar", "2024-11-03", ""],
  ["nemesis", "2025-03-29", "Season opener. Walk-on all afternoon."],
  ["smiler", "2025-03-29", ""],
  ["baron1898", "2025-04-12", "The drop-track hold is pure theatre."],
  ["joris", "2025-04-12", "Red train. Won the race."],
  ["untamed", "2025-04-13", "RMC in a small park — not a wasted metre."],
  ["icon", "2025-05-03", "Back row airtime over the second launch."],
  ["bigone", "2025-05-03", ""],
  ["karnan", "2025-06-07", "Vertical lift, vertical drop, swing launch. Underrated."],
  ["piraten", "2025-06-08", ""],
  ["nemesis", "2025-07-19", ""],
  ["oblivion", "2025-07-19", "Held on the brink for a full three seconds."],
  ["shambhala", "2025-08-16", ""],
  ["redforce", "2025-08-16", "Fastest in Europe. Over in twenty seconds."],
  ["steelvengeance", "2025-09-20", "Twenty-seven airtime moments. I counted."],
  ["millenniumforce", "2025-09-20", "Overbanked turn at sunset."],
  ["maverick", "2025-09-21", ""],
  ["eltoro", "2025-09-24", "Ejector on every hill. Legs bruised."],
  ["fury325", "2025-09-27", "The treble out-and-back is relentless."],
  ["velocicoaster", "2025-09-30", "Mosasaurus roll. No notes."],
  ["irongwazi", "2025-10-01", ""],
  ["taron", "2025-10-25", "Night rides until close."],
  ["blackmamba", "2025-10-25", ""],
  ["taron", "2026-02-21", ""],
  ["wodan", "2026-02-22", ""],
  ["bluefire", "2026-02-22", "The launch still hits."],
  ["baron1898", "2026-03-28", ""],
  ["icon", "2026-04-18", ""],
  ["stealth", "2026-05-09", ""],
  ["toutatis", "2026-05-30", "Three launches and a proper Astérix pun."],
  ["oziris", "2026-05-30", ""],
  ["nemesis", "2026-06-13", "Row four. Still the best."],
  ["wickerman", "2026-06-13", ""],
  ["helix", "2026-07-04", ""],
  ["valkyria", "2026-07-04", ""],
];

export const MOCK_RIDES: Ride[] = RIDE_SEED.map(([coasterId, riddenOn, note], i) => ({
  id: `seed-ride-${String(i).padStart(3, "0")}`,
  user_id: MOCK_ENTHUSIAST_ID,
  coaster_id: coasterId,
  ridden_on: riddenOn,
  note: note === "" ? null : note,
}));

/**
 * Other members of the board. In step 2 these become real profiles with real
 * rides and the counts come out of the public_leaderboard view; here they are a
 * flat list because the point is the ranking UI, not the arithmetic.
 */
export const MOCK_LEADERBOARD: LeaderboardRow[] = [
  { display_name: "woodie_wendy", credit_count: 412 },
  { display_name: "Tomás Barreiro", credit_count: 388 },
  { display_name: "Airtime Annie", credit_count: 351 },
  { display_name: "gravity_gus", credit_count: 340 },
  { display_name: "Priya Raghavan", credit_count: 312 },
  { display_name: "Marcus Odell", credit_count: 287 },
  { display_name: "inversion_ines", credit_count: 264 },
  { display_name: "Hanne Lindqvist", credit_count: 241 },
  { display_name: "Dre Okonkwo", credit_count: 219 },
  { display_name: "clothoid_carl", credit_count: 198 },
  { display_name: "Fiona Achebe", credit_count: 176 },
  { display_name: "Ben Trescothick", credit_count: 152 },
  { display_name: "lift_hill_lena", credit_count: 141 },
  { display_name: "Yusuf Demir", credit_count: 128 },
];
