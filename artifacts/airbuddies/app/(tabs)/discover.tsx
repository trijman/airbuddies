import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { InterestChip } from "@/components/InterestChip";
import { SignalBars } from "@/components/SignalBars";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { NearbyDevice } from "@/context/AppContext";

type ViewMode = "radar" | "seatmap";

function PulseRing({ colors }: { colors: ReturnType<typeof useColors> }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0.8);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return <Animated.View style={[styles.ring, style, { borderColor: colors.primary }]} />;
}

function getSharedInterests(myInterests: string[], deviceInterests?: string[]): string[] {
  if (!deviceInterests?.length || !myInterests.length) return [];
  return myInterests.filter((i) => deviceInterests.includes(i));
}

function DeviceCard({ device, index, myInterests }: { device: NearbyDevice; index: number; myInterests: string[] }) {
  const colors = useColors();
  const { sendBuddyRequest, buddies } = useApp();
  const existingRelation = buddies.find((b) => b.id === device.id)?.relation;
  const alreadyAdded = !!existingRelation;
  const shared = useMemo(() => getSharedInterests(myInterests, device.interests), [myInterests, device.interests]);

  const handleAdd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sendBuddyRequest(device);
    Alert.alert("Verzoek verzonden!", `${device.name} krijgt een buddy-verzoek.`);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View style={[styles.deviceCard, { backgroundColor: colors.card, borderColor: shared.length > 0 ? colors.primary + "55" : colors.border }]}>
        <Avatar name={device.name} size={48} />
        <View style={styles.deviceInfo}>
          <View style={styles.deviceNameRow}>
            <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name}</Text>
            {device.seatNumber && (
              <View style={[styles.deviceSeatTag, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="airplane-outline" size={10} color={colors.primary} />
                <Text style={[styles.deviceSeat, { color: colors.primary }]}>{device.seatNumber}</Text>
              </View>
            )}
          </View>
          <View style={styles.deviceMeta}>
            <SignalBars strength={device.signalStrength} size={14} />
            <Text style={[styles.deviceHops, { color: colors.mutedForeground }]}>
              {device.hops === 0 ? "Direct" : `${device.hops} hop${device.hops > 1 ? "s" : ""}`}
            </Text>
            {device.age && (
              <Text style={[styles.deviceHops, { color: colors.mutedForeground }]}>• {device.age} jr</Text>
            )}
            {device.gender && (
              <Text style={[styles.deviceHops, { color: colors.mutedForeground }]}>• {device.gender}</Text>
            )}
          </View>
          {shared.length > 0 && (
            <View style={styles.sharedRow}>
              <Ionicons name="heart" size={11} color={colors.primary} />
              <Text style={[styles.sharedText, { color: colors.primary }]}>
                {shared.length} gedeelde interesse{shared.length > 1 ? "s" : ""}:
              </Text>
              {shared.slice(0, 2).map((i) => (
                <InterestChip key={i} label={i} selected small />
              ))}
            </View>
          )}
          {!shared.length && device.interests && device.interests.length > 0 && (
            <View style={styles.sharedRow}>
              {device.interests.slice(0, 2).map((i) => (
                <InterestChip key={i} label={i} small />
              ))}
            </View>
          )}
        </View>
        <Pressable
          style={[styles.addBuddyBtn, { backgroundColor: alreadyAdded ? colors.muted : colors.primary }]}
          onPress={handleAdd}
          disabled={alreadyAdded}
          testID={`add-buddy-${device.id}`}
        >
          <Ionicons
            name={alreadyAdded ? "checkmark" : "person-add"}
            size={18}
            color={alreadyAdded ? colors.mutedForeground : colors.primaryForeground}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const AIRCRAFT_CONFIGS = {
  A320: { label: "Airbus A320", rows: 30, cols: ["A","B","C","D","E","F"], aisleBeforeIdx: [3], businessRows: 5 },
  A321: { label: "Airbus A321", rows: 36, cols: ["A","B","C","D","E","F"], aisleBeforeIdx: [3], businessRows: 5 },
  B737: { label: "Boeing 737", rows: 32, cols: ["A","B","C","D","E","F"], aisleBeforeIdx: [3], businessRows: 4 },
  B777: { label: "Boeing 777", rows: 42, cols: ["A","B","C","D","E","F","G","H","J","K"], aisleBeforeIdx: [3, 7], businessRows: 8 },
  A380: { label: "Airbus A380", rows: 58, cols: ["A","B","C","D","E","F","G","H","J","K"], aisleBeforeIdx: [3, 7], businessRows: 12 },
} as const;
type AircraftType = keyof typeof AIRCRAFT_CONFIGS;

interface SeatInfo {
  label: string;
  type: "me" | "buddy" | "nearby" | "empty";
  name?: string;
}

const IATA_TO_CONFIG: Record<string, AircraftType> = {
  A318: "A320", A319: "A320", A320: "A320", A20N: "A320", A319N: "A320",
  A321: "A321", A21N: "A321", A321N: "A321",
  B737: "B737", B738: "B737", B739: "B737", B38M: "B737", B39M: "B737", B736: "B737",
  B777: "B777", B77W: "B777", B77L: "B777",
  A380: "A380", A388: "A380",
};

function resolveAircraftType(iataCode: string | null | undefined): AircraftType | null {
  if (!iataCode) return null;
  return IATA_TO_CONFIG[iataCode.toUpperCase()] ?? null;
}

function SeatMap() {
  const colors = useColors();
  const { profile, buddies, nearbyDevices, activeAircraftType } = useApp();
  const resolved = resolveAircraftType(activeAircraftType);
  const [manualType, setManualType] = useState<AircraftType>("A320");
  const aircraftType: AircraftType = resolved ?? manualType;
  const config = AIRCRAFT_CONFIGS[aircraftType];

  const seatMap = useMemo(() => {
    const map: Record<string, SeatInfo> = {};
    buddies.forEach((b) => {
      if (b.seatNumber) {
        map[b.seatNumber.toUpperCase()] = {
          label: b.seatNumber,
          type: b.status === "online" || b.status === "nearby" ? "buddy" : "empty",
          name: b.name,
        };
      }
    });
    nearbyDevices.forEach((d) => {
      if (d.seatNumber) {
        const key = d.seatNumber.toUpperCase();
        if (!map[key]) {
          map[key] = { label: d.seatNumber, type: "nearby", name: d.name };
        }
      }
    });
    if (profile?.seatNumber) {
      map[profile.seatNumber.toUpperCase()] = {
        label: profile.seatNumber,
        type: "me",
        name: profile.name,
      };
    }
    return map;
  }, [profile, buddies, nearbyDevices]);

  const getSeatColor = (info: SeatInfo | undefined) => {
    if (!info || info.type === "empty") return colors.border;
    if (info.type === "me") return colors.primary;
    if (info.type === "buddy") return colors.online;
    return colors.nearby;
  };

  return (
    <View style={{ flex: 1 }}>
      {resolved ? (
        <View style={[styles.aircraftPickerWrap, { borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }]}>
          <Ionicons name="airplane" size={15} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
            {config.label}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
            · automatisch herkend
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.aircraftPicker}
          style={[styles.aircraftPickerWrap, { borderBottomColor: colors.border }]}
        >
          {(Object.keys(AIRCRAFT_CONFIGS) as AircraftType[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setManualType(key)}
              style={[
                styles.aircraftBtn,
                {
                  backgroundColor: aircraftType === key ? colors.primary : colors.muted,
                },
              ]}
            >
              <Text
                style={[
                  styles.aircraftBtnText,
                  { color: aircraftType === key ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {key}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.seatMapContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.aircraftLabel, { color: colors.mutedForeground }]}>
          {config.label} · {config.rows} rijen · {config.cols.length} stoelen per rij
        </Text>
        <View style={[styles.planeNose, { borderBottomColor: colors.border }]} />
        <View style={styles.cabinWrap}>
          {Array.from({ length: config.rows }, (_, ri) => {
            const row = ri + 1;
            const isBusinessClass = row <= config.businessRows;
            return (
              <View key={row} style={styles.seatRow}>
                <Text style={[styles.rowNumber, { color: colors.mutedForeground }]}>{row}</Text>
                {config.cols.map((col, ci) => {
                  const seatKey = `${row}${col}`;
                  const info = seatMap[seatKey];
                  const isAisleBefore = (config.aisleBeforeIdx as readonly number[]).includes(ci);
                  const seatColor = getSeatColor(info);
                  return (
                    <React.Fragment key={col}>
                      {isAisleBefore && <View style={styles.aisleGap} />}
                      <View
                        style={[
                          isBusinessClass ? styles.businessSeat : styles.economySeat,
                          {
                            backgroundColor: info && info.type !== "empty" ? seatColor + "33" : colors.muted,
                            borderColor: seatColor,
                            borderWidth: info && info.type !== "empty" ? 1.5 : 1,
                          },
                        ]}
                      >
                        {info && info.type !== "empty" && (
                          <Text
                            style={[
                              styles.seatInitial,
                              { color: info.type === "me" ? colors.primary : info.type === "buddy" ? colors.online : colors.nearby },
                            ]}
                          >
                            {info.type === "me" ? "★" : (info.name?.[0] ?? "?")}
                          </Text>
                        )}
                      </View>
                    </React.Fragment>
                  );
                })}
                <View style={{ width: 28 }} />
              </View>
            );
          })}
        </View>

        <View style={[styles.mapLegend, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LegendItem color={colors.primary} label={`Jij (${profile?.seatNumber ?? "?"})`} />
          <LegendItem color={colors.online} label="Buddy online" />
          <LegendItem color={colors.nearby} label="Nabij apparaat" />
          <LegendItem color={colors.border} label="Leeg" filled={false} />
        </View>
      </ScrollView>
    </View>
  );
}

function LegendItem({ color, label, filled = true }: { color: string; label: string; filled?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.legendItem}>
      <View style={[
        styles.legendDot,
        { backgroundColor: filled ? color + "33" : "transparent", borderColor: color, borderWidth: 1.5 }
      ]} />
      <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isScanning, nearbyDevices, startScan, stopScan, profile } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>("radar");
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const myInterests = profile?.interests ?? [];

  const handleScan = () => {
    if (isScanning) {
      stopScan();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startScan();
    }
  };

  const fp = profile?.fingerprint ?? "A3:F1:2C:99:4E:B7";
  const fpShort = fp.slice(0, 23);

  const matchCount = nearbyDevices.filter(
    (d) => getSharedInterests(myInterests, d.interests).length > 0
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Discover</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { backgroundColor: isScanning ? colors.secondary : colors.muted }]}>
            <View style={[styles.statusDot, { backgroundColor: isScanning ? colors.primary : colors.mutedForeground }]} />
            <Text style={[styles.statusText, { color: isScanning ? colors.primary : colors.mutedForeground }]}>
              {isScanning ? "Scannen..." : "Gestopt"}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.toggleRow, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.toggleBtn, viewMode === "radar" && { backgroundColor: colors.card }]}
          onPress={() => setViewMode("radar")}
        >
          <Ionicons name="radio-outline" size={16} color={viewMode === "radar" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.toggleLabel, { color: viewMode === "radar" ? colors.primary : colors.mutedForeground }]}>
            Radar
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === "seatmap" && { backgroundColor: colors.card }]}
          onPress={() => setViewMode("seatmap")}
        >
          <Ionicons name="grid-outline" size={16} color={viewMode === "seatmap" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.toggleLabel, { color: viewMode === "seatmap" ? colors.primary : colors.mutedForeground }]}>
            Stoelkaart
          </Text>
        </Pressable>
      </View>

      {viewMode === "radar" && (
        <FlatList
          data={nearbyDevices}
          keyExtractor={(d) => d.id}
          renderItem={({ item, index }) => <DeviceCard device={item} index={index} myInterests={myInterests} />}
          contentContainerStyle={[styles.listContent, isWeb ? { paddingBottom: 34 } : undefined]}
          showsVerticalScrollIndicator={false}
          scrollEnabled
          ListHeaderComponent={
            <View style={styles.radarSection}>
              <View style={styles.radarContainer}>
                {isScanning && (
                  <>
                    <PulseRing colors={colors} />
                    <PulseRing colors={colors} />
                    <PulseRing colors={colors} />
                  </>
                )}
                <Pressable
                  style={[
                    styles.scanBtn,
                    {
                      backgroundColor: isScanning ? colors.primary : colors.card,
                      borderColor: isScanning ? colors.primary : colors.border,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={handleScan}
                  testID="scan-button"
                >
                  <Ionicons
                    name={isScanning ? "radio" : "radio-outline"}
                    size={36}
                    color={isScanning ? colors.primaryForeground : colors.primary}
                  />
                </Pressable>
              </View>

              <Text style={[styles.radarLabel, { color: colors.foreground }]}>
                {isScanning ? "Zoeken naar buddies..." : "Tik om te scannen"}
              </Text>
              <Text style={[styles.radarSub, { color: colors.mutedForeground }]}>
                {nearbyDevices.length > 0
                  ? `${nearbyDevices.length} apparaat${nearbyDevices.length > 1 ? "en" : ""} gevonden${matchCount > 0 ? ` — ${matchCount} interesse-match${matchCount > 1 ? "es" : ""}` : ""}`
                  : "Vind buddies via Bluetooth"}
              </Text>

              <View style={[styles.fingerprintCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fpLabel, { color: colors.mutedForeground }]}>Jouw fingerprint</Text>
                  <Text style={[styles.fpValue, { color: colors.foreground }]}>{fpShort}</Text>
                </View>
              </View>

              {nearbyDevices.length > 0 && (
                <Text style={[styles.foundHeader, { color: colors.mutedForeground }]}>
                  Gevonden in de buurt
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !isScanning ? null : (
              <View style={styles.searchingMsg}>
                <Text style={[styles.searchingText, { color: colors.mutedForeground }]}>
                  Berichten worden versleuteld via Noise Protocol...
                </Text>
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {viewMode === "seatmap" && (
        <View style={{ flex: 1 }}>
          {!profile?.seatNumber && (
            <View style={[styles.noSeatBanner, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.noSeatText, { color: colors.primary }]}>
                Voeg je stoelnummer toe in Instellingen om jezelf op de kaart te zien
              </Text>
            </View>
          )}
          <SeatMap />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusPill: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    padding: 3,
    borderBottomWidth: 0,
  },
  toggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8, borderRadius: 10,
  },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listContent: { flexGrow: 1 },
  radarSection: { alignItems: "center", paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20 },
  radarContainer: {
    width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  ring: {
    position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 1.5,
  },
  scanBtn: {
    width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", zIndex: 10,
  },
  radarLabel: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  radarSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16, textAlign: "center" },
  fingerprintCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 12, borderWidth: 1, width: "100%", marginBottom: 16,
  },
  fpLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  fpValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  foundHeader: {
    alignSelf: "flex-start",
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4,
  },
  deviceCard: {
    flexDirection: "row", alignItems: "flex-start",
    marginHorizontal: 16, padding: 14, borderRadius: 14, borderWidth: 1, gap: 12,
  },
  deviceInfo: { flex: 1, gap: 4 },
  deviceNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  deviceName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  deviceSeatTag: {
    flexDirection: "row", alignItems: "center", gap: 2,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  deviceSeat: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  deviceMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  deviceHops: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sharedRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 2 },
  sharedText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  addBuddyBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 4 },
  searchingMsg: { padding: 24, alignItems: "center" },
  searchingText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  noSeatBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 16, marginBottom: 0,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  noSeatText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  aircraftPickerWrap: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 48 },
  aircraftPicker: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  aircraftBtn: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 5 },
  aircraftBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  aircraftLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  seatMapContent: { alignItems: "center", paddingVertical: 16, paddingBottom: 40 },
  planeNose: {
    width: 60, height: 30,
    borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    marginBottom: 4,
  },
  cabinWrap: { alignItems: "center" },
  seatRow: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
  rowNumber: { width: 20, fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "right", marginRight: 4 },
  aisleGap: { width: 10 },
  economySeat: {
    width: 22, height: 22, borderRadius: 4, marginHorizontal: 1,
    alignItems: "center", justifyContent: "center",
  },
  businessSeat: {
    width: 26, height: 26, borderRadius: 5, marginHorizontal: 1,
    alignItems: "center", justifyContent: "center",
  },
  seatInitial: { fontSize: 9, fontFamily: "Inter_700Bold" },
  mapLegend: {
    flexDirection: "row", flexWrap: "wrap", gap: 12,
    marginTop: 20, padding: 14, borderRadius: 14, borderWidth: 1,
    marginHorizontal: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
