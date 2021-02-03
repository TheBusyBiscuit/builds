/**
 * This function is just a very simple console.log wrapper, that may be expanded in the future
 */
module.exports = (logging, str, direct) => {
  if (logging) {
    if (direct) {
      process.stdout.write(str)
    } else {
      console.log(str)
    }
  }
}
