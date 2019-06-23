const request = require('request-promise-native');
const process = require('child-process-promise');

const FileSystem = require('fs');
const fs = FileSystem.promises;
const path = require('path');

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

module.exports = (token) => {
    return {
        /**
         * This method will return the latest Commit for the specified Job
         *
         * @param  {Object} job         The currently handled Job Object
         * @param  {Boolean} logging    Whether the internal behaviour should be logged
         * @return {Promise<Object>}    This will return a Promise that resolve with the latest commits
         */
        getLatestCommit: (job, logging) => getLatestCommit(job, token, logging),

        /**
         * This method will return a repository's license.
         * The Promise will reject if no License was found.
         *
         * @param  {Object} job         The currently handled Job Object
         * @param  {Boolean} logging    Whether the internal behaviour should be logged
         * @return {Promise}            This will return a Promise that resolve with the project license
         */
        getLicense: (job, logging) => getLicense(job, token, logging),

        /**
         * This method will return a repository's tags.
         * The Promise will also resolve if no tags exist.
         *
         * @param  {Object} job  The currently handled Job Object
         * @return {Promise}     This will return a Promise that resolve with the project tags
         */
        getTags: (job, logging) => getTags(job, token, logging),

        /**
         * This method will return a Promise.
         * The Promise will resolve if the Repository exists, otherwise it will reject.
         *
         * @param  {Object} job  The currently handled Job Object
         * @return {Promise}     This will return a Promise that resolve if the repository exists
         */
        exists: (job) => exists(job, token),

        clone,
        pushChanges,
        hasUpdate,
        isValid,
        parseDate
    }
};

/**
 * This method will return the latest Commit for the specified Job
 *
 * @param  {Object} job         The currently handled Job Object
 * @param  {Boolean} logging    Whether the internal behaviour should be logged
 * @return {Promise<Object>}    This will return a Promise that resolve with the latest commits
 */
function getLatestCommit(job, token, logging) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) reject("Invalid Job");
        if (logging) console.log("-> Fetching latest Commit...");

        let url = getURL(job, token, "/commits?per_page=1&sha=" + job.branch);
        url.json = true;

        request(url).then((json) => {
            if (json.documentation_url != null) reject("404 - Incomplete JSON");
            else {
                if (logging) console.log("-> Commits: 200 - OK");
                resolve(json[0]);
            }
        }, reject);
    });
}

/**
 * This method will return a repository's license.
 * The Promise will reject if no License was found.
 *
 * @param  {Object} job         The currently handled Job Object
 * @param  {Boolean} logging    Whether the internal behaviour should be logged
 * @return {Promise}            This will return a Promise that resolve with the project license
 */
function getLicense(job, token, logging) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) reject("Invalid Job");
        if (logging) console.log("-> Fetching License...");
        getJSON(job, token, logging, "license", resolve, reject);
    });
}

/**
 * This method will return a repository's tags.
 * The Promise will also resolve if no tags exist.
 *
 * @param  {Object} job  The currently handled Job Object
 * @return {Promise}     This will return a Promise that resolve with the project tags
 */
function getTags(job, token, logging) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) reject("Invalid Job");
        if (logging) console.log("-> Fetching Tags...");
        getJSON(job, token, logging, "tags", resolve, reject);
    });
}

/**
 * A private utility method for fetching JSON Objects from GitHub's API
 */
function getJSON(job, token, logging, endpoint, resolve, reject) {
    let url = getURL(job, token, "/" + endpoint);
    url.json = true;

    request(url).then((json) => {
        if (json.documentation_url != null) reject("404 - Incomplete JSON");
        else {
            if (logging) console.log("-> Tags: 200 - OK");
            resolve(json);
        }
    }, reject);
}

/**
 * This method will return a Promise.
 * The Promise will resolve if the Repository exists, otherwise it will reject.
 *
 * @param  {Object} job  The currently handled Job Object
 * @return {Promise}     This will return a Promise that resolve if the repository exists
 */
function exists(job, token) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) reject("Invalid Job");

        let url = getURL(job, token, "");
        url.json = true;

        request(url).then((json) => {
            if (json.documentation_url != null) reject("404 - Incomplete JSON");
            else resolve(json);
        }, reject);
    });
}

/**
 * This method will return a Promise.
 * The Promise will resolve if the local records diverge from the github-remote.
 * Aka when there are new commits to compile.
 *
 * @param  {Object} job     The currently handled Job Object
 * @param  {Number} timestamp  The timestamp of a commit returned by getCommits(job)
 * @return {Promise}        This will return a Promise that resolve if there are new uncompiled commits
 */
function hasUpdate(job, timestamp) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) reject("Invalid Job");

        var file = path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/builds.json");

        if (FileSystem.existsSync(file)) {
            fs.readFile(file, "utf8")
            .then((data) => {
                if (!data) resolve(0); // Pretend like there is an Update if no local builds exist
                var json = JSON.parse(data);

                if (!json.latest) resolve(0); // Pretend like there is an Update if no local builds exist
                else if (timestamp > json[json.latest].timestamp) resolve(json.latest);
                else reject();
            }, () => resolve(0))
        }
        else resolve(0); // Pretend like there is an Update if no local builds exist
    });
}

/**
 * This function clones a GitHub Repository to the Hard Drive.
 * It also returns a Promise that is resolved when the cloning-process finished successfully
 *
 * @param  {Object} job         The currently handled Job Object
 * @param  {String} commit      The commit's SHA that marks the state of the repository
 * @param  {Boolean} logging    Whether the internal behaviour should be logged
 * @return {Promise}            A Promise that resolved upon a successful cloning process
 */
function clone(job, commit, logging) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) reject("Invalid Job");
        if (logging) console.log("-> Executing 'git clone'");

        var cloning = process.spawn("git", [
            "clone",
            "https://github.com/" + job.author + "/" + job.repo + ".git",
            path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/files"),
            "-b", job.branch,
            "--single-branch"
        ]);

        if (logging) {
            cloning.childProcess.stdout.on('data', (data) => console.log("-> " + data));
            cloning.childProcess.stderr.on('data', (data) => console.log("-> " + data));
        }

        cloning.then(() => {
            if (logging) {
                console.log("-> Finished 'git clone'");
                console.log("-> Executing 'git reset'");
            }

            var refresh = process.spawn("git", [
                "reset",
                "--hard",
                commit
            ], {
                cwd: path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/files")
            });

            if (logging) {
                refresh.childProcess.stdout.on('data', (data) => console.log("-> " + data));
                refresh.childProcess.stderr.on('data', (data) => console.log("-> " + data));
            }

            refresh.then(() => {
                if (logging) console.log("-> Finished 'git reset'");
                resolve();
            }, reject);
        }, reject);
    });
}


/**
 * This method pushes all project files from the specified job to github.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function pushChanges(job, logging) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) reject("Invalid Job");
        if (logging) console.log("-> Executing 'git add'");

        var add = process.spawn("git", [
            "add",
            path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/*")
        ]);

        if (logging) {
            add.childProcess.stdout.on('data', (data) => console.log("-> " + data));
            add.childProcess.stderr.on('data', (data) => console.log("-> " + data));
        }

        add.then(() => {
            if (logging) {
                console.log("-> Finished 'git add'");
                console.log("-> Executing 'git commit'");
            }

            var commit = process.spawn("git", [
                "commit",
                "-m",
                (job.success ? "Successfully compiled: ": "Failed to compile: ") + job.author + "/" + job.repo + ":" + job.branch + " (" + job.id + ")"
            ]);

            if (logging) {
                commit.childProcess.stdout.on('data', (data) => console.log("-> " + data));
                commit.childProcess.stderr.on('data', (data) => console.log("-> " + data));
            }

            commit.then(() => {
                if (logging) {
                    console.log("-> Finished 'git commit'");
                    console.log("-> Executing 'git push'");
                }

                var push = process.spawn("git", ["push"]);

                if (logging) {
                    push.childProcess.stdout.on('data', (data) => console.log("-> " + data));
                    push.childProcess.stderr.on('data', (data) => console.log("-> " + data));
                }

                push.then(() => {
                    if (logging) console.log("-> Finished 'git push'");
                    resolve();
                }, reject);
            }, reject);
        }, reject);
    });
}

/**
 * This method will return the github api path
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {String} endpoint The endpoint of this URL
 * @return {Object}          A Github-API URL Object
 */
function getURL(job, token, endpoint) {
    var url = "https://api.github.com/repos/" + job.author + "/" + job.repo + endpoint;

    if (token != null) {
        url += (endpoint.includes("?") ? "&": "?") + "access_token=" + token;
    }

    return {
        url: url,
        headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "The Busy Biscuit's Repository Compiler",
            "Time-Zone": "UTC"
        }
    };
}

/**
 * This method will check if a Job is valid.
 * null / undefined or incomplete Job Objects will fail.
 *
 * @param  {Object}  job The job object to be tested
 * @return {Boolean}     Whether the job is a valid Job
 */
function isValid(job) {
    if (!job) return false;
    if (Object.getPrototypeOf(job) !== Object.prototype) return false;
    if (!(typeof job.author === 'string' || job.author instanceof String)) return false;
    if (!(typeof job.repo === 'string' || job.repo instanceof String)) return false;
    if (!(typeof job.branch === 'string' || job.branch instanceof String)) return false;

    return true;
}

/**
 * This converts a GitHub-Date into a human-readable format
 *
 * @param  {String} str A Date returned from GitHub
 * @return {String}     A formatted human-readable Date format
 */
function parseDate(str) {
    var date = "";

    date += str.split("T")[0].split("-")[2] + " ";
    date += months[parseInt(str.split("T")[0].split("-")[1]) - 1] + " ";
    date += str.split("T")[0].split("-")[0] + " (";
    date += str.split("T")[1].replace("Z", "") + ")";

    return date;
}
