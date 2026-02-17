import api from '@/api/config';

export interface PremiumPlan {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  period: 'MONTH' | 'QUARTER' | 'YEAR' | string;
  recommended: boolean;
}

export interface PremiumCatalog {
  plans: PremiumPlan[];
  activePlanId: string | null;
  premiumActive: boolean;
}

export interface PurchaseCheckout {
  checkoutId: string;
  checkoutUrl: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | string;
  provider: string;
  planId: string;
  message: string;
}

export const premiumService = {
  async getPlans(): Promise<PremiumCatalog> {
    const { data } = await api.get('/premium/plans');
    return data as PremiumCatalog;
  },

  async createPurchase(planId: string): Promise<PurchaseCheckout> {
    const { data } = await api.post('/premium/purchase', { planId });
    return data as PurchaseCheckout;
  },
};
