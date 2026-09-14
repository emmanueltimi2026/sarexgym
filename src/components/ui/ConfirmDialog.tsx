import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, message, confirmLabel = 'Confirm', tone = 'warning', busy, onConfirm, onClose }) => (
  <Modal isOpen={open} onClose={onClose} title={title} maxWidth="sm">
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600"/><p>{message}</p></div>
    <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-bold">Cancel</button><button onClick={onConfirm} disabled={busy} className={`rounded-lg px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 ${tone === 'danger' ? 'bg-red-700' : tone === 'primary' ? 'bg-[#EF1B23]' : 'bg-[#151515]'}`}>{busy ? 'Please wait…' : confirmLabel}</button></div>
  </Modal>
);
