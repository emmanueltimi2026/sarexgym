import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  resetKey?: string;
  key?: React.Key;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public declare state: State;
  public declare props: Props;
  public declare setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public componentDidUpdate(previousProps: Props) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleReturnHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 text-[#EF1B23] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-athletic font-bold uppercase text-lg text-[#111111] mb-2">
              {this.props.fallbackTitle || 'Display Error Encountered'}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {this.state.error?.message || 'An unexpected rendering issue occurred in this section.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry View
              </button>
              <button
                onClick={this.handleReturnHome}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

