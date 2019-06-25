const Discord = require('discord.js');

const projects = require('../src/projects.js');

module.exports = (cfg) => {
    var webhook = {
        send: () => Promise.resolve()
    };

    if (cfg) webhook = new Discord.WebhookClient(cfg.id, cfg.token);

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
        sendUpdate: (job) => sendUpdate(webhook, job, cfg),

        getConfig: () => cfg
    }
};

/**
 * This method sends a message into your Discord channel that
 * contains the status of the specified job.
 * It returns a Promise that will reject if the job is invalid or
 * when the message could not be sent.
 *
 * @param  {Object} job      The Job that shall be posted
 * @return {Promise}         A Promise that resolves when the message has been posted.
 */
function sendUpdate(webhook, job, cfg) {
    return new Promise((resolve, reject) => {
        if (!projects.isValid(job, true)) {
            reject("Invalid Job");
            return;
        }

        var message = "Build pending...";
        if (cfg) message = job.success ? cfg.messages.success[Math.floor(Math.random() * cfg.messages.success.length)]: cfg.messages.failure[Math.floor(Math.random() * cfg.messages.failure.length)];
        message = message.replace(/<user>/g, job.author).replace(/<repo>/g, job.repo).replace(/<branch>/g, job.branch).replace(/<id>/g, job.id);

        webhook.send(
            new Discord.RichEmbed()
            .setTitle(job.author + "/" + job.repo + ":" + job.branch + " ( #" + job.id + " )")
            .setColor(job.success ? 0X00FF00: 0XFF0000)
            .setDescription(message).setURL("https://thebusybiscuit.github.io/builds/" + job.author + "/" + job.repo + "/" + job.branch + "#" + job.id)
            .setTimestamp(Date.now())
        ).then(resolve, reject);
    });
}
