import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LayoutDashboard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRODUCT_NAME } from '@/constants/site';
import logo from '@/assets/regal-logo.png';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;

      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen-safe flex items-center justify-center bg-gradient-to-br from-[#0a0612] via-[#160a26] to-[#1a0d2e] px-4">
          <div className="max-w-md text-center text-white">
            <img
              src={logo}
              alt=""
              className="mx-auto mb-6 h-14 w-14 drop-shadow-[0_0_24px_rgba(255,107,53,0.35)]"
            />
            <h2 className="text-2xl font-bold mb-3">Something went wrong</h2>
            <p className="text-white/55 mb-8 text-sm leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred in Regal Meeting.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.resetError}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
              <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
            </div>
            <p className="mt-8 text-xs text-white/30">{PRODUCT_NAME} by Quantum Regal</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
