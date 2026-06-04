import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Message } from "@/context/AppContext";

function StatusIcon({ status }: { status: Message["status"] }) {
  const colors = useColors();
  if (status === "sending") return <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />;
  if (status === "sent") return <Ionicons name="checkmark" size={12} color={colors.mutedForeground} />;
  if (status === "delivered") return <Ionicons name="checkmark-done" size={12} color={colors.mutedForeground} />;
  return <Ionicons name="checkmark-done" size={12} color={colors.primary} />;
}

function formatMsgTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function MessageBubble({ msg, isMe, senderName }: { msg: Message; isMe: boolean; senderName?: string }) {
  const colors = useColors();

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      style={[styles.bubbleWrap, isMe ? styles.bubbleRight : styles.bubbleLeft]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMe ? colors.primary : colors.card,
            borderColor: isMe ? "transparent" : colors.border,
            borderWidth: isMe ? 0 : 1,
            borderTopRightRadius: isMe ? 4 : 18,
            borderTopLeftRadius: isMe ? 18 : 4,
          },
        ]}
      >
        {senderName && !isMe && (
          <Text style={[styles.senderLabel, { color: colors.primary }]}>
            {senderName}
          </Text>
        )}
        <Text
          style={[
            styles.bubbleText,
            { color: isMe ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {msg.content}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text
            style={[
              styles.bubbleTime,
              { color: isMe ? colors.primaryForeground + "99" : colors.mutedForeground },
            ]}
          >
            {formatMsgTime(msg.timestamp)}
          </Text>
          {isMe && <StatusIcon status={msg.status} />}
        </View>
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, messages, profile, buddies, sendMessage, markAsRead } = useApp();
  const [input, setInput] = useState("");
  const isWeb = Platform.OS === "web";

  const conv = conversations.find((c) => c.id === id);
  const convMessages = messages[id ?? ""] ?? [];

  const { title, isOnline, isNearby } = useMemo(() => {
    if (!conv) return { title: "Chat", isOnline: false, isNearby: false };
    if (conv.type === "group") {
      return { title: conv.name ?? "Groep", isOnline: false, isNearby: false };
    }
    const buddyId = conv.participantIds.find((pid) => pid !== profile?.id);
    const buddy = buddies.find((b) => b.id === buddyId);
    return {
      title: buddy?.name ?? "Onbekend",
      isOnline: buddy?.status === "online",
      isNearby: buddy?.status === "nearby",
    };
  }, [conv, buddies, profile]);

  const getSenderName = useCallback(
    (senderId: string) => {
      if (senderId === profile?.id) return "Jij";
      const b = buddies.find((b) => b.id === senderId);
      return b?.name ?? "Onbekend";
    },
    [buddies, profile]
  );

  const isGroup = conv?.type === "group";

  const handleSend = () => {
    if (!input.trim() || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(id, input.trim());
    setInput("");
  };

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const statusText = isOnline ? "Online" : isNearby ? "In de buurt" : "Offline";
  const statusColor = isOnline ? colors.online : isNearby ? colors.nearby : colors.mutedForeground;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.chatHeader,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Avatar
          name={title}
          size={36}
          isGroup={isGroup}
          showOnlineIndicator={!isGroup}
          isOnline={isOnline}
          isNearby={isNearby}
        />
        <View style={styles.chatHeaderInfo}>
          <Text style={[styles.chatTitle, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          {!isGroup && (
            <Text style={[styles.chatStatus, { color: statusColor }]}>{statusText}</Text>
          )}
          {isGroup && conv && (
            <Text style={[styles.chatStatus, { color: colors.mutedForeground }]}>
              {conv.participantIds.length} leden
            </Text>
          )}
        </View>
        <View style={[styles.encBadge, { backgroundColor: colors.success + "22" }]}>
          <Ionicons name="lock-closed" size={12} color={colors.success} />
          <Text style={[styles.encText, { color: colors.success }]}>E2E</Text>
        </View>
      </View>

      <FlatList
        data={[...convMessages].reverse()}
        keyExtractor={(m) => m.id}
        inverted
        renderItem={({ item }) => {
          const isMe = item.senderId === profile?.id;
          const senderName = isGroup && !isMe ? getSenderName(item.senderId) : undefined;
          return <MessageBubble msg={item} isMe={isMe} senderName={senderName} />;
        }}
        contentContainerStyle={styles.msgList}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!convMessages.length}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="lock-closed-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>
              Berichten zijn end-to-end versleuteld
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(bottomPad, 8),
          },
        ]}
      >
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Bericht..."
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
        </View>
        <Pressable
          style={[
            styles.sendBtn,
            {
              backgroundColor: input.trim() ? colors.primary : colors.muted,
            },
          ]}
          onPress={handleSend}
          disabled={!input.trim()}
          testID="send-button"
        >
          <Ionicons
            name="send"
            size={18}
            color={input.trim() ? colors.primaryForeground : colors.mutedForeground}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  chatHeaderInfo: { flex: 1 },
  chatTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  chatStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  encBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  encText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  msgList: { padding: 12, flexGrow: 1, justifyContent: "flex-end" },
  bubbleWrap: { marginVertical: 2 },
  bubbleLeft: { alignItems: "flex-start" },
  bubbleRight: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    paddingBottom: 6,
    gap: 2,
  },
  senderLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" },
  bubbleTime: { fontSize: 11 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 120,
  },
  textInput: { fontSize: 15, maxHeight: 100 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  emptyChat: { alignItems: "center", gap: 8, paddingTop: 60 },
  emptyChatText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
