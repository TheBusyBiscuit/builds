module.exports = (assert, github) => {
    return function() {

        it("should reject for an invalid Job (null)", () => {
            return assert.isRejected(github.hasUpdate(null));
        });

        it("should reject for an invalid Job (undefined)", () => {
            return assert.isRejected(github.hasUpdate(undefined));
        });

        it("should reject for an invalid Job (String)", () => {
            return assert.isRejected(github.hasUpdate("This will not work"));
        });

        it("should reject for an invalid Job (Array)", () => {
            return assert.isRejected(github.hasUpdate([]));
        });

        it("should reject for an invalid Job (Missing parameter)", () => {
            return assert.isRejected(github.hasUpdate({repo: "Nope"}));
        });

        it("should reject for an invalid Job (parameter of wrong Type)", () => {
            return assert.isRejected(github.hasUpdate({author: "Hi", repo: 18}));
        });

        it("should resolve for '____/____:master' (No Builds yet)", () => {
            var job = {
                author: "____",
                repo: "____",
                branch: "master"
            }

            return assert.isFulfilled(github.hasUpdate(job, 20172611114944));
        });

        it("should reject for 'testRepository/repo:master' (Same Timestamp)", () => {
            var job = {
                author: "testRepository",
                repo: "repo",
                branch: "master"
            }

            return assert.isRejected(github.hasUpdate(job, 20190609123203));
        });

        it("should reject for 'testRepository/repo:master' (Older Timestamp)", () => {
            var job = {
                author: "testRepository",
                repo: "repo",
                branch: "master"
            }

            return assert.isRejected(github.hasUpdate(job, 20190609021406));
        });

        it("should resolve for 'testRepository/repo:master' (Newer Timestamp)", () => {
            var job = {
                author: "testRepository",
                repo: "repo",
                branch: "master"
            }

            return assert.isFulfilled(github.hasUpdate(job, 20290639123203));
        });
    }
}
