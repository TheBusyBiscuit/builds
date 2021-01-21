const chai = require('chai');
chai.use(require('chai-as-promised'));
const { assert } = chai;

const config = require('../src/config.js');

describe("Config Test", function() {
    it("can generate a default config.json file", () => {
        return assert.isNotNull(config("null"));
    });

    it("can give discord messages for successful builds", () => {
        return assert.isNotNull(config("null").discord.getMessages(true));
    });

    it("can give discord messages for failed builds", () => {
        return assert.isNotNull(config("null").discord.getMessages(false));
    });

    it("can report sonar's status (enabled or not)", () => {
        return assert.isFalse(config("null").sonar.isEnabled());
    });

    it("can return sonar's access token", () => {
        return assert.isNotNull(config("null").sonar.getToken());
    });

    it("can return sonar's console arguments", () => {
        return assert.isNotNull(config("null").sonar.getArguments());
    });
});
