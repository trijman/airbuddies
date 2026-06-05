import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
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

function ContactCardBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const colors = useColors();
  const card = msg.contactData;

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      style={[styles.bubbleWrap, isMe ? styles.bubbleRight : styles.bubbleLeft]}
    >
      <View
        style={[
          styles.contactCard,
          {
            backgroundColor: isMe ? colors.primary + "18" : colors.card,
            borderColor: isMe ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.contactCardHeader}>
          <View style={[styles.contactIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="person" size={18} color={colors.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactName, { color: colors.foreground }]}>{card?.name}</Text>
            <Text style={[styles.contactLabel, { color: colors.mutedForeground }]}>Contactkaart</Text>
          </View>
        </View>
        <View style={[styles.contactDivider, { backgroundColor: colors.border }]} />
        {card?.phone && (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.contactValue, { color: colors.foreground }]}>{card.phone}</Text>
          </View>
        )}
        {card?.email && (
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.contactValue, { color: colors.foreground }]}>{card.email}</Text>
          </View>
        )}
        {card?.instagram && (
          <View style={styles.contactRow}>
            <Ionicons name="logo-instagram" size={14} color={colors.mutedForeground} />
            <Text style={[styles.contactValue, { color: colors.foreground }]}>{card.instagram}</Text>
          </View>
        )}
        <View style={styles.contactMeta}>
          <Text style={[styles.contactTime, { color: colors.mutedForeground }]}>
            {formatMsgTime(msg.timestamp)}
          </Text>
          {isMe && <StatusIcon status={msg.status} />}
        </View>
      </View>
    </Animated.View>
  );
}

function MessageBubble({ msg, isMe, senderName }: { msg: Message; isMe: boolean; senderName?: string }) {
  const colors = useColors();

  if (msg.type === "contact-card") {
    return <ContactCardBubble msg={msg} isMe={isMe} />;
  }

  if (msg.type === "system") {
    return (
      <View style={styles.systemMsgWrap}>
        <Text style={[styles.systemMsg, { color: colors.mutedForeground }]}>{msg.content}</Text>
      </View>
    );
  }

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
          <Text style={[styles.senderLabel, { color: colors.primary }]}>{senderName}</Text>
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
  const { conversations, messages, profile, buddies, sendMessage, sendContactCard, markAsRead, clearChatHistory, leaveGroup } = useApp();
  const [input, setInput] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const isWeb = Platform.OS === "web";

  const conv = conversations.find((c) => c.id === id);
  const convMessages = messages[id ?? ""] ?? [];

  const { title, isOnline, isNearby, isFlight, memberCount } = useMemo(() => {
    if (!conv) return { title: "Chat", isOnline: false, isNearby: false, isFlight: false, memberCount: 0 };
    if (conv.type === "group") {
      return {
        title: conv.name ?? "Groep",
        isOnline: false,
        isNearby: false,
        isFlight: !!conv.flightNumber,
        memberCount: conv.participantIds.length,
      };
    }
    const buddyId = conv.participantIds.find((pid) => pid !== profile?.id);
    const buddy = buddies.find((b) => b.id === buddyId);
    return {
      title: buddy?.name ?? "Onbekend",
      isOnline: buddy?.status === "online",
      isNearby: buddy?.status === "nearby",
      isFlight: false,
      memberCount: 2,
    };
  }, [conv, buddies, profile]);

  const getSenderName = useCallback(
    (senderId: string) => {
      if (senderId === profile?.id) return "Jij";
      const b = buddies.find((b) => b.id === senderId);
      return b?.name ?? "Passagier";
    },
    [buddies, profile]
  );

  const isGroup = conv?.type === "group";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const statusText = isOnline ? "Online" : isNearby ? "In de buurt" : "Offline";
  const statusColor = isOnline ? colors.online : isNearby ? colors.nearby : colors.mutedForeground;

  const handleSend = () => {
    if (!input.trim() || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(id, input.trim());
    setInput("");
    setShowAttach(false);
  };

  const handleContactCard = () => {
    if (!id) return;
    setShowAttach(false);
    if (!profile?.phone && !profile?.email && !profile?.instagram) {
      Alert.alert(
        "Geen contactinfo",
        "Voeg je contactgegevens toe in je profiel (Instellingen → Mijn profiel).",
        [
          { text: "Naar profiel", onPress: () => router.push("/edit-profile") },
          { text: "Annuleer", style: "cancel" },
        ]
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendContactCard(id);
  };

  const handleMore = () => {
    const options = [
      {
        text: "Wis chatgeschiedenis",
        onPress: () =>
          Alert.alert("Wis geschiedenis", "Wil je alle berichten verwijderen?", [
            { text: "Annuleer", style: "cancel" },
            { text: "Verwijder", style: "destructive", onPress: () => clearChatHistory(id ?? "") },
          ]),
      },
      ...(isGroup
        ? [
            {
              text: "Verlaat groep",
              style: "destructive" as const,
              onPress: () =>
                Alert.alert("Verlaat groep", "Wil je deze groep verlaten?", [
                  { text: "Annuleer", style: "cancel" },
                  {
                    text: "Verlaten",
                    style: "destructive",
                    onPress: () => {
                      leaveGroup(id ?? "");
                      router.back();
                    },
                  },
                ]),
            },
          ]
        : []),
      { text: "Annuleer", style: "cancel" as const },
    ];
    Alert.alert(title, undefined, options);
  };

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
        <Pressable
          style={styles.headerCenter}
          onPress={() => {
            if (!isGroup && conv?.participantIds) {
              const buddyId = conv.participantIds.find((p) => p !== profile?.id);
              if (buddyId) router.push(`/profile/${buddyId}`);
            }
          }}
        >
          <Avatar
            name={title}
            size={36}
            isGroup={isGroup}
            showOnlineIndicator={!isGroup}
            isOnline={isOnline}
            isNearby={isNearby}
          />
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatTitleRow}>
              {isFlight && <Ionicons name="airplane" size={12} color={colors.primary} style={{ marginRight: 3 }} />}
              {conv?.isPrivate && isGroup && !isFlight && <Ionicons name="lock-closed" size={11} color={colors.nearby} style={{ marginRight: 3 }} />}
              <Text style={[styles.chatTitle, { color: colors.foreground }]} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {isGroup ? (
              <Text style={[styles.chatStatus, { color: colors.mutedForeground }]}>
                {memberCount} deelnemers
              </Text>
            ) : (
              <Text style={[styles.chatStatus, { color: statusColor }]}>{statusText}</Text>
            )}
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <View style={[styles.encBadge, { backgroundColor: colors.success + "22" }]}>
            <Ionicons name="lock-closed" size={11} color={colors.success} />
            <Text style={[styles.encText, { color: colors.success }]}>E2E</Text>
          </View>
          <Pressable onPress={handleMore} style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.mutedForeground} />
          </Pressable>
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

      {showAttach && (
        <View style={[styles.attachMenu, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.attachOption, { backgroundColor: colors.secondary }]}
            onPress={handleContactCard}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
            <Text style={[styles.attachLabel, { color: colors.foreground }]}>Contactkaart</Text>
          </Pressable>
          <Pressable
            style={[styles.attachOption, { backgroundColor: colors.muted }]}
            onPress={() => setShowAttach(false)}
          >
            <Ionicons name="close-circle-outline" size={26} color={colors.mutedForeground} />
            <Text style={[styles.attachLabel, { color: colors.mutedForeground }]}>Sluiten</Text>
          </Pressable>
        </View>
      )}

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
        <Pressable
          style={[styles.attachBtn, { backgroundColor: colors.muted }]}
          onPress={() => setShowAttach((v) => !v)}
        >
          <Ionicons name={showAttach ? "close" : "add"} size={22} color={colors.mutedForeground} />
        </Pressable>
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
            { backgroundColor: input.trim() ? colors.primary : colors.muted },
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
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  chatHeaderInfo: { flex: 1 },
  chatTitleRow: { flexDirection: "row", alignItems: "center" },
  chatTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  chatStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  encBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  encText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  moreBtn: { padding: 4 },
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
  systemMsgWrap: { alignItems: "center", paddingVertical: 8 },
  systemMsg: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  contactCard: {
    maxWidth: "78%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  contactCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  contactIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  contactName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  contactLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  contactDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  contactValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  contactMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, paddingHorizontal: 12, paddingBottom: 8 },
  contactTime: { fontSize: 11 },
  attachMenu: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachOption: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  attachLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  attachBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
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
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  emptyChat: { alignItems: "center", gap: 8, paddingTop: 60 },
  emptyChatText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
