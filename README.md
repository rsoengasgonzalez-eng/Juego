# Madrid Mystery 2.0

Juego web móvil para compartir desde WhatsApp, preparado para Cloudflare Workers + D1.

## Mejoras incluidas

- **Cada caso dura 48 horas**.
- **Se desbloquea una pista cada 3 horas**: 16 pistas por expediente, de la hora 0 a la 45.
- **La acusación final se abre en la hora 42**, dejando seis horas para enviar la teoría.
- **Catálogo determinista de 1.000 casos**: son 2.000 días de rotación antes de repetir un índice de caso.
- **Grupos automáticos y equilibrados**: con la configuración predeterminada, crea 10 brigadas de 8 plazas para unos 80 participantes.
- **Sin elección manual de equipo**: al registrar el alias, D1 asigna al jugador al grupo menos poblado.
- **Protección de capacidad bajo concurrencia**: la inserción vuelve a comprobar el límite de ocho en la propia escritura D1.
- **Desbordamiento seguro**: el participante 81 abre una brigada adicional; nunca se sobrellena una brigada existente.
- **Pistas protegidas en el servidor**: las pistas bloqueadas no incluyen su contenido en la respuesta API.
- **Modo individual de respaldo**: el expediente se abre aunque D1 no esté configurada o todavía no tenga tablas; equipos y ranking requieren D1.
- PWA, diseño adaptable a móvil, ranking, puntuación y solución del caso anterior.

## Lógica de grupos para 80 participantes

La configuración predeterminada es:

```jsonc
"EXPECTED_PLAYERS": "80",
"AUTO_TEAM_SIZE": "8"
```

El sistema prepara 10 brigadas temáticas. Para cada alta:

1. Lee el número de miembros de todas las brigadas automáticas.
2. Elige la brigada con menos miembros; en empate, usa el orden estable de brigada.
3. Inserta al jugador solo si la brigada sigue por debajo de ocho miembros.
4. Si otra alta concurrente llenó esa brigada, repite la selección.
5. Si las diez están completas, crea una brigada de desbordamiento.

Con 80 altas, la distribución final es exactamente `8,8,8,8,8,8,8,8,8,8`. Durante las altas, la diferencia entre cualquiera de las diez brigadas es como máximo una persona.

## Estructura

```text
Madrid-Mystery-48h/
├── migrations/0001_initial.sql
├── public/
│   ├── app.js
│   ├── icon.svg
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── styles.css
│   └── sw.js
├── src/
│   ├── game-engine.js
│   ├── team-engine.js
│   └── worker.js
├── tests/
│   ├── game-engine.test.js
│   └── team-engine.test.js
├── package.json
└── wrangler.jsonc
```

## Publicación desde GitHub + Cloudflare

### 1. Sustituye los archivos del repositorio

Sube **el contenido** de esta carpeta a la raíz del repositorio. La raíz debe contener `package.json`, `wrangler.jsonc`, `src`, `public`, `migrations` y `tests`.

### 2. Conserva tu `database_id`

En `wrangler.jsonc`, descomenta el bloque `d1_databases` y sustituye:

```text
PEGA_AQUI_TU_DATABASE_ID
```

por el identificador real de `madrid-mystery-db` que ya muestra Cloudflare. No uses el nombre de la base como `database_id`.

El bloque final debe tener esta forma:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "madrid-mystery-db",
    "database_id": "TU-UUID-REAL-DE-D1",
    "migrations_dir": "migrations"
  }
]
```

El binding debe llamarse exactamente `DB`.

### 3. Aplica la migración

Desde el panel de Cloudflare, abre:

```text
Storage & databases → D1 → madrid-mystery-db → Console
```

Copia y ejecuta todo el contenido de `migrations/0001_initial.sql`. Las sentencias usan `IF NOT EXISTS`, por lo que pueden ejecutarse sobre una instalación que ya tenga esas tablas.

Alternativa con Wrangler:

```bash
npm install
npx wrangler d1 migrations apply madrid-mystery-db --remote
```

### 4. Define el inicio del ciclo

En `wrangler.jsonc`, ajusta:

```jsonc
"CASE_CYCLE_START": "2026-11-10T15:00:00.000Z"
```

La fecha está en UTC. No hace falta cron: el Worker calcula el caso y las pistas a partir del reloj del servidor.

### 5. Despliega

```bash
npm install
npm test
npm run deploy
```

En una integración de GitHub, usa:

- **Build command:** `npm ci && npm test`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** `/`

### 6. Verifica

Abre:

```text
https://TU-WORKER.workers.dev/api/health
```

Con D1 preparada debe responder:

```json
{"ok":true,"game":"ready","database":"ready","mode":"shared"}
```

Después abre la web en una ventana privada. Registra varios alias: cada alta devolverá su `team` automático y el ranking mostrará la brigada.

## Pruebas

```bash
npm test
npm run check
```

La suite comprueba:

- transición exacta de caso en la hora 48;
- desbloqueos en 0, 3, 6, …, 45 horas;
- apertura de acusación en la hora 42;
- ausencia de respuestas y pistas bloqueadas en la API pública;
- validez y singularidad de los 1.000 casos;
- reparto equilibrado de 80 jugadores en diez brigadas;
- apertura de desbordamiento para el jugador 81.

## Ajustes rápidos

- Tamaño de grupo: `AUTO_TEAM_SIZE`.
- Participación prevista: `EXPECTED_PLAYERS`.
- Número de casos: `CATALOG_SIZE` (máximo diseñado y probado: 1.000).
- Fecha de inicio: `CASE_CYCLE_START`.
- Hora de acusación: `ACCUSATION_OPEN_HOUR` en `src/game-engine.js`.

Si cambias el tamaño de grupo después de que ya haya jugadores asignados, el sistema no mueve personas entre brigadas existentes para no romper grupos sociales ya formados. El nuevo límite se aplica a las siguientes altas.
