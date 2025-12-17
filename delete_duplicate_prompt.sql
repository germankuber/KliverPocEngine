-- Eliminar el registro duplicado con id b91488e4-37d2-4c3a-90f6-c0a1290ed437
DELETE FROM global_prompts 
WHERE id = 'b91488e4-37d2-4c3a-90f6-c0a1290ed437';

-- Verificar que solo queda un registro
SELECT COUNT(*) as total_records FROM global_prompts;
