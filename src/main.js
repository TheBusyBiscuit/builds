const path = require('path');

const cfg = require('../src/config.js')(path.resolve(__dirname, "../resources/config.json"));

// Modules
const projects = require('../src/projects.js');
const maven = require('../src/maven.js');
const github = require('../src/github.js')(cfg.github);
const discord = require('../src/discord.js')(cfg.discord);
const log = require('../src/logger.js');

module.exports = {
    start,
    check,
    update,
    compile,
    gatherResources,
    upload,
    finish,

    /**
     * This method returns the discord config used by this instance
     *
     * @return {Object} Config
     */
    getConfig: () => cfg
}

/**
 * This method starts the default lifecycle for all projects.
 * It also returns a Promise that can signal when its done.
 *
 * @param  {Boolean} logging Whether the internal activity should be logged.
 * @return {Promise}         A Promise that is resolved after all projects have finished their lifecycle
 */
function start(logging) {
    return new Promise((done, fail) => {
        log(logging, "Loading Projects...");

        projects.getProjects(logging).then((jobs) => {
            global.status.jobs = jobs.slice(0);

            for (var index in jobs) {
                global.status.task[jobs[index].author + "/" + jobs[index].repo + "/" + jobs[index].branch] = "Queued";
            }

            var i = -1;

            var nextJob = () => {
                i++;

                if (!global.status.running || i >= jobs.length) done();
                else {
                    log(logging, "");
                    log(logging, "Watching: " + jobs[i].author + "/" + jobs[i].repo + ":" + jobs[i].branch)

                    let job = jobs[i];

                    // Project Lifecycle
                    check(job, logging).then(() =>
                        update(job, logging).then(() =>
                            compile(job, logging).then(() =>
                                gatherResources(job, logging).then(() =>
                                    upload(job, logging).then(() =>
                                        finish(job, logging).then(() => {
                                            global.status.task[jobs[i].author + "/" + jobs[i].repo + "/" + jobs[i].branch] = "Finished"
                                        }).then(nextJob, fail)
                                    , fail)
                                , fail)
                            , fail)
                        , fail)
                    , nextJob);
                }
            };

            nextJob();
        });
    });
}

/**
 * This method pulls the latest commit from github and
 * checks if it diverges from the local records.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function check(job, logging) {
    if (!global.status.running) return Promise.reject("The operation has been cancelled");
    if (!projects.isValid(job, false)) return Promise.reject("Invalid Job!");

    global.status.task[job.author + "/" + job.repo + "/" + job.branch] = "Pulling Commits";
    return new Promise((resolve, reject) => {
        github.getLatestCommit(job, logging).then((commit) => {
            var timestamp = parseInt(commit.commit.committer.date.replace(/\D/g, ""));

            job.commit = {
                sha: commit.sha,
                date: github.parseDate(commit.commit.committer.date),
                timestamp: timestamp,
                message: commit.commit.message,
                author: commit.author.login,
                avatar: commit.author.avatar_url
            }

            github.hasUpdate(job, timestamp, logging).then((id) => {
                job.id = id + 1;

                projects.clearWorkspace(job).then(resolve, reject);
            }, reject);
        }, reject);
    });
}

/**
 * This method updates a Projects build number and
 * changes it's pom.xml file to include this version.
 * It also clones the repository.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function update(job, logging) {
    if (!global.status.running) return Promise.reject("The operation has been cancelled");
    if (!projects.isValid(job, false)) return Promise.reject("Invalid Job!");

    global.status.task[job.author + "/" + job.repo + "/" + job.branch] = "Cloning Repository";
    return new Promise((resolve, reject) => {
        log(logging, "Updating: " + job.author + "/" + job.repo + ":" + job.branch + " (" + job.id + ")");

        github.clone(job, job.commit.sha, logging).then(() => {
            maven.setVersion(job, (job.options.prefix ? job.options.prefix: "DEV") + " - " + job.id + " (git " + job.commit.sha.substr(0, 8) + ")", true).then(resolve, reject);
        }, reject);
    });
}

/**
 * This method compiles the project using Maven.
 * After completing, the job update will have the flag 'success',
 * that is either true or false.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function compile(job, logging) {
    if (!global.status.running) return Promise.reject("The operation has been cancelled");
    if (!projects.isValid(job, false)) return Promise.reject("Invalid Job!");

    global.status.task[job.author + "/" + job.repo + "/" + job.branch] = "Compiling";
    return new Promise((resolve) => {
        log(logging, "Compiling: " + job.author + "/" + job.repo + ":" + job.branch + " (" + job.id + ")");

        maven.compile(job, cfg, logging)
        .then(() => {
            job.success = true;
            resolve();
        })
        .catch((err) => {
            log(logging, err.stack);
            job.success = false;
            resolve();
        });
    });
}

/**
 * This method pulls all resources from github, such as the license,
 * all version tags and also relocates the exported .jar file to the main project folder.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function gatherResources(job, logging) {
    if (!global.status.running) return Promise.reject("The operation has been cancelled");
    if (!projects.isValid(job, true)) return Promise.reject("Invalid Job!");

    global.status.task[job.author + "/" + job.repo + "/" + job.branch] = "Fetching Resources";
    return new Promise((resolve, reject) => {
        log(logging, "Gathering Resources: " + job.author + "/" + job.repo + ":" + job.branch);

        Promise.all([
            github.getLicense(job, logging),
            github.getTags(job, logging),
            maven.relocate(job)
        ]).then((values) => {
            var license = values[0];
            var tags = values[1];

            job.license = {
                name: license.license.name,
                id: license.license.spdx_id,
                url: license.download_url
            };

            job.tags = {};

            for (var index in tags) {
                job.tags[tags[index].name] = tags[index].commit.sha;
            }

            resolve();
        }, reject)
    });
}

/**
 * This method updates the builds.json file,
 * generates a new index.html and badge.svg file for the project.
 * It will also signal this Update to our Discord Webhook.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function upload(job, logging) {
    if (!global.status.running) return Promise.reject("The operation has been cancelled");
    if (!projects.isValid(job, true)) return Promise.reject("Invalid Job!");

    global.status.task[job.author + "/" + job.repo + "/" + job.branch] = "Preparing Upload";
    return new Promise((resolve, reject) => {
        var promises = [
            projects.addBuild(job, logging),
            projects.generateHTML(job, logging),
            projects.generateBadge(job, logging)
        ];

        log(logging, "Uploading: " + job.author + "/" + job.repo + ":" + job.branch + " (" + job.id + ")");
        if (logging) promises.push(discord.sendUpdate(job));

        Promise.all(promises).then(resolve, reject);
    });
}

/**
 * This method will finish the lifecycle.
 * It pushes all changed files to github.
 * It will also clear the project file for the next iteration.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function finish(job, logging) {
    if (!global.status.running) return Promise.reject("The operation has been cancelled");
    if (!projects.isValid(job, true)) return Promise.reject("Invalid Job!");

    global.status.task[job.author + "/" + job.repo + "/" + job.branch] = "Uploading";
    return Promise.all([
        github.pushChanges(job, logging),
        projects.clearWorkspace(job)
    ]);
}
