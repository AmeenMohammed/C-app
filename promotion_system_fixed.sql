-- Fixed SQL for Supabase Dashboard - Promotion System
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/vttanwzodshofhycuqjr/sql

-- Drop existing functions if they exist to handle return type changes
DROP FUNCTION IF EXISTS get_promoted_items_for_rotation(double precision,double precision,integer,text,integer);
DROP FUNCTION IF EXISTS get_regular_items_with_blocking(double precision,double precision,integer,text,text,integer,integer);
DROP FUNCTION IF EXISTS get_user_promoted_items(text);

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.promotion_analytics CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;

-- Create promotions table
CREATE TABLE public.promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  promotion_type VARCHAR(20) DEFAULT 'basic' CHECK (promotion_type IN ('basic', 'standard', 'premium')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_id TEXT, -- Stripe payment ID or other payment reference
  payment_method VARCHAR(50), -- Payment method used (stripe, paypal, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create promotion analytics table
CREATE TABLE public.promotion_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('view', 'click', 'contact', 'share')),
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Fixed syntax)
DROP POLICY IF EXISTS "Users can view their own promotions" ON public.promotions;
CREATE POLICY "Users can view their own promotions" ON public.promotions
FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own promotions" ON public.promotions;
CREATE POLICY "Users can insert their own promotions" ON public.promotions
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own promotions" ON public.promotions;
CREATE POLICY "Users can update their own promotions" ON public.promotions
FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Public can view analytics" ON public.promotion_analytics;
CREATE POLICY "Public can view analytics" ON public.promotion_analytics
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert analytics" ON public.promotion_analytics;
CREATE POLICY "Users can insert analytics" ON public.promotion_analytics
FOR INSERT WITH CHECK (true);

-- Function to update expired promotions
CREATE OR REPLACE FUNCTION update_expired_promotions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.promotions
  SET status = 'expired'
  WHERE status = 'active' AND end_date < NOW();
END;
$$;

-- Function to get promoted items for rotation
CREATE OR REPLACE FUNCTION get_promoted_items_for_rotation(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  max_distance INTEGER DEFAULT 50,
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC(10,2),
  currency VARCHAR(3),
  description TEXT,
  category_id TEXT,
  category_label TEXT,
  category_icon VARCHAR(20),
  images TEXT[],
  seller_id UUID,
  created_at TIMESTAMPTZ,
  latitude NUMERIC,
  longitude NUMERIC,
  listing_type VARCHAR(20),
  status TEXT[],
  distance DOUBLE PRECISION,
  promotion_id UUID,
  promotion_start TIMESTAMPTZ,
  promotion_priority INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- First update expired promotions
  PERFORM update_expired_promotions();

  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.price,
    i.currency,
    i.description,
    i.category_id,
    c.label as category_label,
    c.icon as category_icon,
    i.images,
    i.seller_id,
    i.created_at,
    i.latitude,
    i.longitude,
    i.listing_type,
    i.status,
    public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) as distance,
    p.id as promotion_id,
    p.start_date as promotion_start,
    EXTRACT(EPOCH FROM (NOW() - p.start_date))::INTEGER as promotion_priority
  FROM public.items i
  INNER JOIN public.promotions p ON i.id = p.item_id
  LEFT JOIN public.categories c ON i.category_id = c.id
  WHERE
    p.status = 'active'
    AND p.start_date <= NOW()
    AND p.end_date > NOW()
    AND i.latitude IS NOT NULL
    AND i.longitude IS NOT NULL
    AND public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) <= max_distance
    AND (category_filter IS NULL OR category_filter = 'all' OR i.category_id = category_filter)
  ORDER BY
    RANDOM() * (1 + promotion_priority / 86400.0),
    distance ASC
  LIMIT limit_count;
END;
$$;

-- Function to get regular items
CREATE OR REPLACE FUNCTION get_regular_items_with_blocking(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  max_distance INTEGER,
  user_uuid TEXT,
  category_filter TEXT DEFAULT NULL,
  offset_count INTEGER DEFAULT 0,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC(10,2),
  currency VARCHAR(3),
  description TEXT,
  category_id TEXT,
  category_label TEXT,
  category_icon VARCHAR(20),
  images TEXT[],
  seller_id UUID,
  created_at TIMESTAMPTZ,
  latitude NUMERIC,
  longitude NUMERIC,
  listing_type VARCHAR(20),
  status TEXT[],
  distance DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.price,
    i.currency,
    i.description,
    i.category_id,
    c.label as category_label,
    c.icon as category_icon,
    i.images,
    i.seller_id,
    i.created_at,
    i.latitude,
    i.longitude,
    i.listing_type,
    i.status,
    public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) as distance
  FROM public.items i
  LEFT JOIN public.categories c ON i.category_id = c.id
  LEFT JOIN public.promotions p ON i.id = p.item_id AND p.status = 'active' AND p.end_date > NOW()
  WHERE
    i.latitude IS NOT NULL
    AND i.longitude IS NOT NULL
    AND public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) <= max_distance
    AND (category_filter IS NULL OR category_filter = 'all' OR i.category_id = category_filter)
    AND p.id IS NULL -- Exclude promoted items
    AND i.seller_id != user_uuid::UUID
  ORDER BY i.created_at DESC
  OFFSET offset_count
  LIMIT limit_count;
END;
$$;

-- Function to get user promoted items
CREATE OR REPLACE FUNCTION get_user_promoted_items(user_uuid TEXT)
RETURNS TABLE (
  item_id UUID,
  title TEXT,
  price NUMERIC(10,2),
  currency VARCHAR(3),
  images TEXT[],
  promotion_id UUID,
  promotion_type VARCHAR(20),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status VARCHAR(20),
  amount_paid DECIMAL,
  payment_id TEXT,
  payment_method VARCHAR(50),
  total_views BIGINT,
  total_clicks BIGINT,
  total_contacts BIGINT,
  hours_remaining INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id as item_id,
    i.title,
    i.price,
    i.currency,
    i.images,
    p.id as promotion_id,
    p.promotion_type,
    p.start_date,
    p.end_date,
    p.status,
    p.amount_paid,
    p.payment_id,
    p.payment_method,
    COALESCE(views.view_count, 0) as total_views,
    COALESCE(clicks.click_count, 0) as total_clicks,
    COALESCE(contacts.contact_count, 0) as total_contacts,
    CASE
      WHEN p.status = 'active' AND p.end_date > NOW()
      THEN EXTRACT(HOUR FROM (p.end_date - NOW()))::INTEGER
      ELSE 0
    END as hours_remaining
  FROM public.promotions p
  INNER JOIN public.items i ON p.item_id = i.id
  LEFT JOIN (
    SELECT pa.promotion_id, COUNT(*) as view_count
    FROM public.promotion_analytics pa
    WHERE pa.event_type = 'view'
    GROUP BY pa.promotion_id
  ) views ON p.id = views.promotion_id
  LEFT JOIN (
    SELECT pa.promotion_id, COUNT(*) as click_count
    FROM public.promotion_analytics pa
    WHERE pa.event_type = 'click'
    GROUP BY pa.promotion_id
  ) clicks ON p.id = clicks.promotion_id
  LEFT JOIN (
    SELECT pa.promotion_id, COUNT(*) as contact_count
    FROM public.promotion_analytics pa
    WHERE pa.event_type = 'contact'
    GROUP BY pa.promotion_id
  ) contacts ON p.id = contacts.promotion_id
  WHERE p.user_id = user_uuid
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to track promotion events
CREATE OR REPLACE FUNCTION track_promotion_event(
  promo_id UUID,
  event_type_param TEXT,
  user_id_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.promotion_analytics (promotion_id, event_type, user_id)
  VALUES (promo_id, event_type_param, user_id_param);
END;
$$;