import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, QrCode } from 'lucide-react';

/** Cámara opcional: comprueba lectura de un QR de demostración en otra pantalla o impreso. */
export const DemoQrScanner:React.FC<{planId:string;onRecognized:()=>void}>=({planId,onRecognized})=>{
  const [scanning,setScanning]=useState(false);
  const [message,setMessage]=useState('');
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const frameRef=useRef<number|null>(null);
  const stop=()=>{
    if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;frameRef.current=null;setScanning(false);
  };
  useEffect(()=>()=>{if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);streamRef.current?.getTracks().forEach(track=>track.stop());},[]);
  const start=async()=>{
    const BarcodeDetectorCtor=(window as unknown as {BarcodeDetector?:new(args:{formats:string[]})=>{detect:(image:HTMLVideoElement)=>Promise<{rawValue:string}[]>}}).BarcodeDetector;
    if(!BarcodeDetectorCtor || !navigator.mediaDevices?.getUserMedia){setMessage('Tu navegador no dispone de un lector QR compatible. Podés confirmar manualmente la lectura para la muestra.');return;}
    try{
      setMessage('');const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});streamRef.current=stream;setScanning(true);
      const video=videoRef.current;
      if(!video){stop();return;}
      video.srcObject=stream;
      await video.play();
      const detector=new BarcodeDetectorCtor({formats:['qr_code']});
      const scan=async()=>{
        if(!streamRef.current||!videoRef.current)return;
        try{
          const findings=await detector.detect(videoRef.current);
          if(findings.some(item=>item.rawValue.toUpperCase().includes(`PLAN ${planId.toUpperCase()}`)&&item.rawValue.includes('NDE ROGARA'))){onRecognized();setMessage('Lectura del QR comprobada para esta contratación.');stop();return;}
        }catch{ /* Reintentar: la cámara puede requerir varios cuadros para enfocar. */ }
        frameRef.current=requestAnimationFrame(()=>{void scan();});
      };
      void scan();
    }catch{stop();setMessage('No se pudo acceder a la cámara. Revisá el permiso o utilizá la confirmación manual.');}
  };
  return <div className="space-y-2"><button type="button" onClick={()=>scanning?stop():void start()} className="mx-auto flex items-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-2 text-xs font-black text-sky-800 hover:bg-sky-100">{scanning?<CameraOff size={16}/>:<Camera size={16}/>} {scanning?'Cerrar cámara':'Verificar QR con cámara'}</button><video ref={videoRef} playsInline muted className={`${scanning?'block':'hidden'} mx-auto max-h-36 w-full rounded-xl border border-sky-200 bg-slate-950 object-cover`}/><p className="flex items-start gap-1 text-[11px] leading-5 text-slate-500"><QrCode size={13} className="mt-0.5 shrink-0"/>La cámara lee un QR de muestra desde otra pantalla o impreso. No verifica un pago bancario.</p>{message&&<p role="status" className="text-xs text-sky-800">{message}</p>}</div>;
};
