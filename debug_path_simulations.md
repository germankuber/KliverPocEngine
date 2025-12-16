# Debug Path Simulations

El problema "Character: N/A" puede ocurrir por dos razones:

## 1. Las simulaciones no tienen character_id asignado

Esto es normal si:
- Ya tenías simulaciones creadas antes de la migración de characters
- La migración de characters aún no se aplicó

**Solución**: 
- Aplica la migración en `APPLY_CHARACTERS_MIGRATION.md`
- Ve a `/simulations` y edita cada simulación
- Selecciona un character del dropdown
- Guarda

## 2. No has creado characters todavía

**Solución**:
1. Ve a `/characters`
2. Crea un nuevo character (ej: "Senior Developer")
3. Ve a `/simulations`
4. Edita una simulación
5. Selecciona el character que creaste
6. Guarda la simulación

## 3. Verificar en la consola del navegador

Abre las DevTools (F12) y busca en Console si hay errores al cargar las simulaciones.


