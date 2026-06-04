import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const AVATAR_COLORS = [
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
  isGroup?: boolean;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
  isNearby?: boolean;
}

export function Avatar({
  name,
  size = 48,
  seed,
  isGroup = false,
  showOnlineIndicator = false,
  isOnline = false,
  isNearby = false,
}: AvatarProps) {
  const colors = useColors();
  const [bg, _shade] = getColorForSeed(seed ?? name);
  const initials = isGroup
    ? (name.slice(0, 2).toUpperCase())
    : (name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase());

  const fontSize = size * 0.38;
  const dotSize = size * 0.28;
  const dotOffset = size * 0.04;

  const indicatorColor = isOnline
    ? colors.online
    : isNearby
    ? colors.nearby
    : colors.offline;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: isGroup ? size * 0.3 : size / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize, color: "#ffffff" }]}>
          {isGroup ? "#" : initials}
        </Text>
      </View>
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
