import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Plus, Menu, LogOut } from 'lucide-react';

// Persisted store & services
import { useUIStore } from './store/uiStore';
import { initializeDatabase } from './services/db';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Custom layout components
import Sidebar from './components/Sidebar';
import NovoLancamentoDrawer from './components/NovoLancamentoDrawer';

// Custom pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Lancamentos from './pages/Lancamentos';
import Conciliacao from './pages/Conciliacao';
import Cadastros from './pages/Cadastros';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

// Create a client for React Query caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1050,
      retry: (failureCount, error: any) => {
        // Retry for 9 seconds total
        if (failureCount >= 2) return false;
        return true;
      },
      retryDelay: 4500, // 4.5s delay between retries = ~9s total
    }
  }
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { setModalOpen } = useUIStore();
  const { signOut } = useAuth();
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Run Local Database Seeding on entry
  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-on-background relative">
      {/* Nav rails */}
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      {/* Content body space */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Bar with actions */}
        <header className="h-16 bg-surface border-b border-surface-border flex items-center justify-between px-4 md:px-6 shrink-0 print:hidden select-none">
          <div className="flex items-center gap-3">
            {/* Menu Toggle for mobile/tablet */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-secondary lg:hidden block"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="font-bold text-xs text-on-surface-variant flex items-center gap-1.5 bg-transparent">
              <span>Sede Financeira</span>
              <span className="w-1.5 h-1.5 bg-bank-truth-green rounded-full"></span>
              <span className="hidden sm:inline">Integrado</span>
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen('isNovoLancamentoOpen', true)}
              className="px-4 py-2 bg-on-background text-surface-container-lowest font-extrabold hover:bg-secondary text-xs rounded transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Novo Lançamento
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="p-2 text-secondary hover:text-alert-red transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Core Page layout content container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Navigate to="/dashboard" replace /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/lancamentos" element={<PrivateRoute><Lancamentos /></PrivateRoute>} />
              <Route path="/conciliacao" element={<PrivateRoute><Conciliacao /></PrivateRoute>} />
              <Route path="/cadastros" element={<PrivateRoute><Cadastros /></PrivateRoute>} />
              <Route path="/relatorios" element={<PrivateRoute><Relatorios /></PrivateRoute>} />
              <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Global Drawers & Slide Panels */}
      <NovoLancamentoDrawer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
