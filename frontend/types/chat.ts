export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  senderEmail?: string;
  content: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  status: ChatMessageStatus;
}
