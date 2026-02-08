import { z } from 'zod';

export const PracticoSchema = z.object({
    id: z.number(),
    nombre: z.string(),
    activo: z.number().refine((val) => val === 0 || val === 1, {
        message: "Activo must be 0 or 1",
    }),
    foto_url: z.string().optional(),
});

export const CreatePracticoSchema = z.object({
    nombre: z.string().min(1, "Name is required"),
    foto_url: z.string().nullable().optional(),
});

export const UpdatePracticoSchema = z.object({
    id: z.number(),
    nombre: z.string().optional(),
    foto_url: z.string().nullable().optional(),
    activo: z.number().optional(),
});

// --- Transaction Schemas ---

export const RangoFechaSchema = z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD").optional(),
});

export const DatosBaseSchema = z.object({
    dias: z.number().min(0),
    rangos: z.array(RangoFechaSchema),
});

export const DatosUnilateralSchema = DatosBaseSchema.extend({
    realizado_por_id: z.number().nullable().optional(),
});

export const LegReciprocoSchema = DatosBaseSchema.extend({
    realizado_por_id: z.number().nullable().optional(),
});

export const DatosReciprocoSchema = z.object({
    ida: LegReciprocoSchema,
    vuelta: LegReciprocoSchema,
});

export const DatosCondonacionSchema = z.object({
    dias: z.number().min(0),
});

export const TransactionTypeSchema = z.enum(['unilateral', 'reciproco', 'condonacion']);

export const CreateTransactionSchema = z.object({
    anio_imputacion: z.number().int(),
    tipo: TransactionTypeSchema,
    deudor_id: z.number().int(),
    acreedor_id: z.number().int(),
    datos: z.union([DatosUnilateralSchema, DatosReciprocoSchema, DatosCondonacionSchema]),
    observacion: z.string().optional(),

    // Optional overrides/metadata
    customOrderNumber: z.number().int().optional(),
    fecha_turno: z.string().optional(), // For condonaciones mainly
    fecha_registro: z.string().optional(), // Date of the transaction
    cantidad_dias: z.number().optional(), // Helper for condonaciones
});

export const UpdateTransactionSchema = CreateTransactionSchema.partial().extend({
    id: z.string().uuid(),
});

export const DashboardFilterSchema = z.object({
    year: z.union([z.number(), z.literal('Todos')]).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    view: z.enum(['intercambios', 'condonaciones']).optional(),
});
