import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { ArrowUp, Dumbbell, LoaderCircle, MessageCircle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AssistantMarkdownLink } from './AssistantMarkdownLink';
import { useGym } from '../../context/GymContext';
import { apiUrl } from '../../lib/secureFetch';
import { getAssistantExperience, getAssistantWidgetBottom, isAssistantActionPathAllowed, isAssistantHiddenPath, shouldAutoFocusAssistantInput } from '../../lib/assistantUi';
import { normalizeAssistantMarkdown, remarkLineBreaks } from '../../lib/assistantMarkdown.js';
import { AssistantStructuredContent, parseAssistantStructuredContent } from './StructuredAssistantContent.js';

type AssistantContentAction = { label: string; type: 'navigate'; path: string };
type MembershipPlanContent = { type: 'membership_plans'; plans: { id: string | null; name: string; description: string | null; price: number | null;
  currency: string; duration: string | null; registrationFee: number | null; trainerAccess: boolean | null; workoutPlan: boolean | null;
  features: string[]; action: AssistantContentAction | null }[] };
type BusinessInfoContent = { type: 'business_info'; data: { name: string | null; address: string | null; phone: string | null; email: string | null;
  openingHours: string | null; facilities: { name: string; description: string | null }[]; registrationSteps: string[]; contactPath: string | null } };
type StructuredContent = MembershipPlanContent | BusinessInfoContent;
type ChatMessage = { role: 'user' | 'assistant'; content: string; structuredContent?: StructuredContent | null; actions?: AssistantContentAction[] };
type AssistantViewportStyle = React.CSSProperties & { '--sarex-ai-viewport-height'?: string; '--sarex-ai-nav-clearance'?: string };
export const AssistantBrandMark: React.FC<{ variant: 'header' | 'avatar' }> = ({ variant }) => variant === 'header'
  ? <span className="flex h-10 w-[72px] shrink-0 items-center justify-center rounded-xl bg-[#17191f] px-2 shadow-sm">
    <img src="/assets/brand/sarex-logo.png" alt="SAREX Fitness Clinic" className="h-auto max-h-7 w-full object-contain" />
  </span>
  : <span className="relative mt-1 flex h-7 w-7 shrink-0 items-center overflow-hidden rounded-full bg-[#17191f]" aria-hidden="true">
    <img src="/assets/brand/sarex-logo.png" alt="" className="absolute left-0 top-1/2 max-w-none -translate-y-1/2 object-contain" style={{ width: 76, height: 24 }} />
  </span>;

export const AssistantWidget: React.FC = () => {
  const { authenticatedRole, currentPath, navigate } = useGym();
  const experience = getAssistantExperience(authenticatedRole, currentPath);
  const suggestions = experience.suggestions;
  const isMemberPortal = authenticatedRole === 'member' && /^\/member(?:\/|$)/.test(currentPath);
  const [open, setOpen] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ role: 'assistant', content: experience.greeting }]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [mobileViewport, setMobileViewport] = useState<{ height: number; bottomInset: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: experience.greeting }]);
    setDraft('');
    setNotice('');
  }, [experience.greeting]);

  useEffect(() => {
    if (!open) return;
    const messageArea = messagesRef.current;
    if (messageArea) messageArea.scrollTo({ top: messageArea.scrollHeight, behavior: 'smooth' });
  }, [messages, notice, open, sending]);

  useEffect(() => {
    const syncSuppression = () => {
      const pathHidden = isAssistantHiddenPath(window.location.pathname) || /^\/(?:login|register|forgot-password|reset-password|change-password)(?:\/|$)/i.test(window.location.pathname);
      const otherModal = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"], [data-assistant-suppress="true"]'))
        .some(element => !element.closest('.sarex-ai-panel'));
      setSuppressed(pathHidden || otherModal);
      if (pathHidden || otherModal) setOpen(false);
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,select,[contenteditable="true"]') && !target.closest('.sarex-ai-panel')) setOpen(false);
    };
    syncSuppression();
    const observer = new MutationObserver(syncSuppression);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-modal', 'data-assistant-suppress'] });
    window.addEventListener('focusin', onFocus);
    window.addEventListener('popstate', syncSuppression);
    return () => { observer.disconnect(); window.removeEventListener('focusin', onFocus); window.removeEventListener('popstate', syncSuppression); };
  }, [currentPath]);

  useEffect(() => {
    if (!open) return;
    const isMobileViewport = window.matchMedia('(max-width: 639px), (pointer: coarse)').matches;
    if (shouldAutoFocusAssistantInput(true, isMobileViewport)) inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); launcherRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey as unknown as EventListener);
    return () => window.removeEventListener('keydown', onKey as unknown as EventListener);
  }, [open]);

  useEffect(() => {
    if (!open) { setMobileViewport(null); return; }
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;
    const updateViewport = () => {
      if (window.matchMedia('(min-width: 640px)').matches) { setMobileViewport(null); return; }
      setMobileViewport({
        height: visualViewport.height,
        bottomInset: Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop),
      });
    };
    updateViewport();
    visualViewport.addEventListener('resize', updateViewport);
    visualViewport.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      visualViewport.removeEventListener('resize', updateViewport);
      visualViewport.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [open]);

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message || sending || message.length > 2000) return;
    setNotice(''); setDraft(''); setSending(true);
    const prior = messages.slice(-8);
    setMessages(value => [...value, { role: 'user', content: message }]);
    try {
      const response = await fetch(apiUrl('/api/v1/assistant/chat'), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: prior.map(({ role: messageRole, content }) => ({ role: messageRole, content })),
          pageContext: window.location.pathname, surface: experience.surface })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'SAREX AI is temporarily unavailable. Please try again.');
      const assistantMessage: ChatMessage = { role: 'assistant', content: String(body.message || 'I could not prepare a response. Please try again.'),
        structuredContent: parseAssistantStructuredContent(body.content) as StructuredContent | null,
        actions: Array.isArray(body.actions) ? body.actions.filter((action: any) => action?.type === 'navigate' && isAssistantActionPathAllowed(action.path) && typeof action.label === 'string').slice(0, 2) : [] };
      setMessages(value => [...value, assistantMessage]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'SAREX AI is temporarily unavailable. Please try again.');
    } finally {
      setSending(false);
      const isMobileViewport = window.matchMedia('(max-width: 639px), (pointer: coarse)').matches;
      if (shouldAutoFocusAssistantInput(open, isMobileViewport)) inputRef.current?.focus();
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(draft); };
  const inputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(draft); }
  };
  if (suppressed || !experience.available) return null;

  return <div className="sarex-ai-widget fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6" data-member-portal={isMemberPortal ? 'true' : undefined} style={{ ...(mobileViewport ? { bottom: getAssistantWidgetBottom(isMemberPortal, mobileViewport.bottomInset), '--sarex-ai-viewport-height': `${mobileViewport.height}px` } : { '--sarex-ai-viewport-height': '100dvh' }), '--sarex-ai-nav-clearance': isMemberPortal && (!mobileViewport || mobileViewport.bottomInset < 80) ? 'var(--member-mobile-nav-clearance, 3.5rem)' : '0px' } as AssistantViewportStyle}>
    {open && <div id="sarex-ai-panel" ref={panelRef} className="sarex-ai-panel flex h-[min(78dvh,760px)] w-[calc(100vw-1.5rem)] shrink-0 flex-col overflow-hidden rounded-3xl border border-[#e6e7eb] bg-white shadow-[0_24px_80px_rgba(12,18,28,0.2)] sm:h-[min(75vh,760px)] sm:w-[420px]" role="dialog" aria-modal="false" aria-labelledby="sarex-ai-title">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-4">
        <AssistantBrandMark variant="header" />
        <div className="min-w-0 flex-1"><h2 id="sarex-ai-title" className="font-bold text-[#17191f]">SAREX AI</h2><p className="text-xs text-gray-500">Fitness and membership assistant</p></div>
        <button type="button" onClick={() => { setOpen(false); launcherRef.current?.focus(); }} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ef1b23]" aria-label="Close SAREX AI"><X size={19} /></button>
      </header>
      <div ref={messagesRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#fafafa] px-4 py-4" aria-live="polite" aria-relevant="additions text" aria-label="Conversation">
        {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.role === 'assistant' && <AssistantBrandMark variant="avatar" />}
          <div className={`${message.role === 'assistant' && message.structuredContent ? 'min-w-0 flex-1' : 'max-w-[88%]'} rounded-2xl px-3.5 py-3 text-sm leading-6 ${message.role === 'user' ? 'whitespace-pre-wrap rounded-br-md bg-[#17191f] text-white' : 'min-w-0 rounded-bl-md border border-gray-100 bg-white text-gray-700 shadow-sm'}`}>
            {message.role === 'user' ? message.content : <>
              <div className="sarex-ai-markdown break-words">
              <ReactMarkdown remarkPlugins={[remarkLineBreaks]} components={{
                a: ({ href, children }) => <AssistantMarkdownLink href={href}>{children}</AssistantMarkdownLink>,
                h1: ({ children }) => <h3 className="mb-1 mt-3 text-base font-extrabold text-[#17191f] first:mt-0">{children}</h3>,
                h2: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-extrabold text-[#17191f] first:mt-0">{children}</h3>,
                h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-bold text-[#17191f] first:mt-0">{children}</h3>,
                p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-[#ef1b23]">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-[#ef1b23]">{children}</ol>,
                li: ({ children }) => <li className="pl-0.5">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-[#17191f]">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                br: () => <br />,
              }}>{normalizeAssistantMarkdown(message.content)}</ReactMarkdown>
              </div>
              {message.structuredContent ? <AssistantStructuredContent content={message.structuredContent} onNavigate={path => { setOpen(false); navigate(path); }} /> : null}
            </>}
            {message.actions?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.actions.map(action => <button key={action.path} type="button" onClick={() => { setOpen(false); navigate(action.path); }} className="rounded-xl border border-[#ef1b23]/20 bg-[#fff5f5] px-3 py-2 text-xs font-bold text-[#d6161e] hover:bg-[#ffeded] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ef1b23]">{action.label}</button>)}</div> : null}
          </div>
        </div>)}
        {messages.length === 1 && suggestions.length > 0 && <div className="ml-9"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Try asking</div><div className="flex flex-wrap gap-2">{suggestions.map(prompt => <button key={prompt} type="button" disabled={sending} onClick={() => void ask(prompt)} className="min-h-9 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#ef1b23]/40 hover:text-[#d6161e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ef1b23] disabled:opacity-50">{prompt}</button>)}</div></div>}
        {sending && <div className="flex items-center gap-2 pl-9 text-sm text-gray-500" role="status"><LoaderCircle size={16} className="animate-spin text-[#ef1b23]" />SAREX AI is thinking…</div>}
        {notice && <p role="alert" className="ml-9 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{notice}</p>}
      </div>
      <form onSubmit={submit} className="shrink-0 border-t border-gray-100 bg-white p-3">
        <label htmlFor="sarex-ai-input" className="sr-only">Ask SAREX AI</label>
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 focus-within:border-[#ef1b23]/60 focus-within:ring-2 focus-within:ring-[#ef1b23]/10">
          <textarea ref={inputRef} id="sarex-ai-input" rows={1} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={inputKeyDown} placeholder="Ask about training, plans…" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#17191f] outline-none placeholder:text-gray-400" aria-describedby="sarex-ai-disclaimer" />
          <button type="submit" disabled={sending || !draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ef1b23] text-white hover:bg-[#d6161e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef1b23] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Send message">{sending ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowUp size={19} />}</button>
        </div>
        <p id="sarex-ai-disclaimer" className="mt-2 text-center text-[10px] leading-4 text-gray-400">General fitness guidance only. Not medical advice.</p>
      </form>
    </div>}
    <button ref={launcherRef} type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="sarex-ai-panel" aria-label={open ? 'Close SAREX AI assistant' : 'Ask SAREX AI'} className="group flex min-h-12 items-center gap-2 rounded-full bg-[#17191f] px-4 text-sm font-bold text-white shadow-[0_12px_35px_rgba(0,0,0,0.24)] transition hover:bg-[#262832] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef1b23]">
      {open ? <X size={18} /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ef1b23]"><Dumbbell size={15} /></span>}<span>{open ? 'Close' : 'Ask SAREX'}</span><MessageCircle size={16} className="opacity-75" aria-hidden="true" />
    </button>
  </div>;
};

export default AssistantWidget;
