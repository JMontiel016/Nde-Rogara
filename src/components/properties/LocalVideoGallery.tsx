import React, { useEffect, useState } from 'react';
import { resolveLocalVideo } from '../../services/videoMedia';
export const LocalVideoGallery:React.FC<{videos:string[]}>=({videos})=>{
  const [urls,setUrls]=useState<{src:string;index:number}[]>([]);
  useEffect(()=>{
    let alive=true;let owned:string[]=[];
    Promise.all(videos.map((ref,index)=>resolveLocalVideo(ref).then(src=>({src,index})).catch(()=>null))).then(items=>{
      const valid=items.filter((item):item is {src:string;index:number}=>Boolean(item));
      owned=valid.map(x=>x.src).filter(src=>src.startsWith('blob:'));
      if(alive)setUrls(valid);else owned.forEach(src=>URL.revokeObjectURL(src));
    });
    return ()=>{alive=false;owned.forEach(src=>URL.revokeObjectURL(src));};
  },[videos.join('|')]);
  if(!videos.length)return null;
  return <section className="space-y-4"><h2 className="text-lg font-black text-slate-900">Recorridos en video</h2><div className="grid gap-4 sm:grid-cols-2">{urls.map(({src,index})=><div key={index} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950"><video controls preload="metadata" className="aspect-video w-full" src={src} aria-label={`Video del inmueble ${index+1}`}/></div>)}</div>{urls.length<videos.length&&<p className="text-xs text-slate-500">Algunos videos locales solo están disponibles desde el navegador donde se cargaron.</p>}</section>;
};
