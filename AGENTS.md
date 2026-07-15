# AGENTS.md

Guía operativa para Codex y cualquier agente que mantenga este repositorio.

## Prioridad

Futures Magician puede enviar órdenes a BingX. La prioridad siempre es:

1. No ejecutar acciones reales de trading sin confirmación explícita del usuario en ese momento.
2. No exponer ni versionar secretos, sesiones web, backups con datos sensibles ni históricos locales privados.
3. Preservar la lógica operativa que ya funciona, especialmente parser, anti-duplicados, stop loss, TP, cierres y reconciliación.
4. Verificar cambios con comandos locales antes de hacer commit o hacer push.

## Alcance del proyecto

La app es un servidor Node.js local con frontend estático:

- `src/server.js`: API HTTP, SSE, estado global, monitor, PM2/entorno local.
- `src/youtubeScraper.js`: Playwright Chromium persistente para YouTube y Telegram Web.
- `src/coverageRecovery.js`: selección conservadora de huecos Demo recientes para recuperación idempotente.
- `src/futuresSignalParser.js`: parser de texto libre a señales normalizadas.
- `src/futuresTrader.js`: motor de ejecución, validaciones, riesgo, demo/live y gestión de posiciones.
- `src/bingxClient.js`: cliente REST firmado de BingX.
- `src/paperTradeStore.js`: trading local/paper.
- `src/referenceLedger.js`: lectura de hoja de Google de referencia.
- `src/replicaAuditMatcher.js`: emparejamiento fiable entre hoja, aperturas, cierres y costes.
- `src/operationalAudit.js`: evidencia de comisiones, estados de muestra y clasificación de errores reintentables.
- `src/signalCoverage.js`: cobertura de paquetes completos, pendientes o incompletos.
- `src/tradeEventStore.js`: auditoría de eventos reales/demo/paper.
- `public/app.js`, `public/index.html`, `public/styles.css`: UI local.
- `scripts/strategyStudy.js`: informe estadístico de operativa.
- `scripts/systemAudit.js`: auditoría integral reproducible y segura para Git.
- `scripts/secureBackup.js`: backup cifrado verificable y restauración aislada.
- `scripts/registerWindowsTasks.ps1`: registro reproducible de PM2 y backups en el Programador de tareas.
- `docs/`: documentación operativa.

## Archivos que no se suben

No añadas ni fuerces nunca estos datos al repositorio:

- `.data/config.json`
- `.data/posts.json`
- `.data/paper-trades.json`
- `.data/trade-events.json`
- `.data/backups/`
- `.yt-profile/`
- tokens de Telegram
- API key o secret de BingX
- capturas que muestren credenciales, IDs privados o saldos sensibles

Antes de hacer commit, revisa:

```bash
git status --short
rg -n "(botToken|apiSecret|apiKey|TOKEN|SECRET|PRIVATE_KEY|chatId)" README.md docs public src package.json package-lock.json
```

El segundo comando puede mostrar ejemplos documentados. Si aparece un valor real, párate y límpialo antes de seguir.

## Comandos habituales

Instalación:

```bash
npm install
npm run install:browsers
```

Desarrollo:

```bash
npm run dev
```

Salud local:

```bash
curl http://localhost:5178/api/health
```

Validación estática:

```bash
npm run lint
npm test
git diff --check
```

Informe estratégico:

```bash
npm run study:strategy
npm run audit:system
```

PM2:

```bash
pm2 status yt-members-signal-trader
pm2 logs yt-members-signal-trader
pm2 restart yt-members-signal-trader --update-env
pm2 save
```

En Windows, si PM2 no pasa bien `npm run dev`, usa:

```powershell
pm2 start src/server.js --name yt-members-signal-trader --cwd "C:\ruta\yt-members-signal-trader"
pm2 save
```

## Reglas por tipo de cambio

### Parser de señales

- Lee primero `docs/SIGNALS.md`.
- Preserva aperturas `LONG` y `SHORT`, cierres, cierre total, TP, SL, break even y mensajes mixtos.
- No relajes el requisito de stop loss obligatorio.
- No elimines protecciones anti-duplicado.
- Mantén pruebas con mensajes mixtos, errores tipográficos conocidos, LONG, SHORT y cierre total.
- Si cambias el parseo, prueba manualmente con mensajes reales anonimizados usando `/api/bingx/parse-test` o una verificación local equivalente.

### Motor BingX y riesgo

- No ejecutes endpoints que creen, cierren o modifiquen órdenes reales sin confirmación explícita del usuario.
- En revisiones técnicas, usa `test`, lectura de estado o validaciones sin efecto.
- Mantener claro el aislamiento entre:
  - real USDT;
  - demo VST;
  - paper/test local.
- Cualquier cambio en tamaños de orden, apalancamiento, SL/TP o modo live debe quedar visible en UI y documentado.
- Los cierres explícitos deben ejecutarse inmediatamente; el precio publicado sirve para auditar slippage, no para retener la salida.
- Los fallos transitorios de cierre deben conservar `executionMode`, ser idempotentes y tener una ventana acotada de reintentos.
- Las aperturas a mercado no deben perseguir un precio desfavorable por encima de la tolerancia configurada.
- Los límites de riesgo de demo/live deben consultar la cuenta BingX, no el almacén paper.

### Scraping YouTube / Telegram Web

- No borres `.yt-profile/` salvo petición explícita.
- No cambies el comportamiento de auto-resume sin explicarlo.
- Si YouTube o Telegram Web no devuelven posts visibles, diagnostica sesión, URL, DOM y logs antes de tocar lógica.
- Telegram Web puede usarse para gestión de posiciones; las aperturas desde Telegram deben tratarse como decisión de riesgo.

### Frontend

- No mezcles visual de real USDT con demo VST si el panel es de futuros reales.
- Las pantallas de riesgo deben mostrar estado, última reconciliación, último error, monitor, Telegram y BingX de forma clara.
- Verifica que los textos no se solapan en desktop y móvil cuando cambies UI.
- No alteres la lógica operativa desde UI salvo que el cambio lo requiera explícitamente.

### Documentación

- Mantener README como entrada principal.
- Mantener docs específicos en `docs/`.
- Usar placeholders para URLs privadas, IDs, tokens y saldos sensibles.
- Si añades diagramas, usa Mermaid para que GitHub los renderice.

## Checklist antes de entregar

1. `git status --short` entendido.
2. `npm run lint` ejecutado si tocaste `src/`, `public/` o `scripts/`.
3. `npm test` ejecutado si tocaste parser, trading, riesgo, auditoría o persistencia.
4. `git diff --check` sin errores.
5. No hay secretos reales en el diff.
6. Si tocaste UI, verificaste localhost en navegador.
7. Si tocaste trading, no ejecutaste acciones reales sin confirmación.
8. Si hiciste commit, la autoría debe ser:

```text
jotaterrasa <165782559+JotaTerrasa@users.noreply.github.com>
```

9. Si tocaste persistencia, verificaste un backup y una restauración en ruta aislada.
10. Si tocaste Docker, verificaste healthcheck y persistencia después de reiniciar el contenedor.

## Git y publicación

Usa commits pequeños y descriptivos. Para commit con autoría correcta:

```bash
git add README.md docs AGENTS.md
git -c user.name="jotaterrasa" -c user.email="165782559+JotaTerrasa@users.noreply.github.com" commit -m "Update project documentation"
```

Para push, usa la credencial de GitHub ya configurada en el entorno si está disponible.

## Incidentes

Si hay descuadre entre app y BingX:

1. No abras nuevas posiciones para "probar".
2. Revisa UI, Telegram, `/api/health`, eventos y BingX directamente.
3. Identifica si falta SL, TP, cierre, posición o cancelación.
4. Documenta el mensaje original, la señal parseada, la orden enviada y la respuesta de BingX.
5. Pide confirmación antes de cualquier acción real correctiva.

Si el monitor se para:

1. Comprueba PM2.
2. Comprueba `/api/health`.
3. Mira si `autoResume` está activo o si fue parada manual.
4. Reanuda solo el monitor si la configuración de riesgo está clara.

## Referencias

- [README](README.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Operación diaria](docs/OPERATIONS.md)
- [Formato de señales](docs/SIGNALS.md)
- [Seguridad](docs/SECURITY.md)
- [Estudio estratégico](docs/STRATEGY_STUDY.md)
