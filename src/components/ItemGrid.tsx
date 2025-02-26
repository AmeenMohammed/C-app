
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BookmarkPlus, MessageSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_ITEMS = [
  {
    id: 1,
    title: "Vintage Camera",
    price: 299,
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
  },
  {
    id: 2,
    title: "Laptop Stand",
    price: 49,
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
  },
];

export function ItemGrid() {
  const { toast } = useToast();

  // Get view counts for all items
  const { data: viewCounts } = useQuery({
    queryKey: ['itemViews'],
    queryFn: async () => {
      const viewPromises = SAMPLE_ITEMS.map(async (item) => {
        const { data } = await supabase.rpc('get_item_views', { item_uuid: item.id });
        return { itemId: item.id, views: data || 0 };
      });
      const counts = await Promise.all(viewPromises);
      return Object.fromEntries(counts.map(({ itemId, views }) => [itemId, views]));
    },
  });

  const handleSave = (e: React.MouseEvent, itemId: number) => {
    e.preventDefault(); // Prevent navigation
    toast({
      description: "Item saved for later",
    });
  };

  const handleContact = (e: React.MouseEvent, itemId: number) => {
    e.preventDefault(); // Prevent navigation
    toast({
      description: "Opening chat with seller...",
    });
  };

  const trackView = async (itemId: number) => {
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
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-1.5">
      {SAMPLE_ITEMS.map((item) => (
        <Link 
          key={item.id} 
          to={`/items/${item.id}`}
          onClick={() => trackView(item.id)}
        >
          <Card className="overflow-hidden relative group">
            <div className="absolute top-1 right-1 flex gap-1 z-10">
              <Button
                variant="secondary"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleSave(e, item.id)}
              >
                <BookmarkPlus className="h-3 w-3" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleContact(e, item.id)}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </div>
            <div className="relative pb-[100%]">
              <img
                src={item.image}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-1">
              <h3 className="font-medium text-xs leading-tight truncate">{item.title}</h3>
              <div className="flex justify-between items-center">
                <p className="text-xs leading-tight text-muted-foreground">${item.price}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
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
