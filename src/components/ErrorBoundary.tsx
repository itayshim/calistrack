import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? (
      <main dir="ltr" className="grid min-h-screen place-items-center bg-ink p-6 text-white">
        <div className="card max-w-md text-center">
          <h1 className="text-2xl font-black">Something went wrong</h1>
          <p className="my-3">Your data is still saved. Refresh the page and try again.</p>
          <button className="btn-primary" onClick={() => location.reload()}>
            Refresh
          </button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}
