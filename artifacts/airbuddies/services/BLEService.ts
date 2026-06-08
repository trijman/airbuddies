import {
  BleManager,
  BleError,
  Device,
  State,
} from "react-native-ble-plx";
import { Platform, PermissionsAndroid } from "react-native";

export const AIRBUDDIES_SERVICE = "6AB71234-0000-1000-8000-00805F9B34FB";
export const PROFILE_CHAR = "6AB71235-0000-1000-8000-00805F9B34FB";
export const MESSAGE_CHAR = "6AB71236-0000-1000-8000-00805F9B34FB";

export interface AirbuddiesProfile {
  id: string;
  name: string;
  fingerprint: string;
  interests?: string[];
  seatNumber?: string;
  age?: number;
  gender?: string;
}

export interface AirbuddiesMessage {
  fromId: string;
  content: string;
  timestamp: number;
  conversationId: string;
  type?: "text" | "system";
}

type DeviceFoundCb = (profile: AirbuddiesProfile, rssi: number) => void;
type MessageReceivedCb = (msg: AirbuddiesMessage) => void;

class BLEService {
  private manager: BleManager | null = null;
  private connectedDevices = new Map<string, Device>();
  private seenIds = new Set<string>();
  private myProfile: AirbuddiesProfile | null = null;
  private onDeviceFoundCb: DeviceFoundCb | null = null;
  private onMessageReceivedCb: MessageReceivedCb | null = null;
  private _scanning = false;

  init() {
    if (!this.manager) {
      this.manager = new BleManager();
    }
  }

  setProfile(profile: AirbuddiesProfile) {
    this.myProfile = profile;
  }

  setOnDeviceFound(cb: DeviceFoundCb) {
    this.onDeviceFoundCb = cb;
  }

  setOnMessageReceived(cb: MessageReceivedCb) {
    this.onMessageReceivedCb = cb;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    if (Platform.Version >= 31) {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ]);
      return Object.values(grants).every(
        (v) => v === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    const grant = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return grant === PermissionsAndroid.RESULTS.GRANTED;
  }

  async waitForPoweredOn(timeoutMs = 8000): Promise<boolean> {
    const m = this.manager;
    if (!m) return false;
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      m.onStateChange((state: State) => {
        if (state === State.PoweredOn) {
          clearTimeout(timer);
          resolve(true);
        } else if (
          state === State.PoweredOff ||
          state === State.Unauthorized ||
          state === State.Unsupported
        ) {
          clearTimeout(timer);
          resolve(false);
        }
      }, true);
    });
  }

  async startAdvertising(): Promise<void> {
    if (!this.manager || !this.myProfile) return;
    try {
      const m = this.manager as any;

      if (typeof m.addService === "function") {
        await m.addService(AIRBUDDIES_SERVICE, true);
      }
      if (typeof m.addCharacteristic === "function") {
        await m.addCharacteristic(
          AIRBUDDIES_SERVICE,
          PROFILE_CHAR,
          2,
          1
        );
        await m.addCharacteristic(
          AIRBUDDIES_SERVICE,
          MESSAGE_CHAR,
          28,
          2
        );
      }
      if (typeof m.publishLocalValue === "function") {
        await m.publishLocalValue(
          PROFILE_CHAR,
          btoa(JSON.stringify(this.myProfile))
        );
      }
      if (typeof m.startAdvertising === "function") {
        await m.startAdvertising(
          { localName: this.myProfile.name.slice(0, 16) },
          [AIRBUDDIES_SERVICE]
        );
      }
    } catch (e) {
      console.warn("[BLE] Peripheral advertising not available:", e);
    }
  }

  async stopAdvertising(): Promise<void> {
    try {
      const m = this.manager as any;
      if (typeof m?.stopAdvertising === "function") {
        await m.stopAdvertising();
      }
    } catch {}
  }

  startScan(): void {
    const m = this.manager;
    if (!m || this._scanning) return;
    this._scanning = true;
    this.seenIds.clear();

    m.startDeviceScan(
      [AIRBUDDIES_SERVICE],
      { allowDuplicates: false },
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.warn("[BLE] Scan error:", error.message);
          this._scanning = false;
          return;
        }
        if (!device || this.seenIds.has(device.id)) return;
        if (device.id === this.myProfile?.id) return;
        this.seenIds.add(device.id);
        this._connectAndFetch(device).catch(() => {});
      }
    );
  }

  stopScan(): void {
    this.manager?.stopDeviceScan();
    this._scanning = false;
  }

  private async _connectAndFetch(device: Device): Promise<void> {
    try {
      const connected = await device.connect({
        autoConnect: false,
        requestMTU: 512,
      });
      await connected.discoverAllServicesAndCharacteristics();

      const char = await connected.readCharacteristicForService(
        AIRBUDDIES_SERVICE,
        PROFILE_CHAR
      );
      if (!char.value) return;

      const profile: AirbuddiesProfile = JSON.parse(atob(char.value));
      this.connectedDevices.set(profile.id, connected);
      this.onDeviceFoundCb?.(profile, Math.abs(device.rssi ?? 70));

      connected.monitorCharacteristicForService(
        AIRBUDDIES_SERVICE,
        MESSAGE_CHAR,
        (_err: BleError | null, ch: { value: string | null } | null) => {
          if (!ch?.value) return;
          try {
            const msg: AirbuddiesMessage = JSON.parse(atob(ch.value));
            this.onMessageReceivedCb?.(msg);
          } catch {}
        }
      );
    } catch {
    }
  }

  async sendMessageViaBLE(
    toId: string,
    msg: AirbuddiesMessage
  ): Promise<boolean> {
    const device = this.connectedDevices.get(toId);
    if (!device) return false;
    try {
      await device.writeCharacteristicWithResponseForService(
        AIRBUDDIES_SERVICE,
        MESSAGE_CHAR,
        btoa(JSON.stringify(msg))
      );
      return true;
    } catch {
      this.connectedDevices.delete(toId);
      return false;
    }
  }

  isConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId);
  }

  get isScanning(): boolean {
    return this._scanning;
  }

  destroy(): void {
    this.stopScan();
    this.stopAdvertising().catch(() => {});
    this.connectedDevices.clear();
    this.manager?.destroy();
    this.manager = null;
  }
}

export const bleService = new BLEService();
