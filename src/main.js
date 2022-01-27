const path = require('path')

const cfg = require('../src/config.js')(path.resolve(__dirname, '../resources/config.json'))

// Modules
const projects = require('../src/projects.js')
const maven = require('../src/maven.js')
const github = require('../src/github.js')(cfg.github)
const discord = require('../src/discord.js')(cfg.discord)
const log = require('../src/logger.js')

module.exports = {
  start,
  check,
  update,
  compile,
  gatherResources,
  upload,
  finish,

  /**
     * This method returns the discord config used by this instance
     *
     * @return {Object} Config
     */
  getConfig: () => cfg
}

/**
 * This method starts the default lifecycle for all projects.
 * It also returns a Promise that can signal when its done.
 *
 * @param  {Boolean} logging Whether the internal activity should be logged.
 * @return {Promise}         A Promise that is resolved after all projects have finished their lifecycle
 */
function start (logging) {
  return new Promise((resolve, reject) => {
    log(logging, 'Loading Projects...')

    projects.getProjects(logging).then(jobs => {
      global.status.jobs = jobs.slice(0)

      for (const index in jobs) {
        updateStatus(jobs[index], 'Queued')
      }

      let i = -1

      const nextJob = () => {
        i++

        if (!global.status.running || i >= jobs.length) {
          log(logging, 'Finished!')
          resolve()
        } else {
          log(logging, '')
          log(logging, 'Watching: ' + jobs[i].author + '/' + jobs[i].repo + ':' + jobs[i].branch + ` (${i + 1} / ${jobs.length})`)

          const job = jobs[i]

          // Project Lifecycle
          check(job, logging)
            .then(() => update(job, logging)
              .then(() => compile(job, logging)
                .then(() => gatherResources(job, logging)
                  .then(() => upload(job, logging)
                    .then(() => finish(job, logging)
                      .then(() => updateStatus(jobs[i], 'Finished'))
                      .then(nextJob, reject),
                    reject),
                  reject),
                reject),
              reject),
            nextJob)
        }
      }

      nextJob()
    })
  })
}

/**
 * This method pulls the latest commit from github and
 * checks if it diverges from the local records.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function check (job, logging) {
  if (!global.status.running) {
    return Promise.reject(new Error('The operation has been cancelled'))
  }

  if (!projects.isValid(job, false)) {
    return Promise.reject(new Error('Invalid Job!'))
  }

  updateStatus(job, 'Pulling Commits')

  return new Promise((resolve, reject) => {
    github.getLatestCommit(job, logging).then(commit => {
      const timestamp = parseInt(commit.commit.committer.date.replace(/\D/g, ''))

      if (commit.commit.message.toLowerCase().startsWith('[ci skip]')) {
        reject(new Error('Skipping build...'))
        return
      }

      job.commit = {
        sha: commit.sha,
        date: github.parseDate(commit.commit.committer.date),
        timestamp: timestamp,
        message: commit.commit.message,
        author: commit.author.name,
        avatar: commit.author.avatar_url
      }

      github.hasUpdate(job, timestamp, logging).then(id => {
        job.id = id + 1
        projects.clearWorkspace(job).then(resolve, reject)
      }, reject)
    }, reject)
  })
}

/**
 * This method updates a Projects build number and
 * changes it's pom.xml file to include this version.
 * It also clones the repository.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function update (job, logging) {
  if (!global.status.running) {
    return Promise.reject(new Error('The operation has been cancelled'))
  }

  if (!projects.isValid(job, false)) {
    return Promise.reject(new Error('Invalid Job!'))
  }

  updateStatus(job, 'Cloning Repository')

  return new Promise((resolve, reject) => {
    log(logging, 'Updating: ' + job.author + '/' + job.repo + ':' + job.branch + ' (' + job.id + ')')

    github.clone(job, job.commit.sha, logging).then(() => {
      const name = (job.options ? job.options.prefix : 'DEV') + ' - ' + job.id + ' (git ' + job.commit.sha.substr(0, 8) + ')'
      maven.setVersion(job, name, true).then(resolve, reject)
    }, reject)
  })
}

/**
 * This method compiles the project using Maven.
 * After completing, the job update will have the flag 'success',
 * that is either true or false.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function compile (job, logging) {
  if (!global.status.running) {
    return Promise.reject(new Error('The operation has been cancelled'))
  }

  if (!projects.isValid(job, false)) {
    return Promise.reject(new Error('Invalid Job!'))
  }

  updateStatus(job, 'Compiling')

  return new Promise((resolve) => {
    log(logging, 'Compiling: ' + job.author + '/' + job.repo + ':' + job.branch + ' (' + job.id + ')')

    maven.compile(job, cfg, logging)
      .then(() => {
        job.success = true
        resolve()
      })
      .catch((err) => {
        log(logging, err.stack)
        job.success = false
        resolve()
      })
  })
}

/**
 * This method pulls all resources from github, such as the license,
 * all version tags and also relocates the exported .jar file to the main project folder.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function gatherResources (job, logging) {
  if (!global.status.running) {
    return Promise.reject(new Error('The operation has been cancelled'))
  }

  if (!projects.isValid(job, true)) {
    return Promise.reject(new Error('Invalid Job!'))
  }

  updateStatus(job, 'Fetching Resources')

  return new Promise((resolve, reject) => {
    log(logging, 'Gathering Resources: ' + job.author + '/' + job.repo + ':' + job.branch)

    Promise.all([
      github.getLicense(job, logging),
      github.getTags(job, logging),
      maven.relocate(job)
    ]).then((values) => {
      const license = values[0]
      const tags = values[1]

      job.license = {
        name: license.license.name,
        id: license.license.spdx_id,
        url: license.download_url
      }

      job.tags = {}

      for (const index in tags) {
        job.tags[tags[index].name] = tags[index].commit.sha
      }

      resolve()
    }, reject)
  })
}

/**
 * This method updates the builds.json file,
 * generates a new index.html and badge.svg file for the project.
 * It will also signal this Update to our Discord Webhook.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function upload (job, logging) {
  if (!global.status.running) {
    return Promise.reject(new Error('The operation has been cancelled'))
  }

  if (!projects.isValid(job, true)) {
    return Promise.reject(new Error('Invalid Job!'))
  }

  global.status.task[job.author + '/' + job.repo + '/' + job.branch] = 'Preparing Upload'

  return new Promise((resolve, reject) => {
    const promises = [
      projects.addBuild(job, logging),
      projects.generateHTML(job, logging),
      projects.generateBadge(job, logging)
    ]

    log(logging, 'Uploading: ' + job.author + '/' + job.repo + ':' + job.branch + ' (' + job.id + ')')

    // Discord counts as a form of "logging" in this sense
    if (logging) {
      promises.push(discord.sendUpdate(job))
    }

    Promise.all(promises).then(resolve, reject)
  })
}

/**
 * This method will finish the lifecycle.
 * It pushes all changed files to github.
 * It will also clear the project file for the next iteration.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function finish (job, logging) {
  // Check if the program is still running
  if (!global.status.running) {
    return Promise.reject(new Error('The operation has been cancelled'))
  }

  // Check if the job is still valid
  if (!projects.isValid(job, true)) {
    return Promise.reject(new Error('Invalid Job!'))
  }

  updateStatus(job, 'Uploading')

  return Promise.all([
    github.pushChanges(job, logging),
    projects.clearWorkspace(job)
  ])
}

/**
 * This updates our global status variable for the given job.
 *
 * @param  {Object} job    The currently handled Job Object
 * @param  {String} status The new status message for this job
 */
function updateStatus (job, status) {
  global.status.task[job.author + '/' + job.repo + '/' + job.branch] = status
}
