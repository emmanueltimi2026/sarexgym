import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { Camera, CameraOff, QrCode, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useGym } from '../../context/GymContext';

export const MemberCheckInScanner: React.FC = () => {
  const { navigate } = useGym();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const acceptedRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('Point your camera at the QR code displayed at reception.');
  const [error, setError] = useState('');

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  const acceptCode = (value: string) => {
    let scanned: URL;
    try {
      scanned = new URL(value);
    } catch {
      setMessage('That is not a valid SAREX reception code.');
      return;
    }
    if (scanned.origin !== window.location.origin || scanned.pathname !== '/check-in/reception' || !scanned.searchParams.get('token')) {
      setMessage('Scan the SAREX reception QR code.');
      return;
    }
    if (acceptedRef.current) return;
    acceptedRef.current = true;
    stopScanner();
    navigate(scanned.pathname + scanned.search);
  };

  const startScanner = async () => {
    setError('');
    setMessage('Starting camera…');
    acceptedRef.current = false;
    try {
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200 });
      controlsRef.current = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: 'environment' } } },
        videoRef.current!,
        result => {
          if (result) acceptCode(result.getText());
        }
      );
      setScanning(true);
      setMessage('Hold the reception QR code inside the frame.');
    } catch (reason) {
      stopScanner();
      const denied = reason instanceof DOMException && (reason.name === 'NotAllowedError' || reason.name === 'PermissionDeniedError');
      setError(denied ? 'Camera permission was denied. Allow camera access in your browser settings and try again.' : 'The camera could not start. Use a secure HTTPS connection and check that no other app is using it.');
      setMessage('');
    }
  };

  return <AppLayout pageTitle="Scan to Check In" pageSubtitle="Scan the reception QR code to record today’s visit." breadcrumbs={[{label:'Member Portal',path:'/member/dashboard'},{label:'Check-in'}]}>
    <div className="mx-auto flex min-h-[calc(100svh-178px)] w-full max-w-[440px] items-center px-0 py-2 sm:min-h-[calc(100svh-210px)]">
      <section className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="relative aspect-square max-h-[48svh] w-full bg-[#111] sm:max-h-[520px]">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover"/>
          {!scanning && <div className="absolute inset-0 grid place-items-center text-center text-white"><div><QrCode className="mx-auto h-12 w-12 text-white/40 sm:h-16 sm:w-16"/><p className="mt-3 px-6 text-xs text-white/65 sm:mt-4 sm:text-sm">Camera preview will appear here.</p></div></div>}
          {scanning && <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,.35)]"><span className="absolute -left-0.5 -top-0.5 h-10 w-10 border-l-4 border-t-4 border-[#EF1B23]"/><span className="absolute -right-0.5 -top-0.5 h-10 w-10 border-r-4 border-t-4 border-[#EF1B23]"/><span className="absolute -bottom-0.5 -left-0.5 h-10 w-10 border-b-4 border-l-4 border-[#EF1B23]"/><span className="absolute -bottom-0.5 -right-0.5 h-10 w-10 border-b-4 border-r-4 border-[#EF1B23]"/></div>}
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#EF1B23]"/><div><p className="text-sm font-bold text-[#111]">{message || error}</p><p className="mt-1 text-[11px] leading-4 text-gray-500 sm:text-xs sm:leading-5">After check-in, show the confirmation screen to reception for visual verification.</p></div></div>
          <button type="button" onClick={scanning ? stopScanner : ()=>void startScanner()} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#EF1B23] text-xs font-black uppercase text-white hover:bg-red-700 sm:h-12">
            {scanning ? <><CameraOff className="h-4 w-4"/>Stop camera</> : <><Camera className="h-4 w-4"/>Open camera</>}
          </button>
        </div>
      </section>
    </div>
  </AppLayout>;
};
