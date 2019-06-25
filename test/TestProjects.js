const testJobs = require('../test/TestJobs.js');
const projects = require('../src/projects.js');

describe("Job Validator Test", () => {
    describe("projects.addBuild()", () => {
        testJobs(true, (job) => projects.addBuild(job));
    });
    describe("projects.generateHTML()", () => {
        testJobs(false, (job) => projects.generateHTML(job));
    });
    describe("projects.generateBadge()", () => {
        testJobs(false, (job) => projects.generateBadge(job));
    });
    describe("projects.clearWorkspace()", () => {
        testJobs(false, (job) => projects.clearWorkspace(job));
    });
});
