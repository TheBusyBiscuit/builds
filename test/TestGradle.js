const chai = require('chai')
chai.use(require('chai-as-promised'))
const { assert } = chai
const FileSystem = require('fs')
const path = require('path')
const fs = FileSystem.promises

const gradle = require('../src/gradle.js')
const testJobs = require('../test/TestJobs.js')
const fakeJob = {
  author: 'TheBusyBiscuit',
  repo: 'builds',
  branch: 'master',
  id: 1,
  success: false,
  directory: '.'
}

describe('Gradle Test', () => {

  it('should do nothing but resolve when relocating a failed Job', () =>
    assert.isFulfilled(gradle.relocate(fakeJob))
  )

  describe('gradle.properties Tests', () => {
    it('should create a gradle.properties file with the right version when there isn\'t one', async () => {
      await fs.mkdir(path.resolve(__dirname, '../' + fakeJob.directory + '/files'))
      assert.isFulfilled(gradle.setVersion(fakeJob, '1.1'))
      assert.equal(await fs.readFile(path.resolve(__dirname, '../' + fakeJob.directory + '/files/gradle.properties'), 'utf8'), '\nversion=1.1')
    })
    it('should edit the version of a gradle.properties file', async () => {
      assert.isFulfilled(gradle.setVersion(fakeJob, '1.2'))
      assert.equal(await fs.readFile(path.resolve(__dirname, '../' + fakeJob.directory + '/files/gradle.properties'), 'utf8'), '\nversion=1.2')
    })
  })

  describe('Job Validator', () => {
    it('should return false for an invalid Job (null)', () => {
      return assert.isFalse(gradle.isValid(null))
    })

    it('should return false for an invalid Job (undefined)', () => {
      return assert.isFalse(gradle.isValid(undefined))
    })

    it('should return false for an invalid Job (String)', () => {
      return assert.isFalse(gradle.isValid('This will not work'))
    })

    it('should return false for an invalid Job (Array)', () => {
      return assert.isFalse(gradle.isValid([]))
    })

    it('should return false for an invalid Job (Missing parameter)', () => {
      return assert.isFalse(gradle.isValid({ repo: 'Nope' }))
    })

    it('should return false for an invalid Job (Missing parameter)', () => {
      return assert.isFalse(gradle.isValid({ author: 'Nope' }))
    })

    it('should return false for an invalid Job (Missing parameter)', () => {
      return assert.isFalse(gradle.isValid({ branch: 'Nope' }))
    })

    it('should return false for an invalid Job (parameter of wrong Type)', () => {
      return assert.isFalse(gradle.isValid({ author: 'Hi', repo: 2, branch: 'master', id: 'lol' }))
    })

    it('should return false for an invalid Job (parameter of wrong Type)', () => {
      return assert.isFalse(gradle.isValid({ author: 'Hi', repo: 'Nope', branch: 'master', id: 'lol' }))
    })

    it('should return true for a valid Job', () => {
      return assert.isTrue(gradle.isValid({
        author: 'TheBusyBiscuit',
        repo: 'builds',
        branch: 'master',
        directory: 'TheBusyBiscuit/builds/master',
        id: 1,
        success: false
      }))
    })
  })

  describe('Gradle Test: \'compile\'', () => {
    testJobs(false, (fakeJob) => gradle.compile(fakeJob, true))
  })

  describe('Gradle Test: \'setVersion\'', () => {
    testJobs(false, (fakeJob) => gradle.setVersion(fakeJob, '1'))
  })
})
