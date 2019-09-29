const fs = require('fs');
const lodash = require("lodash/object");

const defaultConfig = {
    server: {
        port: 8085,
        interval: 15
    },
    github: {
        token: "YOUR_GITHUB_ACCESS_TOKEN"
    },
    discord: {
        enabled: false,
        id: "YOUR_DISCORD_BOT_ID",
        token: "YOUR_DISCORD_BOT_TOKEN",
        messages: {
            success: [
                "This build was successful"
            ],
            failure: [
                "This build has failed"
            ]
        }
    },
    sonar: {
        enabled: false,
        token: "YOUR_SONAR_TOKEN",
        args: []
    }
}

module.exports = (file) => {
    let cfg = {};

    if (file != 'null' && process.env.JSON_CONFIG) {
        return structure(lodash.defaultsDeep(JSON.parse(process.env.JSON_CONFIG), defaultConfig));
    }

    try {
        // Sadly this has to be a sync-process, otherwise a Promise would be more appropriate here
        cfg = JSON.parse(fs.readFileSync(file, 'UTF-8'));
    }
    catch(err) {}

    cfg = lodash.defaultsDeep(cfg, defaultConfig);

    if (file != 'null') {
        fs.writeFileSync(file, JSON.stringify(cfg, null, 2), 'UTF-8');
    }

    return structure(cfg);
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
