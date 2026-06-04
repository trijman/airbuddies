import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SignalBars } from "@/components/SignalBars";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { NearbyDevice } from "@/context/AppContext";

function PulseRing({ delay = 0, colors }: { delay?: number; colors: ReturnType<typeof useColors> }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        style,
        { borderColor: colors.primary, marginTop: delay * -2 },
      ]}
    />
  );
}

function DeviceCard({ device, index }: { device: NearbyDevice; index: number }) {
  const colors = useColors();
  const { acceptNearbyDevice, buddies } = useApp();

  const alreadyAdded = buddies.some((b) => b.id === device.id);

  const handleAdd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptNearbyDevice(device);
    Alert.alert("Buddy toegevoegd!", `${device.name} is nu een buddy.`);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View
        style={[
          styles.deviceCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Avatar name={device.name} size={46} />
        <View style={styles.deviceInfo}>
          <Text style={[styles.deviceName, { color: colors.foreground }]}>
            {device.name}
          </Text>
          <View style={styles.deviceMeta}>
            <SignalBars strength={device.signalStrength} size={16} />
            <Text style={[styles.deviceHops, { color: colors.mutedForeground }]}>
              {device.hops === 0 ? "Direct" : `${device.hops} hop${device.hops > 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>
        <Pressable
          style={[
            styles.addBuddyBtn,
            { backgroundColor: alreadyAdded ? colors.muted : colors.primary },
          ]}
          onPress={handleAdd}
          disabled={alreadyAdded}
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

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isScanning, nearbyDevices, startScan, stopScan } = useApp();
  const isWeb = Platform.OS === "web";

  const topPad = isWeb ? 67 : insets.top;

  const handleScan = () => {
    if (isScanning) {
      stopScan();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startScan();
    }
  };

  const fingerprint = "A3:F1:2C:99:4E:B7:D0:11";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Discover</Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: isScanning ? colors.secondary : colors.muted },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isScanning ? colors.primary : colors.mutedForeground },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isScanning ? colors.primary : colors.mutedForeground },
            ]}
          >
            {isScanning ? "Scannen..." : "Gestopt"}
          </Text>
        </View>
      </View>

      <FlatList
        data={nearbyDevices}
        keyExtractor={(d) => d.id}
        renderItem={({ item, index }) => <DeviceCard device={item} index={index} />}
        contentContainerStyle={[
          styles.listContent,
          isWeb ? { paddingBottom: 34 } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!nearbyDevices.length}
        ListHeaderComponent={
          <View style={styles.radarSection}>
            <View style={styles.radarContainer}>
              {isScanning && (
                <>
                  <PulseRing delay={0} colors={colors} />
                  <PulseRing delay={300} colors={colors} />
                  <PulseRing delay={600} colors={colors} />
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
              {isScanning
                ? "Houd je telefoon dicht bij anderen"
                : "Vind buddies via Bluetooth"}
            </Text>

            <View style={[styles.fingerprintCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fpLabel, { color: colors.mutedForeground }]}>Jouw fingerprint</Text>
                <Text style={[styles.fpValue, { color: colors.foreground }]}>{fingerprint}</Text>
              </View>
            </View>

            {nearbyDevices.length > 0 && (
              <Text style={[styles.foundHeader, { color: colors.mutedForeground }]}>
                {nearbyDevices.length} apparaat{nearbyDevices.length > 1 ? "en" : ""} gevonden
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !isScanning ? null : (
            <View style={styles.searchingMsg}>
              <Text style={[styles.searchingText, { color: colors.mutedForeground }]}>
                Berichten worden versleuteld via Noise Protocol
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: 8 }} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  listContent: { flexGrow: 1 },
  radarSection: { alignItems: "center", paddingTop: 28, paddingBottom: 12, paddingHorizontal: 20 },
  radarContainer: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  ring: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
  },
  scanBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  radarLabel: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  radarSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
    textAlign: "center",
  },
  fingerprintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    width: "100%",
    marginBottom: 20,
  },
  fpLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  fpValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  foundHeader: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  deviceInfo: { flex: 1, gap: 4 },
  deviceName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  deviceMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  deviceHops: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addBuddyBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  searchingMsg: { padding: 24, alignItems: "center" },
  searchingText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
