import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { MapPin, Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
function LocationMapEvents({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Interface for Nominatim API response
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    country?: string;
  };
}

const LocationMap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState([parseInt(searchParams.get('range') || '10')]);
  const [saving, setSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // City search states
  const [cityInput, setCityInput] = useState('');
  const [isGeocodingCity, setIsGeocodingCity] = useState(false);
  const [geocodeTimeout, setGeocodeTimeout] = useState<NodeJS.Timeout | null>(null);
  const [mapKey, setMapKey] = useState(0); // Force map re-render when location changes
  const [suggestions, setSuggestions] = useState<Array<{lat: number, lng: number, displayName: string, shortName: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Forward geocoding function to convert city name to coordinates (multiple results)
  const forwardGeocodeMultiple = async (cityName: string): Promise<Array<{lat: number, lng: number, displayName: string, shortName: string}> | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=5&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return data.map((result: NominatimResult) => {
                  const { city, town, village, suburb, state, country } = result.address || {};
        const shortName = city || town || village || suburb || result.name || t('unknownLocation');
        const stateName = state ? `, ${state}` : '';
        const countryName = country ? `, ${country}` : '';

          return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: result.display_name,
            shortName: `${shortName}${stateName}${countryName}`
          };
        });
      }

      return null;
    } catch (error) {
      console.error('Forward geocoding failed:', error);
      return null;
    }
  };

  // Forward geocoding function to convert city name to coordinates (single result)
  const forwardGeocode = async (cityName: string): Promise<{lat: number, lng: number, displayName: string} | null> => {
    const results = await forwardGeocodeMultiple(cityName);
    if (results && results.length > 0) {
      return {
        lat: results[0].lat,
        lng: results[0].lng,
        displayName: results[0].displayName
      };
    }
    return null;
  };

  // Reverse geocoding function to convert coordinates to city name
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

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // Debounced city search
  const handleCityInputChange = useCallback(async (value: string) => {
    setCityInput(value);

    // Clear existing timeout
    if (geocodeTimeout) {
      clearTimeout(geocodeTimeout);
    }

    // Hide suggestions and clear if input is empty
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    // Don't geocode short inputs
    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    // Set new timeout for geocoding
    const timeout = setTimeout(async () => {
      setIsGeocodingCity(true);

      try {
        const locations = await forwardGeocodeMultiple(value);
        if (locations && locations.length > 0) {
          setSuggestions(locations);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(-1); // Reset selection
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          sonnerToast.error(`No locations found for "${value}"`);
        }
      } catch (error) {
        console.error('Error geocoding city:', error);
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        sonnerToast.error('Failed to search locations');
      } finally {
        setIsGeocodingCity(false);
      }
    }, 1000); // Reduced to 500ms for better responsiveness

    setGeocodeTimeout(timeout);
  }, [geocodeTimeout]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        hideSuggestions();
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: {lat: number, lng: number, displayName: string, shortName: string}) => {
    setUserLocation({ lat: suggestion.lat, lng: suggestion.lng });
    setCityInput(suggestion.shortName);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setLocationError(null);
    setMapKey(prev => prev + 1); // Force map re-render
  };

  // Clear city search
  const clearCitySearch = () => {
    setCityInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    if (geocodeTimeout) {
      clearTimeout(geocodeTimeout);
    }
  };

  // Hide suggestions when clicking outside
  const hideSuggestions = () => {
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimeout) {
        clearTimeout(geocodeTimeout);
      }
    };
  }, [geocodeTimeout]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);

          // Get city name for current location
          try {
            const cityName = await reverseGeocode(location.lat, location.lng);
            setCityInput(cityName);
          } catch (error) {
            console.error('Failed to get city name for current location:', error);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Unable to get your location. You can click on the map to set it manually.");
          // Fallback to a default location (e.g., New York)
          const fallbackLocation = { lat: 40.7128, lng: -74.0060 };
          setUserLocation(fallbackLocation);
          setCityInput('New York, New York, United States');
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser. You can click on the map to set your location.");
      const fallbackLocation = { lat: 40.7128, lng: -74.0060 };
      setUserLocation(fallbackLocation);
      setCityInput('New York, New York, United States');
    }
  }, []);

  const handleLocationChange = async (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setLocationError(null);
    setMapKey(prev => prev + 1); // Force map re-render

    // Update city input with reverse geocoding
    try {
      const cityName = await reverseGeocode(lat, lng);
      setCityInput(cityName);
    } catch (error) {
      console.error('Failed to reverse geocode location:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !userLocation) {
      navigate(`/?range=${radius[0]}`);
      return;
    }

    setSaving(true);
    try {
      // Use INSERT with ON CONFLICT to handle the upsert properly
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error saving location:', error);
        // Try a simple update instead if upsert fails
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      toast({
        title: t('locationSaved'),
        description: "Your location and search range have been saved successfully.",
      });

      navigate(`/?range=${radius[0]}`);
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: t('error'),
        description: "Failed to save location. Please try again.",
        variant: "destructive",
      });
      // Still navigate on error
      navigate(`/?range=${radius[0]}`);
    } finally {
      setSaving(false);
    }
  };

  if (!userLocation) {
    return (
      <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
        <TopBar title={t('locationRange')} />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-card p-6 rounded-lg shadow-lg">
            <h2 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('loading')}...</h2>
            <p className={`text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              Please wait while we determine your location.
            </p>
            {locationError && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                <p className={`text-yellow-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{locationError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      <TopBar title={t('selectSearchRange')} />

      <div className="relative h-[calc(100vh-3.5rem)]">
        <MapContainer
          key={mapKey}
          center={[userLocation.lat, userLocation.lng]}
          zoom={12}
          className="absolute inset-0 z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LocationMapEvents onLocationChange={handleLocationChange} />

          <Marker position={[userLocation.lat, userLocation.lng]} />

          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={radius[0] * 1000} // Convert km to meters
            pathOptions={{
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              color: '#3b82f6',
              weight: 2,
            }}
          />
        </MapContainer>

        {/* Controls overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-card rounded-lg shadow-lg p-4 z-10">
          {locationError && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
              <p className="text-yellow-700 text-sm">{locationError}</p>
            </div>
          )}

          {/* City Search Input */}
          <div className="mb-4">
            <label className={`text-sm font-medium text-foreground mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
              Search by City Name
            </label>
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={t('enterLocationPlaceholder')}
                value={cityInput}
                onChange={(e) => handleCityInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={(e) => {
                  // Delay hiding suggestions to allow clicking on them
                  setTimeout(() => {
                    if (e.currentTarget && document.activeElement && !e.currentTarget.contains(document.activeElement)) {
                      hideSuggestions();
                    }
                  }, 150);
                }}
                onKeyDown={handleKeyDown}
                disabled={isGeocodingCity}
                className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
              />
              {cityInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearCitySearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={`flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors ${
                        selectedSuggestionIndex === index ? 'bg-muted' : ''
                      }`}
                    >
                      <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {suggestion.shortName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {suggestion.displayName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
                          {isGeocodingCity && (
                <div className={`flex items-center gap-2 text-sm text-muted-foreground mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('findingLocation')}...
                </div>
              )}
            </div>

            <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <MapPin className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <label className={`text-sm font-medium text-foreground mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('locationRange')}: {radius[0]}km
                </label>
                <Slider
                  value={radius}
                  onValueChange={setRadius}
                  max={30}
                  min={1}
                  step={1}
                  className="flex-1"
                />
              </div>
            </div>

                      <div className={`text-xs text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              Type a city name above or click on the map to change your location
            </div>

            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                {saving ? t('saving') : t('saveRange')}
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;