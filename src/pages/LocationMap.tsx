import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MapPin } from 'lucide-react';

const LocationMap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const circle = useRef<any>(null);
  
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState([parseInt(searchParams.get('range') || '10')]);
  const [mapboxToken, setMapboxToken] = useState('');

  useEffect(() => {
    // Get user's location
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

  useEffect(() => {
    if (!mapContainer.current || !userLocation) return;

    // For now, we'll use a placeholder token - user needs to add their Mapbox token
    const token = mapboxToken || 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTRiYmJ5NGowMHljMmlwdHV5Y2xudmE5In0.placeholder';
    
    mapboxgl.accessToken = token;
    
    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [userLocation.lng, userLocation.lat],
        zoom: 12,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add user location marker
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);

      map.current.on('load', () => {
        updateCircle();
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      map.current?.remove();
    };
  }, [userLocation, mapboxToken]);

  const updateCircle = () => {
    if (!map.current || !userLocation) return;

    const radiusInMeters = radius[0] * 1000; // Convert km to meters
    
    // Remove existing circle
    if (circle.current) {
      map.current.removeLayer('circle-fill');
      map.current.removeLayer('circle-stroke');
      map.current.removeSource('circle');
    }

    // Create circle geometry
    const center = [userLocation.lng, userLocation.lat];
    const points = 64;
    const coords: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[]]
    };

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusInMeters * Math.cos(angle);
      const dy = radiusInMeters * Math.sin(angle);
      
      // Convert meters to degrees (approximate)
      const dLng = dx / (111320 * Math.cos(userLocation.lat * Math.PI / 180));
      const dLat = dy / 110540;
      
      coords.coordinates[0].push([
        center[0] + dLng,
        center[1] + dLat
      ]);
    }
    coords.coordinates[0].push(coords.coordinates[0][0]); // Close the polygon

    // Add circle source and layers
    map.current.addSource('circle', {
      type: 'geojson',
      data: coords
    });

    map.current.addLayer({
      id: 'circle-fill',
      type: 'fill',
      source: 'circle',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.2
      }
    });

    map.current.addLayer({
      id: 'circle-stroke',
      type: 'line',
      source: 'circle',
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2
      }
    });

    circle.current = true;
  };

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      updateCircle();
    }
  }, [radius]);

  const handleSave = () => {
    navigate(`/?range=${radius[0]}`);
  };

  if (!mapboxToken) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Location Range" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-card p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Mapbox Token Required</h2>
            <p className="text-muted-foreground mb-4">
              To use the map feature, please enter your Mapbox public token. You can get one from{' '}
              <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                mapbox.com
              </a>
            </p>
            <input
              type="text"
              placeholder="Enter your Mapbox public token..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4"
            />
            <Button 
              onClick={() => setMapboxToken(mapboxToken)} 
              disabled={!mapboxToken.trim()}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Select Search Range" />
      
      <div className="relative h-[calc(100vh-3.5rem)]">
        <div ref={mapContainer} className="absolute inset-0" />
        
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
            <Button onClick={handleSave} className="flex-1">
              Save Range
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;