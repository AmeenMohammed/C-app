import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BookmarkPlus, MessageSquare, Eye, Share2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ItemGridProps {
  userId?: string;
  isProfile?: boolean;
  locationRange?: number;
  selectedCategory?: string;
  userLocation?: {lat: number, lng: number} | null;
  searchQuery?: string;
}

export function ItemGrid({ userId, isProfile = false, locationRange = 10, selectedCategory = 'all', userLocation, searchQuery = '' }: ItemGridProps) {
  const { toast } = useToast();
  const [savingItems, setSavingItems] = useState<Record<string, boolean>>({});

  // Query to fetch user items or filtered items based on location and category
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['items', userId, isProfile, locationRange, selectedCategory, userLocation, searchQuery],
    queryFn: async () => {
      try {
        // If on profile page and userId provided, get user's items
        if (isProfile && userId) {
          console.log('🔍 Fetching items for user profile:', userId);

          let query = supabase
            .from('items')
            .select('*')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false });

          // Add search filter if search query exists
          if (searchQuery.trim()) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          const { data, error } = await query;

          if (error) {
            console.error('❌ Error fetching user items:', error);
            throw error;
          }

          console.log('✅ Found items for user:', data?.length || 0);
          return data || [];
        } else {
          // Use location-based filtering if user location is available
          if (userLocation) {
            console.log('🌍 Using location-based filtering:', userLocation);
            
            const { data, error } = await supabase.rpc('get_items_within_range', {
              user_lat: userLocation.lat,
              user_lon: userLocation.lng,
              max_distance: locationRange,
              category_filter: selectedCategory === 'all' ? null : selectedCategory
            });

            if (error) {
              console.error('Error fetching location-based items:', error);
              return SAMPLE_ITEMS;
            }

            // Filter by search query if provided
            let filteredData = data || [];
            if (searchQuery.trim()) {
              filteredData = filteredData.filter(item => 
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
              );
            }

            return filteredData;
          } else {
            // Fallback to original filtering when location is not available
            let query = supabase
              .from('items')
              .select('*')
              .lte('location_range', locationRange)
              .order('created_at', { ascending: false });

            // Filter by category if not 'all'
            if (selectedCategory && selectedCategory !== 'all') {
              query = query.eq('category', selectedCategory);
            }

            // Add search filter if search query exists
            if (searchQuery.trim()) {
              query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;

            if (error) {
              console.error('Error fetching items:', error);
              return SAMPLE_ITEMS;
            }

            return data || [];
          }
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        if (isProfile) {
          // For profile pages, return empty array instead of sample items
          return [];
        }
        return SAMPLE_ITEMS;
      }
    },
  });

  // Get view counts for all items
  const { data: viewCounts } = useQuery({
    queryKey: ['itemViews', items],
    queryFn: async () => {
      const itemsToFetch = items || SAMPLE_ITEMS;
      const viewPromises = itemsToFetch.map(async (item) => {
        if (!item.id) return { itemId: item.id, views: 0 };

        try {
          const { data } = await supabase.rpc('get_item_views', { item_uuid: item.id });
          return { itemId: item.id, views: data ?? 0 };
        } catch (error) {
          console.error(`Error fetching views for item ${item.id}:`, error);
          return { itemId: item.id, views: 0 };
        }
      });

      const counts = await Promise.all(viewPromises);
      return Object.fromEntries(counts.map(({ itemId, views }) => [itemId, views]));
    },
    enabled: !!items,
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

  const handleShare = async (e: React.MouseEvent, itemId: string, title: string) => {
    e.preventDefault(); // Prevent navigation

    const shareData = {
      title: title,
      text: `Check out this item: ${title}`,
      url: `${window.location.origin}/items/${itemId}`
    };

    try {
      if (navigator.share) {
        // Use native share if available (mobile devices)
        await navigator.share(shareData);
        toast({
          title: "Shared successfully",
          description: "Item has been shared",
          duration: 2000,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied",
          description: "Item link copied to clipboard",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share failed",
        description: "Could not share the item",
        variant: "destructive",
        duration: 2000,
      });
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

  // Show appropriate message when no items are found
  if (items && items.length === 0 && isProfile) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 7l3-3 3 3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items posted yet</h3>
          <p className="text-muted-foreground mb-4">
            Start selling by posting your first item. It's quick and easy!
          </p>
          <Link to="/post">
            <Button>
              <ImagePlus className="mr-2 h-4 w-4" />
              Post Your First Item
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden relative group animate-pulse h-64">
            <div className="h-full bg-gray-200"></div>
          </Card>
        ))}
      </div>
    );
  }

  const displayItems = items || SAMPLE_ITEMS;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {displayItems.map((item) => (
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
                src={item.images?.[0] || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm leading-tight truncate">{item.title}</h3>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm leading-tight text-muted-foreground">
                  ${typeof item.price === 'number' ? item.price : 0}
                </p>
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

// Sample items to use as fallback
const SAMPLE_ITEMS = [
  {
    id: "1",
    title: "Vintage Camera",
    price: 299,
    category: "cameras",
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    images: ["https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"],
    location_range: 10,
    seller_id: "sample-user-1",
  },
  {
    id: "2",
    title: "Laptop Stand",
    price: 49,
    category: "electronics",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
    images: ["https://images.unsplash.com/photo-1519389950473-47ba0277781c"],
    location_range: 15,
    seller_id: "sample-user-2",
  },
  {
    id: "3",
    title: "Office Chair",
    price: 120,
    category: "furniture",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7",
    images: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7"],
    location_range: 8,
    seller_id: "sample-user-3",
  },
  {
    id: "4",
    title: "Designer Jacket",
    price: 85,
    category: "fashion",
    image: "https://images.unsplash.com/photo-1544022613-e87ca75a784a",
    images: ["https://images.unsplash.com/photo-1544022613-e87ca75a784a"],
    location_range: 12,
    seller_id: "sample-user-4",
  },
];
