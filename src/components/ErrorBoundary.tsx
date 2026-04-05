import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <div className="text-center">
            <div className="inline-flex p-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-sm font-medium mb-1">Something went wrong</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
