import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { BookmarkPlus, MessageSquare, Eye, Share2, ImagePlus, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import avatar from "../assets/avatar.jpg";
import defaultImage from "../assets/default_item_image.png";
import { formatPrice } from "@/utils/currency";
interface Item {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images?: string[];
  seller_id: string;
  listing_type?: string;
  status?: string[];
  created_at?: string;
  // Promotion fields
  promotion_id?: string;
  promotion_start?: string;
  promotion_priority?: number;
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
  const { t } = useLanguage();
  const [savingItems, setSavingItems] = useState<Record<string, boolean>>({});
  const [promotedItems, setPromotedItems] = useState<Item[]>([]);
  const [regularItems, setRegularItems] = useState<Item[]>([]);
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

  // Query to fetch promoted items (only for home feed, not profile)
  const { data: fetchedPromotedItems } = useQuery({
    queryKey: ['promotedItems', effectiveUserLocation, selectedCategory, locationRange],
    queryFn: async () => {
      if (!effectiveUserLocation || isProfile) return [];

      try {
        const { data, error } = await supabase.rpc('get_promoted_items_for_rotation', {
          user_lat: effectiveUserLocation.lat,
          user_lon: effectiveUserLocation.lng,
          max_distance: locationRange,
          category_filter: selectedCategory === 'all' ? null : selectedCategory,
          limit_count: 5
        });

        if (error) {
          console.warn('Promoted items query failed, fallback to empty:', error.message);
          return [];
        }

        return data || [];
      } catch (error) {
        console.warn('Promoted items not available:', error);
        return [];
      }
    },
    enabled: !!effectiveUserLocation && !isProfile,
    refetchInterval: 30000, // Refresh every 30 seconds for rotation
  });

  // Query to fetch user items or filtered items based on location and category
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['items', userId, isProfile, locationRange, selectedCategory, effectiveUserLocation, searchQuery],
    queryFn: async () => {
      try {
        // If on profile page and userId provided, get user's items
        if (isProfile && userId) {
          console.log('🔍 Fetching items for user profile:', userId);

          // Check if viewing another user's profile and if they are blocked
          if (user && userId !== user.id) {
            try {
              const { data: isBlocked } = await supabase.rpc('check_if_user_is_blocked', {
                blocker_uuid: user.id,
                blocked_uuid: userId
              });

              const { data: hasBlockedMe } = await supabase.rpc('check_if_user_is_blocked', {
                blocker_uuid: userId,
                blocked_uuid: user.id
              });

              if (isBlocked || hasBlockedMe) {
                console.log('🚫 Cannot view items from blocked user');
                return [];
              }
            } catch (blockingError) {
              console.warn('Blocking check failed for profile, continuing without blocking:', blockingError);
              // Continue without blocking if the function doesn't exist yet
            }
          }

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
          // Use location-based filtering for home feed
          if (effectiveUserLocation) {
            console.log('🌍 Using location-based filtering with promoted/regular separation');

            // Try to use new regular items function if user is authenticated
            if (user) {
              try {
                const { data, error } = await supabase.rpc('get_regular_items_with_blocking', {
                  user_lat: effectiveUserLocation.lat,
                  user_lon: effectiveUserLocation.lng,
                  max_distance: locationRange,
                  user_uuid: user.id,
                  category_filter: selectedCategory === 'all' ? null : selectedCategory,
                  offset_count: 0,
                  limit_count: 50
                });

                if (error) {
                  console.warn('Regular items function not available, falling back:', error.message);
                  throw error;
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
              } catch (regularItemsError) {
                console.log('Using fallback for regular items');

                // Fallback to old method
                try {
                  const { data, error } = await supabase.rpc('get_items_within_range_with_blocking', {
                    user_lat: effectiveUserLocation.lat,
                    user_lon: effectiveUserLocation.lng,
                    max_distance: locationRange,
                    user_uuid: user.id,
                    category_filter: selectedCategory === 'all' ? null : selectedCategory
                  });

                  if (error) {
                    console.warn('Blocking function not available, falling back to regular function:', error.message);
                    throw error; // This will trigger the fallback
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
                } catch (blockingError) {
                  console.log('Using fallback regular function due to:', blockingError.message);
                }
              }
            }

            // Fallback: Use regular function and manually filter blocked users
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

            // If user is authenticated, manually filter blocked users
            if (user && filteredData.length > 0) {
              try {
                const manuallyFilteredData = await Promise.all(
                  filteredData.map(async (item) => {
                    try {
                      // Check if user is blocked or has blocked the seller
                      const { data: isBlocked } = await supabase.rpc('check_if_user_is_blocked', {
                        blocker_uuid: user.id,
                        blocked_uuid: item.seller_id
                      });

                      const { data: hasBlockedMe } = await supabase.rpc('check_if_user_is_blocked', {
                        blocker_uuid: item.seller_id,
                        blocked_uuid: user.id
                      });

                      return (isBlocked || hasBlockedMe) ? null : item;
                    } catch (blockCheckError) {
                      // If blocking check fails, include the item (graceful fallback)
                      console.warn('Block check failed for item:', item.id, blockCheckError.message);
                      return item;
                    }
                  })
                );

                return manuallyFilteredData.filter(item => item !== null);
              } catch (manualFilterError) {
                console.warn('Manual blocking filter failed, returning all items:', manualFilterError.message);
                return filteredData;
              }
            }

            return filteredData;
          } else {
            // Fallback when no location is available - show all items
            console.log('📍 No location available, showing all items without range filtering');

            let query = supabase
              .from('items')
              .select('*')
              .order('created_at', { ascending: false });

            // Apply search filter if search query exists
            if (searchQuery.trim()) {
              query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;

            if (error) {
              console.error('Error fetching items:', error);
              return [];
            }

            // Filter out items from blocked users if user is authenticated
            if (user && data) {
              try {
                const filteredData = await Promise.all(
                  data.map(async (item) => {
                    try {
                      // Check if user is blocked or has blocked the seller
                      const { data: isBlocked } = await supabase.rpc('check_if_user_is_blocked', {
                        blocker_uuid: user.id,
                        blocked_uuid: item.seller_id
                      });

                      const { data: hasBlockedMe } = await supabase.rpc('check_if_user_is_blocked', {
                        blocker_uuid: item.seller_id,
                        blocked_uuid: user.id
                      });

                      return (isBlocked || hasBlockedMe) ? null : item;
                    } catch (blockCheckError) {
                      // If blocking check fails, include the item (graceful fallback)
                      console.warn('Block check failed for item:', item.id, blockCheckError.message);
                      return item;
                    }
                  })
                );

                return filteredData.filter(item => item !== null);
              } catch (filterError) {
                console.warn('Blocking filter failed, returning all items:', filterError.message);
                return data;
              }
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

  // Update state when data changes
  useEffect(() => {
    if (!isProfile) {
      setPromotedItems(fetchedPromotedItems || []);
      setRegularItems(items || []);
    }
  }, [fetchedPromotedItems, items, isProfile]);

  // Get view counts for all items
  const { data: viewCounts } = useQuery({
    queryKey: ['itemViews', items, promotedItems],
    queryFn: async () => {
      const allItems = isProfile ? (items || []) : [...(promotedItems || []), ...(regularItems || [])];
      if (allItems.length === 0) return {};

      const viewPromises = allItems.map(async (item) => {
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
    enabled: !!(items || promotedItems),
  });

  // Track promotion analytics
  const trackPromotionAnalytics = async (item: Item, eventType: 'view' | 'click' | 'contact' | 'share') => {
    console.log('🎯 Tracking promotion analytics:', {
      hasPromotionId: !!item.promotion_id,
      promotionId: item.promotion_id,
      hasUser: !!user,
      userId: user?.id,
      eventType,
      itemTitle: item.title
    });

    if (item.promotion_id && user) {
      try {
        const { data, error } = await supabase.rpc('track_promotion_event', {
          promotion_uuid: item.promotion_id,
          event_type_param: eventType,
          user_uuid: user.id
        });

        console.log('✅ Promotion analytics tracked successfully:', { eventType, promotionId: item.promotion_id });

        if (error) {
          console.error('❌ Promotion tracking error:', error);
        }
      } catch (error) {
        console.error('❌ Failed to track promotion analytics:', error);
      }
    } else {
      console.warn('⚠️ Skipping promotion tracking:', {
        reason: !item.promotion_id ? 'No promotion_id' : 'No user',
        promotionId: item.promotion_id,
        hasUser: !!user
      });
    }
  };

  const handleSave = async (e: React.MouseEvent, itemId: string, item?: Item) => {
    e.preventDefault(); // Prevent navigation

    if (!user) {
      toast({
        title: t('authenticationRequired'),
        description: t('pleaseSignInToSaveItems'),
        variant: "destructive",
      });
      return;
    }

    // Track analytics for promoted items
    if (item?.promotion_id) {
      trackPromotionAnalytics(item, 'click');
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
            title: t('alreadySaved'),
            description: t('itemAlreadyInSaved'),
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: t('itemSaved'),
          description: t('addedToSavedItems'),
        });
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: t('errorSavingItem'),
        description: t('pleaseRetryLater'),
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
        title: t('authenticationRequired'),
        description: "Please sign in to message sellers",
        variant: "destructive",
      });
      return;
    }

    // Prevent users from contacting themselves
    if (item.seller_id === user.id) {
      toast({
        title: t('cannotMessageYourself'),
        description: t('cannotSendMessagesToYourself'),
        variant: "destructive",
      });
      return;
    }

    // Track analytics for promoted items
    if (item.promotion_id) {
      trackPromotionAnalytics(item, 'contact');
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
            sellerAvatar: sellerData?.avatar_url || avatar,
            itemId: item.id,
            itemDetails: {
              title: item.title,
              price: item.price,
              image: item.images?.[0] || defaultImage,
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
            sellerAvatar: sellerData.avatar_url || avatar,
            itemId: item.id,
            itemDetails: {
              title: item.title,
              price: item.price,
              image: item.images?.[0] || defaultImage,
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
            sellerAvatar: avatar,
            itemId: item.id,
            itemDetails: {
              title: item.title,
              price: item.price,
              image: item.images?.[0] || defaultImage,
              link: `${window.location.origin}/items/${item.id}`
            }
          }
        });
      }
    } catch (error) {
      console.error('Error getting seller info:', error);
      toast({
        title: "Error",
        description: t('errorGettingSellerInfo'),
        variant: "destructive",
      });
    }
  };

  const handleShare = async (e: React.MouseEvent, itemId: string, title: string, item?: Item) => {
    e.preventDefault(); // Prevent navigation

    // Track analytics for promoted items
    if (item?.promotion_id) {
      trackPromotionAnalytics(item, 'share');
    }

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
          title: t('shareSuccessful'),
          description: t('itemHasBeenShared'),
          duration: 2000,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: t('linkCopied'),
          description: t('itemLinkCopiedToClipboard'),
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: t('shareFailed'),
        description: t('couldNotShareItem'),
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const trackView = async (itemId: string, item?: Item) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      try {
        // Track regular item view
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

        // Track promotion analytics if it's a promoted item
        if (item?.promotion_id) {
          trackPromotionAnalytics(item, 'view');
        }
      } catch (error) {
        // Handle any other errors silently to not disrupt user experience
        console.error('Error tracking view:', error);
      }
    }
  };

  // Render item card with promotion styling
  const renderItemCard = (item: Item, isPromoted: boolean = false) => (
    <Link
      key={item.id}
      to={`/items/${item.id}`}
      onClick={() => trackView(item.id, item)}
    >
      <Card className={`overflow-hidden relative group ${isPromoted ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`}>
        {/* Promoted badge */}
        {isPromoted && (
          <div className="absolute top-2 left-2 z-20">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              <Star className="h-3 w-3 mr-1 fill-current" />
              {t('promoted')}
            </Badge>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-2 z-10">
          {/* Only show save and message buttons if it's not the user's own item */}
          {item.seller_id !== user?.id && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-all ${savingItems[item.id] ? 'opacity-100 scale-125' : ''}`}
                onClick={(e) => handleSave(e, item.id, item)}
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
            onClick={(e) => handleShare(e, item.id, item.title, item)}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative pb-[100%]">
          <img
            src={item.images?.[0] || defaultImage}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Tags displayed on image */}
          {item.status && item.status.length > 0 && (
            <div className={`absolute ${isPromoted ? 'bottom-2' : 'top-2'} left-2 flex flex-wrap gap-1 max-w-[calc(100%-4rem)]`}>
              {item.status.map((tag, index) => (
                <div
                  key={index}
                  className="bg-black/70 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-md"
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-medium text-sm leading-tight truncate">{item.title}</h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {item.listing_type === "request"
              ? t('lookingFor')
              : item.listing_type === "rent"
              ? t('forRent')
              : t('forSale')}
          </p>
          <div className="flex justify-between items-center mt-1">
            <p className="text-sm leading-tight text-muted-foreground">
              {formatPrice(typeof item.price === 'number' ? item.price : 0, item.currency)}
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{viewCounts?.[item.id] ?? 0}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );

  // Show appropriate message when no items are found
  if ((items && items.length === 0 && promotedItems.length === 0) && isProfile) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 7l3-3 3 3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noItemsPostedYet')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('startSellingByPosting')}
          </p>
          <Link to="/post">
            <Button>
              <ImagePlus className="mr-2 h-4 w-4" />
              {t('postYourFirstItem')}
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

  // For profile page, show regular items only
  if (isProfile) {
    const displayItems = items || [];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayItems.map((item) => renderItemCard(item, false))}
      </div>
    );
  }

  // For home page, show promoted items first, then regular items
  return (
    <div className="space-y-6">
      {/* Promoted Items Section */}
      {promotedItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">{t('promotedItems')}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {promotedItems.map((item) => renderItemCard(item, true))}
          </div>
        </div>
      )}

      {/* Regular Items Section */}
      {regularItems.length > 0 && (
        <div>
          {promotedItems.length > 0 && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('allItems')}</h2>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {regularItems.map((item) => renderItemCard(item, false))}
          </div>
        </div>
      )}

      {/* No items message */}
      {promotedItems.length === 0 && regularItems.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noItemsFound')}</p>
        </div>
      )}
    </div>
  );
}

