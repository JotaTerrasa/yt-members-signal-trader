# AGENTS.md

Guia operativa para Codex y cualquier agente que mantenga este repositorio.

## Prioridad

Futures Magician puede enviar ordenes a BingX. La prioridad siempre es:

1. No ejecutar acciones reales de trading sin confirmacion explicita del usuario en ese momento.
2. No exponer ni versionar secretos, sesiones web, backups con datos sensibles ni historicos locales privados.
3. Preservar la logica operativa que ya funciona, especialmente parser, anti-duplicados, stop loss, TP, cierres y reconciliacion.
4. Verificar cambios con comandos locales antes de commitear o pushear.

## Alcance del proyecto

La app es un servidor Node.js local con frontend estatico:

- `src/server.js`: API HTTP, SSE, estado global, monitor, PM2/runtime local.
- `src/youtubeScraper.js`: Playwright Chromium persistente para YouTube y Telegram Web.
- `src/futuresSignalParser.js`: parser de texto libre a senales normalizadas.
- `src/futuresTrader.js`: motor de ejecucion, validaciones, riesgo, demo/live y gestion de posiciones.
- `src/bingxClient.js`: cliente REST firmado de BingX.
- `src/paperTradeStore.js`: trading local/paper.
- `src/referenceLedger.js`: lectura de Google Sheet de referencia.
- `src/tradeEventStore.js`: auditoria de eventos reales/demo/paper.
- `public/app.js`, `public/index.html`, `public/styles.css`: UI local.
- `scripts/strategyStudy.js`: informe estadistico de operativa.
- `docs/`: documentacion operativa.

## Archivos que no se suben

No anadas ni fuerces nunca estos datos al repositorio:

- `.data/config.json`
- `.data/posts.json`
- `.data/paper-trades.json`
- `.data/trade-events.json`
- `.data/backups/`
- `.yt-profile/`
- tokens de Telegram
- API key o secret de BingX
- capturas que muestren credenciales, IDs privados o saldos sensibles

Antes de commitear, revisa:

```bash
git status --short
rg -n "(botToken|apiSecret|apiKey|TOKEN|SECRET|PRIVATE_KEY|chatId)" README.md docs public src package.json package-lock.json
```

El segundo comando puede mostrar ejemplos documentados. Si aparece un valor real, parate y limpialo antes de seguir.

## Comandos habituales

Instalacion:

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

Validacion estatica:

```bash
npm run lint
git diff --check
```

Informe estrategico:

```bash
npm run study:strategy
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

### Parser de senales

- Lee primero `docs/SIGNALS.md`.
- Preserva aperturas `LONG` y `SHORT`, cierres, cierre total, TP, SL, break even y mensajes mixtos.
- No relajes el requisito de stop loss obligatorio.
- No elimines protecciones anti-duplicado.
- Si cambias parseo, prueba manualmente con mensajes reales anonimizados usando `/api/bingx/parse-test` o una verificacion local equivalente.

### Motor BingX y riesgo

- No ejecutes endpoints que creen, cierren o modifiquen ordenes reales sin confirmacion explicita del usuario.
- En revisiones tecnicas, usa `test`, lectura de estado o validaciones sin efecto.
- Mantener claro el aislamiento entre:
  - real USDT;
  - demo VST;
  - paper/test local.
- Cualquier cambio en tamanos de orden, apalancamiento, SL/TP o modo live debe quedar visible en UI y documentado.

### Scraping YouTube / Telegram Web

- No borres `.yt-profile/` salvo peticion explicita.
- No cambies el comportamiento de auto-resume sin explicarlo.
- Si YouTube o Telegram Web no devuelven posts visibles, diagnostica sesion, URL, DOM y logs antes de tocar logica.
- Telegram Web puede usarse para gestion de posiciones; las aperturas desde Telegram deben tratarse como decision de riesgo.

### Frontend

- No mezcles visual de real USDT con demo VST si el panel es de futuros reales.
- Las pantallas de riesgo deben mostrar estado, ultima reconciliacion, ultimo error, monitor, Telegram y BingX de forma clara.
- Verifica que los textos no se solapan en desktop y movil cuando cambies UI.
- No alteres la logica operativa desde UI salvo que el cambio lo requiera explicitamente.

### Documentacion

- Mantener README como entrada principal.
- Mantener docs especificos en `docs/`.
- Usar placeholders para URLs privadas, IDs, tokens y saldos sensibles.
- Si anades diagramas, usa Mermaid para que GitHub los renderice.

## Checklist antes de entregar

1. `git status --short` entendido.
2. `npm run lint` ejecutado si tocaste `src/`, `public/` o `scripts/`.
3. `git diff --check` sin errores.
4. No hay secretos reales en el diff.
5. Si tocaste UI, verificaste localhost en navegador.
6. Si tocaste trading, no ejecutaste acciones reales sin confirmacion.
7. Si hiciste commit, la autoria debe ser:

```text
jotaterrasa <165782559+JotaTerrasa@users.noreply.github.com>
```

## Git y publicacion

Usa commits pequenos y descriptivos. Para commit con autoria correcta:

```bash
git add README.md docs AGENTS.md
git -c user.name="jotaterrasa" -c user.email="165782559+JotaTerrasa@users.noreply.github.com" commit -m "Update project documentation"
```

Para push, usa la credencial de GitHub ya configurada en el entorno si esta disponible.

## Incidentes

Si hay descuadre entre app y BingX:

1. No abras nuevas posiciones para "probar".
2. Revisa UI, Telegram, `/api/health`, eventos y BingX directamente.
3. Identifica si falta SL, TP, cierre, posicion o cancelacion.
4. Documenta el mensaje original, la senal parseada, la orden enviada y la respuesta de BingX.
5. Pide confirmacion antes de cualquier accion real correctiva.

Si el monitor se para:

1. Comprueba PM2.
2. Comprueba `/api/health`.
3. Mira si `autoResume` esta activo o si fue parada manual.
4. Reanuda solo el monitor si la configuracion de riesgo esta clara.

## Referencias

- [README](README.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Operacion diaria](docs/OPERATIONS.md)
- [Formato de senales](docs/SIGNALS.md)
- [Seguridad](docs/SECURITY.md)
- [Estudio estrategico](docs/STRATEGY_STUDY.md)
