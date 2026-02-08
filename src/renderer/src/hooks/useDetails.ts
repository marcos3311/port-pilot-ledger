import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// --- Keys ---
export const piltosKeys = {
    all: ['practicos'] as const,
    inactive: ['practicos', 'inactive'] as const,
    summary: (id: number) => ['practicos', 'summary', id] as const,
};

export const transactionKeys = {
    dashboard: (filters: any) => ['dashboard', filters] as const,
    years: ['years'] as const,
};

// --- Hooks ---

export function usePracticos() {
    return useQuery({
        queryKey: piltosKeys.all,
        queryFn: () => window.api.getPracticos(),
    });
}

export function useInactivePracticos() {
    return useQuery({
        queryKey: piltosKeys.inactive,
        queryFn: () => window.api.getInactivePracticos(),
    });
}

export function usePilotSummary(pilotId: number) {
    return useQuery({
        queryKey: piltosKeys.summary(pilotId),
        queryFn: () => window.api.getPilotSummary(pilotId, new Date().getFullYear()), // Year unused in new handler but kept for sig?
        enabled: !!pilotId,
    });
}

export function useAvailableYears() {
    return useQuery({
        queryKey: transactionKeys.years,
        queryFn: () => window.api.getAvailableYears(),
    });
}

export function useDashboardData(filters: { year: number | 'Todos'; limit: number; offset: number; view: 'intercambios' | 'condonaciones' }) {
    return useQuery({
        queryKey: transactionKeys.dashboard(filters),
        queryFn: () => window.api.getDashboardData(filters),
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new (better UX)
    });
}

export function useDashboardInfinite(filters: { year: number | 'Todos'; limit: number; view: 'intercambios' | 'condonaciones' }) {
    return useInfiniteQuery({
        queryKey: transactionKeys.dashboard(filters),
        queryFn: ({ pageParam = 0 }) => window.api.getDashboardData({ ...filters, offset: pageParam as number }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage.hasMore) return undefined;
            return allPages.length * filters.limit;
        },
    });
}

// --- Mutations ---

export function useCreateTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => window.api.createTransaction(data),
        onSuccess: () => {
            toast.success('Transacción creada exitosamente');
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['practicos', 'summary'] });
        },
        onError: (error: any) => {
            toast.error(`Error al crear transacción: ${error.message}`);
        }
    });
}

export function useUpdateTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => window.api.updateTransaction(data),
        onSuccess: () => {
            toast.success('Transacción actualizada');
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['practicos', 'summary'] });
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar: ${error.message}`);
        }
    });
}

export function useDeleteTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, type, shift }: { id: string; type?: string; shift?: boolean }) => {
            if (shift) return window.api.deleteTransactionShift(id);
            return window.api.deleteTransactionSimple(id, type || 'intercambio');
        },
        onSuccess: () => {
            toast.success('Transacción eliminada');
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['practicos', 'summary'] });
        },
        onError: (error: any) => {
            toast.error(`Error al eliminar: ${error.message}`);
        }
    });
}

export function useVoidTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, voided }: { id: string; voided: boolean }) => window.api.setTransactionVoid(id, voided),
        onSuccess: (_, variables) => {
            toast.success(variables.voided ? 'Transacción anulada' : 'Transacción restaurada');
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['practicos', 'summary'] });
        },
        onError: (error: any) => {
            toast.error(`Error: ${error.message}`);
        }
    });
}

export function useCreatePilot() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { nombre: string; foto_url?: string | null }) => window.api.createPractico(data),
        onSuccess: () => {
            toast.success('Práctico creado');
            queryClient.invalidateQueries({ queryKey: piltosKeys.all });
            queryClient.invalidateQueries({ queryKey: ['practicos', 'summary'] });
        },
        onError: (error: any) => {
            toast.error(`Error al crear práctico: ${error.message}`);
        }
    });
}

export function useUpdatePilot() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { id: number; nombre?: string; foto_url?: string | null; activo?: number }) => window.api.updatePractico(data),
        onSuccess: (_, variables) => {
            toast.success('Práctico actualizado');
            queryClient.invalidateQueries({ queryKey: piltosKeys.all });
            queryClient.invalidateQueries({ queryKey: piltosKeys.summary(variables.id) });
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar práctico: ${error.message}`);
        }
    });
}
