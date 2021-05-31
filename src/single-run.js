global.status = {
  task: {},
  running: true
}

require('./main.js').start(true).then(() => console.log('Run completed.'))
