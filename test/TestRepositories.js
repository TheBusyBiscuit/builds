const FileSystem = require('fs');
const fs = FileSystem.promises;
const path = require("path");

const chai = require('chai');
chai.use(require('chai-as-promised'));
const {assert} = chai;

const cfg = require('../src/config.js')(path.resolve(__dirname, "../resources/config.json"));
const github = require('../src/github.js')(cfg.github);
const projects = require('../src/projects.js');

fs.readFile(path.resolve(__dirname, "../resources/repos.json")).then((data) => {
    var json = JSON.parse(data);

    describe("Repository Integrity Test", () => {
        it("is valid JSON", () => {
            return assert.exists(json);
        });

        it("is a JSON Object", () => {
            return assert.isObject(json);
        });

        it("can transform into a Job Queue", () => projects.getProjects().then((jobs) => assert.isArray(jobs)));
    });

    describe("Repository Validator", () => {
        for (var repo in json) {
            validate(repo);
        }
    });
});

function validate(repo) {
    describe(repo, () => {
        it('follows the Pattern: (.*\/.*:.*)', () => {
            return assert.match(repo, /.*\/.*:.*/);
        });

        it('is a valid Job', () => {
            var job = {
                author: repo.split("/")[0],
                repo: repo.split("/")[1].split(":")[0],
                branch: repo.split("/")[1].split(":")[1]
            }
			
			job.directory = job.author + "/" + job.repo + "/" + job.branch;

            return assert.isTrue(projects.isValid(job));
        });

        it('exists on GitHub', function() {
            this.timeout(5000);

            var job = {
                author: repo.split("/")[0],
                repo: repo.split("/")[1].split(":")[0],
                branch: repo.split("/")[1].split(":")[1]
            }
			
			job.directory = job.author + "/" + job.repo + "/" + job.branch;

            return assert.isFulfilled(github.exists(job));
        });
    });
}
