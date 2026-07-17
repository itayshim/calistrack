import { Component, type ReactNode } from 'react';
import { translations } from '../locales/translations';
import { useAppStore } from '../store/useAppStore';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    const language = useAppStore.getState().settings.language;
    const copy = translations[language];
    return this.state.failed ? (
      <main dir={language === 'he' ? 'rtl' : 'ltr'} className="grid min-h-screen place-items-center bg-ink p-6 text-white">
        <div className="card max-w-md text-center">
          <h1 className="text-2xl font-black">{copy.errorTitle}</h1>
          <p className="my-3">{copy.errorDescription}</p>
          <button className="btn-primary" onClick={() => location.reload()}>
            {copy.refresh}
          </button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}
