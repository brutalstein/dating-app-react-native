import { Client } from '@stomp/stompjs';
import * as SecureStore from 'expo-secure-store';
import { WS_BASE_URL } from '@/api/config';

let client: Client | null = null;

export async function connectRealtime(onEvent: (eventType: string, payload: any) => void) {
  const token = await SecureStore.getItemAsync('token');
  if (!token) return;

  if (client?.active) return;

  client = new Client({
    brokerURL: WS_BASE_URL.replace('http', 'ws') + '/ws',
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    onConnect: () => {
      client?.subscribe('/user/queue/events', (message) => {
        const body = JSON.parse(message.body);
        onEvent(body.eventType, body.payload);
      });
    },
  });

  client.activate();
}

export function disconnectRealtime() {
  client?.deactivate();
  client = null;
}

export function sendRealtimeMessage(conversationId: string, content: string) {
  if (!client?.connected) return;
  client.publish({ destination: '/app/chat.send', body: JSON.stringify({ conversationId, content }) });
}
