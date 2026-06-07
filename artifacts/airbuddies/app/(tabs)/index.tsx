import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Conversation } from "@/context/AppContext";

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Nu";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) {
    const d = new Date(ts);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function ConvItem({ conv, index }: { conv: Conversation; index: number }) {
  const colors = useColors();
  const { buddies, profile } = useApp();

  const { name, seed, isGroup, isOnline, isNearby } = useMemo(() => {
    if (conv.type === "group") {
      return {
        name: conv.name ?? "Groep",
        seed: conv.avatarSeed ?? conv.name ?? "groep",
        isGroup: true,
        isOnline: false,
        isNearby: false,
      };
    }
    const buddyId = conv.participantIds.find((id) => id !== profile?.id);
    const buddy = buddies.find((b) => b.id === buddyId);
    return {
      name: buddy?.name ?? "Onbekend",
      seed: conv.avatarSeed ?? buddyId ?? "unknown",
      isGroup: false,
      isOnline: buddy?.status === "online",
      isNearby: buddy?.status === "nearby",
    };
  }, [conv, buddies, profile]);

  const lastMsg = conv.lastMessage;
  const preview = lastMsg
    ? lastMsg.type === "contact-card"
      ? "📇 Contactkaart"
      : lastMsg.senderId === profile?.id
      ? `Jij: ${lastMsg.content}`
      : lastMsg.content
    : "Geen berichten";

  const isFlight = !!conv.flightNumber;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        style={({ pressed }) => [
          styles.convItem,
          { backgroundColor: pressed ? colors.muted : colors.card },
        ]}
        onPress={() => router.push(`/chat/${conv.id}`)}
        testID={`conv-item-${conv.id}`}
      >
        <Avatar
          name={name}
          seed={seed}
          isGroup={isGroup}
          size={52}
          showOnlineIndicator={!isGroup}
          isOnline={isOnline}
          isNearby={isNearby}
        />
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <View style={styles.convNameRow}>
              {isFlight && (
                <Ionicons name="airplane" size={13} color={colors.primary} style={{ marginRight: 3 }} />
              )}
              {conv.isPrivate && conv.type === "group" && !isFlight && (
                <Ionicons name="lock-closed" size={12} color={colors.nearby} style={{ marginRight: 3 }} />
              )}
              <Text
                style={[
                  styles.convName,
                  {
                    color: colors.foreground,
                    fontFamily: conv.unreadCount > 0 ? "Inter_700Bold" : "Inter_600SemiBold",
                  },
                ]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
            <Text
              style={[
                styles.convTime,
                {
                  color: conv.unreadCount > 0 ? colors.primary : colors.mutedForeground,
                  fontFamily: conv.unreadCount > 0 ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {lastMsg ? formatTime(lastMsg.timestamp) : ""}
            </Text>
          </View>

          {isFlight && (
            <Text style={[styles.flightTag, { color: colors.primary }]}>
              {conv.flightNumber}
            </Text>
          )}

          <View style={styles.convPreview}>
            <Text
              style={[
                styles.convMsg,
                {
                  color: conv.unreadCount > 0 ? colors.foreground : colors.mutedForeground,
                  fontFamily: conv.unreadCount > 0 ? "Inter_500Medium" : "Inter_400Regular",
                },
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {conv.muted && !conv.unreadCount && (
              <Ionicons name="notifications-off-outline" size={14} color={colors.mutedForeground} />
            )}
            {conv.unreadCount > 0 && !conv.muted && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                  {conv.unreadCount}
                </Text>
              </View>
            )}
            {conv.unreadCount > 0 && conv.muted && (
              <View style={[styles.badge, { backgroundColor: colors.mutedForeground }]}>
                <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                  {conv.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations } = useApp();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const sorted = [...conversations].sort(
    (a, b) =>
      (b.lastMessage?.timestamp ?? b.createdAt) -
      (a.lastMessage?.timestamp ?? a.createdAt)
  );

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
        <Text style={[styles.title, { color: colors.foreground }]}>Airbuddies</Text>
        <Pressable
          style={[styles.newChatBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/new-group")}
          testID="new-chat-button"
        >
          <Ionicons name="add" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <ConvItem conv={item} index={index} />}
        contentContainerStyle={[
          styles.list,
          isWeb ? { paddingBottom: 34 } : undefined,
        ]}
        scrollEnabled={!!sorted.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Geen gesprekken</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Maak een vluchtgroep of ga naar Discover
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border, marginLeft: 80 }]} />
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
  newChatBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  list: { flexGrow: 1 },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  convInfo: { flex: 1, gap: 2 },
  convHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  convNameRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  convName: { fontSize: 16, flex: 1 },
  convTime: { fontSize: 12 },
  flightTag: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  convPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convMsg: { fontSize: 14, flex: 1 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5, marginLeft: 4,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  separator: { height: StyleSheet.hairlineWidth },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
