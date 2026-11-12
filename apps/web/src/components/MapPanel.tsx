import {useEffect, useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Point={title:string;lat:number;lng:number;type:'site'|'evidence'};
export function MapPanel({tasks}:{tasks:any[]}) {
  const root=useRef<HTMLDivElement>(null);
  const map=useRef<L.Map|null>(null);
  const points:Point[]=tasks.flatMap(t=>{
    const result:Point[]=[];
    if(Number.isFinite(t.latitude) && Number.isFinite(t.longitude))
      result.push({title:t.title,lat:t.latitude,lng:t.longitude,type:'site'});
    for(const e of (t.evidence||[])){
      if(Number.isFinite(e.latitude) && Number.isFinite(e.longitude))
        result.push({title:t.title,lat:e.latitude,lng:e.longitude,type:'evidence'});
    }
    return result;
  });
  useEffect(()=>{
    if(!root.current)return;
    const instance=L.map(root.current).setView([20.5937,78.9629],4);
    map.current=instance;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(instance);
    return ()=>{instance.remove();map.current=null;};
  },[]);
  useEffect(()=>{
    const instance=map.current;if(!instance)return;
    instance.eachLayer(layer=>{if(layer instanceof L.CircleMarker)instance.removeLayer(layer);});
    if(!points.length)return;
    const bounds:L.LatLngExpression[]=[];
    points.forEach(point=>{
      const pos:L.LatLngExpression=[point.lat,point.lng];bounds.push(pos);
      const marker=L.circleMarker(pos,{radius:8,color:point.type==='evidence'?'#45f0a6':'#74afff',weight:2,fillOpacity:.7}).addTo(instance);
      const popup=document.createElement('div');
      popup.textContent=`${point.type==='evidence'?'GPS from uploaded evidence':'Planned task site (not proof)'}: ${point.title}`;
      marker.bindPopup(popup);
    });
    instance.fitBounds(bounds as L.LatLngBoundsExpression,{padding:[20,20],maxZoom:12});
  },[tasks]);
  const siteCount=points.filter(p=>p.type==='site').length;
  const evidenceCount=points.filter(p=>p.type==='evidence').length;
  return <div><div ref={root} style={{width:'100%',height:290,borderRadius:10}}/>
    <p className="helper">Planned task locations: {siteCount} (blue) · Actual GPS-tagged evidence: {evidenceCount} (green). Planned locations are not proof of work.</p>
    {!points.length && <p className="helper">No coordinates available yet. Enter a task site latitude/longitude when creating a task, or upload a photo that contains GPS metadata.</p>}
  </div>;
}
