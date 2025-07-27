// Enhanced Paymob integration for promotions with saved payment methods
// CURRENT: Simulation mode - perfect for development and testing
// TOGGLE: Set VITE_ENABLE_REAL_PAYMENTS=true to use real Paymob payments
// In a production environment, you'll use Paymob credentials from your dashboard
// and handle server-side payment processing with Paymob APIs

import { PaymentData, PaymentResult } from "@/types/payment";
import { supabase } from "@/integrations/supabase/client";

// Toggle between simulation and real payments
// Auto-enable real payments in production, or when explicitly enabled
const USE_REAL_PAYMENTS = import.meta.env.VITE_ENABLE_REAL_PAYMENTS === 'true' ||
  (import.meta.env.PROD && !import.meta.env.VITE_ENABLE_REAL_PAYMENTS);

console.log('💳 Payment System Status:', {
  mode: USE_REAL_PAYMENTS ? 'SECURE_PAYMOB_EDGE_FUNCTION' : 'SIMULATION_MODE',
  provider: USE_REAL_PAYMENTS ? 'Paymob Egypt (Secure)' : 'Simulation',
  architecture: USE_REAL_PAYMENTS ? 'Edge Function - API keys secured on backend' : 'Local simulation',
  status: USE_REAL_PAYMENTS ? '🔒 Secure Paymob Egypt payments via Edge Functions!' : '✅ Safe simulation mode',
  features: USE_REAL_PAYMENTS ? ['Cards', 'Wallets', 'Installments', 'Backend-secured', 'Production-ready'] : ['Full payment flow simulation']
});

export const processPromotionPayment = async (
  paymentData: PaymentData
): Promise<PaymentResult> => {
  console.log('🔍 Payment processing debug:', {
    USE_REAL_PAYMENTS,
    envVar: import.meta.env.VITE_ENABLE_REAL_PAYMENTS,
    paymentData: {
      amount: paymentData.amount,
      currency: paymentData.currency,
      hasPaymentMethodId: !!paymentData.paymentMethodId,
      paymentMethodId: paymentData.paymentMethodId
    }
  });

  // Route to real payment implementation if enabled
  if (USE_REAL_PAYMENTS) {
    console.log('🔄 Processing real Paymob payment via secure Edge Function...');
    try {
      // Get current user for authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User authentication required');
      }

      // Call secure Supabase Edge Function for payment processing
      const { data, error } = await supabase.functions.invoke('process-paymob-payment', {
        body: {
          amount: paymentData.amount,
          currency: paymentData.currency || 'EGP',
          description: paymentData.description || `${paymentData.promotionType} promotion`,
          promotionType: paymentData.promotionType,
          userId: user.id
        }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error(error.message || 'Payment processing failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Payment failed');
      }

      console.log('✅ Payment session created via Edge Function:', data);

      // For redirect-based payments, redirect to Paymob checkout
      if (data.checkoutUrl) {
        console.log('🔄 Redirecting to Paymob checkout:', data.checkoutUrl);
        window.location.href = data.checkoutUrl;

        // Return a pending result since we're redirecting
        return {
          success: true,
          paymentId: data.paymentId,
          paymentIntentId: data.paymentToken,
          requiresAction: true,
          redirectUrl: data.checkoutUrl
        };
      }

      return {
        success: true,
        paymentId: data.paymentId,
        paymentIntentId: data.paymentToken
      };
    } catch (error) {
      console.error('❌ Secure payment processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment system unavailable. Please try again.',
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
      // This should only happen in development/testing when no payment method is provided
      // In real Paymob integration, this path shouldn't be reached
      console.error('⚠️ SIMULATION MODE: No payment method provided');
      console.error('⚠️ If you see this with VITE_ENABLE_REAL_PAYMENTS=true, check Paymob integration');
      throw new Error('No payment method provided. Please select a payment method or check payment configuration.');
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
    mode: USE_REAL_PAYMENTS ? 'SECURE_EDGE_FUNCTION' : 'SIMULATION',
    realPaymentsEnabled: USE_REAL_PAYMENTS,
    architecture: USE_REAL_PAYMENTS ? 'Supabase Edge Function' : 'Local simulation',
    security: USE_REAL_PAYMENTS ? 'API keys secured on backend' : 'No real credentials needed',
    pricing: {
      basic: getPromotionPrice('basic'),
      standard: getPromotionPrice('standard'),
      premium: getPromotionPrice('premium'),
    }
  };
};
