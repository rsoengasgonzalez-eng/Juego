# Madrid Mystery 3.0

Juego cooperativo para Cloudflare Workers + D1, pensado para compartirse desde WhatsApp con unos 80 participantes.

## Comportamiento del juego

- Cada expediente tiene una duración máxima de **48 horas**.
- Se publica una de las **16 pistas cada 30 minutos**: horas 0, 0:30, 1:00…7:30.
- Cada caso incluye **5 misiones obligatorias** compartidas por el equipo.
- Las misiones se habilitan al llegar a las pistas 5, 7, 9, 12 y 15.
- La acusación final permanece bloqueada hasta completar correctamente las cinco misiones.
- Cuando un equipo completa las misiones y envía su acusación, **termina inmediatamente**, sin esperar al cierre de 48 horas.
- El cierre de un equipo no afecta a los demás: el mismo caso permanece abierto para el resto hasta que terminen o venza el límite de 48 horas.
- El calendario global no se adelanta cuando todos terminan; el siguiente caso comienza en la siguiente frontera de 48 horas.
- Las respuestas, soluciones y pistas bloqueadas no se envían al navegador.
- El catálogo mantiene **1.000 casos deterministas**.

## Grupos

### Asignación general

La configuración predeterminada prepara 10 brigadas de 8 plazas para unos 80 participantes. Cada nueva alta entra en el grupo menos poblado. La capacidad se comprueba de nuevo en la escritura D1 para evitar sobreasignaciones concurrentes. El participante 81 abre una brigada adicional.

### Grupo fijo de dos usuarias

El administrador puede reservar un grupo fijo para dos personas mediante dos códigos privados. Las usuarias escriben su código en el campo opcional de registro; no eligen grupo ni ven el código de la otra persona.

Configura los códigos como secreto, nunca dentro de GitHub:

```bash
npx wrangler secret put FIXED_TEAM_CODES
```

Cuando Wrangler solicite el valor, introduce dos códigos separados por coma:

```text
CODIGO-PRIVADO-ANA,CODIGO-PRIVADO-LUCIA
```

El Worker acepta como máximo los dos primeros códigos. Cada código solo puede usarse una vez y ambos asignan al grupo definido por:

```jsonc
"FIXED_TEAM_NAME": "Dúo especial"
```

Para cambiar a las dos usuarias después de que se hayan registrado, no reutilices códigos antiguos. Elimina o reasigna primero sus filas desde D1 y después cambia el secreto.

## Persistencia D1

D1 es obligatoria. La versión 3 guarda:

| Información | Tabla |
|---|---|
| Usuarios, token, alias y plaza fija | `players` |
| Grupos, tipo y capacidad | `teams` |
| Miembros del grupo | `team_members` |
| Instancia y fechas de cada caso | `case_runs` |
| Estado de un equipo en el caso | `team_case_state` |
| Pistas desbloqueadas por equipo | `team_clue_unlocks` |
| Estado y puntuación de misiones | `team_mission_progress` |
| Todos los intentos de misión | `mission_attempts` |
| Acusación única del equipo | `team_accusations` |
| Resultado final y puntuación | `team_case_results` |
| Libro mayor de puntos | `score_events` |

`team_case_results` y `team_case_state` permiten que un equipo quede terminado mientras los demás siguen investigando el mismo `cycle_number`.

## Migraciones

La carpeta `migrations` contiene:

- `0001_initial.sql`: esquema original de usuarios, grupos y acusaciones.
- `0002_missions_persistent_progress.sql`: actualización completa para misiones, pistas persistentes, acusaciones de equipo, resultados y puntuación.

Para una base nueva se aplican ambas en orden. Para una base existente que ya tenga la migración 0001, Wrangler aplicará solamente la 0002.

```bash
npm install
npx wrangler d1 migrations list madrid-mystery-db --remote
npx wrangler d1 migrations apply madrid-mystery-db --remote
```

Confirma con `Y` cuando se solicite. No ejecutes 0002 dos veces manualmente: contiene columnas `ALTER TABLE` y está diseñada para quedar registrada por el sistema de migraciones.

### Aplicación desde el panel de Cloudflare

Si no usas la CLI:

1. Abre **Storage & databases → D1 → madrid-mystery-db → Console**.
2. En una base nueva ejecuta primero `0001_initial.sql` y después `0002_missions_persistent_progress.sql`.
3. En la base anterior del juego ejecuta únicamente `0002_missions_persistent_progress.sql` si 0001 ya se aplicó.
4. Conserva una copia de seguridad antes de actualizar una base con datos reales.

## Configuración de Cloudflare

En `wrangler.jsonc`, sustituye:

```text
REPLACE_WITH_YOUR_D1_DATABASE_UUID
```

por el UUID real de `madrid-mystery-db`:

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

Variables incluidas:

```jsonc
"CASE_CYCLE_START": "2026-11-10T15:00:00.000Z",
"CATALOG_SIZE": "1000",
"EXPECTED_PLAYERS": "80",
"AUTO_TEAM_SIZE": "8",
"FIXED_TEAM_NAME": "Dúo especial"
```

- `CASE_CYCLE_START`: inicio UTC de la rotación de 48 horas.
- `EXPECTED_PLAYERS`: número previsto de participantes.
- `AUTO_TEAM_SIZE`: límite de cada brigada automática.
- `FIXED_TEAM_NAME`: nombre visible del grupo fijo de dos.
- `FIXED_TEAM_CODES`: secreto de Cloudflare con los dos códigos; no aparece en `wrangler.jsonc`.

## Despliegue

```bash
npm install
npm test
npx wrangler d1 migrations apply madrid-mystery-db --remote
npx wrangler secret put FIXED_TEAM_CODES
npm run deploy
```

En la integración GitHub de Cloudflare:

- **Root directory:** `/`
- **Build command:** `npm ci && npm test`
- **Deploy command:** `npx wrangler deploy`

## Verificación

Abre:

```text
https://juego.rsoengasgonzalez.workers.dev/api/health
```

La respuesta correcta es similar a:

```json
{
  "ok": true,
  "game": "ready",
  "database": "ready",
  "mode": "persistent",
  "fixedPairConfigured": true
}
```

Si `database` devuelve `migration-required`, aplica las migraciones. Si `fixedPairConfigured` es `false`, configura `FIXED_TEAM_CODES` y vuelve a desplegar.

## Puntuación

- Cada misión correcta: **100 puntos**; total de misiones: 500.
- Acusación: hasta **1.000 puntos**.
- Bonificación por rapidez: hasta **500 puntos**, disminuyendo a medida que avanza el caso.
- La tabla `score_events` conserva cada componente de la puntuación.
- El ranking ordena por puntuación total y, en empate, por menor tiempo empleado.

## API principal

- `POST /api/players`: registra el usuario y asigna equipo; acepta `alias` y `assignmentCode` opcional.
- `GET /api/game`: devuelve caso, pistas públicas y progreso persistente del equipo autenticado.
- `POST /api/missions/:missionId/submit`: registra cada intento y completa la misión para todo el equipo.
- `POST /api/accusations`: exige las cinco misiones y cierra únicamente el expediente del equipo.
- `GET /api/ranking`: muestra equipos terminados y todavía activos.
- `GET /api/health`: valida binding y esquema D1.

La autenticación utiliza el token aleatorio devuelto al registrar el alias. Se guarda en el dispositivo y se envía como `Authorization: Bearer ...`.

## Pruebas

```bash
npm test
npm run check
```

Las pruebas comprueban la frontera de 48 horas, los desbloqueos cada 30 minutos, las cinco misiones, la ausencia de respuestas privadas en la API, los 1.000 casos y el reparto equilibrado de grupos.
