const process = require('child-process-promise');

const chai = require('chai');
chai.use(require('chai-as-promised'));
const {assert, expect} = chai;

const logger = require('../src/logger.js');

describe("Environment Test", function() {
    this.timeout(6000);

    it("has node.js installed", () => {
        return assert.isFulfilled(process.exec("node -v"));
    });

    it("has Git installed", () => {
        return assert.isFulfilled(process.exec("git --version"));
    });

    it("has Java installed", () => {
        return assert.isFulfilled(process.exec("java -version"));
    });

    it("has Maven installed", () => {
        return assert.isFulfilled(process.exec("mvn -v"));
    });

    it("has a working logger.js script (logging = false)", () => {
        return expect(() => {
            logger(false, "Hello World");
        }).to.not.throw();
    });

    it("has a working logger.js script (logging = true)", () => {
        return expect(() => {
            var log = console.log;
            // Temporarily disable console.log
            console.log = (str) => {};

            logger(true, "Hello World");

            console.log = log;
        }).to.not.throw();
    });
});
