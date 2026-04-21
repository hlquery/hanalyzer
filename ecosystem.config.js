import config from "./hanalyzer.conf.js";

export default {
  apps: [
    {
      name: "hanalyzer",
      cwd: "/home/cferry/work/hlquery/etc/hanalyzer",
      script: "./hanalyzer",
      interpreter: "bash",
      env: {
        HANALYZER_PORT: String(config.server.port),
        HANALYZER_HOST: config.server.host,
        HANALYZER_API_TARGET: config.server.apiTarget
      }
    }
  ]
};
