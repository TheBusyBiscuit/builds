const chai = require('chai');
chai.use(require('chai-as-promised'));
const {assert} = chai;
const XML = require('xml-library');

const maven = require('../src/maven.js');
const testJobs = require('../test/TestJobs.js');

describe("Maven Test", () => {

    it("should do nothing but resolve when relocating a failed Job", () =>
        assert.isFulfilled(maven.relocate({
            author: "TheBusyBiscuit",
            repo: "builds",
            branch: "master",
            id: 1,
            success: false
        }))
    );

    describe("pom.xml Tests", () => {
        it("should create a compact pom.xml (pom.xml structure complete)", async () => {
            var json = await XML.promises.fromXML("<project><version>1.0</version><build><finalName>Project v1.0</finalName></build></project>");
            return maven.updatePOM({
                author: "TheBusyBiscuit",
                repo: "Test",
                branch: "master",
                id: 1,
                success: true
            }, json, "1.1", true).then((xml) => {
                return assert.equal(xml, "<?xml version=\"1.0\" encoding=\"UTF-8\"?><project><version>1.1</version><build><finalName>Test-1</finalName></build></project>");
            });
        });

        it("should create a compact pom.xml (pom.xml partially incomplete)", async () => {
            var json = await XML.promises.fromXML("<project><version>1.0</version><build></build></project>");
            return maven.updatePOM({
                author: "TheBusyBiscuit",
                repo: "Test",
                branch: "master",
                id: 1,
                success: true
            }, json, "1.1", true).then((xml) => {
                return assert.equal(xml, "<?xml version=\"1.0\" encoding=\"UTF-8\"?><project><version>1.1</version><build><finalName>Test-1</finalName></build></project>");
            });
        });

        it("should create a beautified pom.xml", async () => {
            var json = await XML.promises.fromXML("<project><version>1.0</version><build></build></project>");
            return assert.isFulfilled(maven.updatePOM({
                author: "TheBusyBiscuit",
                repo: "Test",
                branch: "master",
                id: 1,
                success: true
            }, json, "1.1", false));
        });
    });

    describe("Command Line Arguments", () => {
        it("should return args without sonar (sonar is disabled in config)", () => {
            return assert.notInclude(maven.getMavenArguments({
                author: "TheBusyBiscuit",
                repo: "Test",
                branch: "master",
                id: 1,
                success: true,
                sonar: {
                    enabled: true
                }
            }, {
                sonar: {
                    isEnabled: () => false,
                    getToken: () => "<NULL>"
                }
            }), "sonar:sonar");
        });

        it("should return args without sonar (sonar is disabled for this job)", () => {
            return assert.notInclude(maven.getMavenArguments({
                author: "TheBusyBiscuit",
                repo: "Test",
                branch: "master",
                id: 1,
                success: true,
                sonar: {
                    enabled: false
                }
            }, {
                sonar: {
                    isEnabled: () => true,
                    getToken: () => "<NULL>"
                }
            }), "sonar:sonar");
        });

        it("should return args without sonar (sonar is missing for this job)", () => {
            return assert.notInclude(maven.getMavenArguments({
                author: "TheBusyBiscuit",
                repo: "Test",
                branch: "master",
                id: 1,
                success: true
            }, {
                sonar: {
                    isEnabled: () => true,
                    getToken: () => "<NULL>"
                }
            }), "sonar:sonar");
        });

        it("should return args with sonar (sonar is enabled, etc...)", () => {
            return assert.include(maven.getMavenArguments({
                author: "TheBusyBiscuit",
                repo: "Test",
                branch: "master",
                id: 1,
                success: true,
                sonar: {
                    enabled: true
                }
            }, {
                sonar: {
                    isEnabled: () => true,
                    getToken: () => "<NULL>"
                }
            }), "sonar:sonar");
        });
    })

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

        it("should return false for an invalid Job (Missing parameter)", () => {
            return assert.isFalse(maven.isValid({author: "Nope"}));
        });

        it("should return false for an invalid Job (Missing parameter)", () => {
            return assert.isFalse(maven.isValid({branch: "Nope"}));
        });

        it("should return false for an invalid Job (parameter of wrong Type)", () => {
            return assert.isFalse(maven.isValid({author: "Hi", repo: 2, branch: "master", id: "lol"}));
        });

        it("should return false for an invalid Job (parameter of wrong Type)", () => {
            return assert.isFalse(maven.isValid({author: "Hi", repo: "Nope", branch: "master", id: "lol"}));
        });

        it("should return true for a valid Job", () => {
            return assert.isTrue(maven.isValid({author: "TheBusyBiscuit", repo: "builds", branch: "master", directory: "TheBusyBiscuit/builds/master", id: 1, success: false}));
        });
    });

    describe("Maven Test: 'compile'", () => {
        testJobs(false, (job) => maven.compile(job));
    });

    describe("Maven Test: 'setVersion'", () => {
        testJobs(false, (job) => maven.setVersion(job));
    });
});
