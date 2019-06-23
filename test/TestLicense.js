module.exports = (assert, github) => {
    return function() {
        this.timeout(8000);

        it("should reject for an invalid Job (null)", () => {
            return assert.isRejected(github.getLicense(null));
        });

        it("should reject for an invalid Job (undefined)", () => {
            return assert.isRejected(github.getLicense(undefined));
        });

        it("should reject for an invalid Job (String)", () => {
            return assert.isRejected(github.getLicense("This will not work"));
        });

        it("should reject for an invalid Job (Array)", () => {
            return assert.isRejected(github.getLicense([]));
        });

        it("should reject for an invalid Job (Missing parameter)", () => {
            return assert.isRejected(github.getLicense({repo: "Nope"}));
        });

        it("should reject for an invalid Job (parameter of wrong Type)", () => {
            return assert.isRejected(github.getLicense({author: "Hi", repo: 18}));
        });

        it("should resolve for 'TheBusyBiscuit/builds'", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "builds",
                branch: "gh-pages"
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
