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
  variant?: "pickup" | "crew" | "hub";
};

type KakaoCanvasMapProps = {
  appKey: string;
  center: Coordinate;
  markers: MapMarker[];
  boundsPoints?: Coordinate[];
  path?: Coordinate[];
  className?: string;
  fitBounds?: boolean;
  level?: number;
  maxZoom?: number;
  minZoom?: number;
  onCenterChangeEnd?: (coordinates: Coordinate) => void;
  onMapClick?: (coordinates: Coordinate) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  routeColor?: string;
  routeOpacity?: number;
  routeWeight?: number;
  syncCenter?: boolean;
  zoom?: number;
};

type KakaoNamespace = any;

declare global {
  interface Window {
    kakao?: KakaoNamespace;
    __swapitKakaoMapsPromise?: Promise<KakaoNamespace>;
    __swapitKakaoMapsAppKey?: string;
  }
}

function loadKakaoMaps(appKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps can only be loaded in the browser"));
  }

  if (window.kakao?.maps && window.__swapitKakaoMapsAppKey === appKey) {
    return Promise.resolve(window.kakao);
  }

  if (window.__swapitKakaoMapsPromise && window.__swapitKakaoMapsAppKey === appKey) {
    return window.__swapitKakaoMapsPromise;
  }

  window.__swapitKakaoMapsAppKey = appKey;
  window.__swapitKakaoMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-swapit-kakao-maps]");

    const onReady = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("Kakao Maps SDK failed to initialize"));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    if (existingScript) {
      existingScript.addEventListener("load", onReady, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Kakao Maps SDK failed to load")), { once: true });
      if (window.kakao?.maps?.load) onReady();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.dataset.swapitKakaoMaps = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Kakao Maps SDK failed to load"));
    document.head.appendChild(script);
  });

  return window.__swapitKakaoMapsPromise;
}

function zoomToLevel(zoom?: number, level?: number) {
  if (level != null) return level;
  if (zoom == null) return 4;
  return Math.max(1, Math.min(14, 20 - zoom));
}

function markerColor(marker: MapMarker) {
  if (marker.variant === "hub") return "#16a34a";
  if (marker.variant === "crew") return "#dc2626";
  return "#2563eb";
}

function markerLabel(marker: MapMarker) {
  if (marker.label === "home") return "⌂";
  return (marker.label ?? marker.key.slice(0, 1)).slice(0, 1).toUpperCase();
}

function createMarkerNode(marker: MapMarker, onClick?: (marker: MapMarker) => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = marker.title ?? marker.key;
  button.style.width = "34px";
  button.style.height = "34px";
  button.style.borderRadius = "999px";
  button.style.border = "3px solid #fff";
  button.style.background = markerColor(marker);
  button.style.boxShadow = "0 8px 18px rgba(15,23,42,0.22)";
  button.style.color = "#fff";
  button.style.fontSize = "13px";
  button.style.fontWeight = "900";
  button.style.lineHeight = "28px";
  button.style.textAlign = "center";
  button.style.cursor = onClick ? "pointer" : "default";
  button.textContent = markerLabel(marker);

  if (onClick) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(marker);
    });
  }

  return button;
}

function boundsKey(points: Coordinate[]) {
  return points
    .map((point) => `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`)
    .join("|");
}

export function KakaoCanvasMap({
  appKey,
  center,
  className,
  boundsPoints = [],
  fitBounds = false,
  level,
  markers,
  maxZoom,
  minZoom,
  onCenterChangeEnd,
  onMapClick,
  onMarkerClick,
  path = [],
  routeColor = "#2563eb",
  routeOpacity = 0.9,
  routeWeight = 6,
  syncCenter = false,
  zoom,
}: KakaoCanvasMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const lastFitBoundsKeyRef = useRef("");
  const [loadError, setLoadError] = useState("");

  const stableMarkers = useMemo(() => markers, [markers]);
  const stableBoundsPoints = useMemo(
    () => boundsPoints.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    [boundsPoints],
  );
  const stablePath = useMemo(() => path.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)), [path]);
  const kakaoLevel = zoomToLevel(zoom, level);

  useEffect(() => {
    let mounted = true;

    loadKakaoMaps(appKey)
      .then((kakao) => {
        if (!mounted || !containerRef.current || mapRef.current) return;

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: kakaoLevel,
        });

        if (maxZoom != null) map.setMinLevel(zoomToLevel(maxZoom));
        if (minZoom != null) map.setMaxLevel(zoomToLevel(minZoom));

        kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
          const latLng = mouseEvent.latLng;
          onMapClick?.({ lat: latLng.getLat(), lng: latLng.getLng() });
        });

        kakao.maps.event.addListener(map, "idle", () => {
          const currentCenter = map.getCenter();
          onCenterChangeEnd?.({ lat: currentCenter.getLat(), lng: currentCenter.getLng() });
        });

        mapRef.current = map;
      })
      .catch((error: Error) => {
        if (mounted) setLoadError(error.message);
      });

    return () => {
      mounted = false;
    };
  }, [appKey, center.lat, center.lng, kakaoLevel, maxZoom, minZoom, onCenterChangeEnd, onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!map || !kakao?.maps) return;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = stableMarkers.map((marker) => {
      const overlay = new kakao.maps.CustomOverlay({
        content: createMarkerNode(marker, onMarkerClick),
        position: new kakao.maps.LatLng(marker.position.lat, marker.position.lng),
        yAnchor: 1,
        zIndex: marker.variant === "crew" ? 5 : 4,
      });
      overlay.setMap(map);
      return overlay;
    });

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (stablePath.length > 1) {
      polylineRef.current = new kakao.maps.Polyline({
        path: stablePath.map((point) => new kakao.maps.LatLng(point.lat, point.lng)),
        strokeColor: routeColor,
        strokeOpacity: routeOpacity,
        strokeWeight: routeWeight,
      });
      polylineRef.current.setMap(map);
    }

    if (fitBounds) {
      const points =
        stableBoundsPoints.length > 1 ? stableBoundsPoints : [...stableMarkers.map((marker) => marker.position), ...stablePath];
      const nextBoundsKey = boundsKey(points);
      if (points.length > 1 && nextBoundsKey && nextBoundsKey !== lastFitBoundsKeyRef.current) {
        const bounds = new kakao.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(new kakao.maps.LatLng(point.lat, point.lng)));
        map.setBounds(bounds, 40, 40, 40, 40);
        lastFitBoundsKeyRef.current = nextBoundsKey;
      }
    } else if (syncCenter) {
      map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
      map.setLevel(kakaoLevel);
    }
  }, [
    center.lat,
    center.lng,
    fitBounds,
    kakaoLevel,
    onMarkerClick,
    routeColor,
    routeOpacity,
    routeWeight,
    stableBoundsPoints,
    stableMarkers,
    stablePath,
    syncCenter,
  ]);

  if (loadError) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-slate-100 p-5 text-center`}>
        <div>
              <p className="text-sm font-black text-ink">Kakao Maps connection is required</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Check NEXT_PUBLIC_KAKAO_MAP_APP_KEY and restart the app.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={`${className ?? ""} relative z-0 overflow-hidden`} />;
}
