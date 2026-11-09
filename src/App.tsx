import React, { Suspense, lazy, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HeroSearch } from './components/home/HeroSearch';
import { FeaturedProperties } from './components/home/FeaturedProperties';
import { useApp } from './context/AppContext';
import { QrCheckoutConfirmation } from './components/plans/QrCheckoutConfirmation';
import { SectionErrorBoundary } from './components/common/AppErrorBoundary';

/**
 * Los módulos que no están en pantalla se cargan bajo demanda.
 * Esto reduce el JavaScript inicial y evita cargar mapas/paneles antes de usarlos.
 */
const PropertyList = lazy(() => import('./components/properties/PropertyList').then(mod => ({ default: mod.PropertyList })));
const PropertyDetail = lazy(() => import('./components/properties/PropertyDetail').then(mod => ({ default: mod.PropertyDetail })));
const PropertyCompareModal = lazy(() => import('./components/properties/PropertyCompareModal').then(mod => ({ default: mod.PropertyCompareModal })));
const PublishModal = lazy(() => import('./components/properties/PublishModal').then(mod => ({ default: mod.PublishModal })));
const AuthModal = lazy(() => import('./components/auth/AuthModal').then(mod => ({ default: mod.AuthModal })));
const PlansPage = lazy(() => import('./components/plans/PlansPage').then(mod => ({ default: mod.PlansPage })));
const PublicationPolicyPage = lazy(() => import('./components/policy/PublicationPolicy').then(mod => ({ default: mod.PublicationPolicyPage })));
const OwnerDashboard = lazy(() => import('./components/owner/OwnerDashboard').then(mod => ({ default: mod.OwnerDashboard })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(mod => ({ default: mod.AdminPanel })));
const ProfileView = lazy(() => import('./components/profile/ProfileView').then(mod => ({ default: mod.ProfileView })));

const LoadingSection = () => (
  <div role="status" className="mx-auto flex min-h-[300px] max-w-6xl items-center justify-center px-6 text-sm font-semibold text-slate-500">
    Cargando contenido…
  </div>
);

export const App: React.FC = () => {
  // Un QR escaneado abre esta pantalla independiente, incluso sin sesión.
  const checkoutToken = new URLSearchParams(window.location.search).get('confirmarPago');
  const {
    currentView, setCurrentView, currentUser, userRole,
    isAuthModalOpen, isPublishModalOpen, isCompareOpen,
    setIsAuthModalOpen, setIsPublishModalOpen,
  } = useApp();

  useEffect(() => {
    // Mantener los accesos existentes sin exponer secciones privadas a visitantes.
    const privateViews = ['landlord-rentals', 'profile', 'admin'];
    if (
      privateViews.includes(currentView) &&
      (!currentUser || (currentView === 'admin' && userRole !== 'admin') ||
        (currentView === 'landlord-rentals' && !['landlord', 'admin'].includes(userRole)))
    ) {
      setCurrentView('home');
    }
    if (
      ['tenant-payments', 'agency', 'notifications', 'location-reviews', 'schedule-visits', 'advertiser-settings', 'review-payments', 'favorites'].includes(currentView)
    ) {
      setCurrentView('home');
    }
  }, [currentView, currentUser, userRole, setCurrentView]);

  // Si ya existe una sesión, el enlace QR debe pertenecer a esa misma cuenta.
  // Un móvil sin sesión puede confirmar el token recibido al escanear.
  if (checkoutToken) return <QrCheckoutConfirmation token={checkoutToken} ownerId={currentUser?.id} />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <div className="flex-1">
        {currentView === 'home' && (
          <main className="pb-14"><HeroSearch /><FeaturedProperties /></main>
        )}
        <SectionErrorBoundary key={currentView} label="esta sección" onRecover={() => setCurrentView('home')}>
        <Suspense fallback={<LoadingSection />}>
          {currentView === 'search' && <PropertyList />}
          {currentView === 'detail' && <PropertyDetail />}
          {currentView === 'plans' && <PlansPage />}
          {currentView === 'policy' && <PublicationPolicyPage />}
          {currentView === 'landlord-rentals' && <OwnerDashboard />}
          {currentView === 'admin' && <AdminPanel />}
          {currentView === 'profile' && <ProfileView />}
        </Suspense>
        </SectionErrorBoundary>
      </div>
      <Footer />
      <Suspense fallback={null}>
        {isCompareOpen && <SectionErrorBoundary label="el comparador" onRecover={() => setCurrentView('search')}><PropertyCompareModal /></SectionErrorBoundary>}
        {isPublishModalOpen && <SectionErrorBoundary label="Publicar inmueble" onRecover={() => setIsPublishModalOpen(false)}><PublishModal /></SectionErrorBoundary>}
        {isAuthModalOpen && <SectionErrorBoundary label="el acceso a la cuenta" onRecover={() => setIsAuthModalOpen(false)}><AuthModal /></SectionErrorBoundary>}
      </Suspense>
    </div>
  );
};
