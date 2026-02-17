import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { sendRealtimeMessage } from './realtimeService';

export type QueuedMessage = {
  id: string;
  conversationId: string;
  content: string;
  clientMessageId: string;
  attempts: number;
  status: 'queued' | 'sending' | 'failed';
  nextRetryAt: number;
};

const KEY = 'chat_offline_queue_v1';
const MAX_ATTEMPTS = 5;

let queue: QueuedMessage[] = [];
let flushing = false;

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

export async function initOfflineQueue() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    queue = raw ? (JSON.parse(raw) as QueuedMessage[]) : [];
  } catch {
    queue = [];
  }
  NetInfo.addEventListener((state) => {
    if (state.isConnected) flushQueue();
  });
  await flushQueue();
}

export async function enqueueMessage(item: Omit<QueuedMessage, 'attempts' | 'status' | 'nextRetryAt'>) {
  queue.push({ ...item, attempts: 0, status: 'queued', nextRetryAt: Date.now() });
  await persist();
}

export async function markSent(clientMessageId: string) {
  queue = queue.filter((q) => q.clientMessageId !== clientMessageId);
  await persist();
}

export async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    const now = Date.now();
    for (const item of queue) {
      if (item.status === 'failed' || item.nextRetryAt > now) continue;
      try {
        sendRealtimeMessage(item.conversationId, item.content, item.clientMessageId);
        item.status = 'sending';
      } catch {
        item.attempts += 1;
        if (item.attempts >= MAX_ATTEMPTS) {
          item.status = 'failed';
        } else {
          item.status = 'queued';
          item.nextRetryAt = now + Math.min(30000, 1000 * (2 ** item.attempts));
        }
      }
    }
    await persist();
  } finally {
    flushing = false;
  }
}

export function getQueueSnapshot() {
  return queue;
}
