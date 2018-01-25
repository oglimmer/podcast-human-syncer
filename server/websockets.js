
const ioFactory = require('socket.io');
const { promisify } = require('util');
const redis = require('redis');
const capitalize = require('capitalize');

const client = redis.createClient();
const SMEMBERS = promisify(client.SMEMBERS).bind(client);
const SISMEMBER = promisify(client.SISMEMBER).bind(client);
const SADD = promisify(client.SADD).bind(client);
const SREM = promisify(client.SREM).bind(client);
const GET = promisify(client.GET).bind(client);
const MGET = promisify(client.MGET).bind(client);
const SET = promisify(client.SET).bind(client);
const MSET = promisify(client.MSET).bind(client);

global.DBREF = {
  SADD,
  SMEMBERS,
  MGET
};

module.exports = server => {

  const io = ioFactory(server);

  io.on('connection', socket => {

    socket.on('transfer name', async name => {
      const nameCaped = capitalize(name);
      // console.log(`transfer name:: ${nameCaped}`);
      if (!await SISMEMBER("connectedUsers", nameCaped)) {
        socket.username = nameCaped;
        await SADD("connectedUsers", nameCaped);
        socket.emit('user accepted', nameCaped);
        updateStatus(false);
      } else {
        socket.emit('user join failed', 'Name already exists');
      }
    });

    socket.on('rejoin user', async name => {
      const nameCaped = capitalize(name);
      // console.log(`rejoin user:: ${nameCaped}`);
      socket.username = nameCaped;
      socket.emit('user accepted', nameCaped);
      await SADD("connectedUsers", nameCaped);
      updateStatus(false);
    });

    socket.on('disconnect', async () => {
      // console.log(`disconnect:: ${socket.username}`);
      if (socket.username) {
        await SREM("connectedUsers", socket.username);
      }
      updateStatus(false);
    });

    async function updateStatus(resetTime) {
      const [current, next, urgent, wantToFinish] = await MGET('current', 'next', 'urgent', 'wantToFinish');
      const conntected = await SMEMBERS('connectedUsers');
      socket.broadcast.emit('update status', {
        current,
        next,
        urgent,
        wantToFinish,
        resetTime: resetTime,
        conntected
      });
      socket.emit('update status', {
        current,
        next,
        urgent,
        wantToFinish,
        resetTime: resetTime,
        conntected
      });
    }

    socket.on('took over', async name => {
      // console.log(`took over:: ${name}`);
      if (await GET('current') !== name) {
        await MSET('current', name, 'next', '', 'urgent', '', 'wantToFinish', '');
        updateStatus(true);
      }
    });
    socket.on('want to finish', async name => {
      // console.log(`want to finish:: ${name}`);
      if (await GET('current') === name) {
        await SET('wantToFinish', name);
        updateStatus(false);
      }
    });
    socket.on('ask for next', async name => {
      // console.log(`ask for next:: ${name}`);
      const [next, urgent, current] = await MGET('next', 'urgent', 'current');
      if (next === '' && urgent === '' && current !== name) {
        await SET('next', name);
        updateStatus(false);
      }
    });
    socket.on('ask for urgent', async name => {
      // console.log(`ask for urgent:: ${name}`);
      if (await GET('current') !== name) {
        await MSET('urgent', name, 'next', '');
        updateStatus(false);
      }
    });
  });

}
