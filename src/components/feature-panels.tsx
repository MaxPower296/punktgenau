"use client";
import { useEffect, useState } from "react";
import { MapPin, Thermometer, Droplets, Wind, Star, Upload, Trash2, Share2, Download, Calendar, Mountain, Navigation, Search, Layers } from "lucide-react";
import { toast } from "@/components/ui";

// Reverse Geocode
export function ReverseGeocode({ lat, lng }: { lat: number; lng: number }) {
  const [addr, setAddr] = useState<string | null>(null);
  useEffect(() => {
    let aborted = false;
    fetch(`/api/reverse?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => { if (!aborted) setAddr(d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`); })
      .catch(() => { if (!aborted) setAddr(null); });
    return () => { aborted = true; };
  }, [lat, lng]);
  if (!addr) return <span className="text-xs text-dim">Adresse wird ermittelt…</span>;
  return <span className="text-xs text-mute">{addr}</span>;
}

// Weather
export function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lng=${lng}`).then(r=>r.json()).then(d=>setData(d)).catch(()=>setErr(true));
  }, [lat, lng]);
  if (err) return <p className="text-xs text-dim">Wetter nicht verfügbar</p>;
  if (!data?.current_weather) return <p className="text-xs text-dim">Wetter lädt…</p>;
  const cw = data.current_weather;
  const daily = data.daily;
  const codeMap: Record<number,string> = {0:"Klar",1:"Überw. klar",2:"Bewölkt",3:"Bedeckt",45:"Nebel",51:"Niesel",61:"Leicht Regen",63:"Regen",65:"Stark Regen",71:"Schnee",80:"Schauer",95:"Gewitter"};
  return (
    <div className="rounded-xl border border-line bg-ink/40 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold"><Thermometer className="size-4 text-amber"/> {cw.temperature}°C · {codeMap[cw.weathercode] || `Code ${cw.weathercode}`} <span className="ml-auto flex items-center gap-1 text-xs text-mute"><Wind className="size-3"/>{cw.windspeed} km/h</span></p>
      {daily && (
        <div className="mt-2 grid grid-cols-5 gap-1 text-center">
          {daily.time.slice(0,5).map((t:string,i:number)=>(
            <div key={t} className="rounded-lg bg-panel p-1">
              <p className="text-[10px] text-dim">{new Date(t).toLocaleDateString("de",{weekday:"short"})}</p>
              <p className="text-xs font-medium">{Math.round(daily.temperature_2m_max[i])}°/{Math.round(daily.temperature_2m_min[i])}°</p>
              <p className="text-[10px] text-mute flex items-center justify-center gap-1"><Droplets className="size-3"/>{daily.precipitation_sum[i]}mm</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// POI Panel
export function PoiPanel({ lat, lng, onSelect }: { lat: number; lng: number; onSelect?: (lat:number,lng:number,label:string)=>void }) {
  const [pois, setPois] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(2000);
  const search = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/poi?lat=${lat}&lng=${lng}&radius=${radius}`);
      const d = await r.json();
      setPois(d.elements || []);
    } catch { toast("POI Suche fehlgeschlagen","err"); }
    setLoading(false);
  };
  useEffect(()=>{ search(); },[]);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select value={radius} onChange={e=>setRadius(parseInt(e.target.value))} className="field !py-1 text-xs">
          <option value={1000}>1 km</option>
          <option value={2000}>2 km</option>
          <option value={5000}>5 km</option>
        </select>
        <button onClick={search} disabled={loading} className="btn btn-ghost !py-1 !text-xs"><Search className="size-3"/>{loading?"Suche…":"Suchen"}</button>
      </div>
      <div className="max-h-48 overflow-auto space-y-1">
        {pois.length===0 && <p className="text-xs text-dim">Keine POIs gefunden.</p>}
        {pois.map(p=>(
          <button key={p.id} onClick={()=>onSelect?.(p.lat,p.lon,p.name)} className="w-full text-left rounded-lg border border-line p-2 hover:border-amber">
            <p className="text-xs font-medium truncate">{p.name}</p>
            <p className="text-[10px] text-dim">{p.type} · {p.tags.shop?"Supermarkt":p.tags.amenity||p.type}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// Tour Planner
export function TourPlanner({ points, onOptimize }: { points: {id:string,name:string,lat:number,lng:number}[], onOptimize?: (ordered:any[])=>void }) {
  const [selected, setSelected] = useState<string[]>(points.slice(0,5).map(p=>p.id));
  const toggle = (id:string)=> setSelected(s=> s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const ordered = (() => {
    if (selected.length<2) return selected.map(id=>points.find(p=>p.id===id)!).filter(Boolean);
    const sel = selected.map(id=>points.find(p=>p.id===id)!).filter(Boolean);
    // nearest neighbor from first
    const visited: typeof sel = [sel[0]];
    const remaining = sel.slice(1);
    while (remaining.length) {
      const last = visited[visited.length-1];
      let bestIdx=0; let bestDist=Infinity;
      remaining.forEach((p,i)=>{
        const d = Math.hypot(p.lat-last.lat, p.lng-last.lng);
        if (d<bestDist){bestDist=d; bestIdx=i;}
      });
      visited.push(remaining.splice(bestIdx,1)[0]);
    }
    return visited;
  })();
  const totalKm = ordered.reduce((s,p,i)=> i? s+ haversine(ordered[i-1].lat,ordered[i-1].lng,p.lat,p.lng)/1000 : 0, 0);
  const timeH = totalKm / 50; // 50 km/h avg
  return (
    <div className="space-y-3">
      <div className="max-h-40 overflow-auto space-y-1">
        {points.map(p=>(
          <label key={p.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-panel">
            <input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)} />
            <span className="flex-1 truncate">{p.name}</span>
          </label>
        ))}
      </div>
      {selected.length>=2 && (
        <div className="rounded-xl border border-line bg-ink/40 p-3">
          <p className="text-xs font-semibold">Optimierte Reihenfolge ({ordered.length} Stopps)</p>
          <ol className="mt-2 space-y-1 list-decimal list-inside text-xs">
            {ordered.map((p,i)=><li key={p.id}>{i+1}. {p.name}</li>)}
          </ol>
          <p className="mt-2 text-xs text-mute">Distanz: {totalKm.toFixed(1)} km · Fahrzeit ~ {Math.floor(timeH)}h {Math.round((timeH%1)*60)}min (50 km/h)</p>
          <a href={`https://www.google.com/maps/dir/${ordered.map(p=>`${p.lat},${p.lng}`).join("/")}`} target="_blank" className="btn btn-amber w-full mt-2 !py-2 !text-xs"><Navigation className="size-3"/> In Google Maps öffnen</a>
        </div>
      )}
    </div>
  );
}
function haversine(lat1:number,lng1:number,lat2:number,lng2:number){
  const R=6371000; const toRad=(d:number)=>d*Math.PI/180;
  const a=Math.sin(toRad(lat2-lat1)/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(toRad(lng2-lng1)/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

// Share Panel
export function SharePanel({ point, mapName }: { point?: {name:string,lat:number,lng:number,category?:string|null}, mapName?:string }) {
  const text = point ? `${point.name} (${point.category||""}) – ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}` : `Karte ${mapName} – Punktgenau`;
  const url = point ? `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}` : typeof window!=="undefined"? window.location.href : "";
  const share = async ()=>{
    if (navigator.share) {
      try { await navigator.share({ title: point?.name || mapName, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast("Link kopiert");
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={share} className="btn btn-amber !py-1.5 !text-xs"><Share2 className="size-3"/> Teilen</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" className="btn btn-ghost !py-1.5 !text-xs">WhatsApp</a>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" className="btn btn-ghost !py-1.5 !text-xs">Telegram</a>
      <a href={`mailto:?subject=${encodeURIComponent(point?.name||mapName||"Punktgenau")}&body=${encodeURIComponent(text)}`} className="btn btn-ghost !py-1.5 !text-xs">E-Mail</a>
    </div>
  );
}

// Elevation Profile
export function ElevationProfile({ points }: { points: {lat:number,lng:number}[] }) {
  const [elevs, setElevs] = useState<number[]|null>(null);
  useEffect(()=>{
    if (points.length<2) return;
    const lats = points.map(p=>p.lat).join(",");
    const lngs = points.map(p=>p.lng).join(",");
    fetch(`/api/elevation?lats=${lats}&lngs=${lngs}`).then(r=>r.json()).then(d=>setElevs(d.elevations)).catch(()=>{});
  },[points]);
  if (!elevs) return <p className="text-xs text-dim">Höhenprofil lädt…</p>;
  const min = Math.min(...elevs); const max = Math.max(...elevs);
  const range = max-min || 1;
  return (
    <div>
      <div className="flex h-20 items-end gap-1 border-b border-line pb-1">
        {elevs.map((e,i)=>(
          <div key={i} className="flex-1 bg-amber rounded-t" style={{height: `${8+ ((e-min)/range)*80}%`}} title={`${e} m`}/>
        ))}
      </div>
      <p className="text-[10px] text-dim mt-1 flex justify-between"><span>{min} m</span><span>{max} m</span><span>Δ {(max-min)} m</span></p>
    </div>
  );
}

// Backup Panel
export function BackupPanel() {
  const [importing, setImporting]=useState(false);
  const doExport = async ()=>{
    const res = await fetch("/api/backup");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`punktgenau-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const doImport = async (e: React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return;
    setImporting(true);
    try{
      const text=await f.text(); const json=JSON.parse(text);
      const res=await fetch("/api/backup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(json)});
      const d=await res.json();
      toast(`Importiert: ${d.importedMaps} Karten, ${d.importedPoints} Punkte`);
      location.reload();
    }catch{ toast("Import fehlgeschlagen","err");}
    setImporting(false);
  };
  return (
    <div className="flex gap-2">
      <button onClick={doExport} className="btn btn-ghost !py-1.5 !text-xs"><Download className="size-3"/> Backup exportieren</button>
      <label className="btn btn-ghost !py-1.5 !text-xs cursor-pointer"><Upload className="size-3"/> Backup importieren<input type="file" accept=".json" className="hidden" onChange={doImport} disabled={importing}/></label>
    </div>
  );
}

// Image Gallery
export function ImageGallery({ pointId }: { pointId: string }) {
  const [images, setImages]=useState<any[]>([]);
  const [uploading,setUploading]=useState(false);
  const load=()=> fetch(`/api/points/${pointId}/image`).then(r=>r.json()).then(d=>setImages(d.images||[]));
  useEffect(()=>{ load(); },[pointId]);
  const upload=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return;
    setUploading(true);
    const form=new FormData(); form.append("file",f);
    await fetch(`/api/points/${pointId}/image`,{method:"POST", body: form});
    await load(); setUploading(false); toast("Foto hinzugefügt");
  };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((im:any)=>(
          <div key={im.id} className="relative group">
            <img src={im.url} alt="" className="h-24 w-full object-cover rounded-lg border border-line"/>
            <button onClick={async()=>{await fetch(`/api/points/${pointId}/image?imageId=${im.id}`,{method:"DELETE"}); load();}} className="absolute top-1 right-1 bg-ink/80 rounded-full p-1 opacity-0 group-hover:opacity-100"><Trash2 className="size-3"/></button>
          </div>
        ))}
      </div>
      <label className="btn btn-ghost w-full mt-2 !py-1.5 !text-xs cursor-pointer">{uploading?"Lädt…":"Foto hinzufügen"}<input type="file" accept="image/*" className="hidden" onChange={upload}/></label>
    </div>
  );
}

// Calendar ICS
export function CalendarButton({ point }: { point: {name:string, lat:number,lng:number, visitedAt?:string|null} }) {
  const download = ()=>{
    const dt = point.visitedAt ? new Date(point.visitedAt) : new Date();
    const dt2 = new Date(dt.getTime()+ 24*60*60*1000);
    const fmt = (d:Date)=> d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${point.name}\nDTSTART:${fmt(dt)}\nDTEND:${fmt(dt2)}\nLOCATION:${point.lat},${point.lng}\nDESCRIPTION:Punktgenau Stellplatz\nEND:VEVENT\nEND:VCALENDAR`;
    const blob=new Blob([ics],{type:"text/calendar"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`${point.name}.ics`; a.click(); URL.revokeObjectURL(url);
  };
  return <button onClick={download} className="btn btn-ghost !py-1.5 !text-xs"><Calendar className="size-3"/> Kalender</button>;
}
