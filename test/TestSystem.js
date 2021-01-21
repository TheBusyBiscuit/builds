const system = require('../src/main.js');
const path = require('path');
const FileSystem = require('fs');
const projects = require('../src/projects.js');

const chai = require('chai');
chai.use(require('chai-as-promised'));
const { assert } = chai;

const testJobs = require('../test/TestJobs.js');

// A public sample Maven project
var job = {
    author: "jitpack",
    repo: "maven-simple",
    branch: "master",
    directory: "jitpack/maven-simple/master"
}

describe("Full System Test", function() {
    this.timeout(60000);

    before(() => {
        global.status = {
            task: {},
            running: true
        };
    });

    before(cleanup);

    it("has a valid Config", () => assert.isNotNull(system.getConfig()));

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
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.directory + "/files/target/" + job.repo + "-" + job.id + ".jar")))
        ]))
    );

    it("passes stage 'gatherResources' (getLicense & getTags & relocate)", () =>
        system.gatherResources(job).then(() => Promise.all([
            assert.exists(job.license),
            assert.isObject(job.license),
            assert.exists(job.tags),
            assert.isObject(job.tags),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.directory + "/" + job.repo + "-" + job.id + ".jar")))
        ]))
    );


    it("passes stage 'upload' - first build (addBuild & generateHTML & generateBadge)", async () => {
        await system.upload(job);
        return Promise.all([
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.directory + "/builds.json"))),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.directory + "/index.html"))),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.directory + "/badge.svg")))
        ]);
    });

    it("passes stage 'upload' - second build (addBuild & generateHTML & generateBadge)", async () => {
        job.id = 2;
        job.success = false;
        job.tags = {};
        job.tags["1.0"] = job.commit.sha;

        await system.upload(job);
        return Promise.all([
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.directory + "/builds.json"))),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.directory + "/index.html"))),
            assert.isTrue(FileSystem.existsSync(path.resolve(__dirname, "../" + job.directory + "/badge.svg")))
        ]);
    });

    it("properly communicates status", () =>
        assert.strictEqual(global.status.task[job.directory], "Preparing Upload")
    );

    it("can handle failed builds", () =>
        FileSystem.promises.writeFile(path.resolve(__dirname, "../" + job.directory + "/files/src/main/java/com/github/jitpack/App.java"), "This will not compile.", "utf8").then(() =>
            system.compile(job).then(() => Promise.all([
                assert.exists(job.success),
                assert.isFalse(job.success)
            ]))
        )
    );

    describe("Job Validator", () => {
        describe("Stage 'check'", () => {
            testJobs(false, (job) => system.check(job))
        });
        describe("Stage 'update'", () => {
            testJobs(false, (job) => system.update(job))
        });
        describe("Stage 'compile'", () => {
            testJobs(false, (job) => system.compile(job))
        });
        describe("Stage 'gatherResources'", () => {
            testJobs(true, (job) => system.gatherResources(job))
        });
        describe("Stage 'upload'", () => {
            testJobs(true, (job) => system.upload(job))
        });
        describe("Stage 'finish'", () => {
            testJobs(true, (job) => system.finish(job))
        });
    });

    describe("global.status.running = false", () => {
        it("will report stage 'start' as successful", () => {
            global.status.running = false;
            return assert.isFulfilled(system.start());
        });

        it("will abort stage 'check'", () => {
            global.status.running = false;
            return assert.isRejected(system.check());
        });

        it("will abort stage 'update'", () => {
            global.status.running = false;
            return assert.isRejected(system.update());
        });

        it("will abort stage 'compile'", () => {
            global.status.running = false;
            return assert.isRejected(system.compile());
        });

        it("will abort stage 'gatherResources'", () => {
            global.status.running = false;
            return assert.isRejected(system.gatherResources());
        });

        it("will abort stage 'upload'", () => {
            global.status.running = false;
            return assert.isRejected(system.upload());
        });

        it("will abort stage 'finish'", () => {
            global.status.running = false;
            return assert.isRejected(system.finish());
        });

    })

    after(cleanup);
});

function cleanup() {
    let file = path.resolve(__dirname, "../" + job.author);

    if (!FileSystem.existsSync(file)) return Promise.resolve();
    else return projects.clearFolder(file);
}
