-- Add location fields to channels table
ALTER TABLE public.channels
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION,
ADD COLUMN location_range INTEGER DEFAULT 10;

-- Create index for efficient location-based queries on channels
CREATE INDEX idx_channels_location ON public.channels (latitude, longitude);

-- Create a function to get channels within a certain distance from a location
CREATE OR REPLACE FUNCTION public.get_channels_within_range(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  max_distance DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  creator_id UUID,
  is_private BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_range INTEGER,
  distance DOUBLE PRECISION,
  member_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.creator_id,
    c.is_private,
    c.created_at,
    c.updated_at,
    c.latitude,
    c.longitude,
    c.location_range,
    public.calculate_distance(user_lat, user_lon, c.latitude, c.longitude) as distance,
    (
      SELECT COUNT(*)
      FROM public.channel_members cm
      WHERE cm.channel_id = c.id
    ) as member_count
  FROM public.channels c
  WHERE
    c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    AND public.calculate_distance(user_lat, user_lon, c.latitude, c.longitude) <= max_distance
  ORDER BY
    distance ASC,
    c.created_at DESC;
END;
$$;