import React from 'react';
import { Header } from './components/navigation/Header';
import { Navigation } from './components/navigation/Navigation';
import { Footer } from './components/navigation/Footer';
import { LibraryTab } from './components/library/LibraryTab';
import { OptimizeTab } from './components/optimize/OptimizeTab';
import { AppProvider, useAppContext } from './hooks/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ErrorMessage } from './components/common/ErrorMessage';

// 内部App组件，使用Context
function AppContent() {
  const { state, setActiveTab, incrementMagicianLevel, setError } = useAppContext();
  
  return (
    <div className="w-[400px] h-screen bg-gradient-to-br from-magic-900 via-magic-800 to-magic-900 flex flex-col">
      {/* Header */}
      <Header magicianLevel={state.magicianLevel} />

      {/* Navigation */}
      <Navigation activeTab={state.activeTab} onTabChange={setActiveTab} />

      {/* 错误提示 */}
      {state.error && (
        <div className="px-4 pt-2">
          <ErrorMessage 
            message={state.error} 
            onClose={() => setError(null)} 
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-magic-600 scrollbar-track-magic-900">
        <ErrorBoundary>
          {state.activeTab === 'library' ? (
            <LibraryTab />
          ) : (
            <OptimizeTab onLevelUp={incrementMagicianLevel} />
          )}
        </ErrorBoundary>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

// 主App组件，提供Context
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
