-- Remove a policy que permitia LISTAR todos os arquivos do bucket public.
--
-- PROBLEMA: a policy "Public read product-images" era SELECT para o papel
-- `public` em storage.objects. Em bucket publico, SELECT nao serve para abrir
-- a imagem, serve para ENUMERAR o bucket. Auditoria confirmou: com a chave
-- anon dava para listar os arquivos e ler o catalogo inteiro de imagens.
--
-- POR QUE AS IMAGENS CONTINUAM ABRINDO: o bucket e publico (storage.buckets
-- .public = true). A URL /storage/v1/object/public/product-images/... e
-- servida direto, sem passar por RLS. O proprio linter do Supabase diz isso:
-- "Public buckets don't need this for object URL access".
--
-- POR QUE O ADMIN CONTINUA FUNCIONANDO: o codigo nunca chama .list(). Ele usa
-- upload() (policy de INSERT, intacta), getPublicUrl() (que so monta a string
-- no cliente, sem chamada de API) e os banners sobem pela serviceUrl com a
-- service role, que ignora policy. Verificado antes de escrever isto.

DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
