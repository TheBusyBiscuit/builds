const FileSystem = require('fs');
const fs = FileSystem.promises;
const path = require("path");

const chai = require('chai');
chai.use(require('chai-as-promised'));
const {assert} = chai;

const credentials = JSON.parse(FileSystem.readFileSync(path.resolve(__dirname, "../resources/credentials.json"), "UTF8"));
const discord = require('../src/discord.js')(credentials.discord);

describe("Discord Integration Test", () => {
    describe("Config Validator", () => {
        it("should have a valid id", () => {
            return assert.match(discord.getConfig().id, /[0-9]+/);
        });

        it("should have a valid Token", () => {
            return assert.match(discord.getConfig().id, /[a-zA-Z0-9]+/);
        });
    });

    describe("Job Validator", () => {
        it("should return false for an invalid Job (null)", () => {
            return assert.isFalse(discord.isValid(null));
        });

        it("should return false for an invalid Job (undefined)", () => {
            return assert.isFalse(discord.isValid(undefined));
        });

        it("should return false for an invalid Job (String)", () => {
            return assert.isFalse(discord.isValid("This will not work"));
        });

        it("should return false for an invalid Job (Array)", () => {
            return assert.isFalse(discord.isValid([]));
        });

        it("should return false for an invalid Job (Missing parameter)", () => {
            return assert.isFalse(discord.isValid({repo: "Nope"}));
        });

        it("should return false for an invalid Job (parameter of wrong Type)", () => {
            return assert.isFalse(discord.isValid({author: "Hi", repo: "Nope", branch: "master", id: "lol"}));
        });

        it("should return true for a valid Job", () => {
            return assert.isTrue(discord.isValid({author: "TheBusyBiscuit", repo: "builds", branch: "master", id: 1, success: false}));
        });
    });
});
