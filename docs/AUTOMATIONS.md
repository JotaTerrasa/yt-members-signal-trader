# Automatizaciones de mantenimiento

Futures Magician utiliza dos capas de automatización distintas:

- el Programador de tareas de Windows mantiene PM2 y las copias cifradas;
- las automatizaciones locales de Codex generan informes, mantienen la documentación y validan Docker.

Ninguna automatización de mantenimiento puede ejecutar, cancelar o modificar órdenes Demo o Live, cambiar el modo de BingX ni alterar la configuración operativa.

## Horarios

Los horarios se interpretan en la zona local de Madrid:

| Hora | Automatización | Resultado esperado |
|---|---|---|
| 09:00 | Informe estratégico diario | Actualiza el estudio de los últimos 30 días bajo `docs/strategy-reports/`. |
| 09:30 | Documentación, auditoría y Docker | Actualiza `docs/audits/`, sincroniza la documentación y valida Docker cuando corresponde. |

Son automatizaciones locales. El equipo, el proyecto y el servicio de Codex deben estar disponibles a la hora prevista. Un reinicio no sustituye una ejecución omitida; la tarea puede lanzarse manualmente con los comandos indicados más abajo.

## Barrera inicial

Antes de editar, ambas tareas deben demostrar que:

1. la rama actual es `main`;
2. `git status --porcelain` está vacío;
3. no hay merge, rebase, cherry-pick o revert en curso;
4. `git pull --ff-only origin main` puede completarse;
5. no existen cambios del usuario que puedan mezclarse con el mantenimiento.

Si falla una condición, la ejecución se aplaza sin editar, stagear, commitear ni hacer push. Esta regla impide publicar documentación adelantada respecto a cambios de código todavía locales.

## Informe estratégico

La tarea de las 09:00 ejecuta:

```bash
npm run study:strategy -- --days 30
npm run lint
```

Solo puede publicar `docs/strategy-reports/latest.md`, el informe fechado del día y documentación estrictamente relacionada. `.data/strategy-study/strategy-study.json` permanece local. Si BingX no responde, el informe únicamente se acepta cuando declara la degradación de calidad y el respaldo local.

## Documentación y Docker

La tarea de las 09:30 comprueba primero `/api/health` y ejecuta:

```bash
npm run audit:system
npm run lint
npm test
docker compose config --quiet
```

La auditoría es de solo lectura respecto a BingX. Puede escribir el estado local ignorado bajo `.data/audits/` y estos documentos versionables:

```text
docs/audits/latest.md
docs/audits/system-audit-AAAA-MM-DD.md
```

Si desde la ejecución anterior cambiaron `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `package.json` o `package-lock.json`, también debe ejecutar:

```bash
npm run docker:build
npm run docker:check
```

## Publicación segura

Antes de publicar, las tareas deben:

- revisar `git diff --check` y el diff completo;
- buscar credenciales, tokens, chat IDs, secretos y referencias personales;
- stagear rutas explícitas de documentación, informes o Docker;
- excluir `.env`, `.data/`, `.yt-profile/`, capturas, backups y `node_modules`;
- fijar autor y committer como `jotaterrasa <165782559+JotaTerrasa@users.noreply.github.com>`;
- comprobar de nuevo que `origin/main` no avanzó;
- usar push directo a `origin main`, sin crear una pull request.

Una validación fallida deja los cambios sin publicar y debe explicar el motivo. La ausencia de cambios válidos no genera un commit vacío.

## Ejecución manual

Para regenerar los informes sin depender del horario:

```bash
npm run study:strategy -- --days 30
npm run audit:system
```

Después, revisa `git status --short`, ejecuta las validaciones aplicables y publica únicamente los documentos esperados. Los archivos de memoria y configuración de estas automatizaciones viven fuera del repositorio, bajo el directorio local de automatizaciones de Codex.

## Tareas de Windows

`npm run windows:tasks` registra por separado:

- `FuturesMagicianPM2Startup`, al iniciar sesión;
- `FuturesMagicianSecureBackup`, cada día a las 03:15;
- `FuturesMagicianProfileBackup`, los domingos a las 04:00.

Estas tareas no actualizan Git ni la documentación. Su operación se describe en [Operación diaria](OPERATIONS.md) y [Despliegue](DEPLOYMENT.md).
