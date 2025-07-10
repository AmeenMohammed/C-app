-- Create channel_messages table for storing messages in channels
CREATE TABLE public.channel_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  attachment_type TEXT CHECK (attachment_type IN ('image', 'video', 'file')),
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.channel_messages 
ADD CONSTRAINT fk_channel_messages_channel_id 
FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_messages table
-- Members can view messages in channels they're part of
CREATE POLICY "Channel members can view messages" 
ON public.channel_messages 
FOR SELECT 
USING (public.user_is_channel_member(channel_id, auth.uid()));

-- Members can send messages to channels they're part of
CREATE POLICY "Channel members can send messages" 
ON public.channel_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND public.user_is_channel_member(channel_id, auth.uid())
);

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" 
ON public.channel_messages 
FOR UPDATE 
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages" 
ON public.channel_messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_channel_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_channel_messages_updated_at
  BEFORE UPDATE ON public.channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_channel_messages_updated_at();