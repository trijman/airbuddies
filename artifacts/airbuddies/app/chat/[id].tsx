import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { Avatar } from "@/components/Avatar";
import { InviteModal } from "@/components/InviteModal";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Message, MediaAttachment } from "@/context/AppContext";

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

function SenderLabel({ senderName, senderSeat, senderId }: { senderName?: string; senderSeat?: string; senderId?: string }) {
  const colors = useColors();
  if (!senderName) return null;
  return (
    <Pressable
      style={styles.senderRow}
      onPress={() => { if (senderId) router.push(`/profile/${senderId}`); }}
      disabled={!senderId}
    >
      <Text style={[styles.senderLabel, { color: colors.primary }]}>{senderName}</Text>
      {senderSeat && (
        <View style={styles.senderSeatTag}>
          <Ionicons name="airplane-outline" size={9} color={colors.primary + "99"} />
          <Text style={[styles.senderSeat, { color: colors.primary + "99" }]}>{senderSeat}</Text>
        </View>
      )}
    </Pressable>
  );
}

function MessageBubble({
  msg, isMe, senderName, senderSeat, senderId, onImagePress, onLongPress,
}: {
  msg: Message; isMe: boolean; senderName?: string; senderSeat?: string; senderId?: string;
  onImagePress?: (uri: string) => void;
  onLongPress?: (msg: Message) => void;
}) {
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

  if (msg.type === "image" && msg.attachment) {
    const asp = (msg.attachment.height && msg.attachment.width)
      ? msg.attachment.height / msg.attachment.width
      : 0.75;
    const imgW = 220;
    const imgH = Math.min(Math.max(imgW * asp, 120), 280);
    return (
      <Animated.View
        entering={FadeInUp.duration(200)}
        style={[styles.bubbleWrap, isMe ? styles.bubbleRight : styles.bubbleLeft]}
      >
        <Pressable
          onPress={() => msg.attachment?.uri && onImagePress?.(msg.attachment.uri)}
          onLongPress={() => onLongPress?.(msg)}
          delayLongPress={400}
        >
          <View style={[styles.imageBubble, { borderColor: isMe ? colors.primary : colors.border }]}>
            <SenderLabel senderName={senderName} senderSeat={senderSeat} senderId={senderId} />
            <Image
              source={{ uri: msg.attachment.uri }}
              style={{ width: imgW, height: imgH, borderRadius: 12 }}
              resizeMode="cover"
            />
            <View style={[styles.bubbleMeta, { paddingTop: 4 }]}>
              <Text style={[styles.bubbleTime, { color: colors.mutedForeground }]}>
                {formatMsgTime(msg.timestamp)}
              </Text>
              {isMe && <StatusIcon status={msg.status} />}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  if (msg.type === "document" && msg.attachment) {
    const sizeKB = msg.attachment.size ? Math.round(msg.attachment.size / 1024) : null;
    const ext = msg.attachment.name?.split(".").pop()?.toUpperCase() ?? "FILE";
    return (
      <Animated.View
        entering={FadeInUp.duration(200)}
        style={[styles.bubbleWrap, isMe ? styles.bubbleRight : styles.bubbleLeft]}
      >
        <Pressable
          onPress={async () => {
            if (!msg.attachment?.uri) return;
            try {
              const canOpen = await Linking.canOpenURL(msg.attachment.uri);
              if (canOpen) {
                await Linking.openURL(msg.attachment.uri);
              } else {
                Alert.alert("Kan niet openen", "Dit bestandstype wordt niet ondersteund op dit apparaat.");
              }
            } catch {
              Alert.alert("Fout", "Kon het document niet openen.");
            }
          }}
          onLongPress={() => onLongPress?.(msg)}
          delayLongPress={400}
        >
          <View
            style={[
              styles.docBubble,
              {
                backgroundColor: isMe ? colors.primary : colors.card,
                borderColor: isMe ? "transparent" : colors.border,
              },
            ]}
          >
            <SenderLabel senderName={senderName} senderSeat={senderSeat} senderId={senderId} />
            <View style={styles.docRow}>
              <View style={[styles.docIcon, { backgroundColor: isMe ? colors.primaryForeground + "22" : colors.muted }]}>
                <Ionicons name="document-text" size={22} color={isMe ? colors.primaryForeground : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.docName, { color: isMe ? colors.primaryForeground : colors.foreground }]}
                  numberOfLines={2}
                >
                  {msg.attachment.name ?? "Document"}
                </Text>
                <Text style={[styles.docMeta, { color: isMe ? colors.primaryForeground + "99" : colors.mutedForeground }]}>
                  {ext}{sizeKB ? ` · ${sizeKB} KB` : ""}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={isMe ? colors.primaryForeground + "99" : colors.mutedForeground} />
            </View>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, { color: isMe ? colors.primaryForeground + "99" : colors.mutedForeground }]}>
                {formatMsgTime(msg.timestamp)}
              </Text>
              {isMe && <StatusIcon status={msg.status} />}
            </View>
          </View>
        </Pressable>
      </Animated.View>
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
        <SenderLabel senderName={senderName} senderSeat={senderSeat} senderId={senderId} />
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
  const { conversations, messages, profile, buddies, sendMessage, sendMediaMessage, sendContactCard, markAsRead, clearChatHistory, muteConversation, leaveGroup, deleteMessage } = useApp();
  const [input, setInput] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [seatGate, setSeatGate] = useState(false);
  const [gateInput, setGateInput] = useState("");
  const [savingGate, setSavingGate] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const isWeb = Platform.OS === "web";

  const conv = conversations.find((c) => c.id === id);
  const convMessages = messages[id ?? ""] ?? [];

  // ── Seat gate: check if user has a seat number for this flight ──────────
  useFocusEffect(
    useCallback(() => {
      if (!conv?.flightNumber) { setSeatGate(false); return; }
      AsyncStorage.getItem("my_flights_v1").then((stored) => {
        if (!stored) { setSeatGate(true); return; }
        const flights: Array<{ flightNumber: string; seatNumber?: string }> = JSON.parse(stored);
        const match = flights.find((f) => f.flightNumber === conv.flightNumber);
        setSeatGate(!match?.seatNumber);
      }).catch(() => setSeatGate(false));
    }, [conv?.flightNumber])
  );

  const handleSeatGateConfirm = async () => {
    if (!gateInput.trim() || !conv?.flightNumber) return;
    setSavingGate(true);
    try {
      const stored = await AsyncStorage.getItem("my_flights_v1");
      if (stored) {
        const flights = JSON.parse(stored);
        const updated = flights.map((f: { flightNumber: string }) =>
          f.flightNumber === conv.flightNumber ? { ...f, seatNumber: gateInput.trim().toUpperCase() } : f
        );
        await AsyncStorage.setItem("my_flights_v1", JSON.stringify(updated));
      }
      setGateInput("");
      setSeatGate(false);
    } finally {
      setSavingGate(false);
    }
  };

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

  const getSenderSeat = useCallback(
    (senderId: string) => {
      const b = buddies.find((b) => b.id === senderId);
      return b?.seatNumber;
    },
    [buddies]
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

  const handlePickImage = async () => {
    if (!id) return;
    setShowAttach(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Toegang geweigerd", "Geef toegang tot je fotobibliotheek in de instellingen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const attachment: MediaAttachment = {
        uri: asset.uri,
        type: "image",
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType ?? "image/jpeg",
      };
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      sendMediaMessage(id, attachment);
    }
  };

  const handlePickCamera = async () => {
    if (!id) return;
    setShowAttach(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Toegang geweigerd", "Geef toegang tot je camera in de instellingen.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const attachment: MediaAttachment = {
        uri: asset.uri,
        type: "image",
        mimeType: asset.mimeType ?? "image/jpeg",
      };
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      sendMediaMessage(id, attachment);
    }
  };

  const handlePickDocument = async () => {
    if (!id) return;
    setShowAttach(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const attachment: MediaAttachment = {
          uri: asset.uri,
          type: "document",
          name: asset.name,
          size: asset.size ?? undefined,
          mimeType: asset.mimeType ?? undefined,
        };
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        sendMediaMessage(id, attachment);
      }
    } catch {
      Alert.alert("Fout", "Kon document niet openen.");
    }
  };

  const handleMore = () => {
    const isFlight = !!conv?.flightNumber;
    const isPrivateGroup = isGroup && conv?.isPrivate && !isFlight;
    const isPublicGroup = isGroup && !isPrivateGroup;
    const isMuted = conv?.muted ?? false;

    const options: Array<{ text: string; style?: "default" | "destructive" | "cancel"; onPress?: () => void }> = [
      {
        text: "Wis chatgeschiedenis",
        onPress: () =>
          Alert.alert("Wis geschiedenis", "Wil je alle berichten verwijderen?", [
            { text: "Annuleer", style: "cancel" },
            { text: "Verwijder", style: "destructive", onPress: () => clearChatHistory(id ?? "") },
          ]),
      },
    ];

    if (isPublicGroup || !isGroup) {
      options.push({
        text: isMuted ? "Dempen uitzetten" : "Dempen",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          muteConversation(id ?? "", !isMuted);
        },
      });
    }

    if (isPrivateGroup) {
      options.push({
        text: isMuted ? "Dempen uitzetten" : "Dempen",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          muteConversation(id ?? "", !isMuted);
        },
      });
      options.push({
        text: "Verlaat groep",
        style: "destructive",
        onPress: () =>
          Alert.alert("Verlaat groep", "Wil je deze groep verlaten? Je kunt later niet meer deelnemen.", [
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
      });
    }

    options.push({ text: "Annuleer", style: "cancel" });
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
            if (isGroup) {
              router.push(`/group-info/${id}`);
            } else if (conv?.participantIds) {
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
          {isGroup && (
            <Pressable
              onPress={() => setShowInvite(true)}
              style={[styles.inviteBtn, { backgroundColor: colors.primary + "18" }]}
              testID="invite-button"
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            </Pressable>
          )}
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
          const senderSeat = isGroup && !isMe ? getSenderSeat(item.senderId) : undefined;
          const handleLongPress = (msg: typeof item) => {
            if (!isMe) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert(
              "Bericht verwijderen",
              "Wil je dit bericht verwijderen?",
              [
                { text: "Annuleer", style: "cancel" },
                {
                  text: "Verwijder",
                  style: "destructive",
                  onPress: () => id && deleteMessage(id, msg.id),
                },
              ]
            );
          };
          return (
            <MessageBubble
              msg={item}
              isMe={isMe}
              senderName={senderName}
              senderSeat={senderSeat}
              senderId={isGroup && !isMe ? item.senderId : undefined}
              onImagePress={(uri) => setLightboxUri(uri)}
              onLongPress={handleLongPress}
            />
          );
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
            onPress={handlePickImage}
          >
            <Ionicons name="image-outline" size={26} color={colors.primary} />
            <Text style={[styles.attachLabel, { color: colors.foreground }]}>Foto</Text>
          </Pressable>
          <Pressable
            style={[styles.attachOption, { backgroundColor: colors.secondary }]}
            onPress={handlePickCamera}
          >
            <Ionicons name="camera-outline" size={26} color={colors.primary} />
            <Text style={[styles.attachLabel, { color: colors.foreground }]}>Camera</Text>
          </Pressable>
          <Pressable
            style={[styles.attachOption, { backgroundColor: colors.muted }]}
            onPress={handlePickDocument}
          >
            <Ionicons name="document-outline" size={26} color={colors.mutedForeground} />
            <Text style={[styles.attachLabel, { color: colors.foreground }]}>Document</Text>
          </Pressable>
          <Pressable
            style={[styles.attachOption, { backgroundColor: colors.muted }]}
            onPress={handleContactCard}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.mutedForeground} />
            <Text style={[styles.attachLabel, { color: colors.foreground }]}>Contactkaart</Text>
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

      {conv && isGroup && (
        <InviteModal
          visible={showInvite}
          onClose={() => setShowInvite(false)}
          conversationId={conv.id}
          currentParticipantIds={conv.participantIds}
        />
      )}

      {/* Fullscreen image lightbox */}
      <Modal
        visible={!!lightboxUri}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightboxUri(null)}
      >
        <Pressable style={styles.lightboxOverlay} onPress={() => setLightboxUri(null)}>
          <View style={styles.lightboxClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </View>
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      {/* Seat gate overlay for public flight chats */}
      {isFlight && seatGate && (
        <RNKeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.seatGate, { backgroundColor: colors.background }]}
        >
          <Pressable style={styles.seatGateBack} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          </Pressable>
          <Ionicons name="airplane" size={48} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.seatGateTitle, { color: colors.foreground }]}>Stoelnummer vereist</Text>
          <Text style={[styles.seatGateSub, { color: colors.mutedForeground }]}>
            Vul eerst je stoelnummer in om mee te doen aan de vluchtchat. Zo weet iedereen waar je zit.
          </Text>
          <TextInput
            style={[
              styles.seatGateInput,
              {
                color: colors.foreground,
                borderColor: gateInput ? colors.primary : colors.border,
                backgroundColor: colors.card,
              },
            ]}
            placeholder="bijv. 14A"
            placeholderTextColor={colors.mutedForeground}
            value={gateInput}
            onChangeText={(t) => setGateInput(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={5}
            returnKeyType="done"
            onSubmitEditing={handleSeatGateConfirm}
          />
          <Pressable
            style={[
              styles.seatGateBtn,
              { backgroundColor: colors.primary, opacity: gateInput.trim() && !savingGate ? 1 : 0.45 },
            ]}
            onPress={handleSeatGateConfirm}
            disabled={!gateInput.trim() || savingGate}
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
            <Text style={styles.seatGateBtnText}>Deelnemen aan vluchtchat</Text>
          </Pressable>
          <Pressable style={styles.seatGateSkip} onPress={() => router.back()}>
            <Text style={[styles.seatGateSkipText, { color: colors.mutedForeground }]}>Weet ik nog niet</Text>
          </Pressable>
        </RNKeyboardAvoidingView>
      )}
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
  inviteBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
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
  senderRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 1 },
  senderLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  senderSeatTag: { flexDirection: "row", alignItems: "center", gap: 2 },
  senderSeat: { fontSize: 10, fontFamily: "Inter_500Medium" },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" },
  bubbleTime: { fontSize: 11 },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.93)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  lightboxImage: {
    width: "100%",
    height: "80%",
  },
  imageBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 6,
    gap: 2,
  },
  docBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    paddingBottom: 8,
    gap: 6,
  },
  docRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  docIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 18 },
  docMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
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
  seatGate: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    gap: 12,
  },
  seatGateBack: {
    position: "absolute",
    top: 56,
    left: 20,
    padding: 8,
  },
  seatGateSkip: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  seatGateSkipText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  seatGateTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  seatGateSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 8 },
  seatGateInput: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
    textAlign: "center",
  },
  seatGateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    marginTop: 4,
  },
  seatGateBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
