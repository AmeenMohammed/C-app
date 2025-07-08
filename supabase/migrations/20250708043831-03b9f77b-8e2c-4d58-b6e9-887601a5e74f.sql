-- Drop and recreate the function with correct return type
DROP FUNCTION public.get_items_within_range(double precision,double precision,double precision,text);

CREATE OR REPLACE FUNCTION public.get_items_within_range(user_lat double precision, user_lon double precision, max_distance double precision, category_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, title text, price numeric, description text, category text, images text[], seller_id uuid, created_at timestamp with time zone, latitude double precision, longitude double precision, location_range integer, promoted boolean, promoted_at timestamp with time zone, distance double precision)
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
$function$;

-- Create tables for messages and saved items functionality
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant1_id uuid NOT NULL,
  participant2_id uuid NOT NULL,
  item_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(participant1_id, participant2_id, item_id)
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

CREATE TABLE public.saved_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Enable RLS on new tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = participant1_id);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- RLS policies for saved items
CREATE POLICY "Users can view their own saved items" ON public.saved_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save items" ON public.saved_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their saved items" ON public.saved_items
  FOR DELETE USING (auth.uid() = user_id);