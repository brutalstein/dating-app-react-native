import api from '@/api/config';

export const moderationService = {
  listReports: async () => (await api.get('/moderation/reports')).data,
  setReportStatus: async (reportId: string, status: 'OPEN' | 'REVIEWED' | 'DISMISSED') =>
    (await api.put(`/moderation/reports/${reportId}`, { status })).data,
  userAction: async (targetUserId: string, actionType: 'WARN' | 'BAN' | 'UNBAN', reason?: string) =>
    (await api.post('/moderation/actions', { targetUserId, actionType, reason })).data,
  createReport: async (targetUserId: string, reason: string, contentRef?: string) =>
    (await api.post('/moderation/reports', { targetUserId, reason, contentRef })).data,
};
