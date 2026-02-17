import api from '@/api/config';

export const chatService = {
  async getMessages(conversationId: string) {
    const { data } = await api.get(`/conversations/${conversationId}/messages`);
    return data as any[];
  },
  async markRead(conversationId: string) {
    await api.post(`/conversations/${conversationId}/read`);
  },
};
