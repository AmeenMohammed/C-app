// Enhanced Paymob integration for promotions with saved payment methods
// CURRENT: Simulation mode - perfect for development and testing
// TOGGLE: Set VITE_ENABLE_REAL_PAYMENTS=true to use real Paymob payments
// In a production environment, you'll use Paymob credentials from your dashboard
// and handle server-side payment processing with Paymob APIs

import { PaymentData, PaymentResult } from "@/types/payment";

// Toggle between simulation and real payments
const USE_REAL_PAYMENTS = import.meta.env.VITE_ENABLE_REAL_PAYMENTS === 'true';

console.log('💳 Payment System Status:', {
  mode: USE_REAL_PAYMENTS ? 'REAL_PAYMOB_PAYMENTS' : 'SIMULATION_MODE',
  provider: USE_REAL_PAYMENTS ? 'Paymob Egypt' : 'Simulation',
  toggle: 'Set VITE_ENABLE_REAL_PAYMENTS=true for real payments',
  status: USE_REAL_PAYMENTS ? '🇪🇬 Paymob Egypt payments enabled - real payments!' : '✅ Safe simulation mode',
  features: USE_REAL_PAYMENTS ? ['Cards', 'Wallets', 'Installments', 'Egyptian-built', 'Developer-friendly'] : ['Full payment flow simulation']
});

export const processPromotionPayment = async (
  paymentData: PaymentData
): Promise<PaymentResult> => {
  // Route to real payment implementation if enabled
  if (USE_REAL_PAYMENTS) {
    console.log('🔄 Routing to REAL payment processing...');
    try {
      // Using Paymob - Egyptian-built payment platform perfect for local market
      const { processRealPromotionPayment } = await import('./paymobPayment.production');
      return processRealPromotionPayment(paymentData);
    } catch (error) {
      console.error('❌ Paymob payment system failed to load:', error);
      return {
        success: false,
        error: 'Paymob payment system unavailable. Please check configuration or contact support.',
      };
    }
  }

  // Continue with simulation
  console.log('🎮 Using payment simulation mode');

  try {
    // Simulate realistic payment processing delay
    const processingTime = paymentData.paymentMethodId ? 1000 : 2000; // Faster for saved methods
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // In a real implementation, you would:
    // 1. If paymentMethodId is provided, use saved payment method
    // 2. Create a Stripe payment intent on your backend
    // 3. Confirm the payment with Stripe (using saved PM or collecting new payment info)
    // 4. Handle webhooks for payment confirmation
    // 5. Store payment records in your database

    // Simulate payment processing
    let paymentId: string;
    let paymentIntentId: string;

    if (paymentData.paymentMethodId) {
      // Using saved payment method
      paymentId = `pi_saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      paymentIntentId = `pi_${paymentData.paymentMethodId}_${Date.now()}`;

      console.log('💳 Simulating saved payment method:', paymentData.paymentMethodId);

      // Simulate lower failure rate for saved payment methods (2% chance)
      if (Math.random() < 0.02) {
        throw new Error('Payment failed. Your payment method may have expired or been declined.');
      }
    } else {
      // Fallback for when no payment method is properly selected
      throw new Error('No payment method provided. Please select a payment method.');
    }

    console.log('✅ Simulated payment successful:', paymentId);

    return {
      success: true,
      paymentId,
      paymentIntentId,
    };
  } catch (error) {
    console.error('❌ Simulated payment processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown payment error',
    };
  }
};

// Get payment amount based on promotion type (in EGP)
export const getPromotionPrice = (promotionType: 'basic' | 'standard' | 'premium'): number => {
  // Check for environment variable pricing first
  const basicPrice = import.meta.env.VITE_BASIC_PROMOTION_PRICE;
  const standardPrice = import.meta.env.VITE_STANDARD_PROMOTION_PRICE;
  const premiumPrice = import.meta.env.VITE_PREMIUM_PROMOTION_PRICE;

  switch (promotionType) {
    case 'basic':
      return basicPrice ? parseInt(basicPrice) : 10; // 24 hours - 10 EGP
    case 'standard':
      return standardPrice ? parseInt(standardPrice) : 15; // 48 hours - 15 EGP
    case 'premium':
      return premiumPrice ? parseInt(premiumPrice) : 20; // 72 hours - 20 EGP
    default:
      return 10;
  }
};

// Get promotion duration in hours
export const getPromotionDuration = (promotionType: 'basic' | 'standard' | 'premium'): number => {
  switch (promotionType) {
    case 'basic':
      return 24; // 24 hours
    case 'standard':
      return 48; // 48 hours
    case 'premium':
      return 72; // 72 hours
    default:
      return 24;
  }
};

// Format price for display (EGP)
export const formatPromotionPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount);
};

// Payment system status for debugging
export const getPaymentSystemStatus = () => {
  return {
    mode: USE_REAL_PAYMENTS ? 'REAL_PAYMENTS' : 'SIMULATION',
    realPaymentsEnabled: USE_REAL_PAYMENTS,
    stripePublicKey: USE_REAL_PAYMENTS ? !!import.meta.env.VITE_STRIPE_PUBLIC_KEY : 'not_required',
    apiUrl: import.meta.env.VITE_API_URL || '/api',
    pricing: {
      basic: getPromotionPrice('basic'),
      standard: getPromotionPrice('standard'),
      premium: getPromotionPrice('premium'),
    }
  };
};
