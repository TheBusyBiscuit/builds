const FileSystem = require('fs')
const fs = FileSystem.promises
const path = require('path')

const log = require('../src/logger.js')
const lodash = require('lodash/lang')

module.exports = {
  getProjects,
  addBuild,
  generateHTML,
  generateBadge,
  clearWorkspace,
  clearFolder,
  isValid
}

/**
 * This will return a Promise that resolves to an Array of Jobs
 *
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A Promise that resolves to an Array of Jobs
 */
function getProjects (logging) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, '../resources/repos.json')).then((data) => {
      const jobs = []
      const json = JSON.parse(data)

      for (const repo in json) {
        log(logging, '-> Found Project "' + repo + '"')

        const job = {
          author: repo.split('/')[0],
          repo: repo.split('/')[1].split(':')[0],
          branch: repo.split('/')[1].split(':')[1]
        }

        job.directory = job.author + '/' + job.repo + '/' + job.branch

        if (json[repo].options) {
          job.options = json[repo].options

          if (json[repo].options.custom_directory) {
            job.directory = json[repo].options.custom_directory
          }
        }

        if (json[repo].sonar && json[repo].sonar.enabled) {
          job.sonar = json[repo].sonar
        }

        jobs.push(job)
      }

      resolve(jobs)
    }, reject)
  })
}

/**
 * This method adds the current job to the builds.json file and applies any Tags
 *
 * @param  {[type]}  job     The job to add
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A Promise that resolves to an Array of Jobs
 */
function addBuild (job, logging) {
  return new Promise((resolve, reject) => {
    if (!isValid(job, true)) {
      reject(new Error('Invalid Job'))
      return
    }

    const file = path.resolve(__dirname, '../' + job.directory + '/builds.json')
    let builds = {}

    const append = () => {
      log(logging, '-> Adding Build #' + job.id)

      builds[job.id] = {
        id: job.id,
        sha: job.commit.sha,
        date: job.commit.date,
        timestamp: job.commit.timestamp,
        message: job.commit.message,
        author: job.commit.author,
        avatar: job.commit.avatar,
        license: job.license,
        candidate: 'DEVELOPMENT',
        status: (job.success ? 'SUCCESS' : 'FAILURE')
      }

      if (job.options && !job.options.createJar) {
        builds[job.id].status = 'COMPILE_ONLY'
      }

      if (job.success) {
        builds.last_successful = job.id
      }

      builds.latest = job.id

      if (!job.options || !job.options.ignoreTags) {
        // Apply any Tags
        for (const build in builds) {
          for (const tag in job.tags) {
            if (job.tags[tag] === builds[build].sha) {
              builds[build].candidate = 'RELEASE'
              builds[build].tag = tag
              break
            }
          }
        }
      }

      log(logging, "-> Saving 'builds.json'...")
      fs.writeFile(file, JSON.stringify(builds), 'utf8').then(resolve, reject)
    }

    log(logging, "-> Reading 'builds.json'...")

    if (FileSystem.existsSync(file)) {
      fs.readFile(file, 'utf8').then((data) => {
        builds = JSON.parse(data)
        append()
      }, append)
    } else append()
  })
}

/**
 * This method will generate an index.html page for the specified project.
 * It will use '/resources/template.html' as a template.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function generateHTML (job, logging) {
  log(logging, "-> Generating 'index.html'...")

  return new Promise((resolve, reject) => {
    if (!isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    fs.readFile(path.resolve(__dirname, '../resources/template.html'), 'utf8').then((html) => {
      html = html.replace(/\${owner}/g, job.author)
      html = html.replace(/\${repository}/g, job.repo)
      html = html.replace(/\${branch}/g, job.branch)

      log(logging, "-> Saving 'index.html'...")

      fs.writeFile(path.resolve(__dirname, '../' + job.directory + '/index.html'), html, 'utf8').then(resolve, reject)
    }, reject)
  })
}

/**
 * This method will generate a new badge for the specified project.
 * It will use '/resources/badge.svg' as a template.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function generateBadge (job, logging) {
  log(logging, "-> Generating 'badge.svg'...")

  return new Promise((resolve, reject) => {
    if (!isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    fs.readFile(path.resolve(__dirname, '../resources/badge.svg'), 'utf8').then((svg) => {
      svg = svg.replace(/\${status}/g, job.success ? 'SUCCESS' : 'FAILURE')
      svg = svg.replace(/\${color}/g, job.success ? 'rgb(30, 220, 30)' : 'rgb(220, 30, 30)')

      log(logging, "-> Saving 'badge.svg'...")

      fs.writeFile(path.resolve(__dirname, '../' + job.directory + '/badge.svg'), svg, 'utf8').then(resolve, reject)
    }, reject)
  })
}

/**
 * This method will delete a project's working directory and source files
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function clearWorkspace (job, logging) {
  if (!isValid(job, false)) {
    return Promise.reject(new Error('Invalid Job!'))
  }

  if (!FileSystem.existsSync(path.resolve(__dirname, '../' + job.directory + '/files'))) {
    return Promise.resolve()
  } else {
    return clearFolder(path.resolve(__dirname, '../' + job.directory + '/files'), logging)
  }
}

/**
 * This method will delete a directory recursively.
 *
 * @param  {String} file      The directory to be deleted
 * @param  {Boolean} logging  Whether the internal activity should be logged
 * @return {Promise}          A promise that resolves when this activity finished
 */
async function clearFolder (file, logging) {
  log(logging, "-> Deleting '" + path + "'")

  const stats = await fs.stat(file)

  if (stats.isDirectory()) {
    const files = await fs.readdir(file)
    const length = files.length
    let index = 0

    return new Promise((resolve, reject) => {
      const check = () => {
        if (length === index) {
          fs.rmdir(file).then(resolve, reject)
          return true
        } else {
          return false
        }
      }

      if (!check()) {
        let i

        const next = () => {
          index++
          check()
        }

        const cancel = (e) => {
          reject(e)
          i = length
        }

        for (i = 0; i < length; i++) {
          clearFolder(file + '/' + files[i], logging).then(next, cancel)
        }
      }
    })
  } else {
    return fs.unlink(file)
  }
}

/**
 * This method will check if a Job is valid.
 * null / undefined or incomplete Job Objects will fail.
 *
 * @param  {Object}  job        The job object to be tested
 * @param  {Boolean} compiled   Whether to check if the job has an ID and success-value
 * @return {Boolean}            Whether the job is a valid Job
 */
function isValid (job, compiled) {
  if (!lodash.isObject(job)) return false
  if (!lodash.isString(job.author)) return false
  if (!lodash.isString(job.repo)) return false
  if (!lodash.isString(job.branch)) return false
  if (!lodash.isString(job.directory)) return false

  if (compiled) {
    if (!lodash.isInteger(job.id)) return false
    if (!lodash.isBoolean(job.success)) return false
  }

  return true
}
