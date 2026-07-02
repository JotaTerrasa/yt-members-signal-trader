# Paquetización y ejecución portátil

Esta guía deja Futures Magician preparado para ejecutarse en un portátil, un mini-PC, un VPS, una Raspberry potente o un contenedor Docker. La aplicación sigue guardando sus datos privados fuera de Git.

## Objetivo

- Arranque local con `npm`.
- Arranque persistente con PM2.
- Arranque reproducible con Docker Compose.
- Comprobación rápida de entorno con `npm run package:check`.
- Persistencia de configuración, sesiones de navegador e informes.

## Datos que deben sobrevivir

Estos directorios no se suben al repositorio, pero sí deben conservarse entre reinicios:

| Ruta | Contenido | Debe respaldarse |
|---|---|---|
| `.data/` | Configuración, posts, eventos, trades, backups redactados. | Sí |
| `.yt-profile/` | Perfil persistente de Chromium para YouTube y Telegram Web. | Sí, si quieres evitar iniciar sesión de nuevo |
| `docs/strategy-reports/` | Informes versionables del estudio estratégico. | Sí, si quieres historial en Git |

Nunca subas `.data/config.json`, tokens, claves API ni sesiones reales.

## Opción 1: arranque directo

Es la mejor opción para tu máquina principal, porque permite abrir Chromium visualmente e iniciar sesión en YouTube o Telegram Web.

```bash
npm install
npm run install:browsers
npm run package:check
npm run start
```

URL:

```text
http://localhost:5178
```

En Windows también puedes usar:

```powershell
.\scripts\start.ps1
```

En Linux/macOS:

```bash
sh scripts/start.sh
```

## Opción 2: PM2

Es la opción recomendada para dejarlo corriendo en tu ordenador o en un servidor con Node instalado.

```bash
npm install
npm run install:browsers
npm run package:check
pm2 start ecosystem.config.cjs
pm2 save
```

Comandos útiles:

```bash
pm2 status yt-members-signal-trader
pm2 logs yt-members-signal-trader
pm2 restart yt-members-signal-trader --update-env
```

El archivo `ecosystem.config.cjs` mantiene:

- puerto `5178`;
- `NODE_ENV=production`;
- Chromium visual por defecto (`PLAYWRIGHT_HEADLESS=false`);
- reinicio si el proceso crece demasiado en memoria.

## Opción 3: Docker Compose

Es la opción más reproducible. Incluye Node, dependencias del sistema y Chromium de Playwright en una imagen.

1. Copia el ejemplo de entorno:

```bash
cp .env.example .env
```

2. Arranca:

```bash
npm run docker:up
```

3. Comprueba:

```bash
docker compose ps
docker compose logs -f futures-magician
```

4. Abre:

```text
http://localhost:5178
```

Parar:

```bash
npm run docker:down
```

### Sesiones web en Docker

El contenedor usa `PLAYWRIGHT_HEADLESS=true` por defecto. Eso es ideal para correr sin pantalla, pero no sirve para iniciar sesión visualmente desde cero.

Flujo recomendado:

1. Inicia sesión una vez en modo local o PM2 visual.
2. Conserva `.yt-profile/`.
3. Arranca Docker con el volumen `./.yt-profile:/app/.yt-profile`.
4. El contenedor reutiliza la sesión si YouTube o Telegram no la han invalidado.

Si YouTube o Telegram piden login otra vez, vuelve temporalmente al arranque visual, inicia sesión y después regresa a Docker.

## Variables de entorno

| Variable | Valor por defecto | Uso |
|---|---:|---|
| `PORT` | `5178` | Puerto HTTP local. |
| `NODE_ENV` | `production` en Docker/PM2 | Modo de ejecución Node. |
| `TZ` | `Europe/Madrid` | Zona horaria de logs y contenedor. |
| `PLAYWRIGHT_HEADLESS` | `false` local, `true` Docker | Ejecutar Chromium sin ventana. |
| `PLAYWRIGHT_NO_SANDBOX` | `false` | Solo para entornos Linux que lo exijan. |
| `STRATEGY_STUDY_OFFLINE` | `0` | Si es `1`, el informe estratégico no consulta BingX. |

Las credenciales de Telegram y BingX no deben ir en `.env`. Se configuran desde la UI y se guardan localmente en `.data/config.json`.

## Comprobación portátil

```bash
npm run package:check
```

Valida:

- versión de Node;
- existencia de `package-lock.json`;
- Chromium de Playwright instalado;
- escritura en `.data/`;
- escritura en `.yt-profile/`;
- estado del puerto local.

Si el puerto aparece ocupado pero la app ya está levantada, es normal.

## Construcción manual Docker

```bash
docker compose build
docker compose up -d
```

La imagen expone `5178` y define healthcheck contra:

```text
/api/health
```

## Actualización segura

Antes de actualizar:

```bash
git status --short
```

Después:

```bash
git pull --ff-only
npm install
npm run package:check
pm2 restart yt-members-signal-trader --update-env
```

En Docker:

```bash
git pull --ff-only
npm run docker:up
```

No borres `.data/` ni `.yt-profile/`.
