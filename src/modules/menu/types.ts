import { z } from 'zod'

export interface MenuItem {
  id: string
  group_title: string
  name: string
  href: string
  icon: string
  sort_order: number
  is_active: boolean
  required_role: string | null
}

export interface MenuGroup {
  title: string
  items: MenuItem[]
}

export const upsertMenuSchema = z.object({
  id: z.string().uuid().optional(),
  group_title: z.string().min(1, 'El grupo es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  href: z.string().min(1, 'La ruta es requerida'),
  icon: z.string().min(1, 'El icono es requerido'),
  sort_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
  required_role: z.string().nullable(),
})

export type UpsertMenuInput = z.infer<typeof upsertMenuSchema>
