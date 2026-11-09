import React, { useEffect, useState } from 'react';
import { Home, Search, Menu, X, UserRound, LogIn, Plus, LogOut, LayoutDashboard, Tags, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AppView } from '../../context/AppContext';
import { applyTheme, readTheme, type ThemeChoice } from '../../services/theme';

const ThemeToggle: React.FC = () => {
  const [mode, setMode] = useState<ThemeChoice>(readTheme);
  useEffect(() => {
    // Actualizar desde otras pestañas sin reiniciar la sesión.
    const update = () => setMode(readTheme());
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  return <button type="button" onClick={() => { const next = mode === 'light' ? 'dark' : 'light'; applyTheme(next); setMode(next); }}
    title={mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
    aria-label={mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
    className="theme-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100">
    {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
  </button>;
};

export const Navbar: React.FC = () => {
  const { currentView, setCurrentView, currentUser, userRole, logoutUser, setIsAuthModalOpen, setAuthModalMode, setIsPublishModalOpen, properties } = useApp();
  const adminAlerts = properties.filter(p => p.moderationStatus === 'flagged').length;
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (page: AppView) => { setCurrentView(page); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const publish = () => {
    setMenuOpen(false);
    if (!currentUser) { setAuthModalMode('register'); setIsAuthModalOpen(true); return; }
    if (userRole === 'landlord' || userRole === 'admin') setIsPublishModalOpen(true);
  };
  const nav = (page: AppView, text: string, Icon: React.ElementType) => <button key={page} onClick={() => go(page)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${currentView === page ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><Icon className="w-4 h-4" />{text}</button>;
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <button className="flex items-center gap-2 font-black text-slate-900 text-xl shrink-0" onClick={() => go('home')}><span className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center"><Home className="w-5 h-5" /></span> Nde Rogarã</button>
        <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">{nav('home', 'Inicio', Home)}{nav('search', 'Buscar inmuebles', Search)}{nav('plans', 'Planes', Tags)}</nav>
        <div className="hidden md:flex gap-2 items-center">
          {currentUser && userRole === 'landlord' && nav('landlord-rentals', 'Mis avisos', LayoutDashboard)}
          {currentUser && userRole === 'admin' && <div className="flex gap-1 items-center">{nav('admin', 'Administración', ShieldCheck)}{adminAlerts > 0 && <button title="Abrir alertas de moderación" aria-label={`${adminAlerts} avisos pendientes`} onClick={() => go('admin')} className="rounded-lg px-2 py-1 bg-rose-100 text-rose-800 text-xs font-bold">{adminAlerts} alerta{adminAlerts !== 1 ? 's' : ''}</button>}</div>}
          {currentUser ? <><button onClick={() => go('profile')} title="Mi perfil" className="px-3 py-2 rounded-xl text-sm flex items-center gap-1.5 hover:bg-slate-100"><UserRound className="w-4 h-4" />{currentUser.name.split(' ')[0]}</button><button onClick={logoutUser} className="px-3 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100"><LogOut className="w-4 h-4" /></button></> : <button onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 font-bold text-sm text-slate-700"><LogIn className="w-4 h-4" /> Ingresar</button>}
          <ThemeToggle />
          <button onClick={publish} className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 flex items-center gap-1.5"><Plus className="w-4 h-4" />Publicar</button>
        </div>
        <div className="flex items-center gap-2 md:hidden"><ThemeToggle/><button onClick={() => setMenuOpen(m => !m)} className="p-2 rounded-xl border border-slate-200" aria-label="Abrir navegación">{menuOpen ? <X /> : <Menu />}</button></div>
      </div>
      {menuOpen && <nav className="md:hidden px-4 pb-5 pt-2 border-t border-slate-100 flex flex-col gap-1 bg-white" aria-label="Navegación móvil">
        {nav('home', 'Inicio', Home)}{nav('search', 'Buscar inmuebles', Search)}{nav('plans', 'Planes', Tags)}
        {currentUser && userRole === 'landlord' && nav('landlord-rentals', 'Mis avisos', LayoutDashboard)}
        {currentUser && userRole === 'admin' && <div className="flex gap-1 items-center">{nav('admin', 'Administración', ShieldCheck)}{adminAlerts > 0 && <button title="Abrir alertas de moderación" aria-label={`${adminAlerts} avisos pendientes`} onClick={() => go('admin')} className="rounded-lg px-2 py-1 bg-rose-100 text-rose-800 text-xs font-bold">{adminAlerts} alerta{adminAlerts !== 1 ? 's' : ''}</button>}</div>}
        {currentUser && nav('profile', 'Mi perfil', UserRound)}
        <button className="px-4 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm flex gap-2 items-center justify-center" onClick={publish}><Plus className="w-4 h-4" />Publicar inmueble</button>
        {currentUser ? <button onClick={() => { logoutUser(); setMenuOpen(false); }} className="py-2 text-sm font-semibold text-slate-600">Cerrar sesión</button> : <button onClick={() => { setMenuOpen(false); setAuthModalMode('login'); setIsAuthModalOpen(true); }} className="py-2 text-sm font-semibold text-slate-700">Ingresar como propietario</button>}
      </nav>}
    </header>
  );
};
