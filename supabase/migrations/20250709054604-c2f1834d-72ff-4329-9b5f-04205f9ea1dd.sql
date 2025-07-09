-- Create channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel_members table to track membership
CREATE TABLE public.channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Add foreign key constraints
ALTER TABLE public.channel_members 
ADD CONSTRAINT fk_channel_members_channel_id 
FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channels table
-- Anyone can view public channels, members can view private channels they're part of
CREATE POLICY "View public channels or joined private channels" 
ON public.channels 
FOR SELECT 
USING (
  is_private = false 
  OR EXISTS (
    SELECT 1 FROM public.channel_members 
    WHERE channel_id = channels.id 
    AND user_id = auth.uid()
  )
);

-- Users can create channels
CREATE POLICY "Users can create channels" 
ON public.channels 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

-- Channel creators can update their channels
CREATE POLICY "Channel creators can update" 
ON public.channels 
FOR UPDATE 
USING (auth.uid() = creator_id);

-- Channel creators can delete their channels
CREATE POLICY "Channel creators can delete" 
ON public.channels 
FOR DELETE 
USING (auth.uid() = creator_id);

-- RLS Policies for channel_members table
-- Members can view other members of channels they're part of
CREATE POLICY "View channel members" 
ON public.channel_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.channel_members cm 
    WHERE cm.channel_id = channel_members.channel_id 
    AND cm.user_id = auth.uid()
  )
);

-- Users can join channels (insert membership)
CREATE POLICY "Users can join channels" 
ON public.channel_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Channel owners/admins can manage members
CREATE POLICY "Channel owners can manage members" 
ON public.channel_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.channel_members cm 
    WHERE cm.channel_id = channel_members.channel_id 
    AND cm.user_id = auth.uid() 
    AND cm.role IN ('owner', 'admin')
  )
);

-- Users can leave channels (delete their own membership)
CREATE POLICY "Users can leave channels" 
ON public.channel_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to automatically add creator as owner when channel is created
CREATE OR REPLACE FUNCTION public.add_channel_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add creator as owner
CREATE TRIGGER add_creator_as_owner_trigger
  AFTER INSERT ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.add_channel_creator_as_owner();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_channels_updated_at();