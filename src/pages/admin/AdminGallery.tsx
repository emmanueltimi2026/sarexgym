import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Image as ImageIcon, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { apiUrl } from '../../lib/secureFetch';

type GalleryImage = { id: string; imageUrl: string; caption: string; altText: string; sortOrder: number; published: boolean };
const emptyDraft = { caption: '', altText: '' };

const readImage = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image file'));
  reader.onerror = () => reject(new Error('Could not read image file'));
  reader.readAsDataURL(file);
});

export const AdminGallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GalleryImage | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/v1/admin/gallery'), { credentials: 'include', cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to load gallery');
      setImages(Array.isArray(body.data) ? body.data : []);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load gallery');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadGallery(); }, [loadGallery]);

  const addImage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) return setError('Choose a JPG, PNG, or WebP image first.');
    if (selectedFile.size > 20_000_000) return setError('Images must be 20 MB or smaller.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) return setError('Choose a JPG, PNG, or WebP image.');
    if (!draft.altText.trim()) return setError('Add a short description for accessibility.');
    setBusy(true); setError(''); setNotice('');
    try {
      const imageData = await readImage(selectedFile);
      const response = await fetch(apiUrl('/api/v1/admin/gallery'), { method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData, ...draft }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to upload image');
      setDraft(emptyDraft); setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setNotice('Image uploaded as a draft. Review it and publish when ready.');
      await loadGallery();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to upload image');
    } finally { setBusy(false); }
  };

  const updateImage = async (image: GalleryImage, changes: Partial<Pick<GalleryImage, 'caption' | 'altText' | 'published'>>) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(apiUrl(`/api/v1/admin/gallery/${image.id}`), { method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to update image');
      setImages(current => current.map(item => item.id === image.id ? body.data : item));
      setNotice(changes.published === undefined ? 'Image details saved.' : changes.published ? 'Image published on the public site.' : 'Image unpublished.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update image'); }
    finally { setBusy(false); }
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(apiUrl('/api/v1/admin/gallery/reorder'), { method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: reordered.map(image => image.id) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to reorder gallery');
      setImages(reordered.map((image, order) => ({ ...image, sortOrder: order })));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to reorder gallery'); }
    finally { setBusy(false); }
  };

  const deleteImage = async () => {
    if (!deleteTarget) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(apiUrl(`/api/v1/admin/gallery/${deleteTarget.id}`), { method: 'DELETE', credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to delete image');
      setImages(current => current.filter(image => image.id !== deleteTarget.id));
      setDeleteTarget(null); setNotice('Image removed from the gallery.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete image'); }
    finally { setBusy(false); }
  };

  return <AppLayout pageTitle="Public Gallery" pageSubtitle="Upload, arrange, and publish the images shown on the SAREX facilities page."
    breadcrumbs={[{ label: 'Administration' }, { label: 'Gallery' }]}>
    <div className="mx-auto max-w-6xl space-y-6">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</div>}

      <form onSubmit={addImage} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Image file
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setSelectedFile(event.target.files?.[0] || null)}
            className="mt-2 block w-full rounded-lg border border-gray-200 p-2 text-sm font-normal normal-case" />
          <span className="mt-1 block text-[11px] font-normal normal-case text-gray-500">JPG, PNG, or WebP, up to 20 MB. New images start unpublished.</span>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Accessibility description
          <input required maxLength={180} value={draft.altText} onChange={event => setDraft(current => ({ ...current, altText: event.target.value }))}
            placeholder="Describe what the photo shows" className="mt-2 block w-full rounded-lg border border-gray-200 p-3 text-sm font-normal normal-case" />
        </label>
        <button disabled={busy || !selectedFile} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#EF1B23] px-5 py-3 text-xs font-black text-white disabled:opacity-50">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload draft
        </button>
        <label className="text-xs font-bold uppercase tracking-wide text-gray-700 md:col-span-2">Optional caption
          <input maxLength={180} value={draft.caption} onChange={event => setDraft(current => ({ ...current, caption: event.target.value }))}
            placeholder="Short caption shown with the image" className="mt-2 block w-full rounded-lg border border-gray-200 p-3 text-sm font-normal normal-case" />
        </label>
      </form>

      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-gray-900">Gallery images</h2><p className="mt-1 text-sm text-gray-500">Published images appear publicly in this order.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{images.length} images</span></div>
      {loading && <div role="status" className="rounded-xl bg-white p-10 text-center text-sm text-gray-500">Loading gallery…</div>}
      {!loading && images.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><ImageIcon className="mx-auto h-10 w-10 text-gray-300"/><h3 className="mt-3 font-bold text-gray-800">No gallery images</h3><p className="mt-1 text-sm text-gray-500">Upload an image draft to get started.</p></div>}
      <div className="grid gap-5 lg:grid-cols-2">
        {images.map((image, index) => <article key={image.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="relative h-56 bg-gray-100"><img src={image.imageUrl} alt={image.altText} className="h-full w-full object-cover" />
            <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${image.published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{image.published ? 'Published' : 'Draft'}</span>
          </div>
          <div className="space-y-3 p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500">Accessibility description<input value={image.altText} maxLength={180}
              onChange={event => setImages(current => current.map(item => item.id === image.id ? { ...item, altText: event.target.value } : item))}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal normal-case text-gray-800" /></label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500">Caption<input value={image.caption} maxLength={180}
              onChange={event => setImages(current => current.map(item => item.id === image.id ? { ...item, caption: event.target.value } : item))}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal normal-case text-gray-800" /></label>
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <button type="button" disabled={busy || index === 0} onClick={() => void moveImage(index, -1)} aria-label={`Move image ${index + 1} up`} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" disabled={busy || index === images.length - 1} onClick={() => void moveImage(index, 1)} aria-label={`Move image ${index + 1} down`} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" disabled={busy || !image.altText.trim()} onClick={() => void updateImage(image, { caption: image.caption, altText: image.altText })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold">Save details</button>
              <button type="button" disabled={busy || !image.altText.trim()} onClick={() => void updateImage(image, { published: !image.published })} className={`rounded-lg px-3 py-2 text-xs font-black text-white disabled:opacity-50 ${image.published ? 'bg-gray-800' : 'bg-[#EF1B23]'}`}>{image.published ? 'Unpublish' : 'Publish'}</button>
              <button type="button" disabled={busy} onClick={() => setDeleteTarget(image)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600"><Trash2 className="h-3.5 w-3.5" />Delete</button>
            </div>
          </div>
        </article>)}
      </div>
    </div>
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete gallery image?" message={deleteTarget ? `Remove this image${deleteTarget.caption ? ` (“${deleteTarget.caption}”)` : ''} from the public gallery?` : ''}
      confirmLabel="Delete image" tone="danger" busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={() => void deleteImage()} />
  </AppLayout>;
};
