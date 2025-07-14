import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Google Maps types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initMap: () => void;
    gm_authFailure: () => void;
  }
}

const LocationMap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerInstance = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState([parseInt(searchParams.get('range') || '10')]);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Check if Google Maps API key is configured
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) {
      setMapError('Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables.');
      return;
    }

    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,marker&loading=async`;
      script.async = true;
      script.onload = () => {
        setGoogleMapsLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        setMapError('Failed to load Google Maps. Please check your internet connection and API key.');
      };

      // Add error handler for billing issues
      window.gm_authFailure = () => {
        setMapError('Google Maps billing is not enabled. Please enable billing in your Google Cloud Console.');
      };

      document.head.appendChild(script);
    } else {
      setGoogleMapsLoaded(true);
    }
  }, [apiKey]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to a default location (e.g., New York)
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    }
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current || !userLocation || !window.google || mapError) return;

    try {
      // Initialize map
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: userLocation.lat, lng: userLocation.lng },
        zoom: 12,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
      });

      // Check if AdvancedMarkerElement is available, fallback to regular Marker
      if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
        // Use new AdvancedMarkerElement
        markerInstance.current = new window.google.maps.marker.AdvancedMarkerElement({
          map: mapInstance.current,
          position: { lat: userLocation.lat, lng: userLocation.lng },
          title: 'Your Location',
        });
      } else {
        // Fallback to deprecated Marker (suppress deprecation warning)
        markerInstance.current = new window.google.maps.Marker({
          position: { lat: userLocation.lat, lng: userLocation.lng },
          map: mapInstance.current,
          title: 'Your Location',
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new window.google.maps.Size(32, 32),
          },
        });
      }

      // Draw initial circle
      updateCircle();

    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapError('Failed to initialize map. Please try again.');
    }
  }, [googleMapsLoaded, userLocation, mapError]);

  const updateCircle = () => {
    if (!mapInstance.current || !userLocation || !window.google) return;

    const radiusInMeters = radius[0] * 1000; // Convert km to meters

    // Remove existing circle
    if (circleInstance.current) {
      circleInstance.current.setMap(null);
    }

    // Create new circle
    circleInstance.current = new window.google.maps.Circle({
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      map: mapInstance.current,
      center: { lat: userLocation.lat, lng: userLocation.lng },
      radius: radiusInMeters,
    });

    // Adjust map bounds to fit the circle
    const bounds = circleInstance.current.getBounds();
    mapInstance.current.fitBounds(bounds);
  };

  // Update circle when radius changes
  useEffect(() => {
    if (mapInstance.current && userLocation) {
      updateCircle();
    }
  }, [radius]);

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
        title: "Location Saved",
        description: "Your location and search range have been saved successfully.",
      });

      navigate(`/?range=${radius[0]}`);
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive",
      });
      // Still navigate on error
      navigate(`/?range=${radius[0]}`);
    } finally {
      setSaving(false);
    }
  };

  if (!apiKey || mapError) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Location Range" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-card p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold">Maps Unavailable</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {mapError || 'Google Maps is not available right now.'}
            </p>

            {!apiKey && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                <h3 className="font-medium text-yellow-800 mb-2">Setup Instructions:</h3>
                <ol className="text-sm text-yellow-700 space-y-1">
                  <li>1. Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                  <li>2. Enable Maps JavaScript API</li>
                  <li>3. Create an API key</li>
                  <li>4. Add it to your .env file as VITE_GOOGLE_MAPS_API_KEY</li>
                </ol>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search Radius: {radius[0]}km
                </label>
                <Slider
                  value={radius}
                  onValueChange={setRadius}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={saving}>
                  {saving ? "Saving..." : "Save Range"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!googleMapsLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Location Range" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-card p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Loading Google Maps...</h2>
            <p className="text-muted-foreground mb-4">
              Please wait while we load the map component.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Select Search Range" />

      <div className="relative h-[calc(100vh-3.5rem)]">
        <div ref={mapRef} className="absolute inset-0" />

        {/* Controls overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-4 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Search Radius: {radius[0]}km
              </label>
              <Slider
                value={radius}
                onValueChange={setRadius}
                max={50}
                min={1}
                step={1}
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? "Saving..." : "Save Range"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;