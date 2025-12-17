-- Query para verificar las columnas actuales de global_prompts
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

-- Query para ver los datos actuales en la tabla
SELECT * FROM global_prompts;
