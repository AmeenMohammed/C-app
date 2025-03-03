import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BookmarkPlus, MessageSquare, Eye, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

const SAMPLE_ITEMS = [
  {
    id: "1",
    title: "Vintage Camera",
    price: 299,
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
  },
  {
    id: "2",
    title: "Laptop Stand",
    price: 49,
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
  },
];

export function ItemGrid() {
  const { toast } = useToast();
  const [savingItems, setSavingItems] = useState<Record<string, boolean>>({});

  // Get view counts for all items
  const { data: viewCounts } = useQuery({
    queryKey: ['itemViews'],
    queryFn: async () => {
      const viewPromises = SAMPLE_ITEMS.map(async (item) => {
        const { data } = await supabase.rpc('get_item_views', { item_uuid: item.id });
        return { itemId: item.id, views: data ?? 0 };
      });
      const counts = await Promise.all(viewPromises);
      return Object.fromEntries(counts.map(({ itemId, views }) => [itemId, views]));
    },
  });

  const handleSave = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault(); // Prevent navigation
    
    // Show animation
    setSavingItems(prev => ({ ...prev, [itemId]: true }));
    setTimeout(() => {
      setSavingItems(prev => ({ ...prev, [itemId]: false }));
    }, 500);
  };

  const handleContact = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault(); // Prevent navigation
    toast({
      description: "Opening chat with seller...",
    });
  };

  const handleShare = (e: React.MouseEvent, itemId: string, title: string) => {
    e.preventDefault(); // Prevent navigation

    // Check if Web Share API is available
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `Check out this item: ${title}`,
        url: `${window.location.origin}/items/${itemId}`,
      })
      .then(() => toast.success("Shared successfully"))
      .catch((error) => {
        console.error('Error sharing:', error);
        toast.error("Error sharing item");
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(`${window.location.origin}/items/${itemId}`)
        .then(() => toast.success("Link copied to clipboard"))
        .catch(() => toast.error("Failed to copy link"));
    }
  };

  const trackView = async (itemId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      await supabase.from('item_views').insert({
        item_id: itemId,
        viewer_id: user.id
      }).then(({ error }) => {
        if (error && error.code !== '23505') { // Ignore unique violation errors
          console.error('Error tracking view:', error);
        }
      });
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {SAMPLE_ITEMS.map((item) => (
        <Link 
          key={item.id} 
          to={`/items/${item.id}`}
          onClick={() => trackView(item.id)}
        >
          <Card className="overflow-hidden relative group">
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              <Button
                variant="secondary"
                size="icon"
                className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-all ${savingItems[item.id] ? 'opacity-100 scale-125' : ''}`}
                onClick={(e) => handleSave(e, item.id)}
              >
                <BookmarkPlus className={`h-4 w-4 transition-all ${savingItems[item.id] ? 'text-primary fill-primary' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleContact(e, item.id)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleShare(e, item.id, item.title)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative pb-[100%]">
              <img
                src={item.image}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm leading-tight truncate">{item.title}</h3>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm leading-tight text-muted-foreground">${item.price}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{viewCounts?.[item.id] ?? 0}</span>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
