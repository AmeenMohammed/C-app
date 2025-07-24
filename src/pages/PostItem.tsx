import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImagePlus, X, MapPin, TrendingUp } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories } from "@/hooks/useCategories";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getCurrencyOptions } from "@/utils/currency";

// Fix for default markers in React-Leaflet
interface LeafletIconDefault extends L.Icon.Default {
  _getIconUrl?: () => string;
}

delete (L.Icon.Default.prototype as LeafletIconDefault)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom component to handle map click events
function LocationSelector({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const PostItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const showBackButton = location.state?.from === 'profile';
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    description: "",
    category: "",
    city: "", // Replace range with city
    listingType: "sell" as "sell" | "rent" | "request",
    currency: "EGP", // Default currency
  });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geocodeTimeout, setGeocodeTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch categories dynamically
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);

          // Automatically populate city field with current location
          if (!formData.city.trim()) { // Only populate if city field is empty
            setLocationLoading(true);
            try {
              const cityName = await reverseGeocode(location.lat, location.lng);
              setFormData(prev => ({ ...prev, city: cityName }));
              toast({
                title: t('locationDetected'),
                description: t('currentLocationSetAutomatically'),
              });
            } catch (error) {
              console.error("Failed to get city name:", error);
            } finally {
              setLocationLoading(false);
            }
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: t('locationInfo'),
            description: t('clickSetLocationOnMap'),
          });
          // Set a default location (New York) so the map can still work
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    }

    // Cleanup timeout on unmount
    return () => {
      if (geocodeTimeout) {
        clearTimeout(geocodeTimeout);
      }
    };
  }, [geocodeTimeout]);

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

  const forwardGeocode = async (cityName: string): Promise<{lat: number, lng: number} | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        return { lat, lng };
      }

      return null;
    } catch (error) {
      console.error('Forward geocoding failed:', error);
      return null;
    }
  };

  const handleLocationChange = async (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setLocationLoading(true);

    // Get city name from coordinates
    const cityName = await reverseGeocode(lat, lng);
    setFormData(prev => ({ ...prev, city: cityName }));
    setLocationLoading(false);

    // Don't close the map automatically - let user confirm
    toast({
      title: t('locationUpdated'),
      description: t('clickConfirmLocation'),
    });
  };

  const handleCityInputChange = async (value: string) => {
    setFormData(prev => ({ ...prev, city: value }));

    // Clear any existing timeout
    if (geocodeTimeout) {
      clearTimeout(geocodeTimeout);
    }

    // First try to parse coordinates if user enters them (e.g., "40.7128, -74.0060")
    const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
    const match = value.match(coordPattern);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      // Validate coordinates
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setUserLocation({ lat, lng });
        toast({
          title: t('coordinatesSet'),
          description: t('mapUpdatedWithCoordinates'),
        });
        return;
      }
    }

    // If not coordinates, set up debounced geocoding for city names
    if (value.trim().length >= 5) { // Increased from 2 to 5 characters
      const timeoutId = setTimeout(async () => {
        setLocationLoading(true);
        const coordinates = await forwardGeocode(value.trim());
        if (coordinates) {
          setUserLocation(coordinates);
          toast({
            title: t('cityFound'),
            description: t('mapUpdatedWithCity'),
          });
        }
        setLocationLoading(false);
      }, 1000); // Wait 1 second after user stops typing

      setGeocodeTimeout(timeoutId);
    }
  };

  const confirmLocation = () => {
    setShowLocationSelector(false);
    toast({
      title: t('locationConfirmed'),
      description: t('itemLocationSetSuccessfully'),
    });
  };

  const handlePromoteItem = () => {
    setShowPaymentDialog(true);
  };

  const handlePayment = (method: string) => {
    setShowPaymentDialog(false);
    toast({
      title: t('processingPayment'),
      description: `${t('processingPaymentVia')} ${method}...`,
    });
    // Here you would integrate with actual payment processing
    setTimeout(() => {
      toast({
        title: t('paymentSuccessful'),
        description: t('itemPromoted'),
      });
    }, 2000);
  };

  const uploadImages = async (files: FileList): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      try {
        const { data, error } = await supabase.storage
          .from('item_images')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('item_images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: t('uploadError'),
          description: `${t('failedToUpload')} ${file.name}`,
          variant: "destructive",
        });
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.description || !formData.category) {
      toast({
        title: t('error'),
        description: t('fillAllRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    if (!userLocation) {
      toast({
        title: t('error'),
        description: t('setItemLocationOnMap'),
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: t('error'),
        description: t('mustBeLoggedInToPost'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        title: formData.title,
        price: parseFloat(formData.price),
        currency: formData.currency,
        description: formData.description,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        seller_id: user.id,
        images: images,
        listing_type: formData.listingType,
        category_id: formData.category // Use category_id to match database schema
      };

      // Insert item data (types need regeneration - temporarily bypassing type check)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('items').insert(itemData as any);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('itemPostedSuccessfully'),
      });
      navigate('/profile');
    } catch (error) {
      console.error('Error posting item:', error);
      toast({
        title: t('error'),
        description: t('failedToPostItem'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    if (images.length + e.target.files.length > 5) {
      toast({
        title: t('tooManyImages'),
        description: t('maximum5ImagesAllowed'),
        variant: "destructive",
      });
      return;
    }

    const uploadedUrls = await uploadImages(e.target.files);
    setImages(prev => [...prev, ...uploadedUrls]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t('postItem')} showBackButton={showBackButton} />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={t('postItem')} showBackButton={showBackButton} />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-red-500">{t('errorLoadingCategories')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar title={t('postItem')} showBackButton={showBackButton} />

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('images')} ({t('upTo5')})</label>
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`${t('upload')} ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary transition-colors"
                  >
                    <ImagePlus className="h-6 w-6 text-gray-400" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('title')}</label>
              <Input
                placeholder={
                  formData.listingType === "request"
                    ? t('whatAreYouLookingFor')
                    : formData.listingType === "rent"
                    ? t('whatAreYouRenting')
                    : t('whatAreYouSelling')
                }
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {formData.listingType === "request" ? t('budget') : t('price')}
              </label>
              <div className="flex gap-2">
                <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrencyOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={formData.listingType === "request" ? t('maximumBudget') : "0.00"}
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('category')}</label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('listingType')}</label>
              <Select value={formData.listingType} onValueChange={(value: "sell" | "rent" | "request") => setFormData(prev => ({ ...prev, listingType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">{t('forSale')}</SelectItem>
                  <SelectItem value="rent">{t('forRent')}</SelectItem>
                  <SelectItem value="request">{t('lookingFor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('location')}</label>
              <div className="space-y-2">
                <Input
                  placeholder={t('enterCityOrArea')}
                  value={formData.city}
                  onChange={(e) => handleCityInputChange(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLocationSelector(!showLocationSelector)}
                  className="w-full flex items-center gap-2"
                  disabled={locationLoading}
                >
                  <MapPin className="h-4 w-4" />
                  {locationLoading ? t('findingLocation') : t('updateLocationOnMap')}
                </Button>

                {userLocation && (
                  <div className="text-xs text-muted-foreground">
                    {t('currentLocation')}: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </div>
                )}
              </div>

              {showLocationSelector && userLocation && (
                <div className="border rounded-lg overflow-hidden" style={{ height: '350px' }}>
                  <MapContainer
                    center={[userLocation.lat, userLocation.lng]}
                    zoom={13}
                    style={{ height: '300px', width: '100%' }}
                    key={`${userLocation.lat}-${userLocation.lng}`}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationSelector onLocationChange={handleLocationChange} />
                    <Marker position={[userLocation.lat, userLocation.lng]} />
                  </MapContainer>
                  <div className="p-2 bg-muted text-xs flex justify-between items-center">
                    <span>{t('clickMapToSetLocation')}</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={confirmLocation}
                      className="ml-2"
                    >
                      {t('confirmLocation')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('description')}</label>
              <Textarea
                placeholder={t('describeYourItem')}
                className="min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? t('posting') : t('postItem')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePromoteItem}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                {t('promote')}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('paymentRequired')}</DialogTitle>
          </DialogHeader>
          <p>{t('itemRequiresPaymentToPromote')}</p>
          <div className="flex justify-end mt-4">
            <Button onClick={() => handlePayment('Credit Card')}>{t('payWithCreditCard')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default PostItem;
