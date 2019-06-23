const chai = require('chai');
chai.use(require('chai-as-promised'));
const {assert} = chai;

const maven = require('../src/maven.js');

describe("Maven Test", () => {
    describe("Job Validator", () => {
        it("should return false for an invalid Job (null)", () => {
            return assert.isFalse(maven.isValid(null));
        });

        it("should return false for an invalid Job (undefined)", () => {
            return assert.isFalse(maven.isValid(undefined));
        });

        it("should return false for an invalid Job (String)", () => {
            return assert.isFalse(maven.isValid("This will not work"));
        });

        it("should return false for an invalid Job (Array)", () => {
            return assert.isFalse(maven.isValid([]));
        });

        it("should return false for an invalid Job (Missing parameter)", () => {
            return assert.isFalse(maven.isValid({repo: "Nope"}));
        });

        it("should return false for an invalid Job (parameter of wrong Type)", () => {
            return assert.isFalse(maven.isValid({author: "Hi", repo: "Nope", branch: "master", id: "lol"}));
        });

        it("should return true for a valid Job", () => {
            return assert.isTrue(maven.isValid({author: "TheBusyBiscuit", repo: "builds", branch: "master", id: 1, success: false}));
        });
    });
});
