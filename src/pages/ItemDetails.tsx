import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Pencil, Star, BookmarkPlus, MapPin, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useNavigate, Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  category?: string;
  images: string[];
  description?: string;
  seller_id: string;
  location_range?: number;
  latitude?: number;
  longitude?: number;
  listing_type?: string;
  status?: string[];
  created_at?: string;
}

interface Seller {
  id: string;
  user_id?: string;
  full_name: string;
  avatar_url: string | null;
  location: string;
}

interface SellerRatings {
  average_rating: number;
  total_ratings: number;
}

const ItemDetails = () => {
  const { id: itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [item, setItem] = useState<Item | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [sellerRatings, setSellerRatings] = useState<SellerRatings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemLocation, setItemLocation] = useState<string>("");

  // Image gallery state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [showZoomTip, setShowZoomTip] = useState(false);

  const isOwner = user && item?.seller_id === user.id;

  // Reverse geocoding function to convert coordinates to city name
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );
      const data = await response.json();

      if (data.address) {
        const { city, town, village, suburb, state, country } = data.address;
        // Build a readable address
        const cityName = city || town || village || suburb || t('unknownLocation');
        const stateName = state ? `, ${state}` : '';
        const countryName = country ? `, ${country}` : '';
        return `${cityName}${stateName}${countryName}`;
      }

      return `${t('location')}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${t('location')}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // Debug logging to help troubleshoot ownership issues
  useEffect(() => {
    if (user && item) {
      console.log('🔍 Owner check:', {
        userId: user.id,
        itemSellerId: item.seller_id,
        isOwner: user.id === item.seller_id
      });
    }
  }, [user, item]);

  // Fetch item location when item is loaded
  useEffect(() => {
    const fetchItemLocation = async () => {
      if (item?.latitude && item?.longitude) {
        console.log('📍 Fetching location for item:', { lat: item.latitude, lng: item.longitude });
        const location = await reverseGeocode(item.latitude, item.longitude);
        setItemLocation(location);
      }
    };

    fetchItemLocation();
  }, [item]);

  const [itemFetchError, setItemFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch item from database
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setItem(data as Item);

          // Fetch seller information
          const { data: sellerData, error: sellerError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.seller_id)
            .maybeSingle(); // Use maybeSingle() instead of single() to avoid PGRST116

          if (sellerError) {
            console.error('Error fetching seller:', sellerError);
            // Set default seller if there's an actual error
            setSeller({
              id: data.seller_id,
              user_id: data.seller_id,
              full_name: t('unknownUser'),
              avatar_url: null,
              location: t('locationNotSet')
            });
          } else if (!sellerData) {
            // No profile found, create fallback
            setSeller({
              id: data.seller_id,
              user_id: data.seller_id,
              full_name: t('unknownUser'),
              avatar_url: null,
              location: t('locationNotSet')
            });
          } else {
            setSeller(sellerData as Seller);
          }

          // Fetch seller ratings
          try {
            const { data: ratingsData } = await supabase.rpc('get_seller_ratings', {
              seller_uuid: data.seller_id
            });

            if (ratingsData && ratingsData.length > 0) {
              setSellerRatings(ratingsData[0]);
            }
          } catch (ratingsError) {
            console.warn('Failed to fetch seller ratings:', ratingsError);
          }

          // Fetch view count
          const { data: viewData } = await supabase.rpc('get_item_views', {
            item_uuid: itemId
          });
          setViewCount(viewData || 0);

          // Check if item is saved by current user
          if (user) {
            const { data: savedData } = await supabase
              .from('saved_items')
              .select('id')
              .eq('user_id', user.id)
              .eq('item_id', itemId)
              .maybeSingle();

            setSaved(!!savedData);
          }
        }
      } catch (error: unknown) {
        console.error('Error fetching item:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load item';
        setItemFetchError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [itemId]);

  const trackView = async () => {
    if (!user || !itemId) return;

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
  };

  useEffect(() => {
    if (user && itemId && !isOwner) {
      trackView();
    }
  }, [user, itemId, isOwner]);

  const handleSaveItem = async () => {
    if (!user || !itemId) {
      toast.error(t('pleaseSignInToSaveItems'));
      navigate('/');
      return;
    }

    setSaving(true);

    try {
      if (saved) {
        // Remove from saved items
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', itemId);

        if (error) throw error;

        setSaved(false);
        toast.success(t('itemSaved')); // Reusing itemSaved for now
      } else {
        // Add to saved items
        const { error } = await supabase
          .from('saved_items')
          .insert({
            user_id: user.id,
            item_id: itemId
          });

        if (error) {
          if (error.code === '23505') {
            toast.error(t('alreadySaved'));
          } else {
            throw error;
          }
        } else {
          setSaved(true);
          toast.success(t('itemSaved'));
        }
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error(t('errorSavingItem'));
    } finally {
      setTimeout(() => {
        setSaving(false);
      }, 500);
    }
  };

  const handleContactSeller = async () => {
    if (!seller || !item || !user) return;

    try {
      // The seller_id from items table is the auth.users.id
      // The seller object from user_profiles has user_id field
      const sellerId = seller.user_id || seller.id; // Use user_id if available, fallback to id

      // Prevent users from contacting themselves
      if (sellerId === user.id) {
        toast.error(t('cannotMessageYourself'));
        return;
      }

      // Check if conversation already exists
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, participant1_id, participant2_id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .or(`participant1_id.eq.${sellerId},participant2_id.eq.${sellerId}`);

      // Find conversation where both users are participants
      const existingConversation = conversations?.find(conv =>
        (conv.participant1_id === user.id && conv.participant2_id === sellerId) ||
        (conv.participant1_id === sellerId && conv.participant2_id === user.id)
      );

      let conversationId = existingConversation?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: sellerId,
            item_id: item.id
          })
          .select('id')
          .single();

        if (error) throw error;
        conversationId = newConversation.id;
      }

      // Navigate to messages with proper seller information and item details
      navigate(`/messages?userId=${sellerId}`, {
        state: {
          sellerId: sellerId,
          sellerName: seller.full_name || t('unknownUser'),
          sellerAvatar: seller.avatar_url || avatar,
          conversationId,
          itemId: item.id,
          itemDetails: {
            title: item.title,
            price: item.price,
            image: item.images?.[0] || defaultImage,
            link: `${window.location.origin}/items/${item.id}`
          }
        }
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error(t('failedToLoadConversations'));
    }
  };

  // Image gallery functions
  const openGallery = (index: number = 0) => {
    setCurrentImageIndex(index);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setIsGalleryOpen(true);
    setShowZoomTip(true);
    setTimeout(() => setShowZoomTip(false), 3000); // Hide tip after 3 seconds
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const nextImage = () => {
    if (item?.images && item.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const prevImage = () => {
    if (item?.images && item.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + item.images.length) % item.images.length);
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 0.5));
    if (zoomLevel <= 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isGalleryOpen) return;

      switch (e.key) {
        case 'Escape':
          closeGallery();
          break;
        case 'ArrowLeft':
          prevImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isGalleryOpen, item?.images]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t('itemDetails')} />
        <div className="container mx-auto px-4 py-6 text-center">
          <p>{t('loading')}...</p>
        </div>
      </div>
    );
  }

  if (error || itemFetchError) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t('itemDetails')} />
        <div className="container mx-auto px-4 py-6 text-center">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-red-500 mb-2">{t('failedToLoadItemDetails')}</h2>
            <p className="text-gray-600 mb-4">
              {itemFetchError || t('itemNotFoundOrNoPermission')}
            </p>
            <Button onClick={() => navigate('/home')}>{t('backToHome')}</Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t('itemDetails')} />
        <div className="container mx-auto px-4 py-6 text-center">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">{t('itemNotFound')}</h2>
            <p className="text-gray-600 mb-4">
              {t('itemNotFoundOrNoPermission')}
            </p>
            <Button onClick={() => navigate('/home')}>{t('backToHome')}</Button>
          </Card>
        </div>
      </div>
    );
  }

  const images = item.images || [defaultImage];

        return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      <TopBar title={t('itemDetails')} />
      <main className="container mx-auto px-4 py-6 space-y-4">
        <Card className="overflow-hidden">
          {/* Image Gallery Section */}
          <div className="relative">
            <img
              src={images[0]}
              alt={item.title}
              className="w-full aspect-video object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openGallery(0)}
            />
            {/* Tags displayed on image */}
            {item.status && item.status.length > 0 && (
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[calc(100%-8rem)]">
                {item.status.map((tag, index) => (
                  <div
                    key={index}
                    className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
                1 / {images.length}
              </div>
            )}
          </div>

          {/* Image thumbnails for multiple images */}
          {images.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto">
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${item.title} - Image ${index + 1}`}
                  className="w-16 h-16 object-cover rounded cursor-pointer border-2 border-transparent hover:border-primary transition-colors"
                  onClick={() => openGallery(index)}
                />
              ))}
            </div>
          )}

          {/* Rest of the existing content */}
          <div className="p-6 space-y-4">
            <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h1 className="text-2xl font-semibold">{item.title}</h1>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <p className="text-xl font-semibold text-primary">
                    {item.listing_type === "request" ? `${t('budget')}: ` : ""}{formatPrice(item.price, item.currency)}
                  </p>
                  <div className={`flex items-center gap-1 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Eye className="h-4 w-4" />
                    <span>{viewCount} {t('views')}</span>
                  </div>
                </div>
                {item.created_at && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('postedOn')} {new Date(item.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
              {/* Only show save button if it's not the user's own item */}
              {!isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveItem}
                  className={`transition-transform duration-300 ${saving ? 'scale-150' : ''}`}
                >
                  <BookmarkPlus className={`h-5 w-5 transition-all ${saving || saved ? 'text-primary fill-primary' : ''}`} />
                </Button>
              )}
            </div>
            <div>
              <h2 className="font-semibold mb-2">{t('description')}</h2>
              <p className="text-muted-foreground">
                {item.description || t('noDescriptionProvided')}
              </p>
            </div>
            {/* Location section */}
            {(item.latitude && item.longitude) && (
              <div>
                <h2 className={`font-semibold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('location')}</h2>
                <div className={`flex items-center gap-2 text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <MapPin className="h-4 w-4" />
                  <span>{itemLocation || t('loading')}</span>
                </div>
              </div>
            )}
            <div>
              <h2 className="font-semibold mb-2">
                {item.listing_type === "request"
                  ? t('requester')
                  : item.listing_type === "rent"
                  ? t('landlord')
                  : t('seller')}
              </h2>
              <Link
                to={item?.seller_id ? `/seller/${item.seller_id}` : '/home'}
                className="flex items-center space-x-3 p-2 rounded-lg border border-transparent transition-all duration-200 hover:border-primary/50"
              >
                <img
                  src={seller?.avatar_url || avatar}
                  alt="Seller"
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = avatar;
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{seller?.full_name || t('unknownUser')}</p>
                    {sellerRatings && sellerRatings.total_ratings > 0 ? (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-primary text-primary mr-1" />
                        {sellerRatings.average_rating.toFixed(1)} ({sellerRatings.total_ratings})
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="h-4 w-4 text-gray-300 mr-1" />
                        {t('noRatingsYet')}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {seller?.location || t('locationNotSet')}
                  </p>
                </div>
              </Link>
            </div>
            {/* Show different buttons based on ownership */}
            {isOwner ? (
              <Button onClick={() => navigate(`/edit-item/${item.id}`)} variant="outline" className="w-full">
                <Pencil className="h-4 w-4 mr-2" />
{t('editItem')}
              </Button>
            ) : (
              <Button size="sm" onClick={handleContactSeller} className="w-full">
                {item.listing_type === "request"
                  ? t('contactRequester')
                  : item.listing_type === "rent"
                  ? t('contactLandlord')
                  : t('contactSeller')}
              </Button>
            )}
          </div>
        </Card>
      </main>

      {/* Image Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeGallery}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Image counter */}
            <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>

            {/* Zoom tip - appears briefly when gallery opens */}
            {showZoomTip && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 bg-black/70 text-white px-4 py-2 rounded-lg text-sm text-center transition-opacity duration-300">
                <div>{t('clickToZoomIn')} • {t('doubleClickToZoomOut')}</div>
                <div className="text-xs opacity-80 mt-1">{t('dragToMoveWhenZoomed')}</div>
              </div>
            )}

            {/* Zoom controls - moved to top left on mobile to avoid overlap */}
            <div className="absolute top-16 left-4 md:top-auto md:bottom-4 z-10 flex gap-2">
              <button
                onClick={zoomOut}
                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={resetZoom}
                className="bg-white/20 hover:bg-white/30 rounded-full px-3 py-2 transition-colors text-white text-sm"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={zoomIn}
                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
                >
                  <ChevronLeft className="h-8 w-8 text-white" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
                >
                  <ChevronRight className="h-8 w-8 text-white" />
                </button>
              </>
            )}

            {/* Main image */}
            <div className="flex items-center justify-center w-full h-full overflow-hidden">
              <img
                src={images[currentImageIndex]}
                alt={`${item.title} - Image ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
                style={{
                  transform: `scale(${zoomLevel}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                  cursor: zoomLevel > 1 ? 'move' : zoomLevel < 3 ? 'zoom-in' : 'zoom-out'
                }}
                onClick={(e) => {
                  if (zoomLevel < 3) {
                    zoomIn();
                  }
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  if (zoomLevel > 1) {
                    resetZoom();
                  }
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1 && zoomLevel > 1) {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const startX = touch.clientX - imagePosition.x;
                    const startY = touch.clientY - imagePosition.y;

                    const handleTouchMove = (e: TouchEvent) => {
                      if (e.touches.length === 1) {
                        e.preventDefault();
                        const touch = e.touches[0];
                        setImagePosition({
                          x: touch.clientX - startX,
                          y: touch.clientY - startY
                        });
                      }
                    };

                    const handleTouchEnd = () => {
                      document.removeEventListener('touchmove', handleTouchMove);
                      document.removeEventListener('touchend', handleTouchEnd);
                    };

                    document.addEventListener('touchmove', handleTouchMove, { passive: false });
                    document.addEventListener('touchend', handleTouchEnd);
                  }
                }}
                onMouseDown={(e) => {
                  if (zoomLevel > 1) {
                    e.preventDefault();
                    const startX = e.clientX - imagePosition.x;
                    const startY = e.clientY - imagePosition.y;

                    const handleMouseMove = (e: MouseEvent) => {
                      setImagePosition({
                        x: e.clientX - startX,
                        y: e.clientY - startY
                      });
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }
                }}
              />
            </div>

            {/* Thumbnail strip for navigation - adjusted for mobile */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 rounded-lg p-2 max-w-[90vw] overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-12 h-12 rounded border-2 overflow-hidden transition-all flex-shrink-0 ${
                      index === currentImageIndex ? 'border-white' : 'border-white/30'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${t('thumbnail')} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetails;
