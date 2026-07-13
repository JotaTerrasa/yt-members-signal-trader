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
      env: {
        NODE_ENV: 'production',
        PORT: '5178',
        HOST: '127.0.0.1',
        PLAYWRIGHT_HEADLESS: 'false'
      }
    }
  ]
};
