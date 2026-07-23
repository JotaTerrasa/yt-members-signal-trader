const inheritedEnvironmentNames = Object.keys(process.env);
const safeEnvironmentNames = [
  'APPDATA',
  'COMSPEC',
  'DBUS_SESSION_BUS_ADDRESS',
  'DISPLAY',
  'HOME',
  'HOMEDRIVE',
  'HOMEPATH',
  'LANG',
  'LC_ALL',
  'LOCALAPPDATA',
  'PATH',
  'PATHEXT',
  'PLAYWRIGHT_BROWSERS_PATH',
  'PROGRAMDATA',
  'SYSTEMDRIVE',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'TZ',
  'USERPROFILE',
  'WAYLAND_DISPLAY',
  'WINDIR',
  'XAUTHORITY'
];
const safeEnvironment = Object.fromEntries(safeEnvironmentNames.flatMap((name) => (
  process.env[name] ? [[name, process.env[name]]] : []
)));

module.exports = {
  apps: [
    {
      name: 'yt-members-signal-trader',
      script: 'src/server.js',
      cwd: __dirname,
      time: true,
      watch: false,
      max_memory_restart: '750M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 12000,
      // PM2 hereda por defecto todo el shell. Se elimina primero y solo se reponen rutas del sistema.
      filter_env: inheritedEnvironmentNames,
      env: {
        ...safeEnvironment,
        NODE_ENV: 'production',
        PORT: '5178',
        HOST: '127.0.0.1',
        PLAYWRIGHT_HEADLESS: 'false'
      }
    }
  ]
};
