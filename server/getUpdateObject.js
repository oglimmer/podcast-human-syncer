
const { SMEMBERS, MGET, HGETALL } = require('./Redis')

const { FIELDS_SIMPLE, CONNECTED, TOTAL_TIME, CHAT_MESSAGES } = require('./constants')

function arrayToObject (arrayKeys, arrayValues) {
  const newObj = {}
  if (arrayKeys.length !== arrayValues.length) {
    throw new Error('input arrays have different length')
  }
  let i = 0
  arrayKeys.forEach((k) => { newObj[k] = arrayValues[i++] })
  return newObj
}

function contains (haystack, needle) {
  return !!haystack.find(e => e === needle)
}

module.exports = async function getUpdateObject (roomname, fieldsToUpdate) {
  const fieldsToUpdateSimple = fieldsToUpdate.filter(e => contains(FIELDS_SIMPLE, e))
  const simpleFieldsToLoad = fieldsToUpdateSimple.map(e => `${roomname}:${e}`)
  let emitData = {}
  if (simpleFieldsToLoad.length > 0) {
    emitData = arrayToObject(fieldsToUpdateSimple, await MGET(...simpleFieldsToLoad))
  }
  if (contains(fieldsToUpdate, CONNECTED)) {
    emitData.connected = await SMEMBERS(`${roomname}:${CONNECTED}`)
  }
  if (contains(fieldsToUpdate, TOTAL_TIME)) {
    emitData.totalTime = await HGETALL(`${roomname}:${TOTAL_TIME}`)
  }
  if (contains(fieldsToUpdate, CHAT_MESSAGES)) {
    emitData.chatMessages = await HGETALL(`${roomname}:${CHAT_MESSAGES}`)
  }
  if (emitData.lastTakerOver) {
    emitData.lastTakerOver = Math.floor((Date.now() - new Date(emitData.lastTakerOver).getTime()) / 1000)
  }
  return emitData
}
