import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: number;
  status: MessageStatus;
  type: "text" | "system";
}

export interface Buddy {
  id: string;
  name: string;
  avatar?: string;
  publicKey: string;
  fingerprint: string;
  isVerified: boolean;
  isFavorite: boolean;
  isBlocked: boolean;
  lastSeen?: number;
  status: "online" | "offline" | "nearby";
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
}

export interface NearbyDevice {
  id: string;
  name: string;
  fingerprint: string;
  signalStrength: number;
  hops: number;
}

export interface UserProfile {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
}

interface AppContextType {
  profile: UserProfile | null;
  buddies: Buddy[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  nearbyDevices: NearbyDevice[];
  isScanning: boolean;
  sendMessage: (conversationId: string, content: string) => void;
  addBuddy: (buddy: Omit<Buddy, "isVerified" | "isFavorite" | "isBlocked">) => void;
  removeBuddy: (buddyId: string) => void;
  toggleFavorite: (buddyId: string) => void;
  createGroup: (name: string, memberIds: string[]) => void;
  startScan: () => void;
  stopScan: () => void;
  acceptNearbyDevice: (device: NearbyDevice) => void;
  updateProfile: (name: string) => void;
  getConversationWith: (buddyId: string) => Conversation | undefined;
  startConversation: (buddyId: string) => Conversation;
  markAsRead: (conversationId: string) => void;
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

const DEMO_BUDDIES: Buddy[] = [
  {
    id: "buddy_1",
    name: "Sophie",
    publicKey: "pk_sophie_" + generateId(),
    fingerprint: generateFingerprint(),
    isVerified: true,
    isFavorite: true,
    isBlocked: false,
    lastSeen: Date.now() - 1000 * 60 * 2,
    status: "online",
  },
  {
    id: "buddy_2",
    name: "Liam",
    publicKey: "pk_liam_" + generateId(),
    fingerprint: generateFingerprint(),
    isVerified: false,
    isFavorite: false,
    isBlocked: false,
    lastSeen: Date.now() - 1000 * 60 * 45,
    status: "nearby",
  },
  {
    id: "buddy_3",
    name: "Mia",
    publicKey: "pk_mia_" + generateId(),
    fingerprint: generateFingerprint(),
    isVerified: true,
    isFavorite: false,
    isBlocked: false,
    lastSeen: Date.now() - 1000 * 60 * 60 * 3,
    status: "offline",
  },
];

const MY_ID = "me_" + generateId();
const MY_FINGERPRINT = generateFingerprint();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [buddies, setBuddies] = useState<Buddy[]>(DEMO_BUDDIES);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem("profile");
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      } else {
        const newProfile: UserProfile = {
          id: MY_ID,
          name: "Ik",
          publicKey: "pk_me_" + generateId(),
          fingerprint: MY_FINGERPRINT,
        };
        setProfile(newProfile);
        await AsyncStorage.setItem("profile", JSON.stringify(newProfile));
      }

      const storedConvs = await AsyncStorage.getItem("conversations");
      const storedMsgs = await AsyncStorage.getItem("messages");

      if (storedConvs) {
        setConversations(JSON.parse(storedConvs));
      } else {
        const demoConvs = buildDemoConversations();
        setConversations(demoConvs.conversations);
        setMessages(demoConvs.messages);
        await AsyncStorage.setItem("conversations", JSON.stringify(demoConvs.conversations));
        await AsyncStorage.setItem("messages", JSON.stringify(demoConvs.messages));
      }

      if (storedMsgs && storedConvs) {
        setMessages(JSON.parse(storedMsgs));
      }
    } catch (e) {
      console.error("Load error", e);
    }
  };

  const buildDemoConversations = () => {
    const conv1Id = "conv_sophie";
    const conv2Id = "conv_group_avontuur";
    const now = Date.now();

    const msg1: Message = {
      id: generateId(),
      conversationId: conv1Id,
      senderId: "buddy_1",
      content: "Hey! Ben jij al verbonden via Bluetooth?",
      timestamp: now - 1000 * 60 * 10,
      status: "read",
      type: "text",
    };
    const msg2: Message = {
      id: generateId(),
      conversationId: conv1Id,
      senderId: MY_ID,
      content: "Ja! Airbuddies werkt geweldig.",
      timestamp: now - 1000 * 60 * 8,
      status: "read",
      type: "text",
    };
    const msg3: Message = {
      id: generateId(),
      conversationId: conv1Id,
      senderId: "buddy_1",
      content: "Top! Geen internet nodig.",
      timestamp: now - 1000 * 60 * 2,
      status: "delivered",
      type: "text",
    };

    const gmsg1: Message = {
      id: generateId(),
      conversationId: conv2Id,
      senderId: "buddy_2",
      content: "Wie gaat er mee op avontuur?",
      timestamp: now - 1000 * 60 * 30,
      status: "read",
      type: "text",
    };
    const gmsg2: Message = {
      id: generateId(),
      conversationId: conv2Id,
      senderId: MY_ID,
      content: "Ik doe mee!",
      timestamp: now - 1000 * 60 * 25,
      status: "read",
      type: "text",
    };

    const conversations: Conversation[] = [
      {
        id: conv1Id,
        type: "direct",
        participantIds: [MY_ID, "buddy_1"],
        lastMessage: msg3,
        unreadCount: 1,
        createdAt: now - 1000 * 60 * 60,
        avatarSeed: "sophie",
      },
      {
        id: conv2Id,
        type: "group",
        name: "Avontuurclub",
        participantIds: [MY_ID, "buddy_2", "buddy_3"],
        lastMessage: gmsg2,
        unreadCount: 0,
        createdAt: now - 1000 * 60 * 60 * 2,
        avatarSeed: "avontuur",
      },
    ];

    const messages: Record<string, Message[]> = {
      [conv1Id]: [msg1, msg2, msg3],
      [conv2Id]: [gmsg1, gmsg2],
    };

    return { conversations, messages };
  };

  const saveConversations = async (convs: Conversation[]) => {
    await AsyncStorage.setItem("conversations", JSON.stringify(convs));
  };

  const saveMessages = async (msgs: Record<string, Message[]>) => {
    await AsyncStorage.setItem("messages", JSON.stringify(msgs));
  };

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!profile) return;
      const newMsg: Message = {
        id: generateId(),
        conversationId,
        senderId: profile.id,
        content,
        timestamp: Date.now(),
        status: "sending",
        type: "text",
      };

      setMessages((prev) => {
        const updated = {
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []), newMsg],
        };
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
          const convMsgs = prev[conversationId] ?? [];
          const updated = {
            ...prev,
            [conversationId]: convMsgs.map((m) =>
              m.id === newMsg.id ? { ...m, status: "delivered" as MessageStatus } : m
            ),
          };
          saveMessages(updated);
          return updated;
        });
      }, 800);
    },
    [profile]
  );

  const addBuddy = useCallback(
    async (buddy: Omit<Buddy, "isVerified" | "isFavorite" | "isBlocked">) => {
      const newBuddy: Buddy = {
        ...buddy,
        isVerified: false,
        isFavorite: false,
        isBlocked: false,
      };
      setBuddies((prev) => [...prev, newBuddy]);
    },
    []
  );

  const removeBuddy = useCallback((buddyId: string) => {
    setBuddies((prev) => prev.filter((b) => b.id !== buddyId));
  }, []);

  const toggleFavorite = useCallback((buddyId: string) => {
    setBuddies((prev) =>
      prev.map((b) => (b.id === buddyId ? { ...b, isFavorite: !b.isFavorite } : b))
    );
  }, []);

  const createGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      if (!profile) return;
      const newConv: Conversation = {
        id: "group_" + generateId(),
        type: "group",
        name,
        participantIds: [profile.id, ...memberIds],
        unreadCount: 0,
        createdAt: Date.now(),
        avatarSeed: name,
      };
      setConversations((prev) => {
        const updated = [newConv, ...prev];
        saveConversations(updated);
        return updated;
      });
    },
    [profile]
  );

  const startScan = useCallback(() => {
    setIsScanning(true);
    setNearbyDevices([]);

    const names = ["Alex", "Emma", "Noah", "Olivia", "James", "Ava"];
    let found = 0;

    const addDevice = () => {
      if (found >= 3) {
        setIsScanning(false);
        return;
      }
      const name = names[Math.floor(Math.random() * names.length)];
      const device: NearbyDevice = {
        id: "nearby_" + generateId(),
        name,
        fingerprint: generateFingerprint(),
        signalStrength: Math.floor(Math.random() * 40) + 60,
        hops: Math.floor(Math.random() * 3),
      };
      setNearbyDevices((prev) => [...prev, device]);
      found++;
      scanTimerRef.current = setTimeout(addDevice, 1200 + Math.random() * 1000);
    };

    scanTimerRef.current = setTimeout(addDevice, 800);
  }, []);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  }, []);

  const acceptNearbyDevice = useCallback((device: NearbyDevice) => {
    const newBuddy: Buddy = {
      id: device.id,
      name: device.name,
      publicKey: "pk_" + device.id,
      fingerprint: device.fingerprint,
      isVerified: false,
      isFavorite: false,
      isBlocked: false,
      lastSeen: Date.now(),
      status: "nearby",
    };
    setBuddies((prev) => {
      if (prev.find((b) => b.id === device.id)) return prev;
      return [...prev, newBuddy];
    });
    setNearbyDevices((prev) => prev.filter((d) => d.id !== device.id));
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, name };
      AsyncStorage.setItem("profile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getConversationWith = useCallback(
    (buddyId: string) => {
      return conversations.find(
        (c) => c.type === "direct" && c.participantIds.includes(buddyId)
      );
    },
    [conversations]
  );

  const startConversation = useCallback(
    (buddyId: string): Conversation => {
      const existing = conversations.find(
        (c) => c.type === "direct" && c.participantIds.includes(buddyId)
      );
      if (existing) return existing;

      if (!profile) throw new Error("No profile");
      const newConv: Conversation = {
        id: "direct_" + generateId(),
        type: "direct",
        participantIds: [profile.id, buddyId],
        unreadCount: 0,
        createdAt: Date.now(),
        avatarSeed: buddyId,
      };
      setConversations((prev) => {
        const updated = [newConv, ...prev];
        saveConversations(updated);
        return updated;
      });
      return newConv;
    },
    [conversations, profile]
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

  return (
    <AppContext.Provider
      value={{
        profile,
        buddies,
        conversations,
        messages,
        nearbyDevices,
        isScanning,
        sendMessage,
        addBuddy,
        removeBuddy,
        toggleFavorite,
        createGroup,
        startScan,
        stopScan,
        acceptNearbyDevice,
        updateProfile,
        getConversationWith,
        startConversation,
        markAsRead,
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
