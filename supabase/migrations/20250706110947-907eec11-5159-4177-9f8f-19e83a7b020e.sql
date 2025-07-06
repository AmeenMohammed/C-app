-- Add latitude and longitude columns to items table for proper location-based filtering
ALTER TABLE public.items 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Create an index for efficient location-based queries
CREATE INDEX idx_items_location ON public.items (latitude, longitude);

-- Create a function to calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DOUBLE PRECISION, 
  lon1 DOUBLE PRECISION, 
  lat2 DOUBLE PRECISION, 
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN (
    6371 * acos(
      cos(radians(lat1)) * 
      cos(radians(lat2)) * 
      cos(radians(lon2) - radians(lon1)) + 
      sin(radians(lat1)) * 
      sin(radians(lat2))
    )
  );
END;
$$;

-- Create a function to get items within a certain distance from a location
CREATE OR REPLACE FUNCTION public.get_items_within_range(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  max_distance DOUBLE PRECISION,
  category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  description TEXT,
  category TEXT,
  images TEXT[],
  seller_id UUID,
  created_at TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_range NUMERIC,
  promoted BOOLEAN,
  promoted_at TIMESTAMPTZ,
  distance DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.price,
    i.description,
    i.category,
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
  WHERE 
    i.latitude IS NOT NULL 
    AND i.longitude IS NOT NULL
    AND public.calculate_distance(user_lat, user_lon, i.latitude, i.longitude) <= max_distance
    AND (category_filter IS NULL OR i.category = category_filter)
  ORDER BY 
    i.promoted DESC NULLS LAST,
    distance ASC,
    i.created_at DESC;
END;
$$;