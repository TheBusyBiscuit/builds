const fs = require('fs')
const path = require('path')
const lodash = require('lodash/object')

const defaultConfig = {
  github: {
    token: 'YOUR_GITHUB_ACCESS_TOKEN'
  },
  discord: {
    enabled: false,
    id: 'YOUR_DISCORD_WEBHOOK_ID',
    token: 'YOUR_DISCORD_WEBHOOK_TOKEN'
  },
  sonar: {
    enabled: false,
    token: 'YOUR_SONAR_TOKEN',
    args: []
  }
}

module.exports = file => {
  let cfg = {}

  if (file != 'null' && process.env.JSON_CONFIG) {
    return structure(lodash.defaultsDeep(JSON.parse(process.env.JSON_CONFIG), defaultConfig))
  }

  try {
    // Sadly this has to be a sync-process, otherwise a Promise would be more appropriate here
    cfg = JSON.parse(fs.readFileSync(file, 'UTF-8'))
  } catch (err) { }

  cfg = lodash.defaultsDeep(cfg, defaultConfig)

  if (file != 'null') {
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2), 'UTF-8')
  }

  return structure(cfg)
}

function structure (json) {
  const messages = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../resources/discord-messages.json'), 'UTF-8'))

  return {
    github: {
      getToken: () => process.env.ACCESS_TOKEN
    },
    discord: {
      isEnabled: () => json.discord.enabled,
      getID: () => json.discord.id,
      getToken: () => json.discord.token,
      getMessages: success => {
        return success ? messages.success : messages.failure
      }
    },
    sonar: {
      isEnabled: () => json.sonar.enabled,
      getToken: () => json.sonar.token,
      getArguments: () => json.sonar.args
    }
  }
}
