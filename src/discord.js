const Discord = require('discord.js')
const lodash = require('lodash/collection')
const projects = require('../src/projects.js')

module.exports = cfg => {
  let config = cfg

  let webhook = {
    send: () => Promise.resolve()
  }

  if (config) {
    if (config.isEnabled()) {
      webhook = new Discord.WebhookClient(config.getID(), config.getToken())
    }
  } else {
    config = {
      isEnabled: () => true,
      getMessages: success => {
        return success ? 'This Build was a success!' : 'This Build was a failure!'
      }
    }
  }

  return {
    /**
         * This method sends a message into your Discord channel that
         * contains the status of the specified job.
         * It returns a Promise that will reject if the job is invalid or
         * when the message could not be sent.
         *
         * @param  {Object} job      The Job that shall be posted
         * @return {Promise}         A Promise that resolves when the message has been posted.
         */
    sendUpdate: job => sendUpdate(webhook, job, config),

    /**
         * This method returns the discord config used by this instance
         *
         * @return {Object} Config
         */
    getConfig: () => config
  }
}

/**
 * This method sends a message into your Discord channel that
 * contains the status of the specified job.
 * It returns a Promise that will reject if the job is invalid or
 * when the message could not be sent.
 *
 * @param  {Object} job      The Job that shall be posted
 * @return {Promise}         A Promise that resolves when the message has been posted.
 */
function sendUpdate (webhook, job, cfg) {
  return new Promise((resolve, reject) => {
    // Check if the discord webhook was enabled
    if (!cfg.isEnabled()) {
      resolve()
    }

    // Check if the job is valid
    if (!projects.isValid(job, true)) {
      reject(new Error('Invalid Job'))
      return
    }

    // Select a random message and apply variables
    const message = lodash.sample(cfg.getMessages(job.success))
      .replace(/<user>/g, job.author)
      .replace(/<repo>/g, job.repo)
      .replace(/<branch>/g, job.branch)
      .replace(/<id>/g, job.id)

    // Sendm it via our webhook
    webhook.send(new Discord.RichEmbed()
      .setTitle(job.author + '/' + job.repo + ':' + job.branch + ' ( #' + job.id + ' )')
      .setColor(job.success ? 0X00FF00 : 0XFF0000)
      .setDescription(message)
      .setURL('https://thebusybiscuit.github.io/builds/' + job.directory + '#' + job.id)
      .setTimestamp(Date.now())
    ).then(resolve, reject)
  })
}
