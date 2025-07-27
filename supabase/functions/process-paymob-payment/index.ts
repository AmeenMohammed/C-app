import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Paymob configuration from Supabase secrets (secure backend-only)
    const PAYMOB_API_KEY = Deno.env.get('PAYMOB_API_KEY')
    const PAYMOB_INTEGRATION_ID = Deno.env.get('PAYMOB_INTEGRATION_ID')
    const PAYMOB_IFRAME_ID = Deno.env.get('PAYMOB_IFRAME_ID')

    if (!PAYMOB_API_KEY || !PAYMOB_INTEGRATION_ID) {
      throw new Error('Paymob configuration missing. Please set PAYMOB_API_KEY and PAYMOB_INTEGRATION_ID in Supabase secrets.')
    }

    // Parse request body
    const { amount, currency = 'EGP', description, promotionType, userId } = await req.json()

    // Validate input
    if (!amount || !userId) {
      throw new Error('Missing required fields: amount and userId')
    }

    console.log('🇪🇬 Processing secure Paymob payment:', {
      amount,
      currency,
      promotionType,
      userId: userId.substring(0, 8) + '...' // Log partial ID for privacy
    })

    // Step 1: Get Paymob auth token
    const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY })
    })

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Paymob')
    }

    const { token: authToken } = await authResponse.json()

    // Step 2: Create Paymob order
    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: Math.round(amount * 100),
        currency,
        items: [{
          name: `${promotionType} promotion`,
          amount_cents: Math.round(amount * 100),
          description: description || `Promote item with ${promotionType} package`,
          quantity: 1
        }]
      })
    })

    if (!orderResponse.ok) {
      throw new Error('Failed to create Paymob order')
    }

    const order = await orderResponse.json()

    // Step 3: Get payment key
    const currentDomain = req.headers.get('origin') || req.headers.get('referer') || 'https://yourdomain.com'
    const returnUrl = `${currentDomain.replace(/\/$/, '')}/payment-success`

    const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: Math.round(amount * 100),
        expiration: 3600,
        order_id: order.id,
        billing_data: {
          email: "customer@marketplace.com",
          first_name: "Customer",
          last_name: "User",
          phone_number: "+201000000000",
          apartment: "N/A",
          floor: "N/A",
          street: "N/A",
          building: "N/A",
          shipping_method: "N/A",
          postal_code: "N/A",
          city: "Cairo",
          country: "EG",
          state: "Cairo"
        },
        currency,
        integration_id: parseInt(PAYMOB_INTEGRATION_ID),
        return_url: returnUrl,
        redirection_url: returnUrl
      })
    })

    if (!paymentKeyResponse.ok) {
      throw new Error('Failed to get Paymob payment key')
    }

    const { token: paymentToken } = await paymentKeyResponse.json()

    // Build checkout URL
    const checkoutUrl = PAYMOB_IFRAME_ID
      ? `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`
      : `https://accept.paymob.com/api/acceptance/post_pay?payment_token=${paymentToken}`

    console.log('✅ Secure Paymob payment session created successfully')

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl,
        paymentId: order.id.toString(),
        paymentToken,
        requiresAction: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Secure Paymob payment error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})