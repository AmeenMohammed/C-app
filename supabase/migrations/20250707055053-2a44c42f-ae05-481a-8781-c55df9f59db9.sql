-- Add latitude and longitude columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Create an index for efficient location-based queries on user profiles
CREATE INDEX idx_user_profiles_location ON public.user_profiles (latitude, longitude);