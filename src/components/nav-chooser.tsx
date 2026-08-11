"use client";

import { Navigation, Map, Compass } from "lucide-react";

interface NavApp {
  name: string;
  icon: typeof Navigation;
  url: (lat: number, lng: number, label?: string) => string;
}

const NAV_APPS: NavApp[] = [
  {
    name: "Google Maps",
    icon: Navigation,
    url: (lat, lng, label) =>
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving${label ? `&destination_place_id=` : ""}`,
  },
  {
    name: "OsmAnd",
    icon: Map,
    url: (lat, lng, label) =>
      `https://osmand.net/go?lat=${lat}&lon=${lng}&zoom=15${label ? `&name=${encodeURIComponent(label)}` : ""}`,
  },
  {
    name: "Organic Maps",
    icon: Compass,
    url: (lat, lng) => `geo:${lat},${lng}?q=${lat},${lng}`,
  },
  {
    name: "Apple Karten",
    icon: Compass,
    url: (lat, lng) => `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
  },
];

export function NavChooser({
  lat,
  lng,
  label,
  compact = false,
}: {
  lat: number;
  lng: number;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-3"}`}>
      {NAV_APPS.map((app) => (
        <a
          key={app.name}
          href={app.url(lat, lng, label)}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn btn-ghost !text-xs ${compact ? "!px-2.5 !py-1.5" : "flex-1"}`}
          title={`Navigieren mit ${app.name}`}
        >
          <app.icon className="size-3.5" />
          {!compact && app.name}
        </a>
      ))}
    </div>
  );
}
