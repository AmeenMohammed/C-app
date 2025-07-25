-- Enhanced promotion system with rotation and analytics
-- Drop existing promoted columns if they exist and recreate with proper structure

-- Drop existing tables if they exist to recreate with correct structure
DROP TABLE IF EXISTS public.promotion_analytics CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;

-- Create promotions table for better tracking
CREATE TABLE public.promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- References auth.users.id
  promotion_type VARCHAR(20) DEFAULT 'basic' CHECK (promotion_type IN ('basic', 'standard', 'premium')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  payment_id TEXT, -- Stripe payment ID or other payment reference
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create promotion analytics table
CREATE TABLE public.promotion_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('view', 'click', 'contact', 'share')),
  user_id TEXT, -- NULL for anonymous views
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_item_id ON public.promotions(item_id);
CREATE INDEX IF NOT EXISTS idx_promotions_user_id ON public.promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status_dates ON public.promotions(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotion_analytics_promotion_id ON public.promotion_analytics(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_analytics_event_type ON public.promotion_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_promotion_analytics_created_at ON public.promotion_analytics(created_at);

-- Function to automatically update promotion status based on expiry
CREATE OR REPLACE FUNCTION update_expired_promotions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.promotions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND end_date < NOW();
END;
$$;

-- Drop existing functions if they exist to handle return type changes
DROP FUNCTION IF EXISTS get_promoted_items_for_rotation(double precision,double precision,integer,text,integer);
DROP FUNCTION IF EXISTS get_regular_items_with_blocking(double precision,double precision,integer,text,text,integer,integer);
DROP FUNCTION IF EXISTS get_user_promoted_items(text);

-- Function to get active promoted items with rotation logic
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
  price INTEGER,
  currency TEXT,
  description TEXT,
  category_id TEXT,
  category_label TEXT,
  category_icon TEXT,
  images TEXT[],
  seller_id UUID,
  created_at TIMESTAMPTZ,
  latitude NUMERIC,
  longitude NUMERIC,
  listing_type TEXT,
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
    -- Newer promotions get higher priority (more recent = higher number)
    EXTRACT(EPOCH FROM (NOW() - p.start_date))::INTEGER * -1 as promotion_priority
  FROM public.items i
  LEFT JOIN public.categories c ON i.category_id = c.id
  INNER JOIN public.promotions p ON i.id = p.item_id
  WHERE
    p.status = 'active'
    AND p.start_date <= NOW()
    AND p.end_date > NOW()
    AND i.latitude IS NOT NULL
    AND i.longitude IS NOT NULL
    AND public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) <= max_distance
    AND (category_filter IS NULL OR category_filter = 'all' OR i.category_id = category_filter)
  ORDER BY
    -- Random with seed based on current hour for rotation every hour
    RANDOM() * (1 + promotion_priority / 86400.0), -- Bias towards newer promotions
    distance ASC
  LIMIT limit_count;
END;
$$;

-- Function to get regular items (non-promoted)
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
  price INTEGER,
  currency TEXT,
  description TEXT,
  category_id TEXT,
  category_label TEXT,
  category_icon TEXT,
  images TEXT[],
  seller_id UUID,
  created_at TIMESTAMPTZ,
  latitude NUMERIC,
  longitude NUMERIC,
  listing_type TEXT,
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
  WHERE
    i.latitude IS NOT NULL
    AND i.longitude IS NOT NULL
    AND public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) <= max_distance
    AND (category_filter IS NULL OR category_filter = 'all' OR i.category_id = category_filter)
    -- Exclude currently promoted items
    AND NOT EXISTS (
      SELECT 1 FROM public.promotions p
      WHERE p.item_id = i.id
      AND p.status = 'active'
      AND p.start_date <= NOW()
      AND p.end_date > NOW()
    )
    -- Exclude items from blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE ub.blocker_id = user_uuid AND ub.blocked_id = i.seller_id
    )
    -- Exclude items from users who have blocked the current user
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE ub.blocker_id = i.seller_id AND ub.blocked_id = user_uuid
    )
  ORDER BY
    distance ASC,
    i.created_at DESC
  OFFSET offset_count
  LIMIT limit_count;
END;
$$;

-- Function to track promotion analytics
CREATE OR REPLACE FUNCTION track_promotion_event(
  promotion_uuid UUID,
  event_type_param TEXT,
  user_uuid TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.promotion_analytics (promotion_id, event_type, user_id, metadata)
  VALUES (promotion_uuid, event_type_param, user_uuid, metadata_param);
END;
$$;

-- Function to get user's promoted items with analytics
CREATE OR REPLACE FUNCTION get_user_promoted_items(user_uuid TEXT)
RETURNS TABLE (
  item_id UUID,
  title TEXT,
  price INTEGER,
  currency TEXT,
  images TEXT[],
  promotion_id UUID,
  promotion_type TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT,
  amount_paid DECIMAL,
  total_views BIGINT,
  total_clicks BIGINT,
  total_contacts BIGINT,
  hours_remaining INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update expired promotions first
  PERFORM update_expired_promotions();

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
    COALESCE(views.view_count, 0) as total_views,
    COALESCE(clicks.click_count, 0) as total_clicks,
    COALESCE(contacts.contact_count, 0) as total_contacts,
    CASE
      WHEN p.status = 'active' AND p.end_date > NOW() THEN
        EXTRACT(EPOCH FROM (p.end_date - NOW()))::INTEGER / 3600
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

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using DO block to handle existing policies)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own promotions" ON public.promotions;
  DROP POLICY IF EXISTS "Users can insert their own promotions" ON public.promotions;
  DROP POLICY IF EXISTS "Users can update their own promotions" ON public.promotions;
  DROP POLICY IF EXISTS "Anyone can view promotion analytics for public data" ON public.promotion_analytics;
  DROP POLICY IF EXISTS "System can insert promotion analytics" ON public.promotion_analytics;

  -- Create policies
  CREATE POLICY "Users can view their own promotions" ON public.promotions
    FOR SELECT USING (auth.uid()::text = user_id);

  CREATE POLICY "Users can insert their own promotions" ON public.promotions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

  CREATE POLICY "Users can update their own promotions" ON public.promotions
    FOR UPDATE USING (auth.uid()::text = user_id);

  CREATE POLICY "Anyone can view promotion analytics for public data" ON public.promotion_analytics
    FOR SELECT USING (true);

  CREATE POLICY "System can insert promotion analytics" ON public.promotion_analytics
    FOR INSERT WITH CHECK (true);
END
$$;

-- Create trigger to automatically update promotion status
CREATE OR REPLACE FUNCTION trigger_update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_promotions_updated_at();