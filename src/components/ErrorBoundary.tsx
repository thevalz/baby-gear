import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional recovery action offered as a button (e.g. reset persisted state). */
  onReset?: () => void;
  /** Short context label for the message, e.g. the view name. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors in its subtree and shows a contained fallback
 * instead of letting a single crash blank the whole app. Errors must be caught
 * by a class component — this is the one class in the codebase for that reason.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging; the boundary keeps the rest of the app alive.
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  private reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        <h2 className="text-base font-semibold text-red-800">
          Something went wrong{this.props.label ? ` in ${this.props.label}` : ''}.
        </h2>
        <p className="mt-1 text-red-700">
          This view hit an unexpected error and was contained here so the rest of
          the app keeps working. Try again — or, if it keeps happening, your saved
          data may be the cause and resetting it should clear it.
        </p>
        {error.message && (
          <pre className="mt-3 overflow-x-auto rounded-md border border-red-200 bg-white/70 p-3 text-xs text-red-800">
            {error.message}
          </pre>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={this.retry}
            className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
          {this.props.onReset && (
            <button
              onClick={this.reset}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-100"
            >
              Reset app data
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-100"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
