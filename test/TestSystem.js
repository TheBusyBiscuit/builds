const system = require('../src/main.js');
const path = require('path');
const FileSystem = require('fs');
const projects = require('../src/projects.js');

const chai = require('chai');
chai.use(require('chai-as-promised'));
const {assert} = chai;

// A public sample Maven project
var job = {
    author: "jitpack",
    repo: "maven-simple",
    branch: "master"
}

describe("Full System Test", function() {
    this.timeout(32000);

    before(() => {
        global.status = {
            task: {},
            running: true
        };
    });

    before(cleanup);

    it("passes stage 'check' (getLatestCommit & hasUpdate)", () =>
        system.check(job).then(() => Promise.all([
            assert.exists(job.id),
            assert.exists(job.commit),
            assert.isObject(job.commit),
            assert.exists(job.commit.sha),
            assert.exists(job.commit.timestamp),
            assert.exists(job.commit.date)
        ]))
    );

    it("passes stage 'update' (clone & setVersion)", () =>
        assert.isFulfilled(system.update(job))
    );

    it("passes stage 'compile' (compile)", () =>
        system.compile(job).then(() => Promise.all([
            assert.exists(job.success),
            assert.isTrue(job.success),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/files/target/" + job.repo + "-" + job.id + ".jar")))
        ]))
    );

    it("passes stage 'gatherResources' (getLicense & getTags & relocate)", () =>
        system.gatherResources(job).then(() => Promise.all([
            assert.exists(job.license),
            assert.isObject(job.license),
            assert.exists(job.tags),
            assert.isObject(job.tags),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/" + job.repo + "-" + job.id + ".jar")))
        ]))
    );

    it("passes stage 'upload' (addBuild & generateHTML & generateBadge)", () =>
        system.upload(job).then(() => Promise.all([
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/builds.json"))),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/index.html"))),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/badge.svg")))
        ]))
    );

    it("properly communicates status", () =>
        assert.strictEqual(global.status.task[job.author + "/" + job.repo + "/" + job.branch], "Fetching Resources")
    );

    it("can handle failed builds", () =>
        FileSystem.promises.writeFile(path.resolve(__dirname, "../" + job.author + "/" + job.repo + "/" + job.branch + "/files/src/main/java/com/github/jitpack/App.java"), "This will not compile.", "utf8").then(() =>
            system.compile(job).then(() => Promise.all([
                assert.exists(job.success),
                assert.isFalse(job.success)
            ]))
        )
    );

    after(cleanup);
});

function cleanup() {
    let file = path.resolve(__dirname, "../" + job.author);

    if (!FileSystem.existsSync(file)) return Promise.resolve();
    else return projects.clearFolder(file);
}
