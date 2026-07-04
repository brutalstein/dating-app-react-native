import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { sendRealtimeMessage, isRealtimeConnected } from './realtimeService';

export type QueuedMessage = {
  id: string;
  conversationId: string;
  content: string;
  clientMessageId: string;
  attempts: number;
  status: 'queued' | 'sending' | 'failed';
  nextRetryAt: number;
  createdAt: number;
};

const KEY = 'chat_offline_queue_v2';
const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 60000;

let queue: QueuedMessage[] = [];
let flushing = false;
let flushInterval: NodeJS.Timeout | null = null;

async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[OfflineQueue] Failed to persist queue:', error);
  }
}

async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      queue = JSON.parse(raw) as QueuedMessage[];
      console.log(`[OfflineQueue] Loaded ${queue.length} messages from storage`);
    }
  } catch (error) {
    console.error('[OfflineQueue] Failed to load queue:', error);
    queue = [];
  }
}

export async function initOfflineQueue() {
  await load();
  
  const subscription = NetInfo.addEventListener((state) => {
    const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
    console.log('[OfflineQueue] Network state changed:', isConnected ? 'online' : 'offline');
    if (isConnected) {
      void flushQueue();
    }
  });
  
  await flushQueue();
  
  flushInterval = setInterval(() => {
    if (!flushing) {
      void flushQueue();
    }
  }, 10000);
  
  return () => {
    subscription();
    if (flushInterval) {
      clearInterval(flushInterval);
    }
  };
}

export async function enqueueMessage(item: Omit<QueuedMessage, 'attempts' | 'status' | 'nextRetryAt' | 'createdAt'>) {
  const now = Date.now();
  const message: QueuedMessage = {
    ...item,
    attempts: 0,
    status: 'queued',
    nextRetryAt: now,
    createdAt: now,
  };
  queue.push(message);
  console.log(`[OfflineQueue] Enqueued message ${message.clientMessageId}`);
  await persist();
}

export async function markSent(clientMessageId: string) {
  const initialLength = queue.length;
  queue = queue.filter((q) => q.clientMessageId !== clientMessageId);
  if (queue.length !== initialLength) {
    console.log(`[OfflineQueue] Marked message ${clientMessageId} as sent, removed from queue`);
    await persist();
  }
}

export async function markFailed(clientMessageId: string) {
  const message = queue.find((q) => q.clientMessageId === clientMessageId);
  if (message) {
    message.status = 'failed';
    console.log(`[OfflineQueue] Marked message ${clientMessageId} as failed`);
    await persist();
  }
}

export async function flushQueue() {
  if (flushing) {
    console.debug('[OfflineQueue] Flush already in progress, skipping');
    return;
  }
  
  flushing = true;
  const connected = isRealtimeConnected();
  
  if (!connected) {
    console.debug('[OfflineQueue] Not connected, skipping flush');
    flushing = false;
    return;
  }
  
  try {
    const now = Date.now();
    let processedCount = 0;
    
    for (const item of queue) {
      if (item.status === 'failed' || item.status === 'sending') {
        continue;
      }
      
      if (item.nextRetryAt > now) {
        continue;
      }
      
      try {
        item.status = 'sending';
        await persist();
        
        sendRealtimeMessage(item.conversationId, item.content, item.clientMessageId);
        console.log(`[OfflineQueue] Sent message ${item.clientMessageId}`);
        processedCount++;
        
        setTimeout(async () => {
          const stillInQueue = queue.find((q) => q.clientMessageId === item.clientMessageId);
          if (stillInQueue && stillInQueue.status === 'sending') {
            console.warn(`[OfflineQueue] Message ${item.clientMessageId} not acknowledged, requeuing`);
            item.status = 'queued';
            item.attempts += 1;
            
            if (item.attempts >= MAX_ATTEMPTS) {
              item.status = 'failed';
              console.error(`[OfflineQueue] Message ${item.clientMessageId} failed after ${MAX_ATTEMPTS} attempts`);
            } else {
              const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, item.attempts), MAX_RETRY_DELAY_MS);
              item.nextRetryAt = now + delay;
            }
            await persist();
          }
        }, 5000);
        
      } catch (error) {
        console.error(`[OfflineQueue] Failed to send message ${item.clientMessageId}:`, error);
        item.attempts += 1;
        
        if (item.attempts >= MAX_ATTEMPTS) {
          item.status = 'failed';
          console.error(`[OfflineQueue] Message ${item.clientMessageId} marked as failed after ${MAX_ATTEMPTS} attempts`);
        } else {
          item.status = 'queued';
          const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, item.attempts), MAX_RETRY_DELAY_MS);
          item.nextRetryAt = now + delay;
          console.log(`[OfflineQueue] Will retry message ${item.clientMessageId} in ${delay}ms (attempt ${item.attempts}/${MAX_ATTEMPTS})`);
        }
        await persist();
      }
    }
    
    if (processedCount > 0) {
      console.log(`[OfflineQueue] Flushed ${processedCount} messages`);
    }
  } finally {
    flushing = false;
  }
}

export function getQueueSnapshot() {
  return [...queue];
}

export function getQueueLength() {
  return queue.length;
}

export async function clearQueue() {
  queue = [];
  await persist();
  console.log('[OfflineQueue] Queue cleared');
}
