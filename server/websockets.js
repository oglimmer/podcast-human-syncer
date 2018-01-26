
const ioFactory = require('socket.io')
const capitalize = require('capitalize')

const { SISMEMBER, SADD, SREM, MGET, SMEMBERS, GET, SET, MSET } = require('./Redis')

async function updateStatus (socket, resetTime) {
  const [current, next, urgent, wantToFinish] = await MGET('current', 'next', 'urgent', 'wantToFinish')
  const conntected = await SMEMBERS('connectedUsers')
  const emitData = {
    current,
    next,
    urgent,
    wantToFinish,
    resetTime,
    conntected
  }
  socket.broadcast.emit('update status', emitData)
  socket.emit('update status', emitData)
}

async function transferName (socket, name) {
  const nameCaped = capitalize(name)
  // console.log(`transfer name:: ${nameCaped}`)
  if (!await SISMEMBER('connectedUsers', nameCaped)) {
    socket.username = nameCaped
    await SADD('connectedUsers', nameCaped)
    socket.emit('user accepted', nameCaped)
    updateStatus(socket, false)
  } else {
    socket.emit('user join failed', 'Name already exists')
  }
}

async function rejoinUser (socket, name) {
  const nameCaped = capitalize(name)
  // console.log(`rejoin user:: ${nameCaped}`)
  socket.username = nameCaped
  socket.emit('user accepted', nameCaped)
  await SADD('connectedUsers', nameCaped)
  updateStatus(socket, false)
}

async function disconnect (socket) {
  // console.log(`disconnect:: ${socket.username}`)
  if (socket.username) {
    await SREM('connectedUsers', socket.username)
  }
  updateStatus(socket, false)
}

async function tookOver (socket, name) {
  // console.log(`took over:: ${name}`)
  if (await GET('current') !== name) {
    await MSET('current', name, 'next', '', 'urgent', '', 'wantToFinish', '')
    updateStatus(socket, true)
  }
}

async function wantToFinish (socket, name) {
  // console.log(`want to finish:: ${name}`)
  if (await GET('current') === name) {
    await SET('wantToFinish', name)
    updateStatus(socket, false)
  }
}

async function askForNext (socket, name) {
  // console.log(`ask for next:: ${name}`)
  const [next, urgent, current] = await MGET('next', 'urgent', 'current')
  if (next === '' && urgent === '' && current !== name) {
    await SET('next', name)
    updateStatus(socket, false)
  }
}

async function askForUrgent (socket, name) {
  // console.log(`ask for urgent:: ${name}`)
  if (await GET('current') !== name) {
    await MSET('urgent', name, 'next', '')
    updateStatus(socket, false)
  }
}

module.exports = server => {
  ioFactory(server).on('connection', socket => {
    socket.on('transfer name', name => transferName(socket, name))
    socket.on('rejoin user', name => rejoinUser(socket, name))
    socket.on('disconnect', () => disconnect(socket))
    socket.on('took over', name => tookOver(socket, name))
    socket.on('want to finish', name => wantToFinish(socket, name))
    socket.on('ask for next', name => askForNext(socket, name))
    socket.on('ask for urgent', name => askForUrgent(socket, name))
  })
}
