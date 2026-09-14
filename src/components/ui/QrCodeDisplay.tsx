import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';

interface QrCodeDisplayProps { value: string; showEnlargeButton?: boolean; }

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({ value, showEnlargeButton = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, value, {
      width: 320,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: { dark: '#111111', light: '#FFFFFF' }
    });
  }, [value]);

  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = 'sarex-reception-check-in.png';
    link.click();
  };

  return <div className="w-full max-w-[360px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="rounded-xl bg-white p-2"><canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-[320px]"/></div>
    {showEnlargeButton && <button type="button" onClick={download} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"><Download className="h-4 w-4"/>Download QR code</button>}
  </div>;
};