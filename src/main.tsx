/**
 * Vite + Tauri entry point
 *
 * Replaces Next.js's layout.tsx + page.tsx server rendering
 * with a standard React SPA bootstrap.
 *
 * The existing component tree is preserved exactly —
 * only the Next.js-specific wrappers (html/body, fonts, metadata) are replaced.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Global styles (same import as Next.js layout.tsx)
import './app/globals.css';

// App shell components (from layout.tsx)
import BackgroundPattern from './components/ui/background/BackgroundPattern';
import QueryProvider from './components/QueryProvider';
import { ModalProvider } from './contexts/ModalContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import TopBar from './components/Navigation/TopBar';
import PageTransition from './components/Navigation/PageTransition';
import ControlPanelProvider from './app/features/Onboarding/ControlPanelProvider';
import DeferredWidgets from './components/lazy/DeferredWidgets';
import { ToastContainer } from './components/ui/Toast';
import UnifiedWorkflowProvider from './components/UnifiedWorkflow/UnifiedWorkflowProvider';

// Page content (from page.tsx)
import Home from './app/page';

function App() {
  return (
    <div className="antialiased">
      <BackgroundPattern />
      <QueryProvider>
        <ErrorProvider>
          <ErrorBoundary>
            <ModalProvider>
              <ControlPanelProvider>
                <UnifiedWorkflowProvider>
                  <TopBar />
                  <PageTransition>
                    <Home />
                  </PageTransition>
                  <DeferredWidgets />
                  <ToastContainer position="top-right" />
                </UnifiedWorkflowProvider>
              </ControlPanelProvider>
            </ModalProvider>
          </ErrorBoundary>
        </ErrorProvider>
      </QueryProvider>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
