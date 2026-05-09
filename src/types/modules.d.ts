// Type declarations for missing modules
declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
  const _default: any;
  export default _default;
}

declare module 'expo-auth-session' {
  export const useAuthRequest: any;
  export const makeRedirectUri: any;
  export const exchangeCodeAsync: any;
  export const refreshAsync: any;
  export const revokeAsync: any;
  export const fetchDiscoveryAsync: any;
  export const DiscoveryDocument: any;
  export const AuthRequest: any;
  export const ResponseType: any;
  const _default: any;
  export default _default;
}

declare module 'expo-web-browser' {
  export const openAuthSessionAsync: any;
  export const maybeCompleteAuthSession: any;
  const _default: any;
  export default _default;
}

declare module 'expo-linear-gradient' {
  import { ComponentType } from 'react';
  export const LinearGradient: ComponentType<any>;
  const _default: any;
  export default _default;
}

declare module 'react-native-toast-message' {
  const Toast: any;
  export default Toast;
}

declare module '@testing-library/react-hooks' {
  export const renderHook: any;
  export const act: any;
  const _default: any;
  export default _default;
}

declare module 'expo-clipboard' {
  export function getStringAsync(): Promise<string>;
  export function setStringAsync(text: string): Promise<boolean>;
  export const setString: any;
  export const getString: any;
  const _default: any;
  export default _default;
}

declare module 'react-native-qrcode-svg' {
  import { ComponentType } from 'react';
  const QRCode: ComponentType<any>;
  export default QRCode;
}

declare module '@react-native-picker/picker' {
  import { ComponentType } from 'react';
  export const Picker: ComponentType<any> & { Item: ComponentType<any> };
  export const PickerItem: ComponentType<any>;
  const _default: any;
  export default _default;
}

declare module 'react-native-uuid' {
  export function v4(): string;
  export function v1(): string;
  const _default: { v4: () => string; v1: () => string };
  export default _default;
}

declare module '@react-native-voice/voice' {
  const Voice: any;
  export default Voice;
  export const SpeechResultsEvent: any;
  export const SpeechErrorEvent: any;
}

declare module 'expo-speech' {
  export function speak(text: string, options?: any): void;
  export function stop(): void;
  export function isSpeakingAsync(): Promise<boolean>;
  const _default: any;
  export default _default;
}

// Augment expo-file-system with missing properties
declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;
  export const EncodingType: {
    UTF8: string;
    Base64: string;
  };
}
