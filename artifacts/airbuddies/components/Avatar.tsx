import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const AVATAR_COLORS: [string, string][] = [
  ["#0ea5e9", "#0369a1"],
  ["#8b5cf6", "#6d28d9"],
  ["#ec4899", "#be185d"],
  ["#22c55e", "#15803d"],
  ["#f59e0b", "#b45309"],
  ["#ef4444", "#b91c1c"],
  ["#14b8a6", "#0f766e"],
  ["#f97316", "#c2410c"],
];

function getColorForSeed(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AvatarProps {
  name: string;
  size?: number;
  seed?: string;
  uri?: string;
  isGroup?: boolean;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
  isNearby?: boolean;
}

export function Avatar({
  name,
  size = 48,
  seed,
  uri,
  isGroup = false,
  showOnlineIndicator = false,
  isOnline = false,
  isNearby = false,
}: AvatarProps) {
  const colors = useColors();
  const [bg] = getColorForSeed(seed ?? name);
  const initials = isGroup
    ? name.slice(0, 2).toUpperCase()
    : name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

  const fontSize = size * 0.38;
  const dotSize = size * 0.28;
  const dotOffset = size * 0.04;
  const borderRadius = isGroup ? size * 0.3 : size / 2;

  const indicatorColor = isOnline
    ? colors.online
    : isNearby
    ? colors.nearby
    : colors.offline;

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.avatar, { width: size, height: size, borderRadius }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius, backgroundColor: bg },
          ]}
        >
          <Text style={[styles.initials, { fontSize, color: "#ffffff" }]}>
            {isGroup ? "#" : initials}
          </Text>
        </View>
      )}
      {showOnlineIndicator && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: indicatorColor,
              bottom: dotOffset,
              right: dotOffset,
              borderWidth: 2,
              borderColor: colors.background,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  dot: {
    position: "absolute",
  },
});
