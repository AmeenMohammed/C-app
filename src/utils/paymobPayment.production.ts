import { PaymentData, PaymentResult } from "@/types/payment";

// Paymob configuration
const getPaymobConfig = () => {
  const apiKey = import.meta.env.VITE_PAYMOB_API_KEY;
  const integrationId = import.meta.env.VITE_PAYMOB_INTEGRATION_ID;
  const iframeId = import.meta.env.VITE_PAYMOB_IFRAME_ID;
  const hmacSecret = import.meta.env.VITE_PAYMOB_HMAC_SECRET;
  const baseUrl = import.meta.env.VITE_PAYMOB_BASE_URL || 'https://accept.paymob.com/api';

  if (!apiKey || !integrationId) {
    throw new Error('Paymob credentials missing. Please set VITE_PAYMOB_API_KEY and VITE_PAYMOB_INTEGRATION_ID from your Paymob dashboard');
  }

  return {
    apiKey,
    integrationId,
    iframeId,
    hmacSecret,
    baseUrl
  };
};

// Get auth token for secure payments from Supabase
const getAuthToken = async (): Promise<string> => {
  // Import Supabase client
  const { supabase } = await import('@/integrations/supabase/client');

  // Get current session
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('User not authenticated');
  }

  return session.access_token;
};

// API call helper
const apiCall = async (endpoint: string, data: Record<string, unknown>) => {
  const authToken = await getAuthToken();
  const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
};

// Paymob API helper - direct calls to Paymob
const paymobApiCall = async (endpoint: string, data: Record<string, unknown>, authToken?: string) => {
  const config = getPaymobConfig();

  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Paymob API error' }));
    throw new Error(error.message || `Paymob API Error: ${response.status}`);
  }

  return response.json();
};

// Step 1: Get Paymob authentication token
const getPaymobAuthToken = async (): Promise<string> => {
  const config = getPaymobConfig();

  const response = await paymobApiCall('/auth/tokens', {
    api_key: config.apiKey
  });

  if (!response.token) {
    throw new Error('Failed to get Paymob auth token');
  }

  return response.token;
};

// Step 2: Create Paymob order
const createPaymobOrder = async (authToken: string, paymentData: PaymentData) => {
  const orderData = {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: Math.round(paymentData.amount * 100), // Convert to cents
    currency: paymentData.currency || 'EGP',
    items: [{
      name: `${paymentData.promotionType} promotion`,
      description: paymentData.description || `Promote item with ${paymentData.promotionType} package`,
      amount_cents: Math.round(paymentData.amount * 100),
      quantity: 1
    }]
  };

  const response = await paymobApiCall('/ecommerce/orders', orderData);

  if (!response.id) {
    throw new Error('Failed to create Paymob order');
  }

  return response;
};

// Step 3: Get payment key for checkout
const getPaymobPaymentKey = async (authToken: string, orderId: number, paymentData: PaymentData) => {
  const config = getPaymobConfig();

  // Get current domain for return URL
  const currentDomain = window.location.origin;
  const returnUrl = `${currentDomain}/payment-success`;

  const paymentKeyData = {
    auth_token: authToken,
    amount_cents: Math.round(paymentData.amount * 100),
    expiration: 3600, // 1 hour
    order_id: orderId,
    billing_data: {
      apartment: "N/A",
      email: "customer@marketplace.com", // You might want to get real user email
      floor: "N/A",
      first_name: "Customer",
      street: "N/A",
      building: "N/A",
      phone_number: "+201000000000", // You might want to get real user phone
      shipping_method: "N/A",
      postal_code: "N/A",
      city: "Cairo",
      country: "EG",
      last_name: "User",
      state: "Cairo"
    },
    currency: paymentData.currency || 'EGP',
    integration_id: parseInt(config.integrationId),
    // Add return URLs for payment completion
    return_url: returnUrl,
    redirection_url: returnUrl
  };

  const response = await paymobApiCall('/acceptance/payment_keys', paymentKeyData);

  if (!response.token) {
    throw new Error('Failed to get Paymob payment key');
  }

  return response;
};

// Process Paymob payment with saved method
const processPaymobSavedPayment = async (paymentData: PaymentData) => {
  return apiCall('/payments/paymob/process-saved', {
    amount: paymentData.amount,
    currency: paymentData.currency,
    description: paymentData.description,
    payment_method_id: paymentData.paymentMethodId,
    promotion_type: paymentData.promotionType,
  });
};

// Create new Paymob payment session
const createPaymobPayment = async (paymentData: PaymentData) => {
  return apiCall('/payments/paymob/create', {
    amount: paymentData.amount,
    currency: paymentData.currency,
    description: paymentData.description,
    payment_method_id: paymentData.paymentMethodId,
    promotion_type: paymentData.promotionType,
  });
};

// Main payment processing function
export const processRealPromotionPayment = async (
  paymentData: PaymentData
): Promise<PaymentResult> => {
  try {
    console.log('🇪🇬 Processing Paymob Egypt payment:', {
      amount: paymentData.amount,
      currency: paymentData.currency,
      promotionType: paymentData.promotionType,
      hasPaymentMethod: !!paymentData.paymentMethodId,
      paymentMethodId: paymentData.paymentMethodId,
      directIntegration: import.meta.env.VITE_PAYMOB_DIRECT_INTEGRATION
    });

    const config = getPaymobConfig();

    if (paymentData.paymentMethodId && import.meta.env.VITE_PAYMOB_DIRECT_INTEGRATION !== 'true') {
      // Using saved payment method (only works with backend integration)
      console.log('💳 Using saved payment method:', paymentData.paymentMethodId);

      const result = await processPaymobSavedPayment(paymentData);

      if (result.success) {
        console.log('✅ Paymob saved payment succeeded:', result.transactionId);
        return {
          success: true,
          paymentId: result.transactionId,
          paymentIntentId: result.transactionId,
        };
      } else {
        throw new Error(result.message || 'Paymob payment failed');
      }
    } else {
      // Create new payment - can use direct integration or backend
      if (paymentData.paymentMethodId && import.meta.env.VITE_PAYMOB_DIRECT_INTEGRATION === 'true') {
        console.log('🔄 Direct integration mode: Creating new payment session (saved payment methods require backend)');
      } else {
        console.log('🆕 Creating new Paymob payment session');
      }

      // Option 1: Direct frontend integration (faster for development)
      if (import.meta.env.VITE_PAYMOB_DIRECT_INTEGRATION === 'true') {
        console.log('🔄 Using direct Paymob integration');

        // Step 1: Get auth token
        const authToken = await getPaymobAuthToken();

        // Step 2: Create order
        const order = await createPaymobOrder(authToken, paymentData);

        // Step 3: Get payment key
        const paymentKey = await getPaymobPaymentKey(authToken, order.id, paymentData);

        // Build checkout URL
        const checkoutUrl = config.iframeId
          ? `https://accept.paymob.com/api/acceptance/iframes/${config.iframeId}?payment_token=${paymentKey.token}`
          : `https://accept.paymob.com/api/acceptance/post_pay?payment_token=${paymentKey.token}`;

        console.log('✅ Paymob payment session created:', checkoutUrl);

        // Redirect user to Paymob checkout
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        }

        return {
          success: true,
          paymentId: order.id.toString(),
          paymentIntentId: paymentKey.token,
          requiresAction: true,
          redirectUrl: checkoutUrl,
        };
      } else {
        // Option 2: Backend integration (recommended for production)
        console.log('🔄 Using backend Paymob integration');

        const result = await createPaymobPayment(paymentData);

        if (result.success) {
          console.log('✅ Paymob payment session created:', result.checkoutUrl);

          // Redirect user to Paymob checkout page
          if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
          }

          return {
            success: true,
            paymentId: result.transactionId || 'pending',
            paymentIntentId: result.sessionId || 'pending',
            requiresAction: true,
            redirectUrl: result.checkoutUrl,
          };
        } else {
          throw new Error(result.message || 'Failed to create Paymob payment session');
        }
      }
    }

  } catch (error) {
    console.error('❌ Paymob payment error:', error);

    // Enhanced error handling for common Paymob issues
    let errorMessage = 'Payment processing failed';

    if (error instanceof Error) {
      if (error.message.includes('credentials') || error.message.includes('api_key')) {
        errorMessage = 'Payment system configuration error. Please check your Paymob credentials.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network connection error. Please check your internet and try again.';
      } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
        errorMessage = 'Please log in again to continue.';
      } else if (error.message.includes('amount') || error.message.includes('cents')) {
        errorMessage = 'Invalid payment amount. Please try again.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Export configuration for debugging
export const getPaymobConfigDebug = () => {
  const config = getPaymobConfig();
  return {
    hasApiKey: !!config.apiKey,
    hasIntegrationId: !!config.integrationId,
    hasIframeId: !!config.iframeId,
    hasHmacSecret: !!config.hmacSecret,
    baseUrl: config.baseUrl,
    environment: config.baseUrl.includes('accept.paymob.com') ? 'PRODUCTION' : 'SANDBOX'
  };
};