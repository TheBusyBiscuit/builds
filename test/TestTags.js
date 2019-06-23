module.exports = (assert, github) => {
    return function() {
        this.timeout(8000);

        it("should reject for an invalid Job (null)", () => {
            return assert.isRejected(github.getTags(null));
        });

        it("should reject for an invalid Job (undefined)", () => {
            return assert.isRejected(github.getTags(undefined));
        });

        it("should reject for an invalid Job (String)", () => {
            return assert.isRejected(github.getTags("This will not work"));
        });

        it("should reject for an invalid Job (Array)", () => {
            return assert.isRejected(github.getTags([]));
        });

        it("should reject for an invalid Job (Missing parameter)", () => {
            return assert.isRejected(github.getTags({repo: "Nope"}));
        });

        it("should reject for an invalid Job (parameter of wrong Type)", () => {
            return assert.isRejected(github.getTags({author: "Hi", repo: 18}));
        });

        it("should resolve for 'TheBusyBiscuit/GitHubWebAPI4Java'", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "GitHubWebAPI4Java",
                branch: "master"
            }

            return github.getTags(job).then((tags) => Promise.all([
                assert.exists(tags),
                assert.notExists(tags.documentation_url),
                assert.isArray(tags),

                assert.exists(tags[0]),
                assert.exists(tags[0].name)
            ]));
        });

        it("should resolve with an empty Array for 'TheBusyBiscuit/Slimecraft' (No Tags)", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "Slimecraft",
                branch: "master"
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
                branch: "master"
            }

            return assert.isRejected(github.getTags(job));
        });
    }
}
