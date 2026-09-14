import React from 'react';
import type{LucideIcon}from'lucide-react';

interface StatCardProps{title?:string;label?:string;value:string|number;subtitle?:string;subtext?:string;icon?:LucideIcon;badge?:{text:string;type?:'positive'|'warning'|'neutral'|'danger'};trend?:{value:string;isPositive?:boolean};valueColor?:string;onClick?:()=>void}

export const StatCard:React.FC<StatCardProps>=({title,label,value,subtitle,subtext,icon:Icon,badge,trend,valueColor,onClick})=>{
 const heading=label||title||'',support=subtext||subtitle||'';
 const lower=heading.toLowerCase();
 const tone=lower.includes('active')?'green':lower.includes('expir')||lower.includes('warn')?'amber':'red';
 const orb=tone==='green'?'bg-emerald-50 text-emerald-700':tone==='amber'?'bg-amber-50 text-amber-600':'bg-red-50 text-[#EF1B23]';
 const valueText=String(value);
 const valueSize=valueText.length>11?'text-[17px]':valueText.length>7?'text-[21px]':'text-[26px]';
 return <div onClick={onClick} className={`saas-stat-card group flex min-w-0 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 sm:gap-3.5 sm:px-4 ${onClick?'cursor-pointer':''}`}>
  {Icon&&<div className={`stat-icon-orb grid h-10 w-10 shrink-0 place-items-center rounded-full ${orb}`}><Icon className="h-[18px] w-[18px]"/></div>}
  <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-extrabold uppercase tracking-[.06em] text-[#687386]">{heading}</p><p title={valueText} className={`mt-0.5 max-w-full whitespace-nowrap font-black leading-none tracking-[-.045em] ${valueSize} ${valueColor||'text-[#111]'}`}>{value}</p>{(support||trend||badge)&&<div className="mt-1.5 truncate text-[9px] font-medium text-[#788397]">{trend?<span className={trend.isPositive?'text-emerald-600':'text-amber-600'}>{trend.value}</span>:badge?<span>{badge.text}</span>:support}</div>}</div>
 </div>;
};
