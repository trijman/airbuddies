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
  transferAdmin: (conversationId: string, newAdminId: string) => void;
  inviteToGroup: (conversationId: string, buddyIds: string[]) => void;
  muteConversation: (conversationId: string, muted: boolean) => void;
  leaveGroup: (conversationId: string) => void;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<void>;
  activeAirlineIata: string | null;
  setActiveAirlineIata: (iata: string | null) => void;
  activeAircraftType: string | null;
  activeSeatNumber: string | null;
  setActiveSeatNumber: (seat: string | null) => void;
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

const MY_ID = "me_static_001";
const MY_FINGERPRINT = "a3:f1:2c:99:4e:b7:d0:11:8a:3c:55:ee:90:12:ab:cd";

const DEMO_BUDDIES: Buddy[] = [
  {
    id: "buddy_1",
    name: "Sophie",
    publicKey: "pk_sophie_001",
    fingerprint: generateFingerprint(),
    isVerified: true,
    isFavorite: true,
    isBlocked: false,
    relation: "buddy",
    lastSeen: Date.now() - 1000 * 60 * 2,
    status: "online",
    age: 28,
    gender: "Vrouw",
    bio: "Reiziger, foodie en fotograaf. Altijd op zoek naar de volgende bestemming!",
    interests: ["Reizen", "Fotografie", "Eten & Drinken", "Cultuur"],
    seatNumber: "14A",
  },
  {
    id: "buddy_2",
    name: "Liam",
    publicKey: "pk_liam_001",
    fingerprint: generateFingerprint(),
    isVerified: false,
    isFavorite: false,
    isBlocked: false,
    relation: "buddy",
    lastSeen: Date.now() - 1000 * 60 * 45,
    status: "nearby",
    age: 34,
    gender: "Man",
    bio: "Ondernemer en tech-liefhebber. Vaak in de lucht voor werk.",
    interests: ["Technologie", "Ondernemen", "Muziek"],
    seatNumber: "22C",
  },
  {
    id: "buddy_3",
    name: "Mia",
    publicKey: "pk_mia_001",
    fingerprint: generateFingerprint(),
    isVerified: true,
    isFavorite: false,
    isBlocked: false,
    relation: "buddy",
    lastSeen: Date.now() - 1000 * 60 * 60 * 3,
    status: "offline",
    age: 25,
    gender: "Vrouw",
    bio: "Duiker en yogadocent. Dol op avontuur.",
    interests: ["Duiken", "Yoga", "Natuur", "Reizen"],
    seatNumber: "7F",
  },
  {
    id: "req_1",
    name: "Lucas",
    publicKey: "pk_lucas_001",
    fingerprint: generateFingerprint(),
    isVerified: false,
    isFavorite: false,
    isBlocked: false,
    relation: "pending_received",
    lastSeen: Date.now() - 1000 * 60 * 5,
    status: "nearby",
    age: 29,
    gender: "Man",
    bio: "Muzikant op tournee. Altijd in voor een goed gesprek.",
    interests: ["Muziek", "Reizen", "Film & TV"],
    seatNumber: "18B",
  },
  {
    id: "req_2",
    name: "Yasmin",
    publicKey: "pk_yasmin_001",
    fingerprint: generateFingerprint(),
    isVerified: false,
    isFavorite: false,
    isBlocked: false,
    relation: "pending_received",
    lastSeen: Date.now() - 1000 * 60 * 12,
    status: "nearby",
    age: 31,
    gender: "Vrouw",
    bio: "Foodblogger en wijnliefhebber.",
    interests: ["Eten & Drinken", "Wijn", "Koken", "Reizen"],
    seatNumber: "9C",
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [buddies, setBuddies] = useState<Buddy[]>(DEMO_BUDDIES);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [activeAirlineIata, setActiveAirlineIata] = useState<string | null>(null);
  const [activeAircraftType, setActiveAircraftType] = useState<string | null>(null);
  const [activeSeatNumber, setActiveSeatNumber] = useState<string | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedProfile, onboardingDone] = await Promise.all([
        AsyncStorage.getItem("profile_v2"),
        AsyncStorage.getItem("onboarding_done_v1"),
      ]);

      setOnboardingComplete(onboardingDone === "1");

      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      } else {
        const newProfile: UserProfile = {
          id: MY_ID,
          name: "Ik",
          publicKey: "pk_me_001",
          fingerprint: MY_FINGERPRINT,
          interests: [],
          isVisible: true,
          avatarSeed: "me",
        };
        setProfile(newProfile);
        await AsyncStorage.setItem("profile_v2", JSON.stringify(newProfile));
      }

      // Load active airline from registered flights (pick first upcoming, then latest past)
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
      } catch { /* ignore */ }

      const storedConvs = await AsyncStorage.getItem("conversations_v2");
      const storedMsgs = await AsyncStorage.getItem("messages_v2");

      if (storedConvs && storedMsgs) {
        setConversations(JSON.parse(storedConvs));
        setMessages(JSON.parse(storedMsgs));
      } else {
        const demo = buildDemoData();
        setConversations(demo.conversations);
        setMessages(demo.messages);
        await AsyncStorage.setItem("conversations_v2", JSON.stringify(demo.conversations));
        await AsyncStorage.setItem("messages_v2", JSON.stringify(demo.messages));
      }
    } catch (e) {
      setOnboardingComplete(false);
      const demo = buildDemoData();
      setConversations(demo.conversations);
      setMessages(demo.messages);
    }
  };

  const buildDemoData = () => {
    const now = Date.now();

    const convSophieId = "conv_sophie";
    const convFlightId = "conv_kl1234";
    const convPrivateId = "conv_avontuur";

    const m1: Message = { id: generateId(), conversationId: convSophieId, senderId: "buddy_1", content: "Hey! Ben jij al verbonden via Bluetooth?", timestamp: now - 1000 * 60 * 10, status: "read", type: "text" };
    const m2: Message = { id: generateId(), conversationId: convSophieId, senderId: MY_ID, content: "Ja! Airbuddies werkt geweldig.", timestamp: now - 1000 * 60 * 8, status: "read", type: "text" };
    const m3: Message = { id: generateId(), conversationId: convSophieId, senderId: "buddy_1", content: "Top! Geen internet nodig. Zit jij ook in stoel 14B?", timestamp: now - 1000 * 60 * 2, status: "delivered", type: "text" };

    const f1: Message = { id: generateId(), conversationId: convFlightId, senderId: "buddy_2", content: "Hoi allemaal! Wie gaat er naar Bangkok?", timestamp: now - 1000 * 60 * 35, status: "read", type: "text" };
    const f2: Message = { id: generateId(), conversationId: convFlightId, senderId: "buddy_3", content: "Ik! Mijn eerste keer Thailand 🌴", timestamp: now - 1000 * 60 * 30, status: "read", type: "text" };
    const f3: Message = { id: generateId(), conversationId: convFlightId, senderId: "buddy_1", content: "Ik kan goede restauranttips geven voor Bangkok!", timestamp: now - 1000 * 60 * 5, status: "delivered", type: "text" };

    const g1: Message = { id: generateId(), conversationId: convPrivateId, senderId: "buddy_2", content: "Wie gaat er mee op avontuur?", timestamp: now - 1000 * 60 * 30, status: "read", type: "text" };
    const g2: Message = { id: generateId(), conversationId: convPrivateId, senderId: MY_ID, content: "Ik doe mee!", timestamp: now - 1000 * 60 * 25, status: "read", type: "text" };

    const conversations: Conversation[] = [
      {
        id: convSophieId,
        type: "direct",
        participantIds: [MY_ID, "buddy_1"],
        lastMessage: m3,
        unreadCount: 1,
        createdAt: now - 1000 * 60 * 60,
        avatarSeed: "sophie",
        isPrivate: false,
      },
      {
        id: convFlightId,
        type: "group",
        name: "KL1234 ✈ Bangkok",
        participantIds: [MY_ID, "buddy_1", "buddy_2", "buddy_3"],
        lastMessage: f3,
        unreadCount: 2,
        createdAt: now - 1000 * 60 * 90,
        avatarSeed: "kl1234",
        isPrivate: false,
        flightNumber: "KL1234",
        description: "Vluchtgroep KL1234 naar Bangkok Suvarnabhumi",
        adminId: MY_ID,
      },
      {
        id: convPrivateId,
        type: "group",
        name: "Avontuurclub",
        participantIds: [MY_ID, "buddy_2", "buddy_3"],
        lastMessage: g2,
        unreadCount: 0,
        createdAt: now - 1000 * 60 * 120,
        avatarSeed: "avontuur",
        isPrivate: true,
        adminId: MY_ID,
      },
    ];

    const messages: Record<string, Message[]> = {
      [convSophieId]: [m1, m2, m3],
      [convFlightId]: [f1, f2, f3],
      [convPrivateId]: [g1, g2],
    };

    return { conversations, messages };
  };

  const saveConversations = async (convs: Conversation[]) => {
    await AsyncStorage.setItem("conversations_v2", JSON.stringify(convs));
  };

  const saveMessages = async (msgs: Record<string, Message[]>) => {
    await AsyncStorage.setItem("messages_v2", JSON.stringify(msgs));
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

  const sendMediaMessage = useCallback(
    async (conversationId: string, attachment: MediaAttachment, caption = "") => {
      if (!profile) return;
      const label =
        attachment.type === "image" ? (caption || "📷 Afbeelding")
        : attachment.type === "document" ? (attachment.name ?? "📄 Document")
        : (attachment.name ?? "🎵 Audio");
      const newMsg: Message = {
        id: generateId(),
        conversationId,
        senderId: profile.id,
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
      }, 700);
    },
    [profile]
  );

  const sendContactCard = useCallback(
    async (conversationId: string) => {
      if (!profile) return;
      const cardMsg: Message = {
        id: generateId(),
        conversationId,
        senderId: profile.id,
        content: `Contactkaart van ${profile.name}`,
        timestamp: Date.now(),
        status: "sending",
        type: "contact-card",
        contactData: {
          name: profile.name,
          phone: profile.phone,
          email: profile.email,
          instagram: profile.instagram,
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
          const convMsgs = prev[conversationId] ?? [];
          const updated = {
            ...prev,
            [conversationId]: convMsgs.map((m) =>
              m.id === cardMsg.id ? { ...m, status: "delivered" as MessageStatus } : m
            ),
          };
          saveMessages(updated);
          return updated;
        });
      }, 600);
    },
    [profile]
  );

  const addBuddy = useCallback(
    (buddy: Omit<Buddy, "isVerified" | "isFavorite" | "isBlocked" | "relation">) => {
      const newBuddy: Buddy = { ...buddy, isVerified: false, isFavorite: false, isBlocked: false, relation: "buddy" };
      setBuddies((prev) => {
        if (prev.find((b) => b.id === buddy.id)) return prev;
        return [...prev, newBuddy];
      });
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
      return [...prev, newBuddy];
    });
    setNearbyDevices((prev) => prev.filter((d) => d.id !== device.id));
  }, []);

  const acceptBuddyRequest = useCallback((buddyId: string) => {
    setBuddies((prev) =>
      prev.map((b) => (b.id === buddyId ? { ...b, relation: "buddy" as BuddyRelation } : b))
    );
  }, []);

  const declineBuddyRequest = useCallback((buddyId: string) => {
    setBuddies((prev) => prev.filter((b) => b.id !== buddyId));
  }, []);

  const createGroup = useCallback(
    (
      name: string,
      memberIds: string[],
      options?: { isPrivate?: boolean; flightNumber?: string }
    ): Conversation => {
      if (!profile) throw new Error("No profile");
      const newConv: Conversation = {
        id: "group_" + generateId(),
        type: "group",
        name,
        participantIds: [profile.id, ...memberIds],
        unreadCount: 0,
        createdAt: Date.now(),
        avatarSeed: options?.flightNumber ?? name,
        isPrivate: options?.isPrivate ?? false,
        flightNumber: options?.flightNumber,
        adminId: profile.id,
      };
      setConversations((prev) => {
        const updated = [newConv, ...prev];
        saveConversations(updated);
        return updated;
      });
      return newConv;
    },
    [profile]
  );

  const startScan = useCallback(() => {
    setIsScanning(true);
    setNearbyDevices([]);
    const names = ["Alex", "Emma", "Noah", "Olivia", "James", "Lars", "Noor", "Finn"];
    const seatPool = ["3A", "11C", "18B", "24F", "6D", "15E", "9A", "31B", "22D", "7F"];
    const genders = ["Man", "Vrouw", "Man", "Vrouw", "Man", "Vrouw", "Anders", "Man"];
    const ages = [24, 31, 28, 42, 35, 27, 30, 38];
    const interestPool = [
      ["Reizen", "Fotografie", "Eten & Drinken"],
      ["Muziek", "Film & TV", "Gaming"],
      ["Sport", "Fitness", "Yoga"],
      ["Technologie", "Ondernemen", "Reizen"],
      ["Natuur", "Wandelen", "Duiken"],
      ["Koken", "Wijn", "Cultuur"],
      ["Kunst", "Mode", "Film & TV"],
      ["Lezen", "Cultuur", "Reizen"],
    ];
    let found = 0;

    const addDevice = () => {
      if (found >= 5) { setIsScanning(false); return; }
      const idx = Math.floor(Math.random() * names.length);
      const device: NearbyDevice = {
        id: "nearby_" + generateId(),
        name: names[idx],
        fingerprint: generateFingerprint(),
        signalStrength: Math.floor(Math.random() * 40) + 60,
        hops: Math.floor(Math.random() * 3),
        interests: interestPool[idx % interestPool.length],
        seatNumber: seatPool[found],
        age: ages[idx % ages.length],
        gender: genders[idx % genders.length],
      };
      setNearbyDevices((prev) => [...prev, device]);
      found++;
      scanTimerRef.current = setTimeout(addDevice, 900 + Math.random() * 1000);
    };

    scanTimerRef.current = setTimeout(addDevice, 600);
  }, []);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  }, []);

  const acceptNearbyDevice = useCallback((device: NearbyDevice) => {
    addBuddy({
      id: device.id,
      name: device.name,
      publicKey: "pk_" + device.id,
      fingerprint: device.fingerprint,
      lastSeen: Date.now(),
      status: "nearby",
    });
    setNearbyDevices((prev) => prev.filter((d) => d.id !== device.id));
  }, [addBuddy]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      AsyncStorage.setItem("profile_v2", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleVisibility = useCallback(() => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isVisible: !prev.isVisible };
      AsyncStorage.setItem("profile_v2", JSON.stringify(updated));
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
      if (!profile) throw new Error("No profile");
      const newConv: Conversation = {
        id: "direct_" + generateId(),
        type: "direct",
        participantIds: [profile.id, buddyId],
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

  const transferAdmin = useCallback((conversationId: string, newAdminId: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId ? { ...c, adminId: newAdminId } : c
      );
      saveConversations(updated);
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
    const completed: UserProfile = {
      id: MY_ID,
      publicKey: "pk_me_001",
      fingerprint: MY_FINGERPRINT,
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
