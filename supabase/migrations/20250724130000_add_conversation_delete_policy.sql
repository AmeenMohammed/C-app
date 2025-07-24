-- Add missing DELETE policy for conversations table
-- This allows users to delete conversations they are participants in

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;

-- Create the DELETE policy (this is the missing one that's causing the issue)
CREATE POLICY "Users can delete their own conversations" ON public.conversations
  FOR DELETE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Create UPDATE policy (in case it doesn't exist)
CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id)
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);