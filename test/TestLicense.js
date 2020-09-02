const testJobs = require('../test/TestJobs.js');

module.exports = (assert, github) => {
    return function() {
        this.timeout(8000);

        testJobs(false, (job) => github.getLicense(job));

        it("should resolve for 'TheBusyBiscuit/builds'", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "builds",
                branch: "gh-pages",
				directory: "TheBusyBiscuit/builds/gh-pages"
            }

            return github.getLicense(job).then((license) => Promise.all([
                assert.exists(license),
                assert.isObject(license),

                assert.notExists(license.documentation_url),

                assert.exists(license.name),
                assert.exists(license.path),
                assert.exists(license.license.spdx_id)
            ]));
        });

        it("should reject for 'TheBusyBiscuit/____' (Not-existing Repository)", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "____",
                branch: "master"
            }

            return assert.isRejected(github.getLicense(job));
        });

        it("should reject for 'TheBusyBiscuit/Slimecraft' (No License)", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "Slimecraft",
                branch: "master"
            }

            return assert.isRejected(github.getLicense(job));
        });
    }
}
