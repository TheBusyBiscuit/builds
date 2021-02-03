const XML = require('xml-library')
const process = require('child-process-promise')
const lodash = require('lodash/lang')

const FileSystem = require('fs')
const fs = FileSystem.promises
const path = require('path')

const log = require('../src/logger.js')
const projects = require('../src/projects.js')

const minify = {
  indent: 0,
  header: '<?xml version="1.0" encoding="UTF-8"?>',
  new_lines: false
}

const beautify = {
  indent: 4,
  header: '<?xml version="1.0" encoding="UTF-8"?>',
  new_lines: true
}

module.exports = {
  setVersion,
  updatePOM,
  compile,
  getMavenArguments,
  relocate,
  isValid
}

/**
 * This method changes the project's version in your pom.xml file
 * It also returns a Promise that resolves when it's done.
 *
 * @param {Object} job      The currently handled Job Object
 * @param {String} version  The Version that shall be set
 * @param {Boolean} compact Whether the XML can be minified. This will also change the finalName
 */
function setVersion (job, version, compact) {
  return new Promise((resolve, reject) => {
    if (!isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    const file = path.resolve(__dirname, '../' + job.directory + '/files/pom.xml')

    fs.readFile(file, 'utf8').then((data) => {
      XML.promises.fromXML(data).then((json) => {
        updatePOM(job, json, version, compact).then((xml) => {
          fs.writeFile(file, xml, 'utf8').then(resolve, reject)
        }, reject)
      }, reject)
    }, reject)
  })
}

/**
 * This method updates a JSON-representation of a pom.xml file
 * and applies the provided version to it
 *
 * @param {Object} job          The currently handled Job Object
 * @param  {XML.XMLNode} json   The pom.xml JSON-representation
 * @param  {String} version     A Version String that should be used
 * @param  {Boolean} compact    Whether the file can be minified or not
 * @return {Promise}            A Promise that fulfills with the updated xml string
 */
function updatePOM (job, json, version, compact) {
  return new Promise((resolve, reject) => {
    json.getChild('version').setValue(version)

    const node = json.getChild(['build', 'finalName'])

    if (node) {
      node.setValue(job.repo + '-' + job.id)
    } else {
      json.getChild('build').addChild(new XML.XMLNode('finalName', job.repo + '-' + job.id))
    }

    XML.promises.toXML(json, compact ? minify : beautify).then((xml) => {
      resolve(xml)
    }, reject)
  })
}

/**
 * This method will compile a project using the command
 * 'mvn clean package -B'
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function compile (job, cfg, logging) {
  return new Promise((resolve, reject) => {
    if (!isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    log(logging, "-> Executing 'mvn package'")

    const args = getMavenArguments(job, cfg)
    const compiler = process.spawn('mvn', args, {
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
 * This will return the console line arguments for maven.compile()
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Object} cfg      Our config.js Object
 * @return {Array<String>}   The needed console line arguments
 */
function getMavenArguments (job, cfg) {
  const args = ['clean', 'package', '-B']

  if (job.sonar && job.sonar.enabled && cfg.sonar.isEnabled()) {
    args.push('sonar:sonar')
    args.push('-Dsonar.login=' + cfg.sonar.getToken())
    args.push('-Dsonar.host.url=' + job.sonar['host-url'])
    args.push('-Dsonar.organization=' + job.sonar.organization)
    args.push('-Dsonar.projectKey=' + job.sonar['project-key'])
  }

  if (job.options && !job.options.createJar) {
    args.push('--file')
    args.push('pom.xml')
  }

  return args
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
    path.resolve(__dirname, '../' + job.directory + '/files/target/' + job.repo + '-' + job.id + '.jar'),
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
