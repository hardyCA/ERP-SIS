-- ============================================================
-- Storage: bucket "products" + RLS policies
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: permitir lectura pública
CREATE POLICY "products_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- RLS: permitir subida a usuarios autenticados
CREATE POLICY "products_authenticated_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- RLS: permitir actualización a usuarios autenticados
CREATE POLICY "products_authenticated_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- RLS: permitir eliminación a usuarios autenticados
CREATE POLICY "products_authenticated_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');
