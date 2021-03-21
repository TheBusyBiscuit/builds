const process = require('child-process-promise')
const lodash = require('lodash/lang')

const FileSystem = require('fs')
const fs = FileSystem.promises
const path = require('path')

const log = require('../src/logger.js')
const projects = require('../src/projects.js')

module.exports = {
  getGradleArguments,
  compile,
  relocate,
  isValid
}

/**
 * This will return the console line arguments for gradle.compile()
 *
 * @param  {String} version  The version to overwrite the config
 * @return {Array<String>}   The needed console line arguments
 */
function getGradleArguments (version) {
  return ['build', '-Pversion="' + version.replace(/\(/g, '\\(').replace(/\)/g, '\\)') + '"']
}

/**
 * This method will compile a project using the command
 * 'gradlew build'
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @param  {String} version     A Version String that should be used
 * @return {Promise}         A promise that resolves when this activity finished
 */
function compile (job, logging, version) {
  return new Promise((resolve, reject) => {
    if (!isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    log(logging, '-> Granting gradlew a+x permissions')

    process.spawn('chmod', ['a+x', 'gradlew'], {
      cwd: path.resolve(__dirname, '../' + job.directory + '/files'),
      shell: true
    })

    log(logging, '-> Executing \'./gradlew build\'')

    const args = getGradleArguments(version)
    const compiler = process.spawn('./gradlew', args, {
      cwd: path.resolve(__dirname, '../' + job.directory + '/files'),
      shell: true
    })

    const logger = (data) => {
      log(logging, data, true)
      fs.appendFile(path.resolve(__dirname, '../' + job.directory + '/' + job.repo + '-' + job.id + '.log'), data, 'UTF-8').catch(err => console.log(err))
    }

    compiler.childProcess.stdout.on('data', logger)
    compiler.childProcess.stderr.on('data', logger)

    compiler.then(resolve, reject)
  })
}

/**
 * This method will relocate a project's compiled jar file
 * to the appropriate directory
 *
 * @param  {Object} job      The currently handled Job Object
 * @return {Promise}         A promise that resolves when this activity finished
 */
function relocate (job) {
  if (!job.success) {
    return Promise.resolve()
  }
  const temp = process.spawn(`dir build/libs`, [], {
    cwd: path.resolve(__dirname, '../' + job.directory + '/files'),
    shell: true
  })
  temp.childProcess.stdout.on('data', function (data) {
    log(true, data, true)
  })
  temp.childProcess.stderr.on('data', function (data) {
    log(true, data, true)
  })
  return fs.rename(
    path.resolve(__dirname, '../' + job.directory + '/files/build/libs/' + job.repo + '-' + job.id + '.jar'),
    path.resolve(__dirname, '../' + job.directory + '/' + job.repo + '-' + job.id + '.jar')
  )
}

/**
 * This method will check if a Job is valid.
 * null / undefined or incomplete Job Objects will fail.
 *
 * @param  {Object}  job The job object to be tested
 * @return {Boolean}     Whether the job is a valid Job
 */
function isValid (job) {
  if (!projects.isValid(job)) return false
  if (!lodash.isInteger(job.id)) return false

  return true
}
