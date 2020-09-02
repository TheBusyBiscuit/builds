const testJobs = require('../test/TestJobs.js');

module.exports = (assert, github) => {
    return function() {
        testJobs(false, (job) => github.hasUpdate(job));

        it("should resolve for '____/____:master' (No Builds yet)", () => {
            var job = {
                author: "____",
                repo: "____",
                branch: "master",
				directory: "____/____/master"
            }

            return assert.isFulfilled(github.hasUpdate(job, 20172611114944));
        });

        it("should reject for 'testRepository/repo:master' (Same Timestamp)", () => {
            var job = {
                author: "testRepository",
                repo: "repo",
                branch: "master",
				directory: "testRepository/repo/master"
            }

            return assert.isRejected(github.hasUpdate(job, 20190609123203));
        });

        it("should reject for 'testRepository/repo:master' (Older Timestamp)", () => {
            var job = {
                author: "testRepository",
                repo: "repo",
                branch: "master",
				directory: "testRepository/repo/master"
            }

            return assert.isRejected(github.hasUpdate(job, 20190609021406));
        });

        it("should resolve for 'testRepository/repo:master' (Newer Timestamp)", () => {
            var job = {
                author: "testRepository",
                repo: "repo",
                branch: "master",
				directory: "testRepository/repo/master"
            }

            return assert.isFulfilled(github.hasUpdate(job, 20290639123203));
        });
    }
}
