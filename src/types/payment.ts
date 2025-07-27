// Payment Types and Interfaces

export interface PaymentMethod {
  id: string;
  payment_type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  provider: string;
  provider_payment_method_id: string;

  // Card details
  card_brand?: string;
  card_last_four?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  card_fingerprint?: string;

  // PayPal details
  paypal_email?: string;

  nickname?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AddPaymentMethodData {
  payment_type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  provider: string;
  provider_payment_method_id: string;
  card_brand?: string;
  card_last_four?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  card_fingerprint?: string;
  paypal_email?: string;
  nickname?: string;
  is_default?: boolean;
}

export interface OneTimeCardData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  cardholderName: string;
}

export interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  promotionType: 'basic' | 'standard' | 'premium';
  paymentMethodId?: string; // Reference to saved payment method
  oneTimeCardData?: OneTimeCardData; // One-time card data for new payments
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  paymentIntentId?: string;
  error?: string;
  requiresAction?: boolean;
  redirectUrl?: string;
}

export interface StripeCardElement {
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    fingerprint: string;
  };
}