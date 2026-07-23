# Despliegue

Guía para instalar, arrancar y dejar la aplicación corriendo en segundo plano.

## 1. Clonar

```bash
git clone git@github.com:JotaTerrasa/yt-members-signal-trader.git
cd yt-members-signal-trader
```

Si usas HTTPS:

```bash
git clone https://github.com/JotaTerrasa/yt-members-signal-trader.git
cd yt-members-signal-trader
```

## 2. Instalar dependencias

```bash
npm install
npm run install:browsers
```

`install:browsers` instala Chromium para Playwright.

## 3. Arrancar en local

```bash
npm run dev
```

La URL por defecto es:

```text
http://localhost:5178
```

Si el puerto está ocupado, identifica primero el proceso. En PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 5178 | Select-Object LocalAddress,LocalPort,State,OwningProcess
Get-Process -Id <PID>
```

Luego puedes usar otro puerto:

```powershell
$env:PORT=5179
npm run dev
```

## 4. Configurar sesiones web

La app usa un perfil persistente:

```text
.yt-profile/
```

Flujo:

1. Abre `http://localhost:5178`.
2. Pulsa `Abrir sesión`.
3. Inicia sesión en YouTube con una cuenta que tenga acceso a miembros.
4. Si usas Telegram Web, guarda la URL del canal y pulsa `Abrir canal`.
5. Inicia sesión en Telegram Web si Chromium lo pide.

No se guarda ninguna contraseña en el repo.

## 5. Configuración funcional

Ejemplo de configuración:

```text
YouTube URL: https://www.youtube.com/@tu-canal/posts
Telegram Web URL: https://web.telegram.org/k/#-XXXXXXXXXX
Monitor: live cada 30 segundos
BingX mode: dual, Demo VST + live real
Capital mensual VST: 300 VST
Capital mensual real: 300 USDT
Por señal: 10% fijo del capital mensual
Resultado: 30 VST en demo y 30 USDT en real por ticker
Reserva técnica Demo VST: 500 VST de margen libre objetivo
Apalancamiento: usar el de la señal
Stop loss obligatorio: activado
Filtro de coste: activo en modo bloqueo
Telegram alertas: activado
Telegram Web ejecución: gestión de posiciones
Telegram Web aperturas: desactivadas salvo confirmación explícita
```

Campos sensibles:

- bot de Telegram token.
- Telegram chat ID.
- BingX API key.
- BingX API secret.

Estos valores viven en `.data/config.json` y no deben subirse a Git.

La reserva técnica de Demo VST también vive en `.data/config.json`. Si se activa, sus aportaciones son colateral virtual externo: ayudan a evitar falta de margen en paquetes demo, pero la app las descuenta de la equity estratégica y del ROI.

## 6. Dejarlo corriendo con PM2

Instala PM2 si no está instalado:

```bash
npm install -g pm2
```

Arranca:

```bash
pm2 start npm --name yt-members-signal-trader -- run dev
pm2 save
```

También puedes usar el archivo de proceso incluido:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

En Windows, si PM2 interpreta mal los argumentos de `npm`, usa el arranque directo:

```powershell
pm2 start src/server.js --name yt-members-signal-trader --cwd "C:\ruta\yt-members-signal-trader"
pm2 save
```

Comprueba:

```bash
pm2 status yt-members-signal-trader
pm2 logs yt-members-signal-trader
```

Reinicia tras cambios:

```bash
pm2 restart yt-members-signal-trader
pm2 save
```

En Linux, para supervivencia tras reinicio usa el comando que PM2 recomienda:

```bash
pm2 startup
```

PM2 imprimirá un comando específico para tu sistema. Ejecútalo una vez y después:

```bash
pm2 save
```

En Windows usa el script incluido y regístralo como tarea al iniciar sesión:

```powershell
npm run windows:tasks
```

El registro crea tres tareas: restauración de PM2 al iniciar sesión, backup cifrado diario a las 03:15 y backup semanal del perfil Chromium los domingos a las 04:00. Ambas tareas de backup descifran y extraen cada copia en un directorio temporal para demostrar que es restaurable; el estado saneado aparece en la guardia nocturna. El arranque ejecuta `pm2 resurrect`, reaplica siempre `ecosystem.config.cjs` con `startOrReload --update-env` y guarda de nuevo el estado. El ecosistema descarta el entorno heredado y repone solo rutas del sistema y variables explícitas de la app, evitando que credenciales de otras herramientas queden en el proceso o en `dump.pm2`. `FuturesMagicianPM2Startup` debe ser la única vía de autoarranque en Windows; el registro elimina el acceso directo heredado `yt-members-signal-trader-pm2-resurrect.lnk` y el script serializa invocaciones simultáneas para evitar carreras y errores `EADDRINUSE`.

## 7. Verificación

Health:

```bash
curl http://localhost:5178/api/health
```

Respuesta esperada con monitor activo:

```json
{
  "ok": true,
  "health": {
    "level": "ok",
    "running": true,
    "phase": "live"
  }
}
```

Estado BingX sin enviar órdenes:

```bash
curl http://localhost:5178/api/bingx/open-positions
```

Auditoría general:

```bash
curl http://localhost:5178/api/audit
```

Cobertura de paquetes y cohorte:

```bash
curl http://localhost:5178/api/signal-coverage
curl http://localhost:5178/api/execution-packages
curl http://localhost:5178/api/promotion-gate
curl http://localhost:5178/api/replica-audit
```

## 8. Cloudflare Tunnel opcional

Solo si necesitas ver la app desde móvil fuera de la red local:

1. Define `APP_BASIC_USER` y `APP_BASIC_PASSWORD` en el entorno de PM2 o en `.env` para Docker.
2. Reinicia la app y comprueba que el navegador solicita credenciales.
3. Abre el túnel:

```bash
cloudflared tunnel --url http://localhost:5178
```

La aplicación comprime automáticamente los recursos estáticos con Brotli o gzip. No hace falta configurar compresión adicional en el túnel.

Precauciones:

- No publiques la URL sin autenticación básica o Cloudflare Access.
- Cierra el túnel cuando termines.
- La UI permite operar y cambiar configuración.

## 9. Actualizar desde GitHub

Antes:

```bash
git status --short
```

Si no hay cambios locales que quieras conservar:

```bash
git pull --ff-only
npm install
pm2 restart yt-members-signal-trader
pm2 save
```

No borres `.data/` ni `.yt-profile/`.

## 10. Empaquetado portable y Docker

El proyecto incluye empaquetado reproducible:

```bash
npm run package:check
npm run docker:up
```

Docker Compose expone `http://localhost:5178` y monta:

- `.data/` para configuración y eventos;
- `.yt-profile/` para sesiones de Chromium;
- `docs/strategy-reports/` para informes estratégicos;
- `docs/audits/` para informes de auditoría integral.

Consulta la guía completa en [Paquetización y ejecución portátil](PACKAGING.md).
