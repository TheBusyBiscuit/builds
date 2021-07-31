global.status = {
  task: {},
  running: true
}

require('./main.js').start(true).then(() => {
  console.log('Run completed.')

  // I don't yet know why but for some reason GitHub Actions does not terminate itself at the moment.
  process.exit()
})
