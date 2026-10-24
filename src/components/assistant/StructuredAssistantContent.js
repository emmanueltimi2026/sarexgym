import React from 'react';
import { ArrowRight, Check, CircleHelp, X } from 'lucide-react';
import { isAssistantActionPathAllowed } from '../../lib/assistantUi.js';

const h = React.createElement;

const finiteNonNegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const optionalText = (value, max = 120) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

export function parseAssistantStructuredContent(value) {
  if (!value || typeof value !== 'object' || value.type !== 'membership_plans' || !Array.isArray(value.plans)) return null;
  return {
    type: 'membership_plans',
    plans: value.plans.slice(0, 8).filter(plan => plan && typeof plan === 'object').map(plan => {
      const action = plan.action && plan.action.type === 'navigate' && isAssistantActionPathAllowed(plan.action.path)
        ? { label: optionalText(plan.action.label, 40) || 'View plans', type: 'navigate', path: plan.action.path }
        : null;
      return {
        id: optionalText(plan.id, 80),
        name: optionalText(plan.name, 80) || 'Membership plan',
        description: optionalText(plan.description, 180),
        price: finiteNonNegative(plan.price),
        currency: typeof plan.currency === 'string' && /^[A-Z]{3}$/.test(plan.currency) ? plan.currency : 'NGN',
        duration: optionalText(plan.duration, 40),
        registrationFee: finiteNonNegative(plan.registrationFee),
        trainerAccess: typeof plan.trainerAccess === 'boolean' ? plan.trainerAccess : null,
        workoutPlan: typeof plan.workoutPlan === 'boolean' ? plan.workoutPlan :
          typeof plan.workoutPlanAccess === 'boolean' ? plan.workoutPlanAccess : null,
        features: Array.isArray(plan.features) ? plan.features.filter(feature => typeof feature === 'string' && feature.trim())
          .slice(0, 8).map(feature => feature.trim().slice(0, 120)) : [],
        action,
      };
    }),
  };
}

const formatMoney = (amount, currency) => {
  if (amount === null) return 'Price unavailable';
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); }
  catch { return `${currency} ${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(amount)}`; }
};

const Capability = ({ label, value }) => {
  const Icon = value === true ? Check : value === false ? X : CircleHelp;
  const state = value === true ? 'Included' : value === false ? 'Not included' : 'Not listed';
  const color = value === true ? 'text-emerald-700' : value === false ? 'text-gray-500' : 'text-amber-700';
  return h('div', { className: 'flex min-w-0 items-center gap-1.5 text-xs text-gray-700' },
    h(Icon, { size: 14, 'aria-hidden': true, className: `shrink-0 ${color}` }),
    h('span', { className: 'min-w-0 break-words' }, `${label}: ${state}`));
};

const MembershipPlanCard = ({ plan, onNavigate }) => h('article', {
  className: 'w-full min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-3.5',
  'data-membership-plan-card': true,
},
h('div', { className: 'flex min-w-0 items-start justify-between gap-2' },
  h('div', { className: 'min-w-0' },
    h('h3', { className: 'break-words text-sm font-extrabold leading-5 text-[#17191f]' }, plan.name),
    plan.description ? h('p', { className: 'mt-0.5 break-words text-xs leading-4 text-gray-500' }, plan.description) : null),
  h('span', { className: 'shrink-0 rounded-full bg-[#fff1f1] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c9141c]' }, 'SAREX')),
h('div', { className: 'mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5' },
  h('span', { className: 'text-lg font-extrabold leading-6 text-[#17191f]' }, formatMoney(plan.price, plan.currency)),
  plan.duration ? h('span', { className: 'text-xs text-gray-500' }, `/ ${plan.duration}`) : null),
plan.registrationFee > 0 ? h('p', { className: 'mt-0.5 text-[11px] text-gray-500' }, `One-time registration: ${formatMoney(plan.registrationFee, plan.currency)}`) : null,
h('div', { className: 'mt-2 grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2' },
  h(Capability, { label: 'Trainer access', value: plan.trainerAccess }),
  h(Capability, { label: 'Workout plan', value: plan.workoutPlan })),
plan.features.length ? h('ul', { className: 'mt-2 space-y-1 border-t border-gray-100 pt-2', 'aria-label': `${plan.name} features` },
  ...plan.features.map((feature, index) => h('li', { key: `${plan.id || plan.name}-feature-${index}`, className: 'flex min-w-0 items-start gap-1.5 text-xs leading-4 text-gray-700' },
    h(Check, { size: 14, 'aria-hidden': true, className: 'mt-0.5 shrink-0 text-emerald-700' }),
    h('span', { className: 'min-w-0 break-words' }, feature)))) :
  h('p', { className: 'mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500' }, 'No additional features listed.'),
plan.action ? h('button', { type: 'button', onClick: () => onNavigate?.(plan.action.path),
  className: 'mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#17191f] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#2a2c33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef1b23]',
  'aria-label': `${plan.action.label}: ${plan.name}` }, plan.action.label, h(ArrowRight, { size: 14, 'aria-hidden': true })) : null);

const MembershipPlansContent = ({ content, onNavigate }) => content.plans.length
  ? h('div', { className: 'mt-2 w-full min-w-0 space-y-2', 'data-structured-content': 'membership_plans' },
    ...content.plans.map((plan, index) => h(MembershipPlanCard, { key: plan.id || `${plan.name}-${index}`, plan, onNavigate })))
  : h('div', { className: 'mt-2 w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-600', 'data-structured-content': 'membership_plans' },
    'There are no active membership plans to display right now.');

const structuredRenderers = Object.freeze({ membership_plans: MembershipPlansContent });

export function AssistantStructuredContent({ content, onNavigate }) {
  const Renderer = content && structuredRenderers[content.type];
  return Renderer ? h(Renderer, { content, onNavigate }) : null;
}
