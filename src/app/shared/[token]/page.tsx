"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), { ssr: false });
export default function SharedPage(){
  const { token } = useParams<{token:string}>();
  const [data,setData]=useState<any>(null);
  const [err,setErr]=useState("");
  useEffect(()=>{
    fetch(`/api/shared/${token}`).then(r=>r.json()).then(d=>{
      if(d.error) setErr(d.error);
      else setData(d);
    }).catch(()=>setErr("Fehler"));
  },[token]);
  if(err) return <div className="grid place-items-center p-10">{err}</div>;
  if(!data) return <div className="p-10">Lädt…</div>;
  return <div className="flex flex-col h-[80vh]">
    <div className="p-4 border-b border-line"><h1 className="font-display text-2xl">{data.map?.name}</h1><p className="text-xs text-mute">{data.points?.length} Punkte</p></div>
    <LeafletMap points={data.points?.map((p:any)=>({id:p.id,name:p.name,lat:p.lat,lng:p.lng,category:p.category}))||[]} fitKey={token} className="flex-1"/>
  </div>;
}
