import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

// ─── Airline branding ─────────────────────────────────────────────────────────
interface AirlineBrand {
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}

const AIRLINE_BRANDS: Record<string, AirlineBrand> = {
  KL: { name: "KLM Royal Dutch Airlines", shortName: "KLM", primaryColor: "#00a1de", secondaryColor: "#003f72", textColor: "#fff" },
  HV: { name: "Transavia", shortName: "Transavia", primaryColor: "#00c800", secondaryColor: "#005a00", textColor: "#fff" },
  TO: { name: "Transavia France", shortName: "Transavia", primaryColor: "#00c800", secondaryColor: "#005a00", textColor: "#fff" },
  OR: { name: "TUI fly Netherlands", shortName: "TUI", primaryColor: "#e2001a", secondaryColor: "#8b0010", textColor: "#fff" },
  LH: { name: "Lufthansa", shortName: "Lufthansa", primaryColor: "#05164d", secondaryColor: "#ffd700", textColor: "#fff" },
  BA: { name: "British Airways", shortName: "British Airways", primaryColor: "#075aaa", secondaryColor: "#eb2226", textColor: "#fff" },
  AF: { name: "Air France", shortName: "Air France", primaryColor: "#002157", secondaryColor: "#d81e3f", textColor: "#fff" },
  EK: { name: "Emirates", shortName: "Emirates", primaryColor: "#c8102e", secondaryColor: "#d4af37", textColor: "#fff" },
  QR: { name: "Qatar Airways", shortName: "Qatar", primaryColor: "#5c0632", secondaryColor: "#9d813e", textColor: "#fff" },
  LX: { name: "Swiss", shortName: "SWISS", primaryColor: "#e30613", secondaryColor: "#333", textColor: "#fff" },
  SK: { name: "SAS", shortName: "SAS", primaryColor: "#005daa", secondaryColor: "#003366", textColor: "#fff" },
  AY: { name: "Finnair", shortName: "Finnair", primaryColor: "#1d6bae", secondaryColor: "#e31e2d", textColor: "#fff" },
  TK: { name: "Turkish Airlines", shortName: "Turkish", primaryColor: "#c8102e", secondaryColor: "#1a1a2e", textColor: "#fff" },
  FR: { name: "Ryanair", shortName: "Ryanair", primaryColor: "#073590", secondaryColor: "#f5a623", textColor: "#fff" },
  U2: { name: "easyJet", shortName: "easyJet", primaryColor: "#ff6600", secondaryColor: "#1a1a1a", textColor: "#fff" },
  W6: { name: "Wizz Air", shortName: "Wizz Air", primaryColor: "#c6007e", secondaryColor: "#4b0f6e", textColor: "#fff" },
  PC: { name: "Pegasus Airlines", shortName: "Pegasus", primaryColor: "#f0780a", secondaryColor: "#1c3f6e", textColor: "#fff" },
  SN: { name: "Brussels Airlines", shortName: "Brussels", primaryColor: "#003087", secondaryColor: "#c8102e", textColor: "#fff" },
  LO: { name: "LOT Polish Airlines", shortName: "LOT", primaryColor: "#003087", secondaryColor: "#d4af37", textColor: "#fff" },
  VY: { name: "Vueling", shortName: "Vueling", primaryColor: "#f9c005", secondaryColor: "#333", textColor: "#222" },
  IB: { name: "Iberia", shortName: "Iberia", primaryColor: "#c8102e", secondaryColor: "#d4af37", textColor: "#fff" },
  TP: { name: "TAP Air Portugal", shortName: "TAP", primaryColor: "#007749", secondaryColor: "#c8102e", textColor: "#fff" },
  OS: { name: "Austrian Airlines", shortName: "Austrian", primaryColor: "#c8102e", secondaryColor: "#333", textColor: "#fff" },
  SQ: { name: "Singapore Airlines", shortName: "Singapore", primaryColor: "#1a1a2e", secondaryColor: "#d4af37", textColor: "#fff" },
  EY: { name: "Etihad Airways", shortName: "Etihad", primaryColor: "#bd8b13", secondaryColor: "#002147", textColor: "#fff" },
  CX: { name: "Cathay Pacific", shortName: "Cathay", primaryColor: "#006564", secondaryColor: "#4b4b4b", textColor: "#fff" },
  AA: { name: "American Airlines", shortName: "American", primaryColor: "#0078d2", secondaryColor: "#c8102e", textColor: "#fff" },
  UA: { name: "United Airlines", shortName: "United", primaryColor: "#002244", secondaryColor: "#0066cc", textColor: "#fff" },
  DL: { name: "Delta Air Lines", shortName: "Delta", primaryColor: "#003366", secondaryColor: "#c8102e", textColor: "#fff" },
  VS: { name: "Virgin Atlantic", shortName: "Virgin", primaryColor: "#c8102e", secondaryColor: "#820000", textColor: "#fff" },
  QF: { name: "Qantas", shortName: "Qantas", primaryColor: "#c8102e", secondaryColor: "#ff6600", textColor: "#fff" },
  ET: { name: "Ethiopian Airlines", shortName: "Ethiopian", primaryColor: "#006940", secondaryColor: "#ffd700", textColor: "#fff" },
  BY: { name: "TUI Airways", shortName: "TUI", primaryColor: "#e2001a", secondaryColor: "#333", textColor: "#fff" },
  X3: { name: "TUI fly Deutschland", shortName: "TUI", primaryColor: "#e2001a", secondaryColor: "#333", textColor: "#fff" },
};

const DEFAULT_BRAND: AirlineBrand = {
  name: "Airline",
  shortName: "Airline",
  primaryColor: "#0ea5e9",
  secondaryColor: "#0369a1",
  textColor: "#fff",
};

function pickActiveFlight(flights: RegisteredFlight[]): RegisteredFlight | null {
  if (!flights.length) return null;
  const now = new Date();
  const sorted = [...flights].sort((a, b) => {
    const aT = a.flightInfo?.scheduledDeparture ?? `${a.flightDate}T23:59:59`;
    const bT = b.flightInfo?.scheduledDeparture ?? `${b.flightDate}T23:59:59`;
    return aT.localeCompare(bT);
  });
  return sorted.find((f) => new Date(f.flightInfo?.scheduledDeparture ?? `${f.flightDate}T23:59:59`) > now)
    ?? sorted[sorted.length - 1]
    ?? null;
}

function getAirlineBrand(iataCode?: string | null): AirlineBrand {
  if (!iataCode) return DEFAULT_BRAND;
  return AIRLINE_BRANDS[iataCode.toUpperCase()] ?? DEFAULT_BRAND;
}

// ─── Flight info types ────────────────────────────────────────────────────────
interface FlightInfo {
  flightNumber: string;
  flightDate: string;
  airline: string | null;
  iataCode: string;
  origin: string | null;
  originCity: string | null;
  destination: string | null;
  destinationCity: string | null;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  actualDeparture: string | null;
  actualArrival: string | null;
  status: string;
  delayMinutes: number | null;
  aircraftType: string | null;
  aircraftName: string | null;
  terminal: string | null;
  gate: string | null;
  source: "aviationstack" | "airlabs" | "inferred";
}

interface RegisteredFlight {
  flightNumber: string;
  flightDate: string;
  passengerName?: string;
  registeredAt: string;
  flightInfo?: FlightInfo;
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      const m = iso.match(/\d{2}:\d{2}/);
      return m ? m[0] : null;
    }
    return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

function cleanCityName(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .replace(/International Airport/i, "")
    .replace(/Airport/i, "")
    .replace(/\bAirport\b/i, "")
    .trim()
    .replace(/\s+$/, "")
    .replace(/,$/, "");
}

type Section = "vlucht" | "menu" | "dutyfree" | "bestemming" | "games";

// ─── Placeholder content per airline ─────────────────────────────────────────
const DEMO_MENU: Record<string, typeof KLM_MENU | undefined> = {};
const KLM_MENU = [
  { id: "1", category: "Voorgerecht", name: "Hollandse garnalenkroket", desc: "Met mosterd-dille saus", allergens: "Gluten, Schaaldieren" },
  { id: "2", category: "Hoofdgerecht", name: "Kip in kruidensaus", desc: "Met rijst en groenten", allergens: "Gluten" },
  { id: "3", category: "Hoofdgerecht", name: "Pasta Primavera (V)", desc: "Seizoensgroenten, pesto", allergens: "Gluten, Lactose" },
  { id: "4", category: "Hoofdgerecht", name: "Zalm met citroen", desc: "Met aardappelpuree en sperziebonen", allergens: "Vis" },
  { id: "5", category: "Dessert", name: "Stroopwafel cheesecake", desc: "Met gekarameliseerde room", allergens: "Gluten, Lactose, Eieren" },
  { id: "6", category: "Dranken", name: "Dutch Craft Beer", desc: "Heineken 0.0 of Heineken", allergens: "Gluten" },
];
const TRANSAVIA_MENU = [
  { id: "1", category: "Snacks", name: "Kaasbroodje", desc: "Warm geroosterd met cheddar", allergens: "Gluten, Lactose" },
  { id: "2", category: "Snacks", name: "Wraps met kip", desc: "Kip, sla, tomaat, mayonaise", allergens: "Gluten, Eieren" },
  { id: "3", category: "Zoet", name: "Kit Kat", desc: "Chocolade wafer", allergens: "Gluten, Lactose" },
  { id: "4", category: "Zoet", name: "Stroopwafel", desc: "Hollandse klassieker", allergens: "Gluten" },
  { id: "5", category: "Dranken", name: "Heineken 0.0", desc: "Alcoholvrij bier", allergens: "Gluten" },
  { id: "6", category: "Dranken", name: "Spa blauw 33cl", desc: "Bruisend bronwater", allergens: "–" },
];

DEMO_MENU["KL"] = KLM_MENU;
DEMO_MENU["HV"] = TRANSAVIA_MENU;
DEMO_MENU["TO"] = TRANSAVIA_MENU;

const GENERIC_MENU = [
  { id: "1", category: "Hoofdgerecht", name: "Kip met rijst", desc: "Klassiek vliegtuigmaaltijd", allergens: "Gluten" },
  { id: "2", category: "Hoofdgerecht", name: "Pasta (V)", desc: "Vegetarische optie", allergens: "Gluten, Lactose" },
  { id: "3", category: "Dessert", name: "Chocolade brownie", desc: "Huisgemaakt recept", allergens: "Gluten, Lactose, Eieren" },
  { id: "4", category: "Dranken", name: "Fris of water", desc: "Cola, Sprite, Fanta, water", allergens: "–" },
];

const DUTY_FREE = [
  { id: "1", brand: "Chanel", name: "N°5 Eau de Parfum 50ml", price: "€89", tag: "Bestseller", emoji: "✨" },
  { id: "2", brand: "Johnnie Walker", name: "Black Label 1L", price: "€28", tag: "Duty-free prijs", emoji: "🥃" },
  { id: "3", brand: "Rituals", name: "The Ritual of Sakura Set", price: "€35", tag: "Nieuw", emoji: "🌸" },
  { id: "4", brand: "Lindt", name: "Chocolade assortiment 200g", price: "€12", tag: "Populair", emoji: "🍫" },
];

const GAMES = [
  { id: "trivia", icon: "🧠", name: "Vluchttrivia", desc: "Test je kennis over reisbestemmingen", color: "#6366f1" },
  { id: "wordgame", icon: "📝", name: "Woordketen", desc: "Gezelschapsspel voor de hele rij", color: "#0ea5e9" },
  { id: "sudoku", icon: "🔢", name: "Sudoku", desc: "Klassiek sudoku · 3 moeilijkheden", color: "#22c55e" },
  { id: "map", icon: "🗺️", name: "Raden waar we zijn", desc: "Raad de locatie op de kaart", color: "#f59e0b" },
];

export default function AirlineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, profile, createGroup } = useApp();
  const [activeSection, setActiveSection] = useState<Section>("vlucht");
  const [orderItems, setOrderItems] = useState<string[]>([]);
  const [activeFlight, setActiveFlight] = useState<RegisteredFlight | null>(null);
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const flightConv = activeFlight
    ? conversations.find((c) => c.flightNumber === activeFlight.flightNumber)
    : null;

  const handleOpenFlightChat = () => {
    if (!activeFlight) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (flightConv) {
      router.push(`/chat/${flightConv.id}`);
    } else {
      const conv = createGroup(`${activeFlight.flightNumber} ✈`, [], {
        isPrivate: false,
        flightNumber: activeFlight.flightNumber,
      });
      router.push(`/chat/${conv.id}`);
    }
  };

  // ─── Load active flight ───────────────────────────────────────────────────
  const loadActiveFlight = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("my_flights_v1");
      if (!stored) { setLoading(false); return; }

      const flights: RegisteredFlight[] = JSON.parse(stored);
      const todayFlight = pickActiveFlight(flights);

      if (!todayFlight) { setActiveFlight(null); setLoading(false); return; }

      setActiveFlight(todayFlight);

      // Use cached flightInfo if available, otherwise fetch
      if (todayFlight.flightInfo) {
        setFlightInfo(todayFlight.flightInfo);
        setLoading(false);
      } else {
        try {
          const res = await fetch(
            `${API_BASE}/flights/search?flight=${encodeURIComponent(todayFlight.flightNumber)}&date=${todayFlight.flightDate}`
          );
          if (res.ok) {
            const data: FlightInfo = await res.json();
            setFlightInfo(data);
          }
        } catch { /* use inferred data */ }
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadActiveFlight();
    }, [loadActiveFlight])
  );

  const brand = getAirlineBrand(flightInfo?.iataCode ?? activeFlight?.flightNumber?.slice(0, 2));
  const menuItems = DEMO_MENU[flightInfo?.iataCode?.toUpperCase() ?? ""] ?? GENERIC_MENU;

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: "vlucht", label: "Vlucht", icon: "airplane-outline" },
    { id: "menu", label: "Menu", icon: "restaurant-outline" },
    { id: "dutyfree", label: "Winkelen", icon: "bag-outline" },
    { id: "bestemming", label: "Bestemming", icon: "map-outline" },
    { id: "games", label: "Games", icon: "game-controller-outline" },
  ];

  const toggleOrder = (id: string) => {
    Haptics.selectionAsync();
    setOrderItems((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  // ─── No flight state ───────────────────────────────────────────────────────
  if (!loading && !activeFlight) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.headerBrandText, { color: colors.primary }]}>Airline</Text>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Vluchtinformatie</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>✈️</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Geen actieve vlucht</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Meld je aan voor een vlucht om hier de airline-informatie te zien: menu, duty-free, games en meer.
          </Text>
          <Pressable
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/my-flights")}
          >
            <Ionicons name="airplane" size={18} color={colors.primaryForeground} />
            <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>Vlucht aanmelden</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const depTime = formatTime(flightInfo?.scheduledDeparture ?? null);
  const arrTime = formatTime(flightInfo?.scheduledArrival ?? null);
  const originCity = cleanCityName(flightInfo?.originCity ?? null) ?? flightInfo?.origin;
  const destCity = cleanCityName(flightInfo?.destinationCity ?? null) ?? flightInfo?.destination;
  const isLive = flightInfo?.source !== "inferred";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header with airline branding ── */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerBrandRow}>
            <View style={[styles.brandDot, { backgroundColor: brand.primaryColor }]} />
            <View>
              <Text style={[styles.headerBrandText, { color: brand.primaryColor }]}>
                {brand.shortName}
              </Text>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                {brand.name !== brand.shortName ? brand.name : "Airlines"}
              </Text>
            </View>
          </View>
          <View style={[styles.flightPill, { backgroundColor: brand.primaryColor + "18" }]}>
            <Ionicons name="airplane" size={12} color={brand.primaryColor} />
            <Text style={[styles.flightPillText, { color: brand.primaryColor }]}>
              {activeFlight?.flightNumber}
            </Text>
            {!isLive && (
              <Ionicons name="cloud-offline-outline" size={11} color={brand.primaryColor + "88"} />
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionPicker}
          style={styles.sectionPickerWrap}
        >
          {sections.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => { Haptics.selectionAsync(); setActiveSection(s.id); }}
              style={[
                styles.sectionBtn,
                activeSection === s.id && { borderBottomColor: brand.primaryColor, borderBottomWidth: 2 },
              ]}
            >
              <Ionicons
                name={s.icon as any}
                size={16}
                color={activeSection === s.id ? brand.primaryColor : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.sectionBtnText,
                  { color: activeSection === s.id ? brand.primaryColor : colors.mutedForeground },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Vlucht tab ── */}
        {activeSection === "vlucht" && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.flightCard, { backgroundColor: brand.primaryColor, shadowColor: brand.primaryColor }]}>
              {/* Airline name stripe */}
              <View style={[styles.flightCardAirlineRow]}>
                <Text style={[styles.flightCardAirlineName, { color: brand.textColor + "cc" }]}>
                  {brand.name}
                </Text>
                {flightInfo?.status && (
                  <View style={[styles.statusBadge, { backgroundColor: brand.secondaryColor + "88" }]}>
                    <Text style={styles.statusBadgeText}>
                      {flightInfo.status === "landed" ? "Geland" :
                       flightInfo.status === "active" ? "Onderweg" :
                       flightInfo.status === "delayed" ? `+${flightInfo.delayMinutes ?? "?"}m` :
                       flightInfo.status === "cancelled" ? "Geannuleerd" :
                       "Op tijd"}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.flightRoute}>
                <View style={styles.flightPort}>
                  <Text style={[styles.flightPortCode, { color: brand.textColor }]}>
                    {flightInfo?.origin ?? activeFlight?.flightNumber?.slice(0, 3) ?? "—"}
                  </Text>
                  {originCity && (
                    <Text style={[styles.flightPortCity, { color: brand.textColor + "aa" }]} numberOfLines={1}>
                      {originCity}
                    </Text>
                  )}
                  {depTime && (
                    <Text style={[styles.flightTime, { color: brand.textColor }]}>{depTime}</Text>
                  )}
                </View>
                <View style={styles.flightMiddle}>
                  <View style={styles.flightLine}>
                    <View style={[styles.flightLineDot, { backgroundColor: brand.textColor }]} />
                    <View style={[styles.flightLineBar, { flex: 1, backgroundColor: brand.textColor + "44" }]} />
                    <Ionicons name="airplane" size={20} color={brand.textColor} />
                    <View style={[styles.flightLineBar, { flex: 1, backgroundColor: brand.textColor + "44" }]} />
                    <View style={[styles.flightLineDot, { backgroundColor: brand.textColor }]} />
                  </View>
                  {flightInfo?.aircraftName && (
                    <Text style={[styles.flightDuration, { color: brand.textColor + "bb" }]}>
                      {flightInfo.aircraftName}
                    </Text>
                  )}
                </View>
                <View style={[styles.flightPort, { alignItems: "flex-end" }]}>
                  <Text style={[styles.flightPortCode, { color: brand.textColor }]}>
                    {flightInfo?.destination ?? "—"}
                  </Text>
                  {destCity && (
                    <Text style={[styles.flightPortCity, { color: brand.textColor + "aa" }]} numberOfLines={1}>
                      {destCity}
                    </Text>
                  )}
                  {arrTime && (
                    <Text style={[styles.flightTime, { color: brand.textColor }]}>{arrTime}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.infoGrid}>
              {[
                { label: "Vliegtuig", value: flightInfo?.aircraftName ?? "–", icon: "airplane-outline" },
                { label: "Gate", value: flightInfo?.gate ?? "–", icon: "location-outline" },
                { label: "Terminal", value: flightInfo?.terminal ?? "–", icon: "business-outline" },
                { label: "Status", value: flightInfo?.status === "landed" ? "Geland" : flightInfo?.status === "active" ? "Onderweg" : "Gepland", icon: "radio-outline" },
                { label: "Vertraging", value: (flightInfo?.delayMinutes ?? 0) > 0 ? `+${flightInfo?.delayMinutes} min` : "Geen", icon: "time-outline" },
                { label: "Jouw stoel", value: profile?.seatNumber ?? "–", icon: "person-outline" },
              ].map((item) => (
                <View
                  key={item.label}
                  style={[styles.infoTile, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons name={item.icon as any} size={18} color={brand.primaryColor} />
                  <Text style={[styles.infoTileLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                  <Text style={[styles.infoTileValue, { color: colors.foreground }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            {!isLive && (
              <View style={[styles.noLiveBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="cloud-offline-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.noLiveText, { color: colors.mutedForeground }]}>
                  Geen live vluchtdata beschikbaar. Informatie kan afwijken van de werkelijkheid.
                </Text>
              </View>
            )}

            {activeFlight && (
              <Pressable
                style={[styles.chatCta, { backgroundColor: brand.primaryColor }]}
                onPress={handleOpenFlightChat}
              >
                <Ionicons name="chatbubbles" size={20} color={brand.textColor} />
                <Text style={[styles.chatCtaText, { color: brand.textColor }]}>
                  Open vluchtchat{flightConv ? ` · ${flightConv.participantIds.length} passagiers` : ""}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={brand.textColor + "99"} />
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* ── Menu tab ── */}
        {activeSection === "menu" && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.menuNote, { backgroundColor: brand.primaryColor + "12", borderColor: brand.primaryColor + "33" }]}>
              <Ionicons name="restaurant-outline" size={16} color={brand.primaryColor} />
              <Text style={[styles.menuNoteText, { color: brand.primaryColor }]}>
                {brand.shortName} maaltijdservice · Dienst start na kruishoogte
              </Text>
            </View>
            {["Voorgerecht", "Hoofdgerecht", "Snacks", "Zoet", "Dessert", "Dranken"].map((cat) => {
              const items = menuItems.filter((m) => m.category === cat);
              if (!items.length) return null;
              return (
                <View key={cat} style={styles.menuCategory}>
                  <Text style={[styles.menuCategoryTitle, { color: colors.mutedForeground }]}>
                    {cat.toUpperCase()}
                  </Text>
                  {items.map((item) => {
                    const selected = orderItems.includes(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => toggleOrder(item.id)}
                        style={[
                          styles.menuItem,
                          {
                            backgroundColor: selected ? brand.primaryColor + "12" : colors.card,
                            borderColor: selected ? brand.primaryColor : colors.border,
                            borderWidth: selected ? 1.5 : 1,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={[styles.menuItemName, { color: colors.foreground }]}>{item.name}</Text>
                          <Text style={[styles.menuItemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                          <Text style={[styles.menuItemAllergens, { color: colors.mutedForeground }]}>
                            ⚠ {item.allergens}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.menuCheckbox,
                            {
                              backgroundColor: selected ? brand.primaryColor : "transparent",
                              borderColor: selected ? brand.primaryColor : colors.border,
                            },
                          ]}
                        >
                          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            {orderItems.length > 0 && (
              <Pressable
                style={[styles.orderBtn, { backgroundColor: brand.primaryColor }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setOrderItems([]);
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color={brand.textColor} />
                <Text style={[styles.orderBtnText, { color: brand.textColor }]}>
                  {orderItems.length} keuze{orderItems.length > 1 ? "s" : ""} vastgelegd
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* ── Duty-free tab ── */}
        {activeSection === "dutyfree" && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 10 }}>
            <View style={[styles.menuNote, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b44" }]}>
              <Ionicons name="bag-handle-outline" size={16} color="#f59e0b" />
              <Text style={[styles.menuNoteText, { color: "#b45309" }]}>
                Bestel voor aankomst · Betalen per pin of creditcard
              </Text>
            </View>
            {DUTY_FREE.map((item, idx) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(idx * 50).duration(250)}>
                <View style={[styles.dutyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.dutyEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.dutyTagRow}>
                      <View style={[styles.dutyTag, { backgroundColor: brand.primaryColor + "18" }]}>
                        <Text style={[styles.dutyTagText, { color: brand.primaryColor }]}>{item.tag}</Text>
                      </View>
                    </View>
                    <Text style={[styles.dutyBrand, { color: colors.mutedForeground }]}>{item.brand}</Text>
                    <Text style={[styles.dutyName, { color: colors.foreground }]}>{item.name}</Text>
                  </View>
                  <View style={styles.dutyRight}>
                    <Text style={[styles.dutyPrice, { color: colors.foreground }]}>{item.price}</Text>
                    <Pressable
                      style={[styles.dutyAddBtn, { backgroundColor: brand.primaryColor }]}
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    >
                      <Ionicons name="add" size={16} color={brand.textColor} />
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* ── Bestemming tab ── */}
        {activeSection === "bestemming" && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 10 }}>
            <View style={[styles.destHeader, { backgroundColor: brand.primaryColor, shadowColor: brand.primaryColor }]}>
              <Text style={[styles.destCity, { color: brand.textColor }]}>
                {destCity ?? flightInfo?.destination ?? "Bestemming"}
              </Text>
              {flightInfo?.destination && (
                <Text style={[styles.destCountry, { color: brand.textColor + "cc" }]}>
                  {flightInfo.destination}
                </Text>
              )}
              <Text style={[styles.destTagline, { color: brand.textColor + "99" }]}>
                Vlucht {activeFlight?.flightNumber} · {brand.shortName}
              </Text>
            </View>
            {[
              { id: "1", icon: "✈️", title: "Vlucht", desc: `${activeFlight?.flightNumber} · ${flightInfo?.origin ?? "–"} → ${flightInfo?.destination ?? "–"}` },
              { id: "2", icon: "🕐", title: "Aankomsttijd", desc: arrTime ? `Verwacht: ${arrTime} lokale tijd` : "Nog niet bekend" },
              { id: "3", icon: "🛂", title: "Instapkaart", desc: "Zorg dat je instapkaart klaarstaat voor landing" },
              { id: "4", icon: "🧳", title: "Bagage", desc: "Volg je bagage via de airline-app na landing" },
              { id: "5", icon: "💡", title: "Tip", desc: "Welkom aan boord! Geniet van je vlucht." },
            ].map((tip, idx) => (
              <Animated.View key={tip.id} entering={FadeInDown.delay(idx * 60).duration(250)}>
                <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.tipEmoji}>{tip.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tipTitle, { color: colors.foreground }]}>{tip.title}</Text>
                    <Text style={[styles.tipDesc, { color: colors.mutedForeground }]}>{tip.desc}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* ── Games tab ── */}
        {activeSection === "games" && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 12 }}>
            <Text style={[styles.gamesIntro, { color: colors.mutedForeground }]}>
              Speel solo of daag je medepassagiers uit via Airbuddies
            </Text>
            {GAMES.map((game, idx) => (
              <Animated.View key={game.id} entering={FadeInDown.delay(idx * 80).duration(250)}>
                <Pressable
                  style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                >
                  <View style={[styles.gameIcon, { backgroundColor: game.color + "20" }]}>
                    <Text style={styles.gameEmoji}>{game.icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.gameName, { color: colors.foreground }]}>{game.name}</Text>
                    <Text style={[styles.gameDesc, { color: colors.mutedForeground }]}>{game.desc}</Text>
                  </View>
                  <View style={[styles.gamePlayBtn, { backgroundColor: brand.primaryColor }]}>
                    <Text style={[styles.gamePlayText, { color: brand.textColor }]}>Spelen</Text>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 0 },
  headerTop: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerBrandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandDot: { width: 12, height: 12, borderRadius: 6 },
  headerBrandText: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  flightPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
  },
  flightPillText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionPickerWrap: { maxHeight: 48 },
  sectionPicker: { flexDirection: "row", paddingHorizontal: 12, gap: 0 },
  sectionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  sectionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 12 },
  flightCard: {
    borderRadius: 20, padding: 20, marginBottom: 12, gap: 12,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  flightCardAirlineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flightCardAirlineName: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  flightRoute: { flexDirection: "row", alignItems: "center", gap: 8 },
  flightPort: { flex: 1 },
  flightPortCode: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  flightPortCity: { fontSize: 11, fontFamily: "Inter_400Regular" },
  flightTime: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  flightMiddle: { flex: 1, alignItems: "center", gap: 8 },
  flightDuration: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  flightLine: { flexDirection: "row", alignItems: "center", width: "100%", gap: 4 },
  flightLineDot: { width: 6, height: 6, borderRadius: 3 },
  flightLineBar: { height: 1 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  noLiveBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 4,
  },
  noLiveText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  infoTile: { width: "47%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  infoTileLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  infoTileValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  chatCta: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, padding: 16,
  },
  chatCtaText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 4,
  },
  menuNoteText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  menuCategory: { marginBottom: 8, gap: 8 },
  menuCategoryTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, paddingLeft: 2 },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14,
  },
  menuItemName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuItemDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  menuItemAllergens: { fontSize: 11, fontFamily: "Inter_400Regular" },
  menuCheckbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  orderBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, padding: 16, marginTop: 4,
  },
  orderBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dutyCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14,
  },
  dutyEmoji: { fontSize: 36 },
  dutyTagRow: { flexDirection: "row" },
  dutyTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  dutyTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dutyBrand: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dutyName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dutyRight: { alignItems: "flex-end", gap: 6 },
  dutyPrice: { fontSize: 17, fontFamily: "Inter_700Bold" },
  dutyAddBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  destHeader: {
    borderRadius: 20, padding: 24, gap: 4, marginBottom: 4,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  destCity: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  destCountry: { fontSize: 16, fontFamily: "Inter_500Medium" },
  destTagline: { fontSize: 13, fontFamily: "Inter_400Regular" },
  tipCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  tipEmoji: { fontSize: 24 },
  tipTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  tipDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  gamesIntro: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 4 },
  gameCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  gameIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  gameEmoji: { fontSize: 26 },
  gameName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  gameDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  gamePlayBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  gamePlayText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8,
  },
  emptyBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
