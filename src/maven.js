const XML = require('xml-library');
const process = require('child-process-promise');

const FileSystem = require('fs');
const fs = FileSystem.promises;
const path = require('path');

const log = require('../src/logger.js');

const minify = {
    indent: 0,
    header: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    new_lines: false
};

const beautify = {
    indent: 4,
    header: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    new_lines: true
};

module.exports = {
    setVersion,
    compile,
    relocate,
    isValid
};

/**
 * This method changes the project's version in your pom.xml file
 * It also returns a Promise that resolves when it's done.
 *
 * @param {Object} job      The currently handled Job Object
 * @param {String} version  The Version that shall be set
 * @param {Boolean} compact Whether the XML can be minified. This will also change the finalName
 */
function setVersion(job, version, compact) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) {
            reject("Invalid Job");
            return;
        }

        var file = path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/files/pom.xml");

        fs.readFile(file, "utf8").then((data) => {
            XML.promises.fromXML(data).then((json) => {
                json.getChild("version").setValue(version);

                if (compact) {
                    var node = json.getChild(["build", "finalName"]);

                    if (node) {
                        node.setValue(job.repo + "-" + job.id);
                    }
                    else {
                        json.getChild("build").addChild(new XML.XMLNode("finalName", null, null, job.repo + "-" + job.id));
                    }
                }

                XML.promises.toXML(json, compact ? minify: beautify).then((xml) => {
                    FileSystem.writeFile(file, xml, "utf8", (e) => {
                        if (e) reject(e);
                        else resolve();
                    });
                }, reject);
            }, reject);
        }, reject);
    });
}

/**
 * This method will compile a project using the command
 * 'mvn clean package -B'
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function compile(job, cfg, logging) {
    return new Promise((resolve, reject) => {
        if (!isValid(job)) {
            reject("Invalid Job");
            return;
        }
        log(logging, "-> Executing 'mvn package'");

        var args = ["clean", "package", "-B"];

        if (job.sonar && job.sonar.enabled && cfg.sonar.isEnabled()) {
            args.push("sonar:sonar");
            args.push("-Dsonar.login=" + cfg.sonar.getToken());
            args.push("-Dsonar.host.url=" + job.sonar["host-url"]);
            args.push("-Dsonar.organization=" + job.sonar["organization"]);
            args.push("-Dsonar.projectKey=" + job.sonar["project-key"]);
        }

        var compiler = process.spawn("mvn", args, {
            cwd: path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/files"),
            shell: true
        });

        var logger = (data) => {
            log(logging, data, true);
            FileSystem.appendFile(path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/" + job.repo + "-" + job.id + ".log"), data, "UTF-8", function(err) {
                if (err) {
                    console.log(err);
                }
            });
        };

        compiler.childProcess.stdout.on('data', logger);
        compiler.childProcess.stderr.on('data', logger);

        compiler.then(resolve, reject);
    });
}

/**
 * This method will relocate a project's compiled jar file
 * to the appropriate directory
 *
 * @param  {Object} job      The currently handled Job Object
 * @return {Promise}         A promise that resolves when this activity finished
 */
function relocate(job) {
    if (!job.success) return Promise.resolve();

    return fs.rename(
        path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/files/target/" + job.repo + "-" + job.id + ".jar"),
        path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/" + job.repo + "-" + job.id + ".jar")
    );
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
    if (!Number.isInteger(job.id)) return false;

    return true;
}
