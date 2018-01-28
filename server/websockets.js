
const ioFactory = require('socket.io')
const capitalize = require('capitalize')

const { SISMEMBER, SADD, SREM, MGET, SMEMBERS, GET, SET, MSET } = require('./Redis')

async function updateStatus (socket, resetTime, roomname) {
  const [current, next, urgent, wantToFinish, lastTakerOver] = await MGET(`${roomname}:current`,
    `${roomname}:next`, `${roomname}:urgent`, `${roomname}:wantToFinish`,
    `${roomname}:lastTakerOver`)
  const connected = await SMEMBERS(`${roomname}:connectedUsers`)
  var secondsSinceLastTakerOver = Math.floor((Date.now() - new Date(lastTakerOver).getTime()) / 1000)
  if (resetTime) {
    secondsSinceLastTakerOver = 0
    await SET(`${roomname}:lastTakerOver`, new Date().toUTCString())
  }
  const emitData = {
    current,
    next,
    urgent,
    wantToFinish,
    secondsSinceLastTakerOver,
    connected
  }
  socket.broadcast.emit('update status', emitData)
  socket.emit('update status', emitData)
}

async function transferName (socket, { username, roomname }) {
  const nameCaped = capitalize(username)
  // console.log(`transfer name:: ${nameCaped}`)
  if (!await SISMEMBER(`${roomname}:connectedUsers`, nameCaped)) {
    socket.username = nameCaped
    socket.roomname = roomname
    await SADD(`${roomname}:connectedUsers`, nameCaped)
    socket.emit('user accepted', nameCaped)
    updateStatus(socket, false, roomname)
  } else {
    socket.emit('user join failed', 'Name already exists')
  }
}

async function rejoinUser (socket, { username, roomname }) {
  const nameCaped = capitalize(username)
  // console.log(`rejoin user:: ${nameCaped}`)
  socket.username = nameCaped
  socket.roomname = roomname
  socket.emit('user accepted', nameCaped)
  await SADD(`${roomname}:connectedUsers`, nameCaped)
  updateStatus(socket, false, roomname)
}

async function disconnect (socket) {
  // console.log(`disconnect:: ${socket.username} / ${socket.roomname}`)
  if (socket.username) {
    await SREM(`${socket.roomname}:connectedUsers`, socket.username)
  }
  updateStatus(socket, false, socket.roomname)
}

async function tookOver (socket, { username, roomname }) {
  // console.log(`took over:: ${username}`)
  if (await GET(`${roomname}:current`) !== username) {
    await MSET(`${roomname}:current`, username,
      `${roomname}:next`, '', `${roomname}:urgent`, '', `${roomname}:wantToFinish`, '')
    updateStatus(socket, true, roomname)
  }
}

async function wantToFinish (socket, { username, roomname }) {
  // console.log(`want to finish:: ${username}`)
  if (await GET(`${roomname}:current`) === username) {
    await SET(`${roomname}:wantToFinish`, username)
    updateStatus(socket, false, roomname)
  }
}

async function askForNext (socket, { username, roomname }) {
  // console.log(`ask for next:: ${username}`)
  const [next, urgent, current] = await MGET(`${roomname}:next`, `${roomname}:urgent`, `${roomname}:current`)
  if (next === '' && urgent === '' && current !== username) {
    await SET(`${roomname}:next`, username)
    updateStatus(socket, false, roomname)
  }
}

async function askForUrgent (socket, { username, roomname }) {
  // console.log(`ask for urgent:: ${username}`)
  if (await GET(`${roomname}:current`) !== username) {
    await MSET(`${roomname}:urgent`, username, `${roomname}:next`, '')
    updateStatus(socket, false, roomname)
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
