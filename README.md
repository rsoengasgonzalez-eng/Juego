# Madrid Mystery

MVP móvil de un juego social tipo *murder mystery* para grupos de WhatsApp. Está preparado para ejecutarse en **Cloudflare Workers**, servir la interfaz como assets estáticos y guardar equipos, pistas y acusaciones en **Cloudflare D1**.

## Qué incluye

- Entrada con alias, sin contraseña ni teléfono.
- Creación y unión a equipos mediante código de seis caracteres.
- Equipos de hasta 8 personas (configurable).
- Tres casos completos que rotan automáticamente cada 72 horas.
- Cuatro fases por caso: 0 h, 18 h, 42 h y 60 h.
- Pistas opcionales con penalización de 50 puntos.
- Acusación final bloqueada hasta la última fase.
- Puntuación de culpable, método, motivo y pruebas.
- Clasificación por equipos y solución del caso anterior.
- Botón para compartir el enlace directamente en WhatsApp.
- PWA instalable, diseño móvil y caché de interfaz.
- Limpieza automática de sesiones inactivas pasados 180 días.

## Arquitectura

- `public/`: interfaz HTML, CSS y JavaScript, sin proceso de compilación.
- `src/worker.js`: API HTTP y acceso a D1.
- `src/cases.js`: contenido de los casos y soluciones (solo llega al navegador lo desbloqueado).
- `src/game.js`: rotación, desbloqueos y puntuación.
- `migrations/`: esquema versionado de D1.
- `wrangler.jsonc`: configuración del Worker, assets, D1 y cron.

La rotación no depende del cron. El caso activo se calcula a partir de `CASE_CYCLE_START` y bloques de 72 horas; por eso el cambio ocurre incluso si nadie visita la web justo a la hora del relevo. El cron diario solo invalida sesiones con más de 180 días de inactividad.

## Publicación en Cloudflare

Necesitas una cuenta de Cloudflare y Node.js 20 o posterior.

### 1. Instalar y autenticar

```bash
npm install
npx wrangler login
```

### 2. Crear la base D1

```bash
npm run db:create
```

El comando devolverá un `database_id`. Copia ese valor en `wrangler.jsonc`, sustituyendo:

```json
"database_id": "REPLACE_WITH_DATABASE_ID"
```

### 3. Elegir cuándo comienza el primer caso

Edita `CASE_CYCLE_START` en `wrangler.jsonc`. Debe ser una fecha ISO con zona horaria. Ejemplo para Madrid:

```json
"CASE_CYCLE_START": "2026-11-13T10:00:00+01:00"
```

A partir de ese instante, cada ciclo durará exactamente 72 horas. Los tres casos incluidos se repetirán de forma circular hasta que añadas más casos en `src/cases.js`.

### 4. Crear las tablas

```bash
npm run db:migrate:remote
```

### 5. Publicar

```bash
npm run deploy
```

Wrangler mostrará una URL similar a:

```text
https://madrid-mystery.<tu-subdominio>.workers.dev
```

Ábrela en un móvil, crea dos alias en navegadores distintos y prueba la creación/unión de equipo.

### 6. Añadir un dominio propio (opcional)

En el panel de Cloudflare:

1. **Workers & Pages** → `madrid-mystery`.
2. **Settings** → **Domains & Routes**.
3. **Add** → **Custom domain**.
4. Introduce, por ejemplo, `misterio.tudominio.com`.

El dominio debe estar gestionado en la misma cuenta de Cloudflare.

## Mensaje para WhatsApp

La propia web tiene un botón de compartir. También puedes copiar este texto y sustituir el enlace:

> 🔎 **NUEVO CASO: El silencio del Palacio de Cristal**  
> Tenemos 72 horas para descubrir quién lo hizo. Crea tu alias, entra en un equipo y revisa las pruebas:  
> https://misterio.tudominio.com

## Pruebas

Las pruebas de la lógica no necesitan dependencias:

```bash
npm test
```

Para probar Worker + D1 localmente después de instalar Wrangler:

```bash
npm run db:migrate:local
npm run dev
```

Wrangler indicará la URL local, normalmente `http://localhost:8787`.

## Puntuación

| Elemento | Puntos |
|---|---:|
| Culpable correcto | 500 |
| Motivo correcto | 250 |
| Método correcto | 200 |
| Cada prueba clave correcta (máx. 3) | 50 |
| Cada pista usada | −50 (máx. −200) |
| Máximo | 1.100 |

Cada equipo solo puede enviar una acusación por ciclo. En empate gana quien haya enviado antes.

## Editar o añadir casos

Los casos viven en `src/cases.js`. Para añadir uno:

1. Duplica un objeto completo.
2. Usa un `id` único.
3. Mantén cuatro fases con `availableAfterHours` 0, 18, 42 y 60, o cambia los tiempos.
4. Comprueba que los IDs de la solución existan en sospechosos, métodos, motivos y pruebas.
5. Ejecuta `npm test` y vuelve a publicar con `npm run deploy`.

No uses personas reales del grupo como víctimas o culpables sin su consentimiento. Mantén el contenido ficticio y no gráfico.

## Límites conscientes del MVP

- El acceso por alias prioriza la facilidad; no es autenticación fuerte. Si alguien borra los datos del navegador perderá su sesión.
- Un jugador puede compartir información fuera de la app; ningún sistema evita las filtraciones en WhatsApp.
- Los casos se gestionan por código. Un panel editorial sería la siguiente mejora.
- No hay notificaciones automáticas de WhatsApp. El botón abre el flujo de compartir y evita depender de la API de WhatsApp Business.
- Al haber tres casos incluidos, el cuarto ciclo vuelve al primero. Añade contenido antes de llegar a ese punto si no quieres repeticiones.

## Privacidad mínima recomendada antes de abrirlo al grupo

Publica una página breve que indique quién administra el juego, qué se guarda (alias, equipo, respuestas y actividad), durante cuánto tiempo y cómo pedir el borrado. No recojas teléfono, ubicación continua ni nombre legal si no son necesarios.
