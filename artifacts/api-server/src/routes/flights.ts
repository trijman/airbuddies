import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, flightRegistrationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router: IRouter = Router();

const RegisterBody = z.object({
  deviceId: z.string().min(1).max(200),
  flightNumber: z.string().min(2).max(10),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  passengerName: z.string().max(100).optional(),
  seatNumber: z.string().max(6).regex(/^([1-9]|[1-5][0-9]|60)[A-K]$/i).optional(),
});

const UnregisterBody = z.object({
  deviceId: z.string().min(1).max(200),
  flightNumber: z.string().min(2).max(10),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ─── Airline IATA code → name mapping (common carriers) ───────────────────────
const AIRLINE_NAMES: Record<string, string> = {
  KL: "KLM Royal Dutch Airlines", LH: "Lufthansa", BA: "British Airways",
  AF: "Air France", EK: "Emirates", QR: "Qatar Airways", LX: "Swiss",
  AA: "American Airlines", UA: "United Airlines", DL: "Delta Air Lines",
  FR: "Ryanair", U2: "easyJet", VY: "Vueling", IB: "Iberia",
  TK: "Turkish Airlines", SQ: "Singapore Airlines", CX: "Cathay Pacific",
  NH: "ANA All Nippon Airways", JL: "Japan Airlines", EY: "Etihad Airways",
  OS: "Austrian Airlines", SK: "SAS Scandinavian Airlines", AY: "Finnair",
  TP: "TAP Air Portugal", AZ: "ITA Airways", WN: "Southwest Airlines",
  B6: "JetBlue Airways", AS: "Alaska Airlines", WS: "WestJet", AC: "Air Canada",
  QF: "Qantas", NZ: "Air New Zealand", TG: "Thai Airways",
  MH: "Malaysia Airlines", GA: "Garuda Indonesia", AI: "Air India",
  HV: "Transavia", HX: "Hong Kong Airlines", S4: "Azores Airlines",
  TO: "Transavia France", W6: "Wizz Air", PC: "Pegasus Airlines",
  VS: "Virgin Atlantic", ZB: "Monarch Airlines", BE: "Flybe",
  LS: "Jet2", MT: "Thomas Cook Airlines", BY: "TUI Airways",
  X3: "TUI fly Deutschland", OR: "TUI fly Netherlands",
  SN: "Brussels Airlines", LO: "LOT Polish Airlines", OK: "Czech Airlines",
  RO: "TAROM", FB: "Bulgaria Air", BT: "airBaltic",
  AH: "Air Algérie", AT: "Royal Air Maroc", ET: "Ethiopian Airlines",
  KQ: "Kenya Airways", MS: "EgyptAir", SA: "South African Airways",
  ME: "Middle East Airlines", GF: "Gulf Air", WY: "Oman Air",
  FZ: "flydubai", G9: "Air Arabia", XY: "flynas",
  CZ: "China Southern Airlines", CA: "Air China", MU: "China Eastern Airlines",
  HU: "Hainan Airlines", "3U": "Sichuan Airlines", OZ: "Asiana Airlines",
  KE: "Korean Air", CI: "China Airlines", BR: "EVA Air",
  VN: "Vietnam Airlines", PG: "Bangkok Airways", FD: "Thai AirAsia",
};

// ─── Aircraft ICAO/IATA code → readable name ──────────────────────────────────
const AIRCRAFT_NAMES: Record<string, string> = {
  A319: "Airbus A319", A320: "Airbus A320", A321: "Airbus A321",
  A20N: "Airbus A320neo", A21N: "Airbus A321neo", A319N: "Airbus A319neo",
  A332: "Airbus A330-200", A333: "Airbus A330-300", A338: "Airbus A330-800neo",
  A339: "Airbus A330-900neo", A342: "Airbus A340-200", A343: "Airbus A340-300",
  A345: "Airbus A340-500", A346: "Airbus A340-600",
  A359: "Airbus A350-900", A35K: "Airbus A350-1000",
  A388: "Airbus A380-800",
  B737: "Boeing 737-800", B38M: "Boeing 737 MAX 8", B39M: "Boeing 737 MAX 9",
  B738: "Boeing 737-800", B739: "Boeing 737-900",
  B744: "Boeing 747-400", B748: "Boeing 747-8",
  B752: "Boeing 757-200", B753: "Boeing 757-300",
  B762: "Boeing 767-200", B763: "Boeing 767-300", B764: "Boeing 767-400",
  B772: "Boeing 777-200", B77W: "Boeing 777-300ER", B773: "Boeing 777-300",
  B77L: "Boeing 777-200LR", B788: "Boeing 787-8", B789: "Boeing 787-9",
  B78X: "Boeing 787-10", E190: "Embraer E190", E195: "Embraer E195",
  AT75: "ATR 72-500", AT76: "ATR 72-600", DH8D: "Bombardier Q400",
  CRJ9: "Bombardier CRJ-900", E75L: "Embraer E175",
};

// ─── Derive basic info from flight number when no API key ──────────────────────
function inferFromFlightNumber(flightNumber: string, date: string) {
  const fn = flightNumber.toUpperCase().trim();
  const iataCode = fn.match(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])/)?.[1] ?? fn.slice(0, 2);
  const airline = AIRLINE_NAMES[iataCode] ?? null;

  return {
    flightNumber: fn,
    flightDate: date,
    airline,
    iataCode,
    origin: null,
    originCity: null,
    destination: null,
    destinationCity: null,
    scheduledDeparture: null,
    scheduledArrival: null,
    actualDeparture: null,
    actualArrival: null,
    status: "scheduled" as const,
    delayMinutes: null,
    aircraftType: null,
    aircraftName: null,
    terminal: null,
    gate: null,
    source: "inferred" as const,
  };
}

// ─── AviationStack flight lookup ───────────────────────────────────────────────
async function lookupAviationStack(flightNumber: string, date: string) {
  const apiKey = process.env["AVIATIONSTACK_API_KEY"];
  if (!apiKey) return null;

  const iata = flightNumber.replace(/\s/g, "").toUpperCase();
  const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(iata)}&flight_date=${date}&limit=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json() as {
      data?: Array<{
        flight_status?: string;
        departure?: { iata?: string; airport?: string; terminal?: string; gate?: string; scheduled?: string; actual?: string; delay?: number };
        arrival?: { iata?: string; airport?: string; terminal?: string; scheduled?: string; actual?: string };
        airline?: { name?: string; iata?: string };
        aircraft?: { iata?: string };
      }>;
    };
    const f = data?.data?.[0];
    if (!f) return null;

    const acType = f.aircraft?.iata?.toUpperCase() ?? null;
    return {
      flightNumber: iata,
      flightDate: date,
      airline: f.airline?.name ?? AIRLINE_NAMES[f.airline?.iata ?? ""] ?? null,
      iataCode: f.airline?.iata ?? iata.slice(0, 2),
      origin: f.departure?.iata ?? null,
      originCity: f.departure?.airport ?? null,
      destination: f.arrival?.iata ?? null,
      destinationCity: f.arrival?.airport ?? null,
      scheduledDeparture: f.departure?.scheduled ?? null,
      scheduledArrival: f.arrival?.scheduled ?? null,
      actualDeparture: f.departure?.actual ?? null,
      actualArrival: f.arrival?.actual ?? null,
      status: (f.flight_status ?? "scheduled") as string,
      delayMinutes: f.departure?.delay ?? null,
      aircraftType: acType,
      aircraftName: acType ? (AIRCRAFT_NAMES[acType] ?? acType) : null,
      terminal: f.departure?.terminal ?? null,
      gate: f.departure?.gate ?? null,
      source: "aviationstack" as const,
    };
  } catch {
    return null;
  }
}

// ─── AirLabs fallback ──────────────────────────────────────────────────────────
async function lookupAirLabs(flightNumber: string) {
  const apiKey = process.env["AIRLABS_API_KEY"];
  if (!apiKey) return null;

  const iata = flightNumber.replace(/\s/g, "").toUpperCase();
  const url = `https://airlabs.co/api/v9/flight?api_key=${apiKey}&flight_iata=${encodeURIComponent(iata)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json() as {
      response?: {
        flight_iata?: string; dep_iata?: string; dep_name?: string; arr_iata?: string; arr_name?: string;
        dep_time_utc?: string; arr_time_utc?: string; dep_time?: string; arr_time?: string;
        status?: string; delayed?: number; aircraft_icao?: string; airline_iata?: string; airline_name?: string;
        dep_terminal?: string; dep_gate?: string;
      };
    };
    const f = data?.response;
    if (!f) return null;

    const acType = f.aircraft_icao?.toUpperCase() ?? null;
    return {
      flightNumber: iata,
      flightDate: f.dep_time?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      airline: f.airline_name ?? AIRLINE_NAMES[f.airline_iata ?? ""] ?? null,
      iataCode: f.airline_iata ?? iata.slice(0, 2),
      origin: f.dep_iata ?? null,
      originCity: f.dep_name ?? null,
      destination: f.arr_iata ?? null,
      destinationCity: f.arr_name ?? null,
      scheduledDeparture: f.dep_time_utc ?? null,
      scheduledArrival: f.arr_time_utc ?? null,
      actualDeparture: null,
      actualArrival: null,
      status: f.status ?? "scheduled",
      delayMinutes: f.delayed ?? null,
      aircraftType: acType,
      aircraftName: acType ? (AIRCRAFT_NAMES[acType] ?? acType) : null,
      terminal: f.dep_terminal ?? null,
      gate: f.dep_gate ?? null,
      source: "airlabs" as const,
    };
  } catch {
    return null;
  }
}

// ─── GET /api/flights/search ───────────────────────────────────────────────────
router.get("/flights/search", async (req, res) => {
  const flightNumber = (req.query.flight as string ?? "").trim().toUpperCase();
  const date = (req.query.date as string ?? new Date().toISOString().slice(0, 10));

  if (!flightNumber || flightNumber.length < 2) {
    res.status(400).json({ error: "flight query parameter required (min 2 chars)" });
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  const result =
    (await lookupAviationStack(flightNumber, date)) ??
    (await lookupAirLabs(flightNumber)) ??
    inferFromFlightNumber(flightNumber, date);

  res.json(result);
});

// ─── POST /api/flights/register ───────────────────────────────────────────────
router.post("/flights/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  const { deviceId, flightNumber, flightDate, passengerName, seatNumber } = parsed.data;
  const fn = flightNumber.toUpperCase();
  const seat = seatNumber?.toUpperCase() ?? null;

  await db
    .delete(flightRegistrationsTable)
    .where(
      and(
        eq(flightRegistrationsTable.deviceId, deviceId),
        eq(flightRegistrationsTable.flightNumber, fn),
        eq(flightRegistrationsTable.flightDate, flightDate)
      )
    );

  const [registration] = await db
    .insert(flightRegistrationsTable)
    .values({ deviceId, flightNumber: fn, flightDate, passengerName, seatNumber: seat })
    .returning();

  res.status(201).json(registration);
});

// ─── DELETE /api/flights/unregister ───────────────────────────────────────────
router.delete("/flights/unregister", async (req, res) => {
  const parsed = UnregisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { deviceId, flightNumber, flightDate } = parsed.data;
  await db
    .delete(flightRegistrationsTable)
    .where(
      and(
        eq(flightRegistrationsTable.deviceId, deviceId),
        eq(flightRegistrationsTable.flightNumber, flightNumber.toUpperCase()),
        eq(flightRegistrationsTable.flightDate, flightDate)
      )
    );

  res.json({ success: true });
});

// ─── GET /api/flights/:flightNumber/seat-check ────────────────────────────────
router.get("/flights/:flightNumber/seat-check", async (req, res) => {
  const flightNumber = req.params.flightNumber.toUpperCase();
  const { date, seat, deviceId } = req.query as { date?: string; seat?: string; deviceId?: string };

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !seat || !deviceId) {
    res.status(400).json({ error: "Missing or invalid date, seat, or deviceId" });
    return;
  }

  const rows = await db
    .select()
    .from(flightRegistrationsTable)
    .where(
      and(
        eq(flightRegistrationsTable.flightNumber, flightNumber),
        eq(flightRegistrationsTable.flightDate, date),
        eq(flightRegistrationsTable.seatNumber, seat.toUpperCase())
      )
    );

  const taken = rows.some((r) => r.deviceId !== deviceId);
  res.json({ taken });
});

// ─── GET /api/flights/:flightNumber/passengers ────────────────────────────────
router.get("/flights/:flightNumber/passengers", async (req, res) => {
  const flightNumber = req.params.flightNumber.toUpperCase();
  const date = req.query.date as string;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Missing or invalid date query parameter (YYYY-MM-DD)" });
    return;
  }

  const registrations = await db
    .select()
    .from(flightRegistrationsTable)
    .where(
      and(
        eq(flightRegistrationsTable.flightNumber, flightNumber),
        eq(flightRegistrationsTable.flightDate, date)
      )
    );

  const names = registrations
    .filter((r) => r.passengerName)
    .map((r) => r.passengerName!)
    .slice(0, 5);

  res.json({
    flightNumber,
    flightDate: date,
    count: registrations.length,
    names,
  });
});

// ─── In-memory rating store (pending DB migration) ────────────────────────────
const flightRatings: Record<string, { deviceId: string; rating: number; ratedAt: string }[]> = {};

const RatingBody = z.object({
  deviceId: z.string().min(1).max(200),
  flightNumber: z.string().min(2).max(10),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rating: z.number().int().min(1).max(5),
});

// ─── POST /api/flights/rating ─────────────────────────────────────────────────
router.post("/flights/rating", async (req, res) => {
  const parsed = RatingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const { deviceId, flightNumber, flightDate, rating } = parsed.data;
  const key = `${flightNumber}_${flightDate}`;
  if (!flightRatings[key]) flightRatings[key] = [];
  // Upsert: replace existing rating from same device
  const idx = flightRatings[key].findIndex((r) => r.deviceId === deviceId);
  const entry = { deviceId, rating, ratedAt: new Date().toISOString() };
  if (idx >= 0) flightRatings[key][idx] = entry;
  else flightRatings[key].push(entry);
  const all = flightRatings[key];
  const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
  res.json({ success: true, totalRatings: all.length, averageRating: Math.round(avg * 10) / 10 });
});

// ─── GET /api/flights/ratings/:flightNumber ───────────────────────────────────
router.get("/flights/ratings/:flightNumber", (req, res) => {
  const fn = req.params.flightNumber.toUpperCase();
  const date = req.query.date as string;
  const key = `${fn}_${date}`;
  const all = flightRatings[key] ?? [];
  const avg = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : null;
  res.json({ flightNumber: fn, flightDate: date, totalRatings: all.length, averageRating: avg ? Math.round(avg * 10) / 10 : null });
});

export default router;
