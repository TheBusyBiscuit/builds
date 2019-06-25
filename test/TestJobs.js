const chai = require('chai');
chai.use(require('chai-as-promised'));
const {assert} = chai;

module.exports = (includeID, func) => {
    it("should reject for an invalid Job (null)", () => {
        return assert.isRejected(func(null));
    });

    it("should reject for an invalid Job (undefined)", () => {
        return assert.isRejected(func(undefined));
    });

    it("should reject for an invalid Job (String)", () => {
        return assert.isRejected(func("This will not work"));
    });

    it("should reject for an invalid Job (Array)", () => {
        return assert.isRejected(func([]));
    });

    it("should reject for an invalid Job (Missing repo)", () => {
        return assert.isRejected(func({author: "Nope"}));
    });

    it("should reject for an invalid Job (Missing author)", () => {
        return assert.isRejected(func({repo: "Nope"}));
    });

    it("should reject for an invalid Job (Missing branch)", () => {
        return assert.isRejected(func({author: "Derp", repo: "Nope"}));
    });

    it("should reject for an invalid Job (author of wrong Type)", () => {
        return assert.isRejected(func({author: 12, repo: "Derp", branch: "Nope"}));
    });

    it("should reject for an invalid Job (repo of wrong Type)", () => {
        return assert.isRejected(func({author: "Hi", repo: 18, branch: "Nope"}));
    });

    it("should reject for an invalid Job (branch of wrong Type)", () => {
        return assert.isRejected(func({author: "Hi", repo: "Hello", branch: []}));
    });

    if (includeID) {
        it("should reject for an invalid Job (missing ID)", () => {
            return assert.isRejected(func({author: "Hi", repo: "Hello", branch: "Branch"}));
        });

        it("should reject for an invalid Job (ID of wrong Type)", () => {
            return assert.isRejected(func({author: "Hi", repo: "Hello", branch: "Branch", id: "Derp"}));
        });

        it("should reject for an invalid Job (missing success-value)", () => {
            return assert.isRejected(func({author: "Hi", repo: "Hello", branch: "Branch", id: 2}));
        });

        it("should reject for an invalid Job (success of wrong Type)", () => {
            return assert.isRejected(func({author: "Hi", repo: "Hello", branch: "Branch", id: 2, success: 17}));
        });
    }
}
