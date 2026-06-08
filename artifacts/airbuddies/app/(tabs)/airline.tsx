import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Image,
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

const FLIGHT_INFO = {
  number: "KL1234",
  origin: "AMS",
  originCity: "Amsterdam",
  destination: "BKK",
  destinationCity: "Bangkok",
  departure: "10:25",
  arrival: "05:10+1",
  duration: "10u 45m",
  aircraft: "Boeing 777-300ER",
  gate: "D14",
  status: "On time",
  altitude: "10.668m",
  speed: "905 km/u",
  timeRemaining: "6u 20m",
};

const MENU_ITEMS = [
  { id: "1", category: "Voorgerecht", name: "Hollandse garnalenkroket", desc: "Met mosterd-dille saus", allergens: "Gluten, Schaaldieren" },
  { id: "2", category: "Hoofdgerecht", name: "Kip in kruidensaus", desc: "Met rijst en groenten", allergens: "Gluten" },
  { id: "3", category: "Hoofdgerecht", name: "Pasta Primavera (V)", desc: "Seizoensgroenten, pesto", allergens: "Gluten, Lactose" },
  { id: "4", category: "Hoofdgerecht", name: "Zalm met citroen", desc: "Met aardappelpuree en sperziebonen", allergens: "Vis" },
  { id: "5", category: "Dessert", name: "Stroopwafel cheesecake", desc: "Met gekarameliseerde room", allergens: "Gluten, Lactose, Eieren" },
  { id: "6", category: "Dranken", name: "KLM Dutch Beer", desc: "Heineken 0.0 of Heineken", allergens: "Gluten" },
];

const DUTY_FREE = [
  { id: "1", brand: "Chanel", name: "N°5 Eau de Parfum 50ml", price: "€89", tag: "Bestseller", emoji: "✨" },
  { id: "2", brand: "Johnnie Walker", name: "Black Label 1L", price: "€28", tag: "Duty-free prijs", emoji: "🥃" },
  { id: "3", brand: "KLM", name: "Delft Huisje Grolsch", price: "€15", tag: "Exclusief aan boord", emoji: "🏠" },
  { id: "4", brand: "Rituals", name: "The Ritual of Sakura Set", price: "€35", tag: "Nieuw", emoji: "🌸" },
  { id: "5", brand: "Lindt", name: "Chocolade assortiment 200g", price: "€12", tag: "Populair", emoji: "🍫" },
];

const DESTINATION_TIPS = [
  { id: "1", icon: "🌡️", title: "Weer", desc: "Bangkok: 34°C, gedeeltelijk bewolkt" },
  { id: "2", icon: "💴", title: "Valuta", desc: "1 EUR ≈ 38 THB · Wisselkantoren bij aankomst" },
  { id: "3", icon: "🕐", title: "Tijdsverschil", desc: "+6 uur ten opzichte van Amsterdam" },
  { id: "4", icon: "🚗", title: "Vervoer", desc: "BTS Skytrain · Airport Rail Link · Grab taxi" },
  { id: "5", icon: "🛂", title: "Visum", desc: "Visa-on-Arrival voor EU-paspoorten · 30 dagen" },
  { id: "6", icon: "💡", title: "Tip", desc: "Bezoek de Chatuchak markt op zaterdag of zondag" },
];

const GAMES = [
  { id: "trivia", icon: "🧠", name: "Vluchttrivia", desc: "Test je kennis over reisbestemmingen", color: "#6366f1" },
  { id: "wordgame", icon: "📝", name: "Woordketen", desc: "Gezelschapsspel voor de hele rij", color: "#0ea5e9" },
  { id: "sudoku", icon: "🔢", name: "Sudoku", desc: "Klassiek sudoku · 3 moeilijkheden", color: "#22c55e" },
  { id: "map", icon: "🗺️", name: "Raden waar we zijn", desc: "Raad de locatie op de kaart", color: "#f59e0b" },
];

type Section = "vlucht" | "menu" | "dutyfree" | "bestemming" | "games";

export default function AirlineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, profile } = useApp();
  const [activeSection, setActiveSection] = useState<Section>("vlucht");
  const [orderItems, setOrderItems] = useState<string[]>([]);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const flightConv = conversations.find((c) => !!c.flightNumber);

  const toggleOrder = (id: string) => {
    Haptics.selectionAsync();
    setOrderItems((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: "vlucht", label: "Vlucht", icon: "airplane-outline" },
    { id: "menu", label: "Menu", icon: "restaurant-outline" },
    { id: "dutyfree", label: "Winkelen", icon: "bag-outline" },
    { id: "bestemming", label: "Bestemming", icon: "map-outline" },
    { id: "games", label: "Games", icon: "game-controller-outline" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <View style={styles.headerBrand}>
              <Text style={styles.klmLogo}>KLM</Text>
              <View style={[styles.klmDot, { backgroundColor: "#00a1de" }]} />
            </View>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Royal Dutch Airlines</Text>
          </View>
          <View style={[styles.flightPill, { backgroundColor: "#00a1de18" }]}>
            <Ionicons name="airplane" size={12} color="#00a1de" />
            <Text style={[styles.flightPillText, { color: "#00a1de" }]}>{FLIGHT_INFO.number}</Text>
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
              onPress={() => setActiveSection(s.id)}
              style={[
                styles.sectionBtn,
                activeSection === s.id && { borderBottomColor: "#00a1de", borderBottomWidth: 2 },
              ]}
            >
              <Ionicons
                name={s.icon as any}
                size={16}
                color={activeSection === s.id ? "#00a1de" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.sectionBtnText,
                  { color: activeSection === s.id ? "#00a1de" : colors.mutedForeground },
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
        {activeSection === "vlucht" && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.flightCard, { backgroundColor: "#00a1de", }]}>
              <View style={styles.flightRoute}>
                <View style={styles.flightPort}>
                  <Text style={styles.flightPortCode}>{FLIGHT_INFO.origin}</Text>
                  <Text style={styles.flightPortCity}>{FLIGHT_INFO.originCity}</Text>
                  <Text style={styles.flightTime}>{FLIGHT_INFO.departure}</Text>
                </View>
                <View style={styles.flightMiddle}>
                  <Text style={styles.flightDuration}>{FLIGHT_INFO.duration}</Text>
                  <View style={styles.flightLine}>
                    <View style={styles.flightLineDot} />
                    <View style={[styles.flightLineBar, { flex: 1 }]} />
                    <Ionicons name="airplane" size={18} color="#fff" />
                    <View style={[styles.flightLineBar, { flex: 1 }]} />
                    <View style={styles.flightLineDot} />
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: "#ffffff33" }]}>
                    <Text style={styles.statusBadgeText}>{FLIGHT_INFO.status}</Text>
                  </View>
                </View>
                <View style={[styles.flightPort, { alignItems: "flex-end" }]}>
                  <Text style={styles.flightPortCode}>{FLIGHT_INFO.destination}</Text>
                  <Text style={styles.flightPortCity}>{FLIGHT_INFO.destinationCity}</Text>
                  <Text style={styles.flightTime}>{FLIGHT_INFO.arrival}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoGrid}>
              {[
                { label: "Vliegtuig", value: FLIGHT_INFO.aircraft, icon: "airplane-outline" },
                { label: "Gate", value: FLIGHT_INFO.gate, icon: "location-outline" },
                { label: "Hoogte", value: FLIGHT_INFO.altitude, icon: "trending-up-outline" },
                { label: "Snelheid", value: FLIGHT_INFO.speed, icon: "speedometer-outline" },
                { label: "Resterende tijd", value: FLIGHT_INFO.timeRemaining, icon: "time-outline" },
                { label: "Jouw stoel", value: profile?.seatNumber ?? "–", icon: "person-outline" },
              ].map((item) => (
                <View
                  key={item.label}
                  style={[styles.infoTile, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                  <Text style={[styles.infoTileLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                  <Text style={[styles.infoTileValue, { color: colors.foreground }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            {flightConv && (
              <Pressable
                style={[styles.chatCta, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/chat/${flightConv.id}`)}
              >
                <Ionicons name="chatbubbles" size={20} color={colors.primaryForeground} />
                <Text style={[styles.chatCtaText, { color: colors.primaryForeground }]}>
                  Open vluchtchat · {flightConv.participantIds.length} passagiers
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primaryForeground + "99"} />
              </Pressable>
            )}
          </Animated.View>
        )}

        {activeSection === "menu" && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.menuNote, { backgroundColor: colors.secondary, borderColor: colors.primary + "33" }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.menuNoteText, { color: colors.primary }]}>
                Dienst start na het bereiken van kruishoogte · Circa 45 minuten
              </Text>
            </View>
            {["Voorgerecht", "Hoofdgerecht", "Dessert", "Dranken"].map((cat) => {
              const items = MENU_ITEMS.filter((m) => m.category === cat);
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
                            backgroundColor: selected ? "#00a1de12" : colors.card,
                            borderColor: selected ? "#00a1de" : colors.border,
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
                              backgroundColor: selected ? "#00a1de" : "transparent",
                              borderColor: selected ? "#00a1de" : colors.border,
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
                style={[styles.orderBtn, { backgroundColor: "#00a1de" }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setOrderItems([]);
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.orderBtnText}>
                  {orderItems.length} keuze{orderItems.length > 1 ? "s" : ""} vastgelegd
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {activeSection === "dutyfree" && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 10 }}>
            <View style={[styles.menuNote, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b44" }]}>
              <Ionicons name="bag-handle-outline" size={16} color="#f59e0b" />
              <Text style={[styles.menuNoteText, { color: "#b45309" }]}>
                Bestel voor aankomst · Betalen per pin of creditcard · Retour niet mogelijk
              </Text>
            </View>
            {DUTY_FREE.map((item, idx) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(idx * 50).duration(250)}>
                <View style={[styles.dutyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.dutyEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.dutyTagRow}>
                      <View style={[styles.dutyTag, { backgroundColor: "#00a1de18" }]}>
                        <Text style={[styles.dutyTagText, { color: "#00a1de" }]}>{item.tag}</Text>
                      </View>
                    </View>
                    <Text style={[styles.dutyBrand, { color: colors.mutedForeground }]}>{item.brand}</Text>
                    <Text style={[styles.dutyName, { color: colors.foreground }]}>{item.name}</Text>
                  </View>
                  <View style={styles.dutyRight}>
                    <Text style={[styles.dutyPrice, { color: colors.foreground }]}>{item.price}</Text>
                    <Pressable
                      style={[styles.dutyAddBtn, { backgroundColor: "#00a1de" }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {activeSection === "bestemming" && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 10 }}>
            <View style={[styles.destHeader, { backgroundColor: "#00a1de" }]}>
              <Text style={styles.destCity}>Bangkok</Text>
              <Text style={styles.destCountry}>Thailand 🇹🇭</Text>
              <Text style={styles.destTagline}>Stad van engelen · 10,5 miljoen inwoners</Text>
            </View>
            {DESTINATION_TIPS.map((tip, idx) => (
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
                  <View style={[styles.gamePlayBtn, { backgroundColor: game.color }]}>
                    <Text style={styles.gamePlayText}>Spelen</Text>
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
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 6 },
  klmLogo: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#00a1de", letterSpacing: 1 },
  klmDot: { width: 10, height: 10, borderRadius: 5 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#00a1de", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  flightRoute: { flexDirection: "row", alignItems: "center", gap: 8 },
  flightPort: { alignItems: "flex-start", minWidth: 60 },
  flightPortCode: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -1 },
  flightPortCity: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ffffff99" },
  flightTime: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff", marginTop: 4 },
  flightMiddle: { flex: 1, alignItems: "center", gap: 6 },
  flightDuration: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#ffffffcc" },
  flightLine: { flexDirection: "row", alignItems: "center", width: "100%", gap: 4 },
  flightLineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  flightLineBar: { height: 1, backgroundColor: "#ffffff55" },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  infoTile: {
    width: "47%", borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 4,
  },
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
  orderBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
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
  },
  destCity: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.5 },
  destCountry: { fontSize: 16, fontFamily: "Inter_500Medium", color: "#ffffffcc" },
  destTagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ffffff99" },
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
  gamePlayText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
