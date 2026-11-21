import * as SecureStore from 'expo-secure-store';

const KLIC = "session_token";

export async function ulozToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KLIC, token);
}
export async function nactiToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(KLIC);
}

export async function smazToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KLIC);
}