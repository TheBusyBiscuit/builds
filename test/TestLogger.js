const chai = require('chai');
chai.use(require('chai-as-promised'));
const {expect} = chai;

const logger = require('../src/logger.js');

describe("Config Test", function() {
    it("has a working logger.js script (logging = false)", () => {
        return expect(() => {
            logger(false, "Hello World");
        }).to.not.throw();
    });

    it("has a working logger.js script (logging = true)", () => {
        return expect(() => {
            var log = console.log;
            // Temporarily disable console.log
            console.log = () => {};

            logger(true, "Hello World");
            logger(true, " ", true);

            console.log = log;
        }).to.not.throw();
    });
});
