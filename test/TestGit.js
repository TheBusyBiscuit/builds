const testJobs = require('../test/TestJobs.js');

module.exports = (github) => () => {
    describe("git clone", () => {
        testJobs(false, (job) => github.clone(job));
    });

    describe("git push", () => {
        testJobs(false, (job) => github.pushChanges(job));
    });
};
