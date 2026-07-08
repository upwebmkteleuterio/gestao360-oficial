import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Plus, Menu } from 'lucide-react';

// Persisted store & services
import { useUIStore } from './store/uiStore';
import { initializeDatabase } from './services/db';

// Custom layout components
import Sidebar from './components/Sidebar';
import NovoLancamentoDrawer from './components/NovoLancamentoDrawer';

// Custom pages
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
      staleTime: 5 * 60 * 1050
    }
  }
});

export default function App() {
  const { setModalOpen } = useUIStore();
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Run Local Database Seeding on entry
  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
              </div>
            </header>

            {/* Core Page layout content container */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
              <div className="max-w-7xl mx-auto space-y-6">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/lancamentos" element={<Lancamentos />} />
                  <Route path="/conciliacao" element={<Conciliacao />} />
                  <Route path="/cadastros" element={<Cadastros />} />
                  <Route path="/relatorios" element={<Relatorios />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                </Routes>
              </div>
            </main>
          </div>

          {/* Global Drawers & Slide Panels */}
          <NovoLancamentoDrawer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
export { queryClient };
