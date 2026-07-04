import { Client, IMessage, IFrame } from '@stomp/stompjs';
import * as SecureStore from 'expo-secure-store';
import { WS_BASE_URL, sanitizeToken } from '@/api/config';

let client: Client | null = null;
let ackListeners: Array<(payload: any) => void> = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

type RealtimeCallbacks = {
  onEvent: (eventType: string, payload: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
};

export async function connectRealtime(
  callbacks: RealtimeCallbacks | ((eventType: string, payload: any) => void)
) {
  const storedToken = await SecureStore.getItemAsync('token');
  const token = sanitizeToken(storedToken);
  
  if (!token) {
    if (storedToken) {
      await SecureStore.deleteItemAsync('token');
    }
    console.warn('[Realtime] No token found, skipping connection');
    return;
  }

  if (client?.active) {
    console.debug('[Realtime] Already connected, skipping');
    return;
  }

  const resolved: RealtimeCallbacks =
    typeof callbacks === 'function'
      ? { onEvent: callbacks }
      : callbacks;

  client = new Client({
    brokerURL: WS_BASE_URL.replace('http', 'ws') + '/ws',
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: RECONNECT_DELAY_MS,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: (str: string) => {
      console.debug('[STOMP]', str);
    },
    onConnect: () => {
      console.log('[Realtime] Connected successfully');
      reconnectAttempts = 0;
      
      client?.subscribe('/user/queue/events', (message: IMessage) => {
        try {
          const body = JSON.parse(message.body);
          resolved.onEvent(body.eventType, body.payload);
        } catch (error) {
          console.error('[Realtime] Error parsing event:', error);
        }
      });
      
      client?.subscribe('/user/queue/ack', (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body);
          ackListeners.forEach((listener) => listener(payload));
        } catch (error) {
          console.error('[Realtime] Error parsing ack:', error);
        }
      });
      
      resolved.onConnected?.();
      
      setTimeout(() => {
        if (client?.connected) {
          client.publish({ destination: '/app/chat.sync', body: '{}' });
        }
      }, 500);
    },
    onStompError: (frame: IFrame) => {
      console.error('[Realtime] STOMP error:', frame.headers['message']);
      resolved.onDisconnected?.();
    },
    onWebSocketClose: (event: CloseEvent) => {
      console.warn('[Realtime] WebSocket closed:', event.code, event.reason);
      resolved.onDisconnected?.();
    },
    onWebSocketError: (event: Event) => {
      console.error('[Realtime] WebSocket error:', event);
      resolved.onError?.(new Error('WebSocket connection error'));
    },
  });

  client.activate();
}

export function disconnectRealtime() {
  if (client) {
    console.log('[Realtime] Disconnecting...');
    client.deactivate();
    client = null;
    ackListeners = [];
    reconnectAttempts = 0;
  }
}

export function onMessageAck(listener: (payload: any) => void) {
  ackListeners.push(listener);
  return () => {
    ackListeners = ackListeners.filter((item) => item !== listener);
  };
}

export function sendRealtimeMessage(conversationId: string, content: string, clientMessageId: string) {
  if (!client?.connected) {
    throw new Error('Realtime not connected');
  }
  
  const payload = JSON.stringify({ conversationId, content, clientMessageId });
  client.publish({ 
    destination: '/app/chat.send', 
    body: payload,
    headers: {
      'content-type': 'application/json',
    },
  });
}

export function sendTypingEvent(conversationId: string, typing: boolean) {
  if (!client?.connected) {
    return false;
  }
  
  try {
    client.publish({ 
      destination: '/app/chat.typing', 
      body: JSON.stringify({ conversationId, typing }),
      headers: {
        'content-type': 'application/json',
      },
    });
    return true;
  } catch (error) {
    console.error('[Realtime] Failed to send typing event:', error);
    return false;
  }
}

export function sendTyping(conversationId: string, typing: boolean) {
  return sendTypingEvent(conversationId, typing);
}

export function ackDelivered(conversationId: string, messageId: string) {
  if (!client?.connected) {
    return false;
  }
  
  try {
    client.publish({ 
      destination: '/app/chat.delivered', 
      body: JSON.stringify({ conversationId, messageId }),
      headers: {
        'content-type': 'application/json',
      },
    });
    return true;
  } catch (error) {
    console.error('[Realtime] Failed to send delivery ack:', error);
    return false;
  }
}

export function sendDelivered(messageId: string, conversationId?: string) {
  if (!conversationId) {
    return false;
  }
  return ackDelivered(conversationId, messageId);
}

export function isRealtimeConnected(): boolean {
  return client?.connected ?? false;
}

export function getRealtimeClient(): Client | null {
  return client;
}
