import { useState, useEffect } from 'react';
import { Practico } from '../../../shared/types';
import clsx from 'clsx';

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any; // If provided, it's edit mode
    practicos: Practico[];
}

export default function TransactionFormModal({ isOpen, onClose, onSuccess, initialData, practicos }: TransactionFormModalProps) {
    const isEditing = Boolean(initialData);

    const [formData, setFormData] = useState({
        anio_imputacion: new Date().getFullYear(),
        customOrderNumber: '',
        fecha_turno: new Date().toISOString().split('T')[0],
        cantidad_dias: 1,
        deudor_id: '',
        acreedor_id: '',
        realizado_por_id: '',
        es_triangulacion: false,
        observacion: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    anio_imputacion: initialData.anio_imputacion,
                    customOrderNumber: initialData.numero_orden?.toString() || '',
                    fecha_turno: initialData.fecha_turno,
                    cantidad_dias: initialData.cantidad_dias,
                    deudor_id: initialData.deudor_id.toString(),
                    acreedor_id: initialData.acreedor_id.toString(),
                    realizado_por_id: initialData.realizado_por_id?.toString() || '',
                    es_triangulacion: Boolean(initialData.es_triangulacion),
                    observacion: initialData.observacion || ''
                });
            } else {
                // Reset for new
                setFormData({
                    anio_imputacion: new Date().getFullYear(),
                    customOrderNumber: '',
                    fecha_turno: new Date().toISOString().split('T')[0],
                    cantidad_dias: 1,
                    deudor_id: '',
                    acreedor_id: '',
                    realizado_por_id: '',
                    es_triangulacion: false,
                    observacion: ''
                });
            }
        }
    }, [isOpen, initialData]);


    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 3);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                customOrderNumber: formData.customOrderNumber ? parseInt(formData.customOrderNumber) : undefined,
                deudor_id: parseInt(formData.deudor_id),
                acreedor_id: parseInt(formData.acreedor_id),
                realizado_por_id: formData.es_triangulacion ? parseInt(formData.realizado_por_id) : parseInt(formData.acreedor_id),
                es_triangulacion: formData.es_triangulacion ? 1 : 0
            };

            if (isEditing && initialData?.id) {
                await window.api.updateTransaction(initialData.id, payload);
            } else {
                await window.api.createTransaction(payload);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold font-oswald text-slate-800 uppercase tracking-tight">
                        {isEditing ? 'Editar Cambio' : 'Registro de Nuevo Cambio'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Row 1: Fecha de Servicio | Cant. Días */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha del Servicio</label>
                            <input
                                type="date"
                                value={formData.fecha_turno}
                                onChange={(e) => {
                                    const newDate = e.target.value;
                                    const newYear = new Date(newDate + 'T12:00:00').getFullYear();
                                    setFormData({
                                        ...formData,
                                        fecha_turno: newDate,
                                        anio_imputacion: newYear
                                    });
                                }}
                                className="w-full border border-slate-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cant. Días</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.cantidad_dias}
                                onChange={(e) => setFormData({ ...formData, cantidad_dias: parseInt(e.target.value) })}
                                className="w-full border border-slate-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Sale (Deudor) | Entra (Crédito) */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Libera</label>
                            <select
                                value={formData.deudor_id}
                                onChange={(e) => setFormData({ ...formData, deudor_id: e.target.value })}
                                className="w-full border border-slate-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                <option value="">Seleccionar Práctico...</option>
                                {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({getInitials(p.nombre)})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Trabaja</label>
                            <select
                                value={formData.acreedor_id}
                                onChange={(e) => setFormData({ ...formData, acreedor_id: e.target.value })}
                                className="w-full border border-slate-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                <option value="">Seleccionar Práctico...</option>
                                {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({getInitials(p.nombre)})</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Triangulación | Año | Folio */}
                    <div className="grid grid-cols-3 gap-6 items-end border-t border-slate-100 pt-6">
                        <div className="flex items-center h-full pb-2.5">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={formData.es_triangulacion}
                                    onChange={(e) => setFormData({ ...formData, es_triangulacion: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Es Triangulación</span>
                            </label>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año Imputación</label>
                            <select
                                value={formData.anio_imputacion}
                                onChange={(e) => setFormData({ ...formData, anio_imputacion: parseInt(e.target.value) })}
                                className={clsx(
                                    "w-full border border-slate-200 rounded-md p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none",
                                    isEditing && "bg-slate-100 cursor-not-allowed text-slate-500"
                                )}
                                disabled={isEditing}
                                required
                            >
                                {Array.from({ length: 26 }, (_, i) => 2010 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nro Cambio</label>
                            <input
                                type="number"
                                placeholder="Auto"
                                value={formData.customOrderNumber}
                                onChange={(e) => setFormData({ ...formData, customOrderNumber: e.target.value })}
                                className={clsx(
                                    "w-full border border-slate-200 rounded-md p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-300",
                                    isEditing && "bg-slate-100 cursor-not-allowed text-slate-500"
                                )}
                                disabled={isEditing}
                            />
                        </div>
                    </div>

                    {formData.es_triangulacion && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fisicamente Realizado Por</label>
                            <select
                                value={formData.realizado_por_id}
                                onChange={(e) => setFormData({ ...formData, realizado_por_id: e.target.value })}
                                className="w-full border border-slate-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required={formData.es_triangulacion}
                            >
                                <option value="">Seleccionar Práctico...</option>
                                {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({getInitials(p.nombre)})</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Observaciones</label>
                        <textarea
                            value={formData.observacion}
                            onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                            className="w-full border border-slate-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                            placeholder="Detalles adicionales..."
                        />
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 py-3 rounded-md font-bold text-xs uppercase transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-md font-bold text-xs uppercase transition-colors shadow-lg"
                        >
                            {isEditing ? 'Guardar Cambios' : 'Confirmar Cambio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
