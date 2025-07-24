import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, Laugh, ThumbsUp, ThumbsDown, Frown, Angry, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Reaction {
  id: string;
  user_id: string;
  reaction: 'like' | 'love' | 'laugh' | 'angry' | 'sad' | 'thumbs_up' | 'thumbs_down';
  created_at: string;
}

interface MessageReactionsProps {
  messageId: string;
  isChannelMessage?: boolean;
  className?: string;
}

const reactionEmojis = {
  like: "❤️",
  love: "😍",
  laugh: "😂",
  angry: "😠",
  sad: "😢",
  thumbs_up: "👍",
  thumbs_down: "👎"
};

const reactionIcons = {
  like: Heart,
  love: Heart,
  laugh: Laugh,
  angry: Angry,
  sad: Frown,
  thumbs_up: ThumbsUp,
  thumbs_down: ThumbsDown
};

export const MessageReactions = ({ messageId, isChannelMessage = false, className = "" }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReactions();
  }, [messageId, isChannelMessage]);

  const fetchReactions = async () => {
    if (!messageId) return;

    try {
      const tableName = isChannelMessage ? 'channel_message_reactions' : 'message_reactions';
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('message_id', messageId);

      if (error) throw error;
      setReactions(data || []);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const handleReaction = async (reactionType: keyof typeof reactionEmojis) => {
    if (!user || loading) return;

    setLoading(true);
    try {
      const functionName = isChannelMessage ? 'toggle_channel_message_reaction' : 'toggle_message_reaction';
      const { data, error } = await supabase.rpc(functionName, {
        p_message_id: messageId,
        p_reaction: reactionType
      });

      if (error) throw error;

      // Refresh reactions
      await fetchReactions();
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error("Failed to add reaction");
    } finally {
      setLoading(false);
    }
  };

  // Group reactions by type and count them
  const reactionCounts = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.reaction]) {
      acc[reaction.reaction] = {
        count: 0,
        users: [],
        hasUserReacted: false
      };
    }
    acc[reaction.reaction].count++;
    acc[reaction.reaction].users.push(reaction.user_id);
    if (reaction.user_id === user?.id) {
      acc[reaction.reaction].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; users: string[]; hasUserReacted: boolean }>);

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {/* Display existing reactions */}
      {Object.entries(reactionCounts).map(([reactionType, data]) => (
        <Button
          key={reactionType}
          variant={data.hasUserReacted ? "default" : "outline"}
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleReaction(reactionType as keyof typeof reactionEmojis)}
          disabled={loading}
        >
          <span className="mr-1">
            {reactionEmojis[reactionType as keyof typeof reactionEmojis]}
          </span>
          {data.count}
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full hover:bg-muted"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {Object.entries(reactionEmojis).map(([type, emoji]) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-base hover:bg-muted"
                onClick={() => handleReaction(type as keyof typeof reactionEmojis)}
                disabled={loading}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};