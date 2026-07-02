module.exports = {
  apps: [
    {
      name: 'yt-members-signal-trader',
      script: 'src/server.js',
      cwd: __dirname,
      time: true,
      watch: false,
      max_memory_restart: '750M',
      env: {
        NODE_ENV: 'production',
        PORT: '5178',
        PLAYWRIGHT_HEADLESS: 'false'
      }
    }
  ]
};
