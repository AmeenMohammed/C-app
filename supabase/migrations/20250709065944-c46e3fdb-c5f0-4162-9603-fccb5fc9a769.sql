-- Drop existing problematic policies
DROP POLICY IF EXISTS "View channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Channel owners can manage members" ON public.channel_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_channel_member(channel_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channel_members 
    WHERE channel_id = channel_uuid 
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_is_channel_admin(channel_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channel_members 
    WHERE channel_id = channel_uuid 
    AND user_id = user_uuid 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new non-recursive policies
CREATE POLICY "View channel members if user is member" 
ON public.channel_members 
FOR SELECT 
USING (public.user_is_channel_member(channel_id, auth.uid()));

CREATE POLICY "Channel admins can manage members" 
ON public.channel_members 
FOR ALL 
USING (public.user_is_channel_admin(channel_id, auth.uid()));

-- Keep existing safe policies
-- Users can join channels (no recursion)
-- Users can leave channels (no recursion)