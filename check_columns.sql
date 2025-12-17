-- Query para ver todas las columnas de la tabla global_prompts
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'global_prompts'
ORDER BY 
    ordinal_position;
