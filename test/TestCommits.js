module.exports = (assert, github) => {
    return function() {
        this.timeout(8000);

        it("should reject for an invalid Job (null)", () => {
            return assert.isRejected(github.getLatestCommit(null));
        });

        it("should reject for an invalid Job (undefined)", () => {
            return assert.isRejected(github.getLatestCommit(undefined));
        });

        it("should reject for an invalid Job (String)", () => {
            return assert.isRejected(github.getLatestCommit("This will not work"));
        });

        it("should reject for an invalid Job (Array)", () => {
            return assert.isRejected(github.getLatestCommit([]));
        });

        it("should reject for an invalid Job (Missing parameter)", () => {
            return assert.isRejected(github.getLatestCommit({repo: "Nope"}));
        });

        it("should reject for an invalid Job (parameter of wrong Type)", () => {
            return assert.isRejected(github.getLatestCommit({author: "Hi", repo: 18}));
        });

        it("should resolve for 'TheBusyBiscuit/builds:gh-pages'", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "builds",
                branch: "gh-pages"
            }

            return github.getLatestCommit(job).then((commit) => Promise.all([
                assert.exists(commit),
                assert.isObject(commit),

                assert.notExists(commit.documentation_url),

                assert.exists(commit.sha),
                assert.exists(commit.author),
                assert.exists(commit.commit.message)
            ]));
        });

        it("should reject for 'TheBusyBiscuit/builds:nope' (Invalid branch)", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "builds",
                branch: "nope"
            }

            return assert.isRejected(github.getLatestCommit(job));
        });

        it("should reject for 'TheBusyBiscuit/____:master' (Not-existing Repository)", () => {
            var job = {
                author: "TheBusyBiscuit",
                repo: "____",
                branch: "master"
            }

            return assert.isRejected(github.getLatestCommit(job));
        });
    }
}
