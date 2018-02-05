
const ioFactory = require('socket.io')
const capitalize = require('capitalize')

const { SISMEMBER, SADD, SREM, GET, MGET, SET, MSET, HGET, HSET, DEL } = require('./Redis')

const log = require('./log')
const getUpdateObject = require('./getUpdateObject')
const { RECIPIENT_CURRENT, RECIPIENT_OTHERS, RECIPIENT_ALL,
  FIELDS_SIMPLE,
  CURRENT, NEXT, URGENT, WANT_OF_FINISH, LAST_TAKE_OVER, CONNECTED, TOTAL_TIME, CHAT_MESSAGES } = require('./constants')

function updateStatus (socket, recipients, emitData) {
  if (recipients & RECIPIENT_CURRENT) {
    socket.emit('update status', emitData)
  }
  if (recipients & RECIPIENT_OTHERS) {
    socket.broadcast.emit('update status', emitData)
  }
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

async function changeChat (socket, { inputChat, username, roomname }) {
  log('change chat', `${inputChat}:${roomname}`)
  await HSET(`${roomname}:${CHAT_MESSAGES}`, username, inputChat)
  updateStatus(socket, RECIPIENT_OTHERS, await getUpdateObject(roomname, [CHAT_MESSAGES]))
}

async function resetAllRimers (socket, { roomname }) {
  await DEL(`${roomname}:${TOTAL_TIME}`)
  await SET(`${roomname}:${LAST_TAKE_OVER}`, new Date().toUTCString())
  updateStatus(socket, RECIPIENT_ALL, await getUpdateObject(roomname, [TOTAL_TIME, LAST_TAKE_OVER]))
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
    socket.on('change chat', data => changeChat(socket, data))
    socket.on('reset all timers', data => resetAllRimers(socket, data))
  })
}
