const fs = require('fs');

module.exports = (file) => {
    let cfg;

    try {
        cfg = JSON.parse(fs.readFileSync(file, "UTF-8"));
    }
    catch(err) {}
    // Sadly this has to be a sync-process, otherwise a Promise would be more appropriate here

    return structure(createDefaultConfig(cfg));
};

function structure(json) {
    return {
        server: {
            getPort: () => json.server.port,
            getInterval: () => json.server.interval
        },
        github: {
            getToken: () => json.github.token
        },
        discord: {
            isEnabled: () => json.discord.enabled,
            getID: () => json.discord.id,
            getToken: () => json.discord.token,
            getMessages: (success) => {
                return success ? json.discord.messages.success: json.discord.messages.failure;
            }
        },
        sonar: {
            isEnabled: () => json.sonar.enabled,
            getToken: () => json.sonar.token,
            getArguments: () => json.sonar.args
        }
    };
}

function createDefaultConfig(cfg) {
    if (!cfg) cfg = {};

    // "Server Settings" Config Section
    if (!cfg.server) cfg.server = {};
    if (!cfg.server.interval) cfg.server.interval = 15;
    if (!cfg.server.port) cfg.server.port = 8085;

    // GitHub Config Section
    if (!cfg.github) cfg.github = {};
    if (!cfg.github.token) cfg.github.token = "YOUR_GITHUB_ACCESS_TOKEN";

    // Discord Config Section
    if (!cfg.discord) cfg.discord = {enabled:false};
    if (!cfg.discord.id) cfg.discord.id = "YOUR_DISCORD_BOT_ID";
    if (!cfg.discord.token) cfg.discord.token = "YOUR_DISCORD_BOT_TOKEN";
    if (!cfg.discord.messages) cfg.discord.messages = {};
    if (!cfg.discord.messages.success || cfg.discord.messages.success.length === 0) cfg.discord.messages.success = ["This build was successful"];
    if (!cfg.discord.messages.failure || cfg.discord.messages.failure.length === 0) cfg.discord.messages.failure = ["This build has failed"];

    // Sonar Config Section
    if (!cfg.sonar) cfg.sonar = {enabled:false};
    if (!cfg.sonar.token) cfg.sonar.token = "YOUR_SONAR_TOKEN";
    if (!cfg.sonar.args) cfg.sonar.args = [];

    return cfg;
}
