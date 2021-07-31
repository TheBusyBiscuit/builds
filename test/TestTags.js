const testJobs = require('../test/TestJobs.js');

module.exports = (assert, github) => {
    return function() {
        this.timeout(8000);

        testJobs(false, (job) => github.getTags(job));

        it("should resolve for 'TheBusyBiscuit/GitHubWebAPI4Java'", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "GitHubWebAPI4Java",
                branch: "master",
                directory: "TheBusyBiscuit/GitHubWebAPI4Java/master"
            }

            return github.getTags(job).then((tags) => Promise.all([
                assert.exists(tags),
                assert.notExists(tags.documentation_url),
                assert.isArray(tags),

                assert.exists(tags[0]),
                assert.exists(tags[0].name)
            ]));
        });

        it("should resolve with an empty Array for 'TheBusyBiscuit/TheBusyBiscuit:main' (No Tags)", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "TheBusyBiscuit",
                branch: "main",
                directory: "TheBusyBiscuit/TheBusyBiscuit/main"
            }

            return github.getTags(job).then((tags) => {
                assert.exists(tags);
                assert.notExists(tags.documentation_url);
                assert.isArray(tags);
                assert.isEmpty(tags);
            });
        });

        it("should reject for 'TheBusyBiscuit/____' (Not-existing Repository)", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "____",
                branch: "master",
                directory: "TheBusyBiscuit/____/master"
            }

            return assert.isRejected(github.getTags(job));
        });
    }
}
