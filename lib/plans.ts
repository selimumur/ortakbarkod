export type PlanType = 'starter' | 'pro' | 'enterprise';

export interface PlanConfig {
    id: PlanType;
    name: string;
    price: number;
    limits: {
        products: number;
        users: number;
        stores: number; // Marketplace stores
    };
    features: {
        marketplace: boolean;
        arbitrage: boolean;
        advanced_reports: boolean;
        api_access: boolean;
        production: boolean; // Uretim module
    };
}

export const PLANS: Record<PlanType, PlanConfig> = {
    starter: {
        id: 'starter',
        name: 'Başlangıç',
        price: 1000,
        limits: {
            products: 500,
            users: 2,
            stores: 0
        },
        features: {
            marketplace: false,
            arbitrage: false,
            advanced_reports: false,
            api_access: false,
            production: true // Basic production allowed
        }
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 2000,
        limits: {
            products: 5000,
            users: 10,
            stores: 3
        },
        features: {
            marketplace: true,
            arbitrage: true, // Maybe only Pro+?
            advanced_reports: true,
            api_access: false,
            production: true
        }
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 9999, // Custom
        limits: {
            products: 999999,
            users: 999,
            stores: 99
        },
        features: {
            marketplace: true,
            arbitrage: true,
            advanced_reports: true,
            api_access: true,
            production: true
        }
    }
};

export const DEFAULT_PLAN = PLANS.starter;

export function getPlanConfig(planId?: string): PlanConfig {
    if (!planId) return DEFAULT_PLAN;
    // Normalize planId (in case DB stores it differently or casing)
    const normalized = planId.toLowerCase() as PlanType;
    return PLANS[normalized] || DEFAULT_PLAN;
}
