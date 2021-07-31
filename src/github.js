const request = require('request-promise-native')
const process = require('child-process-promise')

const FileSystem = require('fs')
const fs = FileSystem.promises
const path = require('path')

const projects = require('../src/projects.js')
const log = require('../src/logger.js')

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

module.exports = (cfg) => {
  return {
    /**
     * This method will return the latest Commit for the specified Job
     *
     * @param  {Object} job         The currently handled Job Object
     * @param  {Boolean} logging    Whether the internal behaviour should be logged
     * @return {Promise<Object>}    This will return a Promise that resolve with the latest commits
     */
    getLatestCommit: (job, logging) => getLatestCommit(job, cfg, logging),

    /**
     * This method will return a repository's license.
     * The Promise will reject if no License was found.
     *
     * @param  {Object} job         The currently handled Job Object
     * @param  {Boolean} logging    Whether the internal behaviour should be logged
     * @return {Promise}            This will return a Promise that resolve with the project license
     */
    getLicense: (job, logging) => getLicense(job, cfg, logging),

    /**
     * This method will return a repository's tags.
     * The Promise will also resolve if no tags exist.
     *
     * @param  {Object} job  The currently handled Job Object
     * @return {Promise}     This will return a Promise that resolve with the project tags
     */
    getTags: (job, logging) => getTags(job, cfg, logging),

    /**
     * This method will return a Promise.
     * The Promise will resolve if the Repository exists, otherwise it will reject.
     *
     * @param  {Object} job  The currently handled Job Object
     * @return {Promise}     This will return a Promise that resolve if the repository exists
     */
    exists: (job) => exists(job, cfg),

    /**
     * This method returns the discord config used by this instance
     *
     * @return {Object} Config
     */
    getConfig: () => cfg,

    clone,
    pushChanges,
    hasUpdate,
    parseDate
  }
}

/**
 * This method will return the latest Commit for the specified Job
 *
 * @param  {Object} job         The currently handled Job Object
 * @param  {Boolean} logging    Whether the internal behaviour should be logged
 * @return {Promise<Object>}    This will return a Promise that resolve with the latest commits
 */
function getLatestCommit (job, cfg, logging) {
  return new Promise((resolve, reject) => {
    if (!projects.isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    log(logging, '-> Fetching latest Commit...')

    const url = getURL(job, cfg, '/commits?per_page=1&sha=' + job.branch)
    url.json = true

    request(url).then((json) => {
      log(logging, '-> commits: 200 - OK')
      resolve(json[0])
    }).catch(reject)
  })
}

/**
 * This method will return a repository's license.
 * The Promise will reject if no License was found.
 *
 * @param  {Object} job         The currently handled Job Object
 * @param  {Boolean} logging    Whether the internal behaviour should be logged
 * @return {Promise}            This will return a Promise that resolve with the project license
 */
function getLicense (job, cfg, logging) {
  return new Promise((resolve, reject) => {
    if (!projects.isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    log(logging, '-> Fetching License...')
    getJSON(job, cfg, logging, 'license', resolve, reject)
  })
}

/**
 * This method will return a repository's tags.
 * The Promise will also resolve if no tags exist.
 *
 * @param  {Object} job  The currently handled Job Object
 * @return {Promise}     This will return a Promise that resolve with the project tags
 */
function getTags (job, cfg, logging) {
  return new Promise((resolve, reject) => {
    if (!projects.isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    log(logging, '-> Fetching Tags...')
    getJSON(job, cfg, logging, 'tags', resolve, reject)
  })
}

/**
 * A private utility method for fetching JSON Objects from GitHub's API
 */
function getJSON (job, cfg, logging, endpoint, resolve, reject) {
  const url = getURL(job, cfg, '/' + endpoint)
  url.json = true

  request(url).then((json) => {
    log(logging, '-> ' + endpoint + ': 200 - OK')

    if (json.documentation_url) {
      reject('Missing License file')
    } else {
      resolve(json)
    }
  }).catch(reject)
}

/**
 * This method will return a Promise.
 * The Promise will resolve if the Repository exists, otherwise it will reject.
 *
 * @param  {Object} job  The currently handled Job Object
 * @return {Promise}     This will return a Promise that resolve if the repository exists
 */
function exists (job, cfg) {
  return new Promise((resolve, reject) => {
    if (!projects.isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    const url = getURL(job, cfg, '')
    url.json = true

    request(url).then(resolve).catch(reject)
  })
}

/**
 * This method will return a Promise.
 * The Promise will resolve if the local records diverge from the github-remote.
 * Aka when there are new commits to compile.
 *
 * @param  {Object} job     The currently handled Job Object
 * @param  {Number} timestamp  The timestamp of a commit returned by getCommits(job)
 * @return {Promise}        This will return a Promise that resolve if there are new uncompiled commits
 */
function hasUpdate (job, timestamp) {
  return new Promise((resolve, reject) => {
    if (!projects.isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    const file = path.resolve(__dirname, '../' + job.directory + '/builds.json')

    if (FileSystem.existsSync(file)) {
      fs.readFile(file, 'utf8').then((data) => {
        if (!data) {
          // Pretend like there is an Update if no local builds exist
          resolve(0)
        }

        const json = JSON.parse(data)

        if (!json.latest) {
          // Pretend like there is an Update if no local builds exist
          resolve(0)
        } else if (timestamp > json[json.latest].timestamp) {
          resolve(json.latest)
        } else {
          reject(new Error('Nothing to update.'))
        }
      }, () => resolve(0))
    } else {
      // Pretend like there is an Update if no local builds exist
      resolve(0)
    }
  })
}

/**
 * This function clones a GitHub Repository to the Hard Drive.
 * It also returns a Promise that is resolved when the cloning-process finished successfully
 *
 * @param  {Object} job         The currently handled Job Object
 * @param  {String} commit      The commit's SHA that marks the state of the repository
 * @param  {Boolean} logging    Whether the internal behaviour should be logged
 * @return {Promise}            A Promise that resolved upon a successful cloning process
 */
function clone (job, commit, logging) {
  return new Promise((resolve, reject) => {
    if (!projects.isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }

    log(logging, "-> Executing 'git clone'")

    const cloning = process.spawn('git', [
      'clone',
      'https://github.com/' + job.author + '/' + job.repo + '.git',
      path.resolve(__dirname, '../' + job.directory + '/files'),
      '-b', job.branch,
      '--single-branch'
    ])

    cloning.childProcess.stdout.on('data', (data) => log(logging, '-> ' + data))
    cloning.childProcess.stderr.on('data', (data) => log(logging, '-> ' + data))

    cloning.then(() => {
      log(logging, "-> Finished 'git clone'")
      log(logging, "-> Executing 'git reset'")

      const refresh = process.spawn('git', [
        'reset',
        '--hard',
        commit
      ], {
        cwd: path.resolve(__dirname, '../' + job.directory + '/files')
      })

      refresh.childProcess.stdout.on('data', (data) => log(logging, '-> ' + data))
      refresh.childProcess.stderr.on('data', (data) => log(logging, '-> ' + data))

      refresh.then(() => {
        log(logging, "-> Finished 'git reset'")
        resolve()
      }, reject)
    }, reject)
  })
}

/**
 * This method pushes all project files from the specified job to github.
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {Boolean} logging Whether the internal activity should be logged
 * @return {Promise}         A promise that resolves when this activity finished
 */
function pushChanges (job, logging) {
  return new Promise((resolve, reject) => {
    if (!projects.isValid(job)) {
      reject(new Error('Invalid Job'))
      return
    }
    log(logging, "-> Executing 'git add'")

    const add = process.spawn('git', [
      'add',
      path.resolve(__dirname, '../' + job.directory + '/*')
    ])

    add.childProcess.stdout.on('data', (data) => log(logging, '-> ' + data))
    add.childProcess.stderr.on('data', (data) => log(logging, '-> ' + data))

    add.then(() => {
      log(logging, "-> Finished 'git add'")
      log(logging, "-> Executing 'git commit'")

      const commit = process.spawn('git', [
        'commit',
        '-m',
        (job.success ? 'Successfully compiled: ' : 'Failed to compile: ') + job.author + '/' + job.repo + ':' + job.branch + ' (' + job.id + ')'
      ])

      commit.childProcess.stdout.on('data', (data) => log(logging, '-> ' + data))
      commit.childProcess.stderr.on('data', (data) => log(logging, '-> ' + data))

      commit.then(() => {
        log(logging, "-> Finished 'git commit'")
        log(logging, "-> Executing 'git push'")

        const push = process.spawn('git', ['push', 'origin', 'HEAD:gh-pages', '--force'])

        push.childProcess.stdout.on('data', (data) => log(logging, '-> ' + data))
        push.childProcess.stderr.on('data', (data) => log(logging, '-> ' + data))

        push.then(() => {
          log(logging, "-> Finished 'git push'")
          resolve()
        }, reject)
      }, reject)
    }, reject)
  })
}

/**
 * This method will return the github api path
 *
 * @param  {Object} job      The currently handled Job Object
 * @param  {String} endpoint The endpoint of this URL
 * @return {Object}          A Github-API URL Object
 */
function getURL (job, cfg, endpoint) {
  const url = 'https://api.github.com/repos/' + job.author + '/' + job.repo + endpoint
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': "The Busy Biscuit's Repository Compiler",
    'Time-Zone': 'UTC'
  }

  if (cfg.getToken()) {
    headers.authorization = 'token ' + cfg.getToken()
  }

  return {
    url: url,
    headers: headers
  }
}

/**
 * This converts a GitHub-Date into a human-readable format
 *
 * @param  {String} str A Date returned from GitHub
 * @return {String}     A formatted human-readable Date format
 */
function parseDate (str) {
  let date = ''

  date += str.split('T')[0].split('-')[2] + ' '
  date += months[parseInt(str.split('T')[0].split('-')[1]) - 1] + ' '
  date += str.split('T')[0].split('-')[0] + ' ('
  date += str.split('T')[1].replace('Z', '') + ')'

  return date
}
