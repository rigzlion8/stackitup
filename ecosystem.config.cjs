module.exports = {
  apps: [{
    name: "stackitup",
    cwd: "/home/app/stackitup",
    script: "node",
    args: "--enable-source-maps dist-server/index.js",
    env: {
      NODE_ENV: "production",
      PORT: "3100",
      HOST: "127.0.0.1",
      NODE_OPTIONS: "--max-old-space-size=256"
    },
    max_memory_restart: "256M",
    max_restarts: 5,
    min_uptime: "10s"
  }]
};
