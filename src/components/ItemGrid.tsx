import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { BookmarkPlus, MessageSquare, Eye, Share2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Item {
  id: string;
  title: string;
  price: number;
  images?: string[];
  seller_id: string;
  listing_type?: string;
}

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
  const { user } = useAuth();
  const [savingItems, setSavingItems] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  // Fetch user's saved location from profile if authenticated
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('No saved location found in profile');
        return null;
      }

      return data;
    },
    enabled: !!user && !isProfile, // Only fetch for home page, not profile pages
  });

  // Use saved location from profile if available, otherwise fall back to userLocation prop
  const effectiveUserLocation = userProfile?.latitude && userProfile?.longitude
    ? { lat: userProfile.latitude, lng: userProfile.longitude }
    : userLocation;

  // Query to fetch user items or filtered items based on location and category
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['items', userId, isProfile, locationRange, selectedCategory, effectiveUserLocation, searchQuery],
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
          if (effectiveUserLocation) {
            console.log('🌍 Using location-based filtering:', effectiveUserLocation);

            const { data, error } = await supabase.rpc('get_items_within_range', {
              user_lat: effectiveUserLocation.lat,
              user_lon: effectiveUserLocation.lng,
              max_distance: locationRange,
              category_filter: selectedCategory === 'all' ? null : selectedCategory
            });

            if (error) {
              console.error('Error fetching location-based items:', error);
              return [];
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
            // Fallback when no location is available - show all items
            console.log('📍 No location available, showing all items without range filtering');

            const { data, error } = await supabase
              .from('items')
              .select('*')
              .order('created_at', { ascending: false });

            if (error) {
              console.error('Error fetching items:', error);
              return [];
            }

            return data || [];
          }
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        // Return empty array for all cases
        return [];
      }
    },
  });

  // Get view counts for all items
  const { data: viewCounts } = useQuery({
    queryKey: ['itemViews', items],
    queryFn: async () => {
      const itemsToFetch = items || [];
      if (itemsToFetch.length === 0) return {};

      const viewPromises = itemsToFetch.map(async (item) => {
        if (!item.id) return { itemId: item.id, views: 0 };

        try {
          // Skip UUID validation for sample items with string IDs
          if (typeof item.id === 'string' && !item.id.includes('-')) {
            return { itemId: item.id, views: 0 };
          }

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

  const handleSave = async (e: React.MouseEvent, itemId: string) => {
    e.preventDefault(); // Prevent navigation

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save items",
        variant: "destructive",
      });
      return;
    }

    // Show animation
    setSavingItems(prev => ({ ...prev, [itemId]: true }));

    try {
      const { error } = await supabase
        .from('saved_items')
        .insert({
          user_id: user.id,
          item_id: itemId
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already saved",
            description: "This item is already in your saved items",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Item saved",
          description: "Added to your saved items",
        });
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Error saving item",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setSavingItems(prev => ({ ...prev, [itemId]: false }));
      }, 500);
    }
  };

  const handleContact = async (e: React.MouseEvent, item: Item) => {
    e.preventDefault(); // Prevent navigation

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to message sellers",
        variant: "destructive",
      });
      return;
    }

    // Prevent users from contacting themselves
    if (item.seller_id === user.id) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot send messages to yourself",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get seller information from user_profiles using seller_id (which is auth.users.id)
      const { data: sellerData, error: sellerError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', item.seller_id)
        .maybeSingle();

      if (sellerError) {
        console.error('Error fetching seller profile:', sellerError);
        // Still navigate to messages with basic info if profile not found
        navigate(`/messages?userId=${item.seller_id}`, {
          state: {
            sellerId: item.seller_id,
            sellerName: "User",
            sellerAvatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
            itemId: item.id,
            itemDetails: {
              title: item.title,
              price: item.price,
              image: item.images?.[0] || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
              link: `${window.location.origin}/items/${item.id}`
            }
          }
        });
        return;
      }

      if (sellerData) {
        // Navigate to messages with seller information and item details
        navigate(`/messages?userId=${item.seller_id}`, {
          state: {
            sellerId: item.seller_id,
            sellerName: sellerData.full_name || "User",
            sellerAvatar: sellerData.avatar_url || "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
            itemId: item.id,
            itemDetails: {
              title: item.title,
              price: item.price,
              image: item.images?.[0] || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
              link: `${window.location.origin}/items/${item.id}`
            }
          }
        });
      } else {
        // Handle case where no seller profile exists
        navigate(`/messages?userId=${item.seller_id}`, {
          state: {
            sellerId: item.seller_id,
            sellerName: "User",
            sellerAvatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
            itemId: item.id,
            itemDetails: {
              title: item.title,
              price: item.price,
              image: item.images?.[0] || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
              link: `${window.location.origin}/items/${item.id}`
            }
          }
        });
      }
    } catch (error) {
      console.error('Error getting seller info:', error);
      toast({
        title: "Error",
        description: "Failed to open chat with seller",
        variant: "destructive",
      });
    }
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
      try {
        // First check if the view already exists
        const { data: existingView } = await supabase
          .from('item_views')
          .select('id')
          .eq('item_id', itemId)
          .eq('viewer_id', user.id)
          .maybeSingle();

        // Only insert if the view doesn't exist
        if (!existingView) {
          const { error } = await supabase
            .from('item_views')
            .insert({
              item_id: itemId,
              viewer_id: user.id
            });

          if (error) {
            console.error('Error tracking view:', error);
          }
        }
      } catch (error) {
        // Handle any other errors silently to not disrupt user experience
        console.error('Error tracking view:', error);
      }
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
            <div className="h-full bg-muted"></div>
          </Card>
        ))}
      </div>
    );
  }

  const displayItems = items || [];

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
              {/* Only show save and message buttons if it's not the user's own item */}
              {item.seller_id !== user?.id && (
                <>
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
                    onClick={(e) => handleContact(e, item)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </>
              )}
              {/* Share button is always visible */}
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

