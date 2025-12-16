# Aplicar Migración 010: last_attempt_failed

Esta migración agrega la columna `last_attempt_failed` a la tabla `path_progress` para rastrear si el último intento de una simulación falló.

## Opción 1: Dashboard de Supabase (RECOMENDADO)

1. Ve a tu proyecto en https://supabase.com
2. Ve a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el siguiente SQL:

```sql
-- Add last_attempt_failed column to path_progress
ALTER TABLE path_progress
ADD COLUMN IF NOT EXISTS last_attempt_failed BOOLEAN DEFAULT false;

COMMENT ON COLUMN path_progress.last_attempt_failed IS 'Indicates if the last attempt for this simulation failed';
```

5. Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)
6. Deberías ver el mensaje "Success. No rows returned"

## Opción 2: Usando psql (si tienes acceso directo)

```bash
psql "your-connection-string" < migrations/010_add_last_attempt_failed.sql
```

## Verificar que se aplicó correctamente

Después de aplicar la migración, verifica que la columna existe ejecutando en el SQL Editor:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'path_progress'
ORDER BY ordinal_position;
```

Deberías ver la columna `last_attempt_failed` con tipo `boolean` y valor por defecto `false`.

## Después de aplicar la migración

1. Recarga tu aplicación en el navegador
2. Los console.logs deberían mostrar que el progreso se actualiza correctamente
3. Cuando completes una simulación, debería marcarse como completada en el path
4. Cuando falles una simulación, debería marcarse como fallida y permitir reintentar si quedan intentos
