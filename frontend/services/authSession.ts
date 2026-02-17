import * as SecureStore from 'expo-secure-store';

type AuthSnapshot = {
  ready: boolean;
  authenticated: boolean;
};

type AuthListener = (snapshot: AuthSnapshot) => void;

let snapshot: AuthSnapshot = {
  ready: false,
  authenticated: false,
};

let isHandlingUnauthorized = false;
const listeners = new Set<AuthListener>();

function emit() {
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function getAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

export function setAuthSnapshot(next: Partial<AuthSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

export function subscribeAuthSession(listener: AuthListener) {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export async function handleUnauthorizedSession() {
  if (isHandlingUnauthorized) {
    return;
  }

  isHandlingUnauthorized = true;

  try {
    await SecureStore.deleteItemAsync('token');
  } catch {
    // no-op
  }

  setAuthSnapshot({ ready: true, authenticated: false });

  setTimeout(() => {
    isHandlingUnauthorized = false;
  }, 1000);
}
