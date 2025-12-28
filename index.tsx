import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center font-sans">
          <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl max-w-lg w-full">
              <h1 className="text-2xl font-bold text-red-500 mb-2">Something went wrong</h1>
              <p className="mb-4 text-gray-300 text-sm">The application encountered a critical error and could not load.</p>
              
              <div className="bg-black/50 p-4 rounded-lg text-left overflow-auto max-h-48 mb-6 border border-gray-800">
                <code className="text-xs font-mono text-red-300 break-all whitespace-pre-wrap">
                    {this.state.error?.toString() || "Unknown Error"}
                </code>
              </div>

              <button 
                onClick={() => {
                    localStorage.clear(); 
                    window.location.reload();
                }}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-red-900/20"
              >
                Clear Data & Reload
              </button>
              <p className="mt-4 text-xs text-gray-500">
                If this persists, please check the console logs.
              </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);