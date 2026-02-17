import api from '@/api/config';

export interface PreferenceCriterionInput {
  key: string;
  value: string;
  mustHave: boolean;
  weight: number;
}

export interface PreferenceProfile {
  id?: string | null;
  proactiveEnabled: boolean;
  updatedAt?: string | null;
  criteria: PreferenceCriterionInput[];
}

export const proactiveService = {
  async getPreferences(): Promise<PreferenceProfile> {
    const { data } = await api.get('/recommendations/preferences');
    return {
      id: data.id,
      proactiveEnabled: Boolean(data.proactiveEnabled),
      updatedAt: data.updatedAt,
      criteria: data.criteria ?? [],
    };
  },

  async savePreferences(payload: PreferenceProfile): Promise<PreferenceProfile> {
    const { data } = await api.put('/recommendations/preferences', payload);
    return {
      id: data.id,
      proactiveEnabled: Boolean(data.proactiveEnabled),
      updatedAt: data.updatedAt,
      criteria: data.criteria ?? [],
    };
  },

  async triggerScan(): Promise<void> {
    await api.post('/recommendations/scan');
  },

  async actionRecommendation(recommendationId: string, action: 'LIKE' | 'PASS'): Promise<void> {
    await api.post(`/recommendations/${recommendationId}/action`, { action });
  },
};
