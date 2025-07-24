-- Create enum for reaction types
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'laugh', 'angry', 'sad', 'thumbs_up', 'thumbs_down');

-- Create message_reactions table for private messages
CREATE TABLE message_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Ensure one reaction per user per message
    CONSTRAINT unique_user_message_reaction UNIQUE(message_id, user_id)
);

-- Create channel_message_reactions table for channel messages
CREATE TABLE channel_message_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES channel_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Ensure one reaction per user per message
    CONSTRAINT unique_user_channel_message_reaction UNIQUE(message_id, user_id)
);

-- Add RLS policies for message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages they can see
CREATE POLICY "Users can view message reactions" ON message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.id = message_reactions.message_id
            AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );

-- Users can add/update their own reactions
CREATE POLICY "Users can manage their own message reactions" ON message_reactions
    FOR ALL USING (user_id = auth.uid());

-- Add RLS policies for channel_message_reactions
ALTER TABLE channel_message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on channel messages they can see
CREATE POLICY "Users can view channel message reactions" ON channel_message_reactions
    FOR SELECT USING (user_is_channel_member((
        SELECT cm.channel_id FROM channel_messages cm
        WHERE cm.id = channel_message_reactions.message_id
    ), auth.uid()));

-- Users can add/update their own reactions on channels they're members of
CREATE POLICY "Users can manage their own channel message reactions" ON channel_message_reactions
    FOR ALL USING (
        user_id = auth.uid()
        AND user_is_channel_member((
            SELECT cm.channel_id FROM channel_messages cm
            WHERE cm.id = channel_message_reactions.message_id
        ), auth.uid())
    );

-- Create functions to toggle reactions
CREATE OR REPLACE FUNCTION toggle_message_reaction(
    p_message_id UUID,
    p_reaction reaction_type
) RETURNS BOOLEAN AS $$
DECLARE
    existing_reaction reaction_type;
BEGIN
    -- Check if user already has a reaction on this message
    SELECT reaction INTO existing_reaction
    FROM message_reactions
    WHERE message_id = p_message_id AND user_id = auth.uid();

    IF existing_reaction IS NOT NULL THEN
        IF existing_reaction = p_reaction THEN
            -- Remove the reaction if it's the same
            DELETE FROM message_reactions
            WHERE message_id = p_message_id AND user_id = auth.uid();
            RETURN FALSE;
        ELSE
            -- Update to new reaction
            UPDATE message_reactions
            SET reaction = p_reaction, updated_at = now()
            WHERE message_id = p_message_id AND user_id = auth.uid();
            RETURN TRUE;
        END IF;
    ELSE
        -- Add new reaction
        INSERT INTO message_reactions (message_id, user_id, reaction)
        VALUES (p_message_id, auth.uid(), p_reaction);
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_channel_message_reaction(
    p_message_id UUID,
    p_reaction reaction_type
) RETURNS BOOLEAN AS $$
DECLARE
    existing_reaction reaction_type;
BEGIN
    -- Check if user already has a reaction on this message
    SELECT reaction INTO existing_reaction
    FROM channel_message_reactions
    WHERE message_id = p_message_id AND user_id = auth.uid();

    IF existing_reaction IS NOT NULL THEN
        IF existing_reaction = p_reaction THEN
            -- Remove the reaction if it's the same
            DELETE FROM channel_message_reactions
            WHERE message_id = p_message_id AND user_id = auth.uid();
            RETURN FALSE;
        ELSE
            -- Update to new reaction
            UPDATE channel_message_reactions
            SET reaction = p_reaction, updated_at = now()
            WHERE message_id = p_message_id AND user_id = auth.uid();
            RETURN TRUE;
        END IF;
    ELSE
        -- Add new reaction
        INSERT INTO channel_message_reactions (message_id, user_id, reaction)
        VALUES (p_message_id, auth.uid(), p_reaction);
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX idx_channel_message_reactions_message_id ON channel_message_reactions(message_id);
CREATE INDEX idx_channel_message_reactions_user_id ON channel_message_reactions(user_id);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_reactions_updated_at
    BEFORE UPDATE ON message_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_message_reactions_updated_at
    BEFORE UPDATE ON channel_message_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();