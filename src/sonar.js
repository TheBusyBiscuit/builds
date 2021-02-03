const process = require('child-process-promise')
const path = require('path')

const cfg = require('../src/config.js')(path.resolve(__dirname, '../resources/config.json'))

if (cfg.sonar.isEnabled()) {
  console.log('Connecting with Sonar...')

  const args = cfg.sonar.getArguments().splice(0)
  args.push('-Dsonar.login=' + cfg.sonar.getToken())

  const scanner = process.spawn('sonar-scanner', args, {
    shell: true
  })

  scanner.childProcess.stdout.on('data', data => console.log('-> ' + data))
  scanner.childProcess.stderr.on('data', data => console.log('-> ' + data))

  scanner.then(() => {
    console.log('-> Finished!')
  }).catch(err => console.log(err.stack))
}
