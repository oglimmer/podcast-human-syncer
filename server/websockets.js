
const ioFactory = require('socket.io')
const capitalize = require('capitalize')

const DEBUG = false

const { SMEMBERS, SISMEMBER, SADD, SREM, GET, MGET, SET, MSET, HGET, HSET, HGETALL } = require('./Redis')

const RECIPIENT_CURRENT = 1
const RECIPIENT_OTHERS = 2
const RECIPIENT_ALL = 3

const CURRENT = 'current'
const NEXT = 'next'
const URGENT = 'urgent'
const WANT_OF_FINISH = 'wantToFinish'
const LAST_TAKE_OVER = 'lastTakerOver'
const CONNECTED = 'connected'
const TOTAL_TIME = 'totalTime'

const FIELDS_SIMPLE = [CURRENT, NEXT, URGENT, WANT_OF_FINISH, LAST_TAKE_OVER]
// SET: CONNECTED
// MAP: TOTAL_TIME

function log (functionName, output) {
  if (DEBUG) {
    console.log(`****************************** ${functionName}:: ${output}`)
  }
}

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

function updateStatus (socket, recipients, emitData) {
  if (recipients & RECIPIENT_CURRENT) {
    socket.emit('update status', emitData)
  }
  if (recipients & RECIPIENT_OTHERS) {
    socket.broadcast.emit('update status', emitData)
  }
}

async function getUpdateObject (roomname, fieldsToUpdate) {
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
  if (emitData.lastTakerOver) {
    emitData.lastTakerOver = Math.floor((Date.now() - new Date(emitData.lastTakerOver).getTime()) / 1000)
  }
  return emitData
}

async function transferName (socket, { username, roomname }) {
  const nameCaped = capitalize(username)
  log('transferName', `${nameCaped}:${roomname}`)
  if (!await SISMEMBER(`${roomname}:${CONNECTED}`, nameCaped)) {
    socket.username = nameCaped
    socket.roomname = roomname
    await SADD(`${roomname}:${CONNECTED}`, nameCaped)
    socket.emit('user accepted', Object.assign({},
      { username: nameCaped },
      await getUpdateObject(roomname, [CURRENT, NEXT, URGENT, WANT_OF_FINISH, LAST_TAKE_OVER, CONNECTED, TOTAL_TIME])
    ))
    updateStatus(socket, RECIPIENT_OTHERS, await getUpdateObject(roomname, [CONNECTED]))
  } else {
    socket.emit('user join failed', 'Name already exists')
  }
}

async function rejoinUser (socket, { username, roomname }) {
  const nameCaped = capitalize(username)
  log('rejoin user', `${nameCaped}:${roomname}`)
  socket.username = nameCaped
  socket.roomname = roomname
  await SADD(`${roomname}:${CONNECTED}`, nameCaped)
  socket.emit('user accepted', Object.assign({},
    { username: nameCaped },
    await getUpdateObject(roomname, [CURRENT, NEXT, URGENT, WANT_OF_FINISH, LAST_TAKE_OVER, CONNECTED, TOTAL_TIME])
  ))
  updateStatus(socket, RECIPIENT_OTHERS, await getUpdateObject(roomname, [CONNECTED]))
}

async function disconnect (socket) {
  log('disconnect', `${socket.username}:${socket.roomname}`)
  if (socket.username) {
    await SREM(`${socket.roomname}:${CONNECTED}`, socket.username)
  }
  updateStatus(socket, RECIPIENT_OTHERS, await getUpdateObject(socket.roomname, [CONNECTED]))
}

async function tookOver (socket, { username, roomname }) {
  log('took over', `${username}:${roomname}`)
  const [ currentUser, lastTakeOver ] = await MGET(`${roomname}:${CURRENT}`, `${roomname}:${LAST_TAKE_OVER}`)
  if (currentUser !== username) {
    await MSET(
      `${roomname}:${CURRENT}`, username,
      `${roomname}:${NEXT}`, '',
      `${roomname}:${URGENT}`, '',
      `${roomname}:${WANT_OF_FINISH}`, '',
      `${roomname}:${LAST_TAKE_OVER}`, new Date().toUTCString())
    if (currentUser) {
      const lastTotalTimeForUser = await HGET(`${roomname}:${TOTAL_TIME}`, `${currentUser}`)
      const timeToAdd = Math.floor((Date.now() - new Date(lastTakeOver).getTime()) / 1000)
      const newTotalTime = lastTotalTimeForUser ? parseInt(lastTotalTimeForUser) + timeToAdd : timeToAdd
      await HSET(`${roomname}:${TOTAL_TIME}`, `${currentUser}`, newTotalTime)
    }
    updateStatus(socket, RECIPIENT_ALL, await getUpdateObject(roomname, [TOTAL_TIME, ...FIELDS_SIMPLE]))
  }
}

async function wantToFinish (socket, { username, roomname }) {
  log('ask for finish', `${username}:${roomname}`)
  if (await GET(`${roomname}:${CURRENT}`) === username) {
    await SET(`${roomname}:${WANT_OF_FINISH}`, username)
    updateStatus(socket, RECIPIENT_ALL, await getUpdateObject(roomname, [WANT_OF_FINISH]))
  }
}

async function askForNext (socket, { username, roomname }) {
  log('ask for next', `${username}:${roomname}`)
  const [next, urgent, current] = await MGET(`${roomname}:${NEXT}`, `${roomname}:${URGENT}`, `${roomname}:${CURRENT}`)
  if (next === '' && urgent === '' && current !== username) {
    await SET(`${roomname}:${NEXT}`, username)
    updateStatus(socket, RECIPIENT_ALL, await getUpdateObject(roomname, [NEXT]))
  }
}

async function askForUrgent (socket, { username, roomname }) {
  log('ask for urgent', `${username}:${roomname}`)
  if (await GET(`${roomname}:${CURRENT}`) !== username) {
    await MSET(`${roomname}:${URGENT}`, username, `${roomname}:${NEXT}`, '')
    updateStatus(socket, RECIPIENT_ALL, await getUpdateObject(roomname, [NEXT, URGENT]))
  }
}

module.exports = server => {
  ioFactory(server).on('connection', socket => {
    socket.on('transfer name', data => transferName(socket, data))
    socket.on('rejoin user', data => rejoinUser(socket, data))
    socket.on('disconnect', () => disconnect(socket))
    socket.on('took over', data => tookOver(socket, data))
    socket.on('want to finish', data => wantToFinish(socket, data))
    socket.on('ask for next', data => askForNext(socket, data))
    socket.on('ask for urgent', data => askForUrgent(socket, data))
  })
}
