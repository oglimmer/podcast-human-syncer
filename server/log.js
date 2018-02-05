
const DEBUG = false

module.exports = (functionName, output) => {
  if (DEBUG) {
    console.log(`****************************** ${functionName}:: ${output}`)
  }
}
