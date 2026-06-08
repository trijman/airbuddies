import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { bleService, type AirbuddiesProfile, type AirbuddiesMessage } from "@/services/BLEService";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface ContactData {
  name: string;
  phone?: string;
  email?: string;
  instagram?: string;
}

export interface MediaAttachment {
  uri: string;
  type: "image" | "document" | "audio";
  name?: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: number;
  status: MessageStatus;
  type: "text" | "system" | "contact-card" | "image" | "document" | "audio";
  contactData?: ContactData;
  attachment?: MediaAttachment;
}

export type BuddyRelation = "buddy" | "pending_sent" | "pending_received" | "none";

export interface Buddy {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  isVerified: boolean;
  isFavorite: boolean;
  isBlocked: boolean;
  relation: BuddyRelation;
  lastSeen?: number;
  status: "online" | "offline" | "nearby";
  age?: number;
  bio?: string;
  interests?: string[];
  seatNumber?: string;
  avatarUri?: string;
  gender?: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name?: string;
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: number;
  avatarSeed?: string;
  isPrivate: boolean;
  flightNumber?: string;
  description?: string;
  muted?: boolean;
  adminId?: string;
}

export interface NearbyDevice {
  id: string;
  name: string;
  fingerprint: string;
  signalStrength: number;
  hops: number;
  interests?: string[];
  seatNumber?: string;
  age?: number;
  gender?: string;
}

export const INTERESTS = [
  "Reizen", "Eten & Drinken", "Muziek", "Sport", "Lezen",
  "Film & TV", "Fotografie", "Technologie", "Natuur", "Cultuur",
  "Kunst", "Ondernemen", "Mode", "Fitness", "Gaming",
  "Yoga", "Wijn", "Koken", "Duiken", "Wandelen",
];

export interface UserProfile {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  gender?: string;
  age?: number;
  bio?: string;
  interests: string[];
  seatNumber?: string;
  avatarUri?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  isVisible: boolean;
  avatarSeed?: string;
}

interface AppContextType {
  profile: UserProfile | null;
  buddies: Buddy[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  nearbyDevices: NearbyDevice[];
  isScanning: boolean;
  onboardingComplete: boolean | null;
  sendMessage: (conversationId: string, content: string) => void;
  sendMediaMessage: (conversationId: string, attachment: MediaAttachment, caption?: string) => void;
  sendContactCard: (conversationId: string) => void;
  addBuddy: (buddy: Omit<Buddy, "isVerified" | "isFavorite" | "isBlocked" | "relation">) => void;
  removeBuddy: (buddyId: string) => void;
  toggleFavorite: (buddyId: string) => void;
  sendBuddyRequest: (device: NearbyDevice) => void;
  acceptBuddyRequest: (buddyId: string) => void;
  declineBuddyRequest: (buddyId: string) => void;
  createGroup: (
    name: string,
    memberIds: string[],
    options?: { isPrivate?: boolean; flightNumber?: string }
  ) => Conversation;
  startScan: () => void;
  stopScan: () => void;
  acceptNearbyDevice: (device: NearbyDevice) => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  toggleVisibility: () => void;
  getConversationWith: (buddyId: string) => Conversation | undefined;
  startConversation: (buddyId: string) => Conversation;
  markAsRead: (conversationId: string) => void;
  clearChatHistory: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  transferAdmin: (conversationId: string, newAdminId: string, newAdminName?: string) => void;
  inviteToGroup: (conversationId: string, buddyIds: string[]) => void;
  muteConversation: (conversationId: string, muted: boolean) => void;
  leaveGroup: (conversationId: string) => void;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<void>;
  activeAirlineIata: string | null;
  setActiveAirlineIata: (iata: string | null) => void;
  activeAircraftType: string | null;
  activeSeatNumber: string | null;
  setActiveSeatNumber: (seat: string | null) => void;
  refreshActiveFlight: () => Promise<void>;
  addSystemMessage: (conversationId: string, content: string) => void;
  deleteConversationsByFlightNumber: (flightNumber: string) => void;
  deleteAllConversations: () => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generateFingerprint(): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 40; i++) {
    if (i > 0 && i % 4 === 0) result += ":";
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

async function getOrCreateDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem("device_id_v1");
  if (stored) return stored;
  const newId = "dev_" + generateId();
  await AsyncStorage.setItem("device_id_v1", newId);
  return newId;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [activeAirlineIata, setActiveAirlineIata] = useState<string | null>(null);
  const [activeAircraftType, setActiveAircraftType] = useState<string | null>(null);
  const [activeSeatNumber, setActiveSeatNumber] = useState<string | null>(null);

  const profileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    loadData();
    return () => {
      bleService.stopScan();
    };
  }, []);

  const loadData = async () => {
    try {
      const deviceId = await getOrCreateDeviceId();

      const [storedProfile, onboardingDone, storedBuddies, storedConvs, storedMsgs] =
        await Promise.all([
          AsyncStorage.getItem("profile_v2"),
          AsyncStorage.getItem("onboarding_done_v1"),
          AsyncStorage.getItem("buddies_v1"),
          AsyncStorage.getItem("conversations_v2"),
          AsyncStorage.getItem("messages_v2"),
        ]);

      setOnboardingComplete(onboardingDone === "1");

      let loadedProfile: UserProfile;
      if (storedProfile) {
        loadedProfile = { ...JSON.parse(storedProfile), id: deviceId };
        setProfile(loadedProfile);
      } else {
        loadedProfile = {
          id: deviceId,
          name: "Reiziger",
          publicKey: "pk_" + deviceId,
          fingerprint: generateFingerprint(),
          interests: [],
          isVisible: true,
          avatarSeed: "me",
        };
        setProfile(loadedProfile);
        await AsyncStorage.setItem("profile_v2", JSON.stringify(loadedProfile));
      }

      if (storedBuddies) {
        setBuddies(JSON.parse(storedBuddies));
      }

      if (storedConvs) setConversations(JSON.parse(storedConvs));
      if (storedMsgs) setMessages(JSON.parse(storedMsgs));

      try {
        const storedFlights = await AsyncStorage.getItem("my_flights_v1");
        if (storedFlights) {
          const flights: Array<{ flightNumber: string; flightDate: string; seatNumber?: string; flightInfo?: { iataCode?: string; scheduledDeparture?: string | null; aircraftType?: string | null } }> = JSON.parse(storedFlights);
          const now = new Date();
          const sorted = [...flights].sort((a, b) => {
            const aT = a.flightInfo?.scheduledDeparture ?? `${a.flightDate}T23:59:59`;
            const bT = b.flightInfo?.scheduledDeparture ?? `${b.flightDate}T23:59:59`;
            return aT.localeCompare(bT);
          });
          const active = sorted.find((f) => new Date(f.flightInfo?.scheduledDeparture ?? `${f.flightDate}T23:59:59`) > now)
            ?? sorted[sorted.length - 1];
          if (active) {
            const iata = active.flightInfo?.iataCode ?? active.flightNumber.slice(0, 2).toUpperCase();
            setActiveAirlineIata(iata);
            setActiveAircraftType(active.flightInfo?.aircraftType ?? null);
            setActiveSeatNumber(active.seatNumber ?? null);
          }
        }
      } catch { }

      initBLE(loadedProfile);
    } catch (e) {
      setOnboardingComplete(false);
    }
  };

  const initBLE = async (userProfile: UserProfile) => {
    try {
      bleService.init();
      const permitted = await bleService.requestPermissions();
      if (!permitted) return;

      const powered = await bleService.waitForPoweredOn(6000);
      if (!powered) return;

      const bleProfile: AirbuddiesProfile = {
        id: userProfile.id,
        name: userProfile.name,
        fingerprint: userProfile.fingerprint,
        interests: userProfile.interests,
        seatNumber: userProfile.seatNumber,
        age: userProfile.age,
        gender: userProfile.gender,
      };
      bleService.setProfile(bleProfile);

      bleService.setOnMessageReceived((msg: AirbuddiesMessage) => {
        const incomingMsg: Message = {
          id: generateId(),
          conversationId: msg.conversationId,
          senderId: msg.fromId,
          content: msg.content,
          timestamp: msg.timestamp,
          status: "delivered",
          type: (msg.type as Message["type"]) ?? "text",
        };

        setMessages((prev) => {
          const updated = {
            ...prev,
            [msg.conversationId]: [...(prev[msg.conversationId] ?? []), incomingMsg],
          };
          AsyncStorage.setItem("messages_v2", JSON.stringify(updated));
          return updated;
        });

        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === msg.conversationId
              ? { ...c, lastMessage: incomingMsg, unreadCount: c.unreadCount + 1 }
              : c
          );
          AsyncStorage.setItem("conversations_v2", JSON.stringify(updated));
          return updated;
        });
      });

      await bleService.startAdvertising();
    } catch (e) {
      console.warn("[BLE] Init error:", e);
    }
  };

  const saveConversations = async (convs: Conversation[]) => {
    await AsyncStorage.setItem("conversations_v2", JSON.stringify(convs));
  };

  const saveMessages = async (msgs: Record<string, Message[]>) => {
    await AsyncStorage.setItem("messages_v2", JSON.stringify(msgs));
  };

  const saveBuddies = async (b: Buddy[]) => {
    await AsyncStorage.setItem("buddies_v1", JSON.stringify(b));
  };

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      const currentProfile = profileRef.current;
      if (!currentProfile) return;

      const newMsg: Message = {
        id: generateId(),
        conversationId,
        senderId: currentProfile.id,
        content,
        timestamp: Date.now(),
        status: "sending",
        type: "text",
      };

      setMessages((prev) => {
        const updated = { ...prev, [conversationId]: [...(prev[conversationId] ?? []), newMsg] };
        saveMessages(updated);
        return updated;
      });

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: newMsg } : c
        );
        saveConversations(updated);
        return updated;
      });

      const updateStatus = (status: MessageStatus) => {
        setMessages((prev) => {
          const updated = {
            ...prev,
            [conversationId]: (prev[conversationId] ?? []).map((m) =>
              m.id === newMsg.id ? { ...m, status } : m
            ),
          };
          saveMessages(updated);
          return updated;
        });
      };

      const conv = conversations.find((c) => c.id === conversationId);
      const recipientId = conv?.type === "direct"
        ? conv.participantIds.find((id) => id !== currentProfile.id)
        : undefined;

      if (recipientId) {
        const bleMsg: AirbuddiesMessage = {
          fromId: currentProfile.id,
          content,
          timestamp: newMsg.timestamp,
          conversationId,
          type: "text",
        };
        const delivered = await bleService.sendMessageViaBLE(recipientId, bleMsg);
        updateStatus(delivered ? "delivered" : "sent");
      } else {
        setTimeout(() => updateStatus("sent"), 500);
      }
    },
    [conversations]
  );

  const sendMediaMessage = useCallback(
    async (conversationId: string, attachment: MediaAttachment, caption = "") => {
      const currentProfile = profileRef.current;
      if (!currentProfile) return;
      const label =
        attachment.type === "image" ? (caption || "📷 Afbeelding")
        : attachment.type === "document" ? (attachment.name ?? "📄 Document")
        : (attachment.name ?? "🎵 Audio");
      const newMsg: Message = {
        id: generateId(),
        conversationId,
        senderId: currentProfile.id,
        content: label,
        timestamp: Date.now(),
        status: "sending",
        type: attachment.type,
        attachment,
      };
      setMessages((prev) => {
        const updated = { ...prev, [conversationId]: [...(prev[conversationId] ?? []), newMsg] };
        saveMessages(updated);
        return updated;
      });
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: newMsg } : c
        );
        saveConversations(updated);
        return updated;
      });
      setTimeout(() => {
        setMessages((prev) => {
          const updated = {
            ...prev,
            [conversationId]: (prev[conversationId] ?? []).map((m) =>
              m.id === newMsg.id ? { ...m, status: "sent" as MessageStatus } : m
            ),
          };
          saveMessages(updated);
          return updated;
        });
      }, 700);
    },
    []
  );

  const sendContactCard = useCallback(
    async (conversationId: string) => {
      const currentProfile = profileRef.current;
      if (!currentProfile) return;
      const cardMsg: Message = {
        id: generateId(),
        conversationId,
        senderId: currentProfile.id,
        content: `Contactkaart van ${currentProfile.name}`,
        timestamp: Date.now(),
        status: "sending",
        type: "contact-card",
        contactData: {
          name: currentProfile.name,
          phone: currentProfile.phone,
          email: currentProfile.email,
          instagram: currentProfile.instagram,
        },
      };
      setMessages((prev) => {
        const updated = { ...prev, [conversationId]: [...(prev[conversationId] ?? []), cardMsg] };
        saveMessages(updated);
        return updated;
      });
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: cardMsg } : c
        );
        saveConversations(updated);
        return updated;
      });
      setTimeout(() => {
        setMessages((prev) => {
          const updated = {
            ...prev,
            [conversationId]: (prev[conversationId] ?? []).map((m) =>
              m.id === cardMsg.id ? { ...m, status: "sent" as MessageStatus } : m
            ),
          };
          saveMessages(updated);
          return updated;
        });
      }, 600);
    },
    []
  );

  const addBuddy = useCallback(
    (buddy: Omit<Buddy, "isVerified" | "isFavorite" | "isBlocked" | "relation">) => {
      const newBuddy: Buddy = { ...buddy, isVerified: false, isFavorite: false, isBlocked: false, relation: "buddy" };
      setBuddies((prev) => {
        if (prev.find((b) => b.id === buddy.id)) return prev;
        const updated = [...prev, newBuddy];
        saveBuddies(updated);
        return updated;
      });
    },
    []
  );

  const removeBuddy = useCallback((buddyId: string) => {
    setBuddies((prev) => {
      const updated = prev.filter((b) => b.id !== buddyId);
      saveBuddies(updated);
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((buddyId: string) => {
    setBuddies((prev) => {
      const updated = prev.map((b) => (b.id === buddyId ? { ...b, isFavorite: !b.isFavorite } : b));
      saveBuddies(updated);
      return updated;
    });
  }, []);

  const sendBuddyRequest = useCallback((device: NearbyDevice) => {
    const newBuddy: Buddy = {
      id: device.id,
      name: device.name,
      publicKey: "pk_" + device.id,
      fingerprint: device.fingerprint,
      isVerified: false,
      isFavorite: false,
      isBlocked: false,
      relation: "pending_sent",
      lastSeen: Date.now(),
      status: "nearby",
      interests: device.interests,
      seatNumber: device.seatNumber,
      age: device.age,
      gender: device.gender,
    };
    setBuddies((prev) => {
      if (prev.find((b) => b.id === device.id)) return prev;
      const updated = [...prev, newBuddy];
      saveBuddies(updated);
      return updated;
    });
    setNearbyDevices((prev) => prev.filter((d) => d.id !== device.id));
  }, []);

  const acceptBuddyRequest = useCallback((buddyId: string) => {
    setBuddies((prev) => {
      const updated = prev.map((b) => (b.id === buddyId ? { ...b, relation: "buddy" as BuddyRelation } : b));
      saveBuddies(updated);
      return updated;
    });
  }, []);

  const declineBuddyRequest = useCallback((buddyId: string) => {
    setBuddies((prev) => {
      const updated = prev.filter((b) => b.id !== buddyId);
      saveBuddies(updated);
      return updated;
    });
  }, []);

  const createGroup = useCallback(
    (
      name: string,
      memberIds: string[],
      options?: { isPrivate?: boolean; flightNumber?: string }
    ): Conversation => {
      const currentProfile = profileRef.current;
      if (!currentProfile) throw new Error("No profile");
      const newConv: Conversation = {
        id: "group_" + generateId(),
        type: "group",
        name,
        participantIds: [currentProfile.id, ...memberIds],
        unreadCount: 0,
        createdAt: Date.now(),
        avatarSeed: options?.flightNumber ?? name,
        isPrivate: options?.isPrivate ?? false,
        flightNumber: options?.flightNumber,
        adminId: currentProfile.id,
      };
      setConversations((prev) => {
        const updated = [newConv, ...prev];
        saveConversations(updated);
        return updated;
      });
      return newConv;
    },
    []
  );

  const startScan = useCallback(() => {
    setIsScanning(true);
    setNearbyDevices([]);

    bleService.setOnDeviceFound((bleProfile, rssi) => {
      const device: NearbyDevice = {
        id: bleProfile.id,
        name: bleProfile.name,
        fingerprint: bleProfile.fingerprint,
        signalStrength: rssi,
        hops: 0,
        interests: bleProfile.interests,
        seatNumber: bleProfile.seatNumber,
        age: bleProfile.age,
        gender: bleProfile.gender,
      };
      setNearbyDevices((prev) => {
        if (prev.find((d) => d.id === device.id)) return prev;
        return [...prev, device];
      });
    });

    bleService.startScan();
  }, []);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    bleService.stopScan();
  }, []);

  const acceptNearbyDevice = useCallback((device: NearbyDevice) => {
    addBuddy({
      id: device.id,
      name: device.name,
      publicKey: "pk_" + device.id,
      fingerprint: device.fingerprint,
      lastSeen: Date.now(),
      status: "nearby",
      interests: device.interests,
      seatNumber: device.seatNumber,
      age: device.age,
      gender: device.gender,
    });
    setNearbyDevices((prev) => prev.filter((d) => d.id !== device.id));
  }, [addBuddy]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      AsyncStorage.setItem("profile_v2", JSON.stringify(updated));
      const bleProfile: AirbuddiesProfile = {
        id: updated.id,
        name: updated.name,
        fingerprint: updated.fingerprint,
        interests: updated.interests,
        seatNumber: updated.seatNumber,
        age: updated.age,
        gender: updated.gender,
      };
      bleService.setProfile(bleProfile);
      return updated;
    });
  }, []);

  const toggleVisibility = useCallback(() => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isVisible: !prev.isVisible };
      AsyncStorage.setItem("profile_v2", JSON.stringify(updated));
      if (updated.isVisible) {
        bleService.startAdvertising().catch(() => {});
      } else {
        bleService.stopAdvertising().catch(() => {});
      }
      return updated;
    });
  }, []);

  const getConversationWith = useCallback(
    (buddyId: string) =>
      conversations.find((c) => c.type === "direct" && c.participantIds.includes(buddyId)),
    [conversations]
  );

  const startConversation = useCallback(
    (buddyId: string): Conversation => {
      const existing = conversations.find(
        (c) => c.type === "direct" && c.participantIds.includes(buddyId)
      );
      if (existing) return existing;
      const currentProfile = profileRef.current;
      if (!currentProfile) throw new Error("No profile");
      const newConv: Conversation = {
        id: "direct_" + generateId(),
        type: "direct",
        participantIds: [currentProfile.id, buddyId],
        unreadCount: 0,
        createdAt: Date.now(),
        avatarSeed: buddyId,
        isPrivate: true,
      };
      setConversations((prev) => {
        const updated = [newConv, ...prev];
        saveConversations(updated);
        return updated;
      });
      return newConv;
    },
    [conversations]
  );

  const markAsRead = useCallback((conversationId: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      );
      saveConversations(updated);
      return updated;
    });
  }, []);

  const transferAdmin = useCallback((conversationId: string, newAdminId: string, newAdminName?: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId ? { ...c, adminId: newAdminId } : c
      );
      saveConversations(updated);
      return updated;
    });
    const label = newAdminName ?? "Nieuwe deelnemer";
    const sysMsg: Message = {
      id: `sys_${Date.now()}`,
      conversationId,
      senderId: "system",
      type: "system",
      content: `${label} is de nieuwe beheerder van dit gesprek.`,
      timestamp: Date.now(),
      status: "read",
    };
    setMessages((prev) => {
      const updated = {
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), sysMsg],
      };
      saveMessages(updated);
      return updated;
    });
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    setMessages((prev) => {
      const updated = { ...prev };
      delete updated[conversationId];
      saveMessages(updated);
      return updated;
    });
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== conversationId);
      saveConversations(updated);
      return updated;
    });
  }, []);

  const clearChatHistory = useCallback((conversationId: string) => {
    setMessages((prev) => {
      const updated = { ...prev, [conversationId]: [] };
      saveMessages(updated);
      return updated;
    });
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: undefined, unreadCount: 0 } : c
      );
      saveConversations(updated);
      return updated;
    });
  }, []);

  const muteConversation = useCallback((conversationId: string, muted: boolean) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId ? { ...c, muted } : c
      );
      saveConversations(updated);
      return updated;
    });
  }, []);

  const inviteToGroup = useCallback((conversationId: string, buddyIds: string[]) => {
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== conversationId) return c;
        const newIds = buddyIds.filter((id) => !c.participantIds.includes(id));
        return { ...c, participantIds: [...c.participantIds, ...newIds] };
      });
      saveConversations(updated);
      return updated;
    });
  }, []);

  const deleteMessage = useCallback((conversationId: string, messageId: string) => {
    setMessages((prev) => {
      const updated = {
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).filter((m) => m.id !== messageId),
      };
      saveMessages(updated);
      return updated;
    });
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === conversationId);
      if (!conv || conv.lastMessage?.id !== messageId) return prev;
      const remaining = (messages[conversationId] ?? []).filter((m) => m.id !== messageId);
      const newLast = remaining.length ? remaining[remaining.length - 1] : undefined;
      const updated = prev.map((c) => c.id === conversationId ? { ...c, lastMessage: newLast } : c);
      saveConversations(updated);
      return updated;
    });
  }, [messages]);

  const addSystemMessage = useCallback((conversationId: string, content: string) => {
    const sysMsg: Message = {
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      conversationId,
      senderId: "system",
      type: "system",
      content,
      timestamp: Date.now(),
      status: "read",
    };
    setMessages((prev) => {
      const updated = {
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), sysMsg],
      };
      saveMessages(updated);
      return updated;
    });
  }, []);

  const refreshActiveFlight = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("my_flights_v1");
      if (!stored) return;
      const flights: Array<{ flightNumber: string; flightDate: string; seatNumber?: string; flightInfo?: { iataCode?: string; scheduledDeparture?: string | null; aircraftType?: string | null } }> = JSON.parse(stored);
      const now = new Date();
      const sorted = [...flights].sort((a, b) => {
        const aT = a.flightInfo?.scheduledDeparture ?? `${a.flightDate}T23:59:59`;
        const bT = b.flightInfo?.scheduledDeparture ?? `${b.flightDate}T23:59:59`;
        return aT.localeCompare(bT);
      });
      const active = sorted.find((f) => new Date(f.flightInfo?.scheduledDeparture ?? `${f.flightDate}T23:59:59`) > now)
        ?? sorted[sorted.length - 1];
      if (active) {
        const iata = active.flightInfo?.iataCode ?? active.flightNumber.slice(0, 2).toUpperCase();
        setActiveAirlineIata(iata);
        setActiveAircraftType(active.flightInfo?.aircraftType ?? null);
        setActiveSeatNumber(active.seatNumber ?? null);
      }
    } catch { }
  }, []);

  const deleteConversationsByFlightNumber = useCallback((flightNumber: string) => {
    setConversations((prev) => {
      const toDelete = new Set(prev.filter((c) => c.flightNumber === flightNumber).map((c) => c.id));
      setMessages((prevMsgs) => {
        const updated = { ...prevMsgs };
        toDelete.forEach((id) => delete updated[id]);
        saveMessages(updated);
        return updated;
      });
      const updated = prev.filter((c) => c.flightNumber !== flightNumber);
      saveConversations(updated);
      return updated;
    });
  }, []);

  const deleteAllConversations = useCallback(() => {
    const empty: Conversation[] = [];
    const emptyMsgs: Record<string, Message[]> = {};
    setConversations(empty);
    setMessages(emptyMsgs);
    saveConversations(empty);
    saveMessages(emptyMsgs);
  }, []);

  const leaveGroup = useCallback((conversationId: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== conversationId);
      saveConversations(updated);
      return updated;
    });
    setMessages((prev) => {
      const updated = { ...prev };
      delete updated[conversationId];
      saveMessages(updated);
      return updated;
    });
  }, []);

  const completeOnboarding = useCallback(async (data: Partial<UserProfile>) => {
    const deviceId = await getOrCreateDeviceId();
    const completed: UserProfile = {
      id: deviceId,
      publicKey: "pk_" + deviceId,
      fingerprint: generateFingerprint(),
      isVisible: true,
      interests: [],
      name: "Reiziger",
      avatarSeed: data.name ?? "me",
      ...data,
    };
    setProfile(completed);
    await AsyncStorage.setItem("profile_v2", JSON.stringify(completed));
    await AsyncStorage.setItem("onboarding_done_v1", "1");
    setOnboardingComplete(true);

    const bleProfile: AirbuddiesProfile = {
      id: completed.id,
      name: completed.name,
      fingerprint: completed.fingerprint,
      interests: completed.interests,
      seatNumber: completed.seatNumber,
      age: completed.age,
      gender: completed.gender,
    };
    bleService.setProfile(bleProfile);
    bleService.startAdvertising().catch(() => {});
  }, []);

  return (
    <AppContext.Provider
      value={{
        profile,
        buddies,
        conversations,
        messages,
        nearbyDevices,
        isScanning,
        onboardingComplete,
        sendMessage,
        sendContactCard,
        addBuddy,
        removeBuddy,
        toggleFavorite,
        sendBuddyRequest,
        acceptBuddyRequest,
        declineBuddyRequest,
        createGroup,
        startScan,
        stopScan,
        acceptNearbyDevice,
        updateProfile,
        toggleVisibility,
        getConversationWith,
        startConversation,
        markAsRead,
        clearChatHistory,
        deleteConversation,
        transferAdmin,
        inviteToGroup,
        muteConversation,
        leaveGroup,
        sendMediaMessage,
        completeOnboarding,
        activeAirlineIata,
        setActiveAirlineIata,
        activeAircraftType,
        activeSeatNumber,
        setActiveSeatNumber,
        refreshActiveFlight,
        addSystemMessage,
        deleteConversationsByFlightNumber,
        deleteAllConversations,
        deleteMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
