-- Add currency field to items table with EGP as default
ALTER TABLE public.items
ADD COLUMN currency VARCHAR(3) DEFAULT 'EGP' NOT NULL;

-- Update existing items to have EGP currency
UPDATE public.items
SET currency = 'EGP'
WHERE currency IS NULL;

-- Update the get_items_within_range function to include currency
DROP FUNCTION IF EXISTS public.get_items_within_range(double precision, double precision, double precision, text);

CREATE OR REPLACE FUNCTION public.get_items_within_range(
  user_lat double precision,
  user_lon double precision,
  max_distance double precision,
  category_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid,
  title text,
  price numeric,
  currency varchar(3),
  description text,
  category_id text,
  category_label text,
  category_icon text,
  images text[],
  seller_id uuid,
  created_at timestamp with time zone,
  latitude double precision,
  longitude double precision,
  location_range integer,
  promoted boolean,
  promoted_at timestamp with time zone,
  listing_type text,
  status text[],
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
    i.location_range,
    i.promoted,
    i.promoted_at,
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
  ORDER BY
    i.promoted DESC NULLS LAST,
    distance ASC,
    i.created_at DESC;
END;
$function$;

-- Update the get_items_within_range_with_blocking function to include currency
DROP FUNCTION IF EXISTS public.get_items_within_range_with_blocking(double precision, double precision, double precision, uuid, text);

CREATE OR REPLACE FUNCTION public.get_items_within_range_with_blocking(
  user_lat double precision,
  user_lon double precision,
  max_distance double precision,
  user_uuid uuid,
  category_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid,
  title text,
  price numeric,
  currency varchar(3),
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
  listing_type text,
  status text[],
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
    i.promoted,
    i.promoted_at,
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