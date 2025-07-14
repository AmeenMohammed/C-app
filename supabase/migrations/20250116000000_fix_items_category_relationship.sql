-- Fix items table category field to use proper foreign key relationship

-- First, let's add the new category_id column
ALTER TABLE public.items
ADD COLUMN category_id TEXT;

-- Update existing records to use category_id instead of category
UPDATE public.items
SET category_id = category
WHERE category IS NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.items
ADD CONSTRAINT fk_items_category_id
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

-- Make category_id NOT NULL since it's required
ALTER TABLE public.items
ALTER COLUMN category_id SET NOT NULL;

-- Drop the old category column
ALTER TABLE public.items
DROP COLUMN category;

-- Update the get_items_within_range function to use proper join
DROP FUNCTION public.get_items_within_range(double precision,double precision,double precision,text);

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
    i.location_range,
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
  ORDER BY
    i.promoted DESC NULLS LAST,
    distance ASC,
    i.created_at DESC;
END;
$function$;