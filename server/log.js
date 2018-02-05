
const DEBUG = true

module.exports = (functionName, output) => {
  if (DEBUG) {
    console.log(`****************************** ${functionName}:: ${output}`)
  }
}
