"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Coordinate = {
  lat: number;
  lng: number;
};

type MapMarker = {
  key: string;
  position: Coordinate;
  label?: string;
  title?: string;
};

type GoogleCanvasMapProps = {
  apiKey: string;
  center: Coordinate;
  zoom: number;
  markers: MapMarker[];
  path?: Coordinate[];
  className?: string;
  fitBounds?: boolean;
  onStatusChange?: (status: "loading" | "ready" | "error") => void;
};

type LoaderState =
  | { status: "loading"; error: null }
  | { status: "ready"; error: null }
  | { status: "error"; error: string };

const baseMapOptions: google.maps.MapOptions = {
  clickableIcons: false,
  disableDefaultUI: true,
  gestureHandling: "greedy",
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
};

let googleMapsPromise: Promise<typeof google.maps> | null = null;
let loadedApiKey: string | null = null;

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise && loadedApiKey === apiKey) {
    return googleMapsPromise;
  }

  loadedApiKey = apiKey;
  googleMapsPromise = new Promise<typeof google.maps>((resolve, reject) => {
    const callbackName = "__swapitCrewGoogleMapsInit";
    const existingScript = document.getElementById("swapit-crew-google-maps-script") as HTMLScriptElement | null;

    (window as typeof window & { [key: string]: unknown })[callbackName] = () => {
      resolve(window.google.maps);
    };

    if (existingScript) {
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "swapit-crew-google-maps-script";
    script.async = true;
    script.defer = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly&loading=async&callback=${callbackName}`;
    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function useGoogleMaps(apiKey: string): LoaderState {
  const [state, setState] = useState<LoaderState>({ status: "loading", error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", error: null });

    void loadGoogleMaps(apiKey)
      .then(() => {
        if (!cancelled) {
          setState({ status: "ready", error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error.message : "Failed to load Google Maps.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return state;
}

export function GoogleCanvasMap({
  apiKey,
  center,
  zoom,
  markers,
  path,
  className,
  fitBounds = false,
  onStatusChange,
}: GoogleCanvasMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const { status } = useGoogleMaps(apiKey);

  const stableMarkers = useMemo(() => markers, [markers]);
  const stablePath = useMemo(() => path ?? [], [path]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    if (status !== "ready" || !containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new window.google.maps.Map(containerRef.current, {
      ...baseMapOptions,
      center,
      zoom,
    });
  }, [center, status, zoom]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) {
      return;
    }

    const map = mapRef.current;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = stableMarkers.map(
      (marker) =>
        new window.google.maps.Marker({
          map,
          position: marker.position,
          title: marker.title,
          label: marker.label
            ? {
                text: marker.label,
                color: "#ffffff",
                fontWeight: "900",
              }
            : undefined,
        }),
    );

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (stablePath.length > 1) {
      polylineRef.current = new window.google.maps.Polyline({
        path: stablePath,
        strokeColor: "#19c6bf",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });
      polylineRef.current?.setMap(map);
    }

    const points = [...stableMarkers.map((marker) => marker.position), ...stablePath];
    if (fitBounds && points.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [center, fitBounds, stableMarkers, stablePath, status, zoom]);

  return <div className={className} ref={containerRef} />;
}
