import { Client } from '@stomp/stompjs';
import * as SecureStore from 'expo-secure-store';
import { WS_BASE_URL } from '@/api/config';

let client: Client | null = null;
let ackListeners: Array<(payload: any) => void> = [];

type RealtimeCallbacks = {
  onEvent: (eventType: string, payload: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
};

export async function connectRealtime(callbacks: RealtimeCallbacks | ((eventType: string, payload: any) => void)) {
  const token = await SecureStore.getItemAsync('token');
  if (!token) return;

  if (client?.active) return;

  const resolved: RealtimeCallbacks =
    typeof callbacks === 'function'
      ? { onEvent: callbacks }
      : callbacks;

  client = new Client({
    brokerURL: WS_BASE_URL.replace('http', 'ws') + '/ws',
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client?.subscribe('/user/queue/events', (message) => {
        const body = JSON.parse(message.body);
        resolved.onEvent(body.eventType, body.payload);
      });
      client?.subscribe('/user/queue/ack', (message) => {
        const payload = JSON.parse(message.body);
        ackListeners.forEach((listener) => listener(payload));
      });
      resolved.onConnected?.();
      client?.publish({ destination: '/app/chat.sync', body: '{}' });
    },
    onStompError: () => resolved.onDisconnected?.(),
    onWebSocketClose: () => resolved.onDisconnected?.(),
  });

  client.activate();
}

export function disconnectRealtime() {
  client?.deactivate();
  client = null;
}

export function onMessageAck(listener: (payload: any) => void) {
  ackListeners.push(listener);
  return () => {
    ackListeners = ackListeners.filter((item) => item !== listener);
  };
}

export function sendRealtimeMessage(conversationId: string, content: string, clientMessageId: string) {
  if (!client?.connected) throw new Error('Realtime not connected');
  client.publish({ destination: '/app/chat.send', body: JSON.stringify({ conversationId, content, clientMessageId }) });
}

export function sendTypingEvent(conversationId: string, typing: boolean) {
  if (!client?.connected) return false;
  client.publish({ destination: '/app/chat.typing', body: JSON.stringify({ conversationId, typing }) });
  return true;
}

export function sendTyping(conversationId: string, typing: boolean) {
  return sendTypingEvent(conversationId, typing);
}

export function ackDelivered(conversationId: string, messageId: string) {
  if (!client?.connected) return false;
  client.publish({ destination: '/app/chat.delivered', body: JSON.stringify({ conversationId, messageId }) });
  return true;
}

export function sendDelivered(messageId: string, conversationId?: string) {
  if (!conversationId) return false;
  return ackDelivered(conversationId, messageId);
}
