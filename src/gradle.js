const process = require('child-process-promise')
const lodash = require('lodash/lang')

const FileSystem = require('fs')
const fs = FileSystem.promises
const path = require('path')

const log = require('../src/logger.js')
const projects = require('../src/projects.js')

module.exports = {
  getGradleArguments,
  setVersion,
  compile,
  relocate,
  isValid
}

/**
 * This will return the console line arguments for gradle.compile()
 *
 * @return {Array<String>}   The needed console line arguments
 */
function getGradleArguments () {
  return ['build']
}

/**
 * This method changes the project's version in your gradle.properties file
 * It also returns a Promise that resolves when it's done.
 *
 * @param {Object} job      The currently handled Job Object
 * @param {String} version  The Version that shall be set
 */
function setVersion (job, version) {
  return new Promise((resolve, reject) => {
    if (!isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }
    const file = path.resolve(__dirname, '../' + job.directory + '/files/gradle.properties')
    if (!FileSystem.existsSync(file)) {
      fs.writeFile(file, '\nversion=' + version, 'utf8').then(resolve, reject)
    } else {
      fs.readFile(file, 'utf8').then((data) => {
        const content = data.split('\n')
        const result = []
        let line
        for (line in content) {
          if (!line.includes('version=')) {
            result.push(line)
          }
        }
        result.push('\nversion=' + version)
        fs.writeFile(file, result, 'utf8').then(resolve, reject)
      }, reject)
    }
  })
}

/**
 * This method will compile a project using the command
 * 'gradlew build'
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function compile (job, logging) {
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

    const args = getGradleArguments()
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
  return fs.rename(
    path.resolve(__dirname, '../' + job.directory + '/files/build/libs/' + job.repo + '-' + (job.options ? job.options.prefix : 'DEV') + ' - ' + job.id + ' (git ' + job.commit.sha.substr(0, 8) + ')' + '.jar'),
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
