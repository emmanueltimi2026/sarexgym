import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Edit3, Eye, EyeOff, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { apiUrl } from '../../lib/secureFetch';

type Service = { id: string; category: string; title: string; imageUrl: string; altText: string; shortDescription: string; fullDescription: string; features: string[]; sortOrder: number; active: boolean; updatedAt: string };
type Draft = { category: string; title: string; altText: string; shortDescription: string; fullDescription: string; featuresText: string; active: boolean };
const emptyDraft: Draft = { category: '', title: '', altText: '', shortDescription: '', fullDescription: '', featuresText: '', active: false };
const readImage = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the image.')); reader.onerror = () => reject(new Error('Could not read the image.')); reader.readAsDataURL(file); });
const toDraft = (service: Service): Draft => ({ category: service.category, title: service.title, altText: service.altText, shortDescription: service.shortDescription, fullDescription: service.fullDescription, featuresText: service.features.join('\n'), active: service.active });

export const AdminServices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/v1/admin/services'), { credentials: 'include', cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to load services.');
      setServices(Array.isArray(body.data) ? body.data : []); setError('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load services.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadServices(); }, [loadServices]);

  const resetEditor = () => { setEditorOpen(false); setDraft(emptyDraft); setEditingId(''); setSelectedFile(null); if (fileInput.current) fileInput.current.value = ''; };
  const beginCreate = () => { setDraft(emptyDraft); setEditingId(''); setSelectedFile(null); if (fileInput.current) fileInput.current.value = ''; setError(''); setNotice(''); setEditorOpen(true); };
  const beginEdit = (service: Service) => { setDraft(toDraft(service)); setEditingId(service.id); setSelectedFile(null); if (fileInput.current) fileInput.current.value = ''; setError(''); setNotice(''); setEditorOpen(true); };

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault();
    const features = draft.featuresText.split('\n').map(value => value.trim()).filter(Boolean);
    if (!editingId && !selectedFile) return setError('Choose an image for this service.');
    if (selectedFile && (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type) || selectedFile.size > 20_000_000)) return setError('Choose a JPG, PNG, or WebP image up to 20 MB.');
    if (features.length < 1) return setError('Add at least one service feature.');
    setBusy(true); setError(''); setNotice('');
    try {
      const current = services.find(service => service.id === editingId);
      let imageData: string | undefined;
      if (selectedFile) imageData = await readImage(selectedFile);
      const payload = { category: draft.category, title: draft.title, altText: draft.altText, shortDescription: draft.shortDescription, fullDescription: draft.fullDescription, features, active: draft.active, ...(imageData ? { imageData } : {}), ...(current ? { updatedAt: current.updatedAt } : {}) };
      const response = await fetch(apiUrl(editingId ? `/api/v1/admin/services/${editingId}` : '/api/v1/admin/services'), { method: editingId ? 'PATCH' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to save service.');
      if (editingId) setServices(items => items.map(item => item.id === editingId ? body.data : item));
      else setServices(items => [...items, body.data].sort((a: Service, b: Service) => a.sortOrder - b.sortOrder));
      resetEditor(); setNotice(editingId ? 'Service details saved.' : 'Service added as a draft.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save service.'); }
    finally { setBusy(false); }
  };

  const moveService = async (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= services.length) return;
    const reordered = [...services]; [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(apiUrl('/api/v1/admin/services/reorder'), { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: reordered.map(service => service.id) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to reorder services.');
      setServices(reordered.map((service, sortOrder) => ({ ...service, sortOrder })));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to reorder services.'); }
    finally { setBusy(false); }
  };

  const deleteService = async () => {
    if (!deleteTarget) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(apiUrl(`/api/v1/admin/services/${deleteTarget.id}`), { method: 'DELETE', credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to delete service.');
      setServices(items => items.filter(item => item.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) resetEditor();
      setDeleteTarget(null); setNotice('Service deleted.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete service.'); }
    finally { setBusy(false); }
  };

  const activeCount = services.filter(service => service.active).length;
  return <AppLayout pageTitle="Services" pageSubtitle="Manage the services shown on the homepage and Facilities page.">
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs font-bold uppercase text-gray-500">Total services</p><p className="mt-1 text-2xl font-black">{services.length}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs font-bold uppercase text-gray-500">Published</p><p className="mt-1 text-2xl font-black">{activeCount}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs font-bold uppercase text-gray-500">Drafts</p><p className="mt-1 text-2xl font-black">{services.length - activeCount}</p></div>
      </div>

      {!editorOpen && (error || notice) && <div role={error ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}

      <section aria-labelledby="service-list-title"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 id="service-list-title" className="text-lg font-bold">Service list</h2><div className="flex items-center gap-3"><button onClick={() => void loadServices()} className="text-sm font-semibold text-gray-600">Refresh list</button><button type="button" onClick={beginCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#EF1B23] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/> Add service</button></div></div>
        {loading ? <div className="grid gap-4 lg:grid-cols-2">{[1,2,3,4].map(item => <div key={item} className="h-56 animate-pulse rounded-xl border bg-white" />)}</div> : services.length === 0 ? <div className="rounded-xl border border-dashed bg-white p-10 text-center text-gray-500">No services yet. Add a service above to get started.</div> : <div className="grid gap-4 xl:grid-cols-2">{services.map((service, index) => <article key={service.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="relative h-48 bg-gray-100"><img src={service.imageUrl} alt={service.altText} className="h-full w-full object-cover"/><span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black uppercase ${service.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-800 text-white'}`}>{service.active ? 'Published' : 'Draft'}</span></div>
          <div className="space-y-3 p-4"><div><small className="font-bold uppercase tracking-wide text-gray-500">{service.category}</small><h3 className="text-lg font-black">{service.title}</h3></div><div className="grid gap-3 md:grid-cols-2"><div><p className="text-[10px] font-black uppercase text-gray-500">Home preview</p><p className="mt-1 text-sm text-gray-700">{service.shortDescription}</p></div><div><p className="text-[10px] font-black uppercase text-gray-500">Facilities details</p><p className="mt-1 line-clamp-3 text-sm text-gray-700">{service.fullDescription}</p></div></div>
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3"><button type="button" disabled={busy || index === 0} onClick={() => void moveService(index,-1)} aria-label={`Move ${service.title} up`} className="rounded-lg border p-2 disabled:opacity-40"><ArrowUp size={16}/></button><button type="button" disabled={busy || index === services.length-1} onClick={() => void moveService(index,1)} aria-label={`Move ${service.title} down`} className="rounded-lg border p-2 disabled:opacity-40"><ArrowDown size={16}/></button><button type="button" disabled={busy} onClick={() => beginEdit(service)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Edit3 size={14}/> Edit</button><button type="button" disabled={busy} onClick={() => beginEdit({ ...service, active: !service.active })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold">{service.active ? <><EyeOff size={14}/> Unpublish</> : <><Eye size={14}/> Publish</>}</button><button type="button" disabled={busy} onClick={() => setDeleteTarget(service)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600"><Trash2 size={14}/> Delete</button></div>
          </div></article>)}</div>}
      </section>
    </div>
    <Modal isOpen={editorOpen} onClose={() => { if (!busy) resetEditor(); }} title={editingId ? 'Edit service' : 'Add a service'} subtitle="The short copy appears on Home; full details appear on Facilities." maxWidth="2xl">
      <form onSubmit={saveService} className="space-y-5">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold uppercase text-gray-600">Service name<input required minLength={2} maxLength={120} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal normal-case text-gray-900" placeholder="e.g. Personal training" /></label>
          <label className="text-xs font-bold uppercase text-gray-600">Category<input required minLength={2} maxLength={80} value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal normal-case text-gray-900" placeholder="e.g. Goal-based support" /></label>
          <label className="text-xs font-bold uppercase text-gray-600 md:col-span-2">Accessibility description for image<input required minLength={5} maxLength={180} value={draft.altText} onChange={event => setDraft({ ...draft, altText: event.target.value })} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal normal-case text-gray-900" placeholder="Describe what the image shows" /></label>
          <label className="text-xs font-bold uppercase text-gray-600 md:col-span-2">Brief description for Home<textarea required minLength={10} maxLength={240} rows={2} value={draft.shortDescription} onChange={event => setDraft({ ...draft, shortDescription: event.target.value })} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal normal-case text-gray-900" /></label>
          <label className="text-xs font-bold uppercase text-gray-600 md:col-span-2">Full description for Facilities<textarea required minLength={20} maxLength={2000} rows={4} value={draft.fullDescription} onChange={event => setDraft({ ...draft, fullDescription: event.target.value })} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal normal-case text-gray-900" /></label>
          <label className="text-xs font-bold uppercase text-gray-600 md:col-span-2">Features <span className="font-normal normal-case">(one per line)</span><textarea required rows={3} value={draft.featuresText} onChange={event => setDraft({ ...draft, featuresText: event.target.value })} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal normal-case text-gray-900" placeholder={'Personalized guidance\nProgress tracking'} /></label>
          <label className="text-xs font-bold uppercase text-gray-600 md:col-span-2">Service image<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" required={!editingId} onChange={event => setSelectedFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm font-normal normal-case text-gray-700" />{selectedFile ? <span className="mt-1 block font-normal normal-case">Selected: {selectedFile.name}</span> : editingId && <span className="mt-1 block font-normal normal-case">Choose an image only if you want to replace the current one.</span>}</label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} />Publish this service on the public site</label>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={busy} onClick={resetEditor} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold disabled:opacity-50">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#EF1B23] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin"/> : editingId ? <Save size={16}/> : <Plus size={16}/>} {editingId ? 'Save service' : 'Add service'}</button></div>
      </form>
    </Modal>
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete service?" message={deleteTarget ? `Delete “${deleteTarget.title}” from the service catalog? It will disappear from both public pages.` : ''} confirmLabel="Delete service" tone="danger" busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={() => void deleteService()} />
  </AppLayout>;
};
