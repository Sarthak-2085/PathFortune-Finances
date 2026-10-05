import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ChatDrawer } from './components/ai/ChatDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import { Overview } from './pages/Overview';
import { Transactions } from './pages/Transactions';
import { Revenue } from './pages/Revenue';
import { Expenses } from './pages/Expenses';
import { Budgets } from './pages/Budgets';
import { Forecasting } from './pages/Forecasting';
import { FinancialHealth } from './pages/FinancialHealth';
import { AIInsights } from './pages/AIInsights';
import { ScenarioSimulator } from './pages/ScenarioSimulator';
import { Reports } from './pages/Reports';
import { DataImport } from './pages/DataImport';
import { Settings } from './pages/Settings';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview key={refreshKey} onNavigateTab={setActiveTab} />;
      case 'transactions':
        return <Transactions key={refreshKey} />;
      case 'revenue':
        return <Revenue key={refreshKey} />;
      case 'expenses':
        return <Expenses key={refreshKey} />;
      case 'budgets':
        return <Budgets key={refreshKey} />;
      case 'forecasting':
        return <Forecasting key={refreshKey} />;
      case 'health':
        return <FinancialHealth key={refreshKey} />;
      case 'insights':
        return <AIInsights key={refreshKey} />;
      case 'simulator':
        return <ScenarioSimulator key={refreshKey} />;
      case 'reports':
        return <Reports key={refreshKey} />;
      case 'import':
        return <DataImport key={refreshKey} />;
      case 'settings':
        return <Settings key={refreshKey} />;
      default:
        return <Overview key={refreshKey} onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-900 antialiased selection:bg-brand-100 selection:text-brand-900">
      {/* Collapsible Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <Header 
          activeTab={activeTab} 
          onOpenAIChat={() => setAiChatOpen(true)}
          onNavigateImport={() => setActiveTab('import')}
          onRefresh={() => setRefreshKey(k => k + 1)}
        />

        {/* Page View Container */}
        <main className="flex-1">
          {/* key=activeTab so navigating to a different page resets the
              boundary - one page crashing shouldn't block every other page. */}
          <ErrorBoundary key={activeTab}>
            {renderActivePage()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Ask PathFortune AI Side Drawer */}
      <ChatDrawer 
        isOpen={aiChatOpen} 
        onClose={() => setAiChatOpen(false)} 
      />
    </div>
  );
}

export default App;
