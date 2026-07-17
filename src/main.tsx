import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './app/I18nProvider';
import './index.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <I18nProvider>
          <App />
        </I18nProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
