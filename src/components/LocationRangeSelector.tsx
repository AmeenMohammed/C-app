import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MapPin, ExternalLink } from "lucide-react";

interface LocationRangeSelectorProps {
  value: number[];
  onChange: (value: number[]) => void;
  userLocation?: {lat: number, lng: number} | null;
  showMapButton?: boolean;
  showExternalLink?: boolean;
}

export const LocationRangeSelector: React.FC<LocationRangeSelectorProps> = ({
  value,
  onChange,
  userLocation,
  showMapButton = true,
  showExternalLink = true
}) => {
  const openGoogleMaps = () => {
    if (userLocation) {
      const url = `https://www.google.com/maps/search/?api=1&query=${userLocation.lat},${userLocation.lng}`;
      window.open(url, '_blank');
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
          window.open(url, '_blank');
        },
        (error) => {
          console.error("Error getting location:", error);
          window.open('https://www.google.com/maps', '_blank');
        }
      );
    }
  };

  const openLocationMap = () => {
    // Navigate to location map page
    window.location.href = `/location-map?range=${value[0]}`;
  };

  return (
    <div className="flex items-center gap-2">
      {showMapButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={openLocationMap}
          className="h-8 w-8"
          title="Open location map"
        >
          <MapPin className="h-4 w-4 text-primary" />
        </Button>
      )}

      <div className="flex-1">
        <Slider
          value={value}
          onValueChange={onChange}
          max={30}
          min={1}
          step={1}
          className="flex-1"
        />
      </div>

      <span className="text-sm text-muted-foreground min-w-[3rem]">
        {value[0]}km
      </span>

      {showExternalLink && (
        <Button
          variant="ghost"
          size="icon"
          onClick={openGoogleMaps}
          className="h-8 w-8"
          title="Open in Google Maps"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};