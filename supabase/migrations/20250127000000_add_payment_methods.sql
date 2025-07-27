-- Migration for Payment Methods System
-- Add payment methods table for storing user payment information

-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- References auth.users.id
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('card', 'paypal', 'apple_pay', 'google_pay')),
  provider VARCHAR(50) NOT NULL DEFAULT 'stripe', -- stripe, paypal, etc.
  provider_payment_method_id TEXT NOT NULL, -- Stripe payment method ID, PayPal billing agreement ID, etc.

  -- Card details (for display purposes only - sensitive data stored with provider)
  card_brand VARCHAR(20), -- visa, mastercard, amex, etc.
  card_last_four VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  card_fingerprint TEXT, -- Unique identifier for the card

  -- PayPal details
  paypal_email TEXT,

  -- General fields
  nickname TEXT, -- User-friendly name like "Main Card", "Business Card"
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_default ON public.payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment methods"
  ON public.payment_methods FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own payment methods"
  ON public.payment_methods FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own payment methods"
  ON public.payment_methods FOR DELETE
  USING (auth.uid()::text = user_id);

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this payment method as default, unset all others for this user
  IF NEW.is_default = true THEN
    UPDATE public.payment_methods
    SET is_default = false, updated_at = NOW()
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single default payment method
CREATE TRIGGER trigger_ensure_single_default_payment_method
  BEFORE INSERT OR UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- Function to get user's payment methods
CREATE OR REPLACE FUNCTION get_user_payment_methods(user_uuid TEXT)
RETURNS TABLE (
  id UUID,
  payment_type VARCHAR(20),
  provider VARCHAR(50),
  provider_payment_method_id TEXT,
  card_brand VARCHAR(20),
  card_last_four VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  paypal_email TEXT,
  nickname TEXT,
  is_default BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id,
    pm.payment_type,
    pm.provider,
    pm.provider_payment_method_id,
    pm.card_brand,
    pm.card_last_four,
    pm.card_exp_month,
    pm.card_exp_year,
    pm.paypal_email,
    pm.nickname,
    pm.is_default,
    pm.is_active,
    pm.created_at
  FROM public.payment_methods pm
  WHERE pm.user_id = user_uuid AND pm.is_active = true
  ORDER BY pm.is_default DESC, pm.created_at DESC;
END;
$$;

-- Update promotions table to reference payment methods
ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id);

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_promotions_payment_method_id ON public.promotions(payment_method_id);