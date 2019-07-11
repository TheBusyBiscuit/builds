const process = require('child-process-promise');

const chai = require('chai');
chai.use(require('chai-as-promised'));
const {assert} = chai;

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
});
