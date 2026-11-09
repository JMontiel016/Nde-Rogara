import React, { useEffect, useState } from 'react';
import { ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { blockDestination, readSiteContent, SITE_CONTENT_EVENT, SITE_SECTIONS, type SiteBlock, type SiteSection } from '../../services/siteContent';

/** El pie público es de solo lectura; el editor se encuentra en Administración. */
export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();
  const [blocks, setBlocks] = useState<SiteBlock[]>(() => readSiteContent().blocks);
  useEffect(() => {
    const reload = () => setBlocks(readSiteContent().blocks);
    window.addEventListener(SITE_CONTENT_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => { window.removeEventListener(SITE_CONTENT_EVENT, reload); window.removeEventListener('storage', reload); };
  }, []);
  const navigate = (hash: string) => {
    const dest = hash.slice(1);
    if (['home', 'search', 'plans', 'policy'].includes(dest)) {
      setCurrentView(dest as 'home' | 'search' | 'plans' | 'policy');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const renderBlock = (block: SiteBlock) => {
    const url = blockDestination(block);
    if (block.kind === 'text') return <div key={block.id} className="space-y-1"><strong className="block text-sm font-bold text-white">{block.title}</strong><p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">{block.value}</p></div>;
    if (block.kind === 'image') return url ? <div key={block.id}><img src={url} alt={block.title} loading="lazy" className="max-h-24 max-w-48 rounded-xl object-contain" /></div> : null;
    if (!url) return null;
    const Icon = block.kind === 'whatsapp' ? MessageCircle : block.kind === 'phone' ? Phone : block.kind === 'email' ? Mail : ExternalLink;
    if (url.startsWith('#')) return <button key={block.id} type="button" onClick={() => navigate(url)} className="inline-flex items-center gap-2 text-left text-sm text-slate-300 hover:text-white"><Icon size={15}/>{block.title}</button>;
    return <a key={block.id} href={url} target={block.kind === 'phone' || block.kind === 'email' ? undefined : '_blank'} rel="noopener noreferrer" className="inline-flex items-center gap-2 break-words text-sm text-slate-300 hover:text-white"><Icon size={15}/>{block.title}</a>;
  };
  const sections: SiteSection[] = ['identity', 'navigation', 'support'];
  return <footer className="mt-auto bg-slate-950 text-slate-300"><div className="mx-auto grid max-w-7xl gap-9 px-5 py-12 sm:grid-cols-3 sm:px-7">{sections.map(section => <section key={section} className="space-y-3"><h2 className="text-xs font-bold uppercase tracking-[.16em] text-sky-300">{SITE_SECTIONS[section]}</h2><div className="flex flex-col items-start gap-3">{blocks.filter(block => block.section === section).map(renderBlock)}</div></section>)}</div><div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Nde Rogarã · Paraguay</div></footer>;
};
