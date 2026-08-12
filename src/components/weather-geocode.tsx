"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
} from "lucide-react";

interface GeocodeData {
  short: string | null;
  address: string | null;
}

interface WeatherData {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
  };
}

const WMO_ICONS: Record<number, typeof Sun> = {
  0: Sun, 1: Sun, 2: Cloud, 3: Cloud,
  45: CloudFog, 48: CloudFog,
  51: CloudRain, 53: CloudRain, 55: CloudRain,
  61: CloudRain, 63: CloudRain, 65: CloudRain,
  71: CloudSnow, 73: CloudSnow, 75: CloudSnow,
  80: CloudRain, 81: CloudRain, 82: CloudRain,
  95: CloudLightning, 96: CloudLightning, 99: CloudLightning,
};

const WMO_DESC: Record<number, string> = {
  0: "Klar", 1: "Leicht bewölkt", 2: "Bewölkt", 3: "Stark bewölkt",
  45: "Nebel", 48: "Nebel",
  51: "Leichter Nieselregen", 53: "Nieselregen", 55: "Starker Nieselregen",
  61: "Leichter Regen", 63: "Regen", 65: "Starker Regen",
  71: "Leichter Schnee", 73: "Schnee", 75: "Starker Schnee",
  80: "Regenschauer", 81: "Regenschauer", 82: "Schwere Schauer",
  95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Schweres Gewitter",
};

const DAY_NAMES = ["Heute", "Morgen", "Übermorgen"];

export function WeatherGeocode({ lat, lng }: { lat: number; lng: number }) {
  const [geo, setGeo] = useState<GeocodeData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    setGeo(null);
    setWeather(null);
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d: GeocodeData) => setGeo(d))
      .catch(() => {});
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d: { weather: WeatherData | null }) => setWeather(d.weather))
      .catch(() => {});
  }, [lat, lng]);

  if (!geo && !weather) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 w-48 rounded bg-panel" />
        <div className="h-20 rounded-lg bg-panel" />
      </div>
    );
  }

  const wCode = weather?.current?.weather_code ?? 0;
  const Icon = WMO_ICONS[wCode] ?? Cloud;

  return (
    <div className="space-y-3">
      {/* Adresse / Reverse Geocoding */}
      <div className="rounded-lg border border-line bg-ink/40 px-3 py-2.5">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
          <MapPin className="size-3.5" />
          Standort
        </p>
        {geo?.short ? (
          <p className="mt-1 text-[13px] font-medium text-paper">{geo.short}</p>
        ) : (
          <p className="mt-1 text-[11px] text-dim">Laden …</p>
        )}
        {geo?.address && geo.address !== geo.short && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-mute">{geo.address}</p>
        )}
      </div>

      {/* Wetter aktuell + 3-Tage */}
      {weather && (
        <div className="rounded-lg border border-line bg-ink/40 px-3 py-2.5">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            <Cloud className="size-3.5" />
            Wetter
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Icon className="size-8 text-amber" strokeWidth={1.5} />
            <div>
              <p className="text-lg font-semibold text-paper">
                {Math.round(weather.current.temperature_2m)}°C
              </p>
              <p className="text-[11px] text-mute">
                {WMO_DESC[wCode] ?? "Unbekannt"} ·{" "}
                <Wind className="inline size-3" />{" "}
                {Math.round(weather.current.wind_speed_10m)} km/h ·{" "}
                <Droplets className="inline size-3" />{" "}
                {weather.current.relative_humidity_2m}%
              </p>
            </div>
          </div>

          {/* 3-Tage Vorhersage */}
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2.5">
            {DAY_NAMES.map((day, i) => {
              const DayIcon = WMO_ICONS[weather.daily.weather_code[i]] ?? Cloud;
              return (
                <div key={i} className="text-center">
                  <p className="text-[10px] font-medium text-dim">{day}</p>
                  <DayIcon className="mx-auto my-1 size-5 text-mute" strokeWidth={1.5} />
                  <p className="text-[11px] font-medium text-paper">
                    {Math.round(weather.daily.temperature_2m_max[i])}° /
                    {Math.round(weather.daily.temperature_2m_min[i])}°
                  </p>
                  <p className="text-[9px] text-dim">
                    <Droplets className="inline size-2.5" />{" "}
                    {weather.daily.precipitation_probability_max[i]}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
