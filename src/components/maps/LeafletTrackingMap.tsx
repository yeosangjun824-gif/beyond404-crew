"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Coordinates = {
  lat: number;
  lng: number;
};

type MarkerConfig = {
  key: string;
  position: Coordinates;
  variant: "pickup" | "crew" | "hub";
  label?: string;
};

type LeafletTrackingMapProps = {
  center: Coordinates;
  markers: MarkerConfig[];
  path?: Coordinates[];
  className?: string;
  maxZoom?: number;
  minZoom?: number;
  zoom?: number;
};

type GoogleMapsApi = any;

declare global {
  interface Window {
    google?: GoogleMapsApi;
    __swapitGoogleMapsPromise?: Promise<GoogleMapsApi>;
  }
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in the browser"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!googleMapsApiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing"));
  }

  if (!window.__swapitGoogleMapsPromise) {
    window.__swapitGoogleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>("script[data-swapit-google-maps]");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.google));
        existingScript.addEventListener("error", () => reject(new Error("Google Maps script failed to load")));
        return;
      }

      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: googleMapsApiKey,
        language: "en",
        region: "IN",
        v: "weekly",
      });

      script.async = true;
      script.dataset.swapitGoogleMaps = "true";
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Google Maps script failed to load"));
      document.head.appendChild(script);
    });
  }

  return window.__swapitGoogleMapsPromise;
}

function markerColor(variant: MarkerConfig["variant"]) {
  if (variant === "crew") return "#c1003f";
  if (variant === "hub") return "#16a34a";
  return "#2563eb";
}

function markerScale(variant: MarkerConfig["variant"]) {
  return variant === "pickup" ? 11 : 12;
}

export function LeafletTrackingMap({
  center,
  markers,
  path = [],
  className,
  maxZoom = 20,
  minZoom = 3,
  zoom = 16,
}: LeafletTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [loadError, setLoadError] = useState("");
  const normalizedPath = useMemo(() => path.filter(Boolean), [path]);

  useEffect(() => {
    let mounted = true;

    loadGoogleMaps()
      .then((googleApi) => {
        if (!mounted || !containerRef.current || mapRef.current) {
          return;
        }

        mapRef.current = new googleApi.maps.Map(containerRef.current, {
          center,
          clickableIcons: true,
          disableDefaultUI: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          mapTypeControl: false,
          maxZoom,
          minZoom,
          streetViewControl: false,
          zoom,
          zoomControl: true,
        });
      })
      .catch((error: Error) => {
        if (mounted) {
          setLoadError(error.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, [center, maxZoom, minZoom, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = markers.map((marker) => {
      const safeLabel = (marker.label ?? "").slice(0, 1).toUpperCase();
      return new window.google.maps.Marker({
        icon: {
          fillColor: markerColor(marker.variant),
          fillOpacity: 1,
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: markerScale(marker.variant),
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        label: safeLabel
          ? {
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "800",
              text: safeLabel,
            }
          : undefined,
        map,
        position: marker.position,
        title: marker.label,
      });
    });

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (normalizedPath.length > 1) {
      polylineRef.current = new window.google.maps.Polyline({
        geodesic: false,
        map,
        path: normalizedPath,
        strokeColor: "#1f6fff",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      const points = [...markers.map((marker) => marker.position), ...normalizedPath];
      if (points.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 64);
      } else {
        map.setCenter(center);
        map.setZoom(zoom);
      }
    }
  }, [center, markers, normalizedPath, zoom]);

  if (loadError) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-slate-100 p-5 text-center`}>
        <div>
          <p className="text-sm font-black text-ink">Google Maps 연결이 필요합니다</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 환경변수를 설정하면 인도 지역 Google 지도로 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
