-- Create user_blocks table for managing blocked users (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can block others" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can unblock others" ON public.user_blocks;

-- RLS Policies for user_blocks table
-- Users can view their own blocks (who they've blocked)
CREATE POLICY "Users can view their own blocks"
ON public.user_blocks
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can block other users
CREATE POLICY "Users can block others"
ON public.user_blocks
FOR INSERT
WITH CHECK (auth.uid() = blocker_id AND blocker_id != blocked_id);

-- Users can unblock users they've blocked
CREATE POLICY "Users can unblock others"
ON public.user_blocks
FOR DELETE
USING (auth.uid() = blocker_id);

-- Create index for efficient blocking queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks (blocked_id);

-- Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS public.block_user(UUID, UUID);
DROP FUNCTION IF EXISTS public.unblock_user(UUID, UUID);
DROP FUNCTION IF EXISTS public.check_if_user_is_blocked(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_blocked_users(UUID);
DROP FUNCTION IF EXISTS public.get_items_within_range_with_blocking(double precision, double precision, double precision, UUID, text);

-- RPC function to block a user
CREATE OR REPLACE FUNCTION public.block_user(blocker_uuid UUID, blocked_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is trying to block themselves
  IF blocker_uuid = blocked_uuid THEN
    RETURN FALSE;
  END IF;

  -- Insert the block relationship
  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (blocker_uuid, blocked_uuid)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to unblock a user
CREATE OR REPLACE FUNCTION public.unblock_user(blocker_uuid UUID, blocked_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove the block relationship
  DELETE FROM public.user_blocks
  WHERE blocker_id = blocker_uuid AND blocked_id = blocked_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.check_if_user_is_blocked(blocker_uuid UUID, blocked_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = blocker_uuid AND blocked_id = blocked_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RPC function to get list of users blocked by a user
CREATE OR REPLACE FUNCTION public.get_blocked_users(blocker_uuid UUID)
RETURNS TABLE(blocked_user_id UUID, blocked_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT blocked_id, created_at
  FROM public.user_blocks
  WHERE blocker_id = blocker_uuid
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create or update user_ratings table
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rater_id, rated_user_id)
);

-- Enable RLS on user_ratings table
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_ratings
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can rate others" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.user_ratings;

CREATE POLICY "Anyone can view ratings" ON public.user_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate others" ON public.user_ratings FOR INSERT WITH CHECK (auth.uid() = rater_id AND rater_id != rated_user_id);
CREATE POLICY "Users can update their own ratings" ON public.user_ratings FOR UPDATE USING (auth.uid() = rater_id);
CREATE POLICY "Users can delete their own ratings" ON public.user_ratings FOR DELETE USING (auth.uid() = rater_id);

-- Create indexes for efficient rating queries
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user_id ON public.user_ratings (rated_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater_id ON public.user_ratings (rater_id);

-- Update or create get_seller_ratings function to exclude ratings from blocked users
DROP FUNCTION IF EXISTS public.get_seller_ratings(UUID);
CREATE OR REPLACE FUNCTION public.get_seller_ratings(seller_uuid UUID)
RETURNS TABLE(
  average_rating NUMERIC,
  total_ratings BIGINT,
  five_star_count BIGINT,
  four_star_count BIGINT,
  three_star_count BIGINT,
  two_star_count BIGINT,
  one_star_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(AVG(ur.rating), 0)::NUMERIC as average_rating,
    COUNT(ur.rating) as total_ratings,
    COUNT(CASE WHEN ur.rating = 5 THEN 1 END) as five_star_count,
    COUNT(CASE WHEN ur.rating = 4 THEN 1 END) as four_star_count,
    COUNT(CASE WHEN ur.rating = 3 THEN 1 END) as three_star_count,
    COUNT(CASE WHEN ur.rating = 2 THEN 1 END) as two_star_count,
    COUNT(CASE WHEN ur.rating = 1 THEN 1 END) as one_star_count
  FROM public.user_ratings ur
  WHERE ur.rated_user_id = seller_uuid
    -- Exclude ratings from users who are blocked by the seller
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE ub.blocker_id = seller_uuid AND ub.blocked_id = ur.rater_id
    )
    -- Exclude ratings from users who have blocked the seller
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE ub.blocker_id = ur.rater_id AND ub.blocked_id = seller_uuid
    );
END;
$function$;

-- Update the get_items_within_range function to exclude items from blocked users
CREATE OR REPLACE FUNCTION public.get_items_within_range_with_blocking(
  user_lat double precision,
  user_lon double precision,
  max_distance double precision,
  user_uuid UUID,
  category_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid,
  title text,
  price numeric,
  description text,
  category_id text,
  category_label text,
  category_icon text,
  images text[],
  seller_id uuid,
  created_at timestamp with time zone,
  latitude double precision,
  longitude double precision,
  promoted boolean,
  promoted_at timestamp with time zone,
  distance double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.price,
    i.description,
    i.category_id,
    c.label as category_label,
    c.icon as category_icon,
    i.images,
    i.seller_id,
    i.created_at,
    i.latitude,
    i.longitude,
    i.promoted,
    i.promoted_at,
    public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) as distance
  FROM public.items i
  LEFT JOIN public.categories c ON i.category_id = c.id
  WHERE
    i.latitude IS NOT NULL
    AND i.longitude IS NOT NULL
    AND public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) <= max_distance
    AND (category_filter IS NULL OR category_filter = 'all' OR i.category_id = category_filter)
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
    i.promoted DESC NULLS LAST,
    distance ASC,
    i.created_at DESC;
END;
$function$;