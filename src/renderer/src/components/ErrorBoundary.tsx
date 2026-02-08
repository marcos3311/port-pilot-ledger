import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-red-50 p-8 text-red-900">
                    <div className="max-w-md text-center">
                        <h1 className="text-2xl font-bold mb-4">Algo salió mal</h1>
                        <p className="mb-4">Se ha producido un error inesperado.</p>
                        <div className="bg-white p-4 rounded shadow text-left overflow-auto max-h-48 text-sm font-mono mb-4 border border-red-200">
                            {this.state.error?.message}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Recargar Aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
