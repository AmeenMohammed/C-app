-- Safe Migration Script for Categories and Items Table Fix (Fixed for View Dependencies)
-- Run this in your Supabase Dashboard -> SQL Editor

-- Step 1: First, ensure categories table exists and seed it
INSERT INTO public.categories (id, label, description, icon) VALUES
('furniture', 'Furniture', 'Home and office furniture', 'sofa'),
('medicine', 'Medicine', 'Medical and health items', 'pill'),
('electronics', 'Electronics', 'Electronic devices', 'laptop'),
('vehicles', 'Vehicles', 'Cars and vehicles', 'car'),
('cameras', 'Cameras', 'Cameras and photography gear', 'camera'),
('baby', 'Baby Items', 'Baby products and accessories', 'baby'),
('books', 'Books', 'Books and publications', 'book'),
('fashion', 'Fashion', 'Clothing and accessories', 'shirt')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- Step 2: Check if category_id column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.items ADD COLUMN category_id TEXT;
  END IF;
END $$;

-- Step 3: Update existing records to use category_id instead of category
-- First, let's see what categories exist in the items table
SELECT DISTINCT category as existing_categories
FROM public.items
WHERE category IS NOT NULL;

-- Update existing records, mapping them to valid category IDs
UPDATE public.items
SET category_id = CASE
  WHEN category = 'furniture' THEN 'furniture'
  WHEN category = 'medicine' THEN 'medicine'
  WHEN category = 'electronics' THEN 'electronics'
  WHEN category = 'vehicles' THEN 'vehicles'
  WHEN category = 'cameras' THEN 'cameras'
  WHEN category = 'baby' THEN 'baby'
  WHEN category = 'books' THEN 'books'
  WHEN category = 'fashion' THEN 'fashion'
  -- Default to electronics for any unmapped categories
  ELSE 'electronics'
END
WHERE category IS NOT NULL AND category_id IS NULL;

-- Step 4: Handle any remaining NULL category_id values
UPDATE public.items
SET category_id = 'electronics'
WHERE category_id IS NULL;

-- Step 5: Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_items_category_id'
  ) THEN
    ALTER TABLE public.items DROP CONSTRAINT fk_items_category_id;
  END IF;
END $$;

-- Step 6: Add foreign key constraint
ALTER TABLE public.items
ADD CONSTRAINT fk_items_category_id
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

-- Step 7: Make category_id NOT NULL since it's required
ALTER TABLE public.items
ALTER COLUMN category_id SET NOT NULL;

-- Step 8: Save the items_with_seller view definition before dropping
-- First, let's see what the view looks like
SELECT definition
FROM pg_views
WHERE viewname = 'items_with_seller';

-- Step 9: Drop the items_with_seller view if it exists
DROP VIEW IF EXISTS public.items_with_seller;

-- Step 10: Drop the old category column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.items DROP COLUMN category;
  END IF;
END $$;

-- Step 11: Recreate the items_with_seller view with the new column
CREATE VIEW public.items_with_seller AS
SELECT
  i.id,
  i.title,
  i.price,
  i.description,
  i.category_id as category, -- Map category_id back to category for backward compatibility
  i.images,
  i.location_range,
  i.promoted,
  i.promoted_at,
  i.seller_id,
  i.created_at,
  up.full_name as seller_name,
  up.avatar_url as seller_avatar,
  up.location as seller_location
FROM public.items i
LEFT JOIN public.user_profiles up ON i.seller_id = up.user_id;

-- Step 12: Update the get_items_within_range function to use proper join
DROP FUNCTION IF EXISTS public.get_items_within_range(double precision,double precision,double precision,text);

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

-- Step 13: Verification queries
SELECT 'Categories table:' as verification;
SELECT * FROM public.categories ORDER BY label;

SELECT 'Items table structure:' as verification;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'items' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Sample items with categories:' as verification;
SELECT i.id, i.title, i.category_id, c.label as category_label, c.icon as category_icon
FROM public.items i
LEFT JOIN public.categories c ON i.category_id = c.id
LIMIT 5;

SELECT 'Recreated items_with_seller view:' as verification;
SELECT * FROM public.items_with_seller LIMIT 3;

-- Step 14: Test the updated function
SELECT 'Testing get_items_within_range function:' as verification;
SELECT COUNT(*) as total_items_in_test
FROM public.get_items_within_range(40.7128, -74.0060, 50, NULL);

-- Success message
SELECT '✅ Safe migration completed successfully! Categories are now properly linked to items and view dependencies resolved.' as status;