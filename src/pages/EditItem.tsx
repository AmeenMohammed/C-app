import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, X, Trash2, MapPin } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingScreen } from "@/components/LoadingScreen";
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

interface Item {
  id: string;
  title: string;
  price: number;
  currency?: string;
  description?: string;
  category_id: string;
  images: string[];
  seller_id: string;
  latitude?: number;
  longitude?: number;
  listing_type: string;
  promoted: boolean;
  promoted_at?: string;
  created_at: string;
  status?: string[];
}

const EditItem = () => {
  const { id: itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    description: "",
    category_id: "",
    listing_type: "sell",
    city: "",
    tags: "",
    currency: "EGP",
  });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geocodeTimeout, setGeocodeTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch categories dynamically
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  // Reverse geocoding function
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );
      const data = await response.json();

      if (data.address) {
        const { city, town, village, suburb, state, country } = data.address;
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
      setGeocodeTimeout(null);
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
    if (value.trim().length >= 3) { // Reduced from 5 to 3 for better UX
      const timeoutId = setTimeout(async () => {
        setLocationLoading(true);
        try {
          const coordinates = await forwardGeocode(value.trim());
          if (coordinates) {
            setUserLocation(coordinates);
            toast({
              title: t('cityFound'),
              description: t('mapUpdatedWithCity'),
            });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        } finally {
          setLocationLoading(false);
        }
      }, 1500); // Increased to 1.5 seconds to give user more time to type

      setGeocodeTimeout(timeoutId);
    }
  };

  const confirmLocation = () => {
    setShowLocationSelector(false);
    toast({
      title: t('locationConfirmed'),
      description: t('itemLocationUpdatedSuccessfully'),
    });
  };

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId || !user) return;

      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .eq('seller_id', user.id) // Ensure user owns the item
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            toast({
              title: t('itemNotFound'),
              description: t('itemNotFoundOrNoPermission'),
              variant: "destructive",
            });
            navigate('/profile');
            return;
          }
          throw error;
        }

        setItem(data);
        setImages(data.images || []);

        // Set initial form data without city first
        const initialFormData = {
          title: data.title || "",
          price: data.price?.toString() || "",
          description: data.description || "",
          category_id: data.category_id || "",
          listing_type: data.listing_type || "sell",
          city: "",
          tags: data.status ? data.status.join(", ") : "",
          currency: data.currency || "EGP",
        };

        // Handle location data if coordinates exist
        if (data.latitude && data.longitude) {
          const location = { lat: data.latitude, lng: data.longitude };
          setUserLocation(location);

          // Get city name from coordinates and set it in the form data
          try {
            const cityName = await reverseGeocode(data.latitude, data.longitude);
            initialFormData.city = cityName;
          } catch (error) {
            console.error('Error getting city name:', error);
            // If geocoding fails, just use coordinates
            initialFormData.city = `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`;
          }
        }

        // Set all form data at once, including the city
        setFormData(initialFormData);

      } catch (error) {
        console.error('Error fetching item:', error);
        toast({
          title: t('error'),
          description: t('failedToLoadItemDetails'),
          variant: "destructive",
        });
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();

  }, [itemId, user, navigate]);

  // Cleanup effect for geocoding timeout on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimeout) {
        clearTimeout(geocodeTimeout);
        setGeocodeTimeout(null);
      }
    };
  }, [geocodeTimeout]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaving(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch('https://vttanwzodshofhycuqjr.functions.supabase.co/upload-item-image', {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setImages(prev => [...prev, data.url]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('error'),
        description: t('failedToUploadImageTryAgain'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.description || !formData.category_id) {
      toast({
        title: t('error'),
        description: t('fillAllRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updateData: Partial<Item> = {
        title: formData.title,
        price: parseFloat(formData.price),
        currency: formData.currency,
        description: formData.description,
        category_id: formData.category_id,
        listing_type: formData.listing_type,
        images: images,
        status: formData.tags
          ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          : null,
      };

      // Add coordinates if provided
      if (userLocation) {
        updateData.latitude = userLocation.lat;
        updateData.longitude = userLocation.lng;
      }

      const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      navigate('/profile');
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('failedToUpdateProfile'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemId) return;

    // Add confirmation dialog
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      navigate('/profile');
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading || categoriesLoading) {
    return <LoadingScreen message={t('loading')} />;
  }

  if (categoriesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t('errorLoadingCategories')}</h2>
          <p className="text-muted-foreground">{t('pleaseRetryLater')}</p>
        </div>
      </div>
    );
  }

  // Filter out the "All" category for editing
  const editCategories = categories?.filter(cat => cat.id !== 'all') || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <TopBar title={t('editItem')} />

      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-2xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('images')} *</label>
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img src={image} alt={`Item ${index + 1}`} className="w-full h-24 object-cover rounded" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                >
                  <ImagePlus className="h-6 w-6" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('title')} *</label>
              <Input
                placeholder={t('itemTitle')}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {formData.listing_type === "request" ? `${t('budget')} *` : `${t('price')} *`}
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
                  step="0.01"
                  placeholder={formData.listing_type === "request" ? t('maxBudget') : "0.00"}
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="flex-1"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('category')} *</label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {editCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <category.iconComponent className="h-4 w-4" />
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('listingType')}</label>
              <Select value={formData.listing_type} onValueChange={(value) => setFormData(prev => ({ ...prev, listing_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectListingType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">{t('forSale')}</SelectItem>
                  <SelectItem value="rent">{t('forRent')}</SelectItem>
                  <SelectItem value="request">{t('lookingFor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags ({t('optional')})</label>
              <Input
                placeholder={t('enterTagsPlaceholder')}
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {t('addCustomTagsDescription')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('description')} *</label>
              <Textarea
                placeholder={t('describeYourItem')}
                className="min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>

            {/* Location Section - Same as PostItem */}
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

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? t('saving') : t('saveChanges')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
{deleting ? "Deleting..." : t('delete')}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default EditItem;