import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { useStore } from './lib/store';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Last-resort boundary for crashes in the app shell (sidebar/toolbar). */}
    <ErrorBoundary label="the app" onReset={() => useStore.getState().resetToSeed()}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
