const fs = require('fs');
const app = require('express')();
const compression = require('compression');
const sapper = require('sapper');
const static = require('serve-static');

// ------------------------------------------------------------------OZ:start
const server = require('http').createServer(app);
// ------------------------------------------------------------------OZ:end

const { PORT = 3000 } = process.env;

// this allows us to do e.g. `fetch('/api/blog')` on the server
const fetch = require('node-fetch');
global.fetch = (url, opts) => {
	if (url[0] === '/') url = `http://localhost:${PORT}${url}`;
	return fetch(url, opts);
};

app.use(compression({ threshold: 0 }));

app.use(static('assets'));

app.use(sapper());

server.listen(PORT, () => {
	console.log(`listening on port ${PORT}`);
});

// ------------------------------------------------------------------OZ:start
const io = require('socket.io')(server);

var connectedUsers = {};
var current = '';
var next = '';
var urgent = '';
var wantToFinish = '';

io.on('connection', socket => {

  socket.on('transfer name', name => {
    console.log(`transfer name:: ${name}`);
    if (connectedUsers[name]) {
      socket.emit('user join failed', 'Name already exists');
    } else {
      socket.username = name;
      connectedUsers[name] = true;
      socket.emit('user joined', connectedUsers);
      socket.broadcast.emit('user joined', connectedUsers);
      if (!current && current !== 'not_found') {
        current =  name;
      }
      updateStatus(false);
    }
  });

  socket.on('disconnect', () => {
    console.log(`disconnect:: ${socket.username}`);
    delete connectedUsers[socket.username];
    socket.broadcast.emit('user joined', connectedUsers);
  });

  function updateStatus(resetTime) {
    socket.broadcast.emit('update status', {
      current: current,
      next: next,
      urgent: urgent,
      wantToFinish: wantToFinish,
      resetTime: resetTime
    });
    socket.emit('update status', {
      current: current,
      next: next,
      urgent: urgent,
      wantToFinish: wantToFinish,
      resetTime: resetTime
    });
  }

  socket.on('took over', name => {
    console.log(`took over:: ${name}`);
    if (current !== name) {
      current =  name;
      next = '';
      urgent = '';
      wantToFinish = '';
      updateStatus(true);
    }
  });
  socket.on('want to finish', name => {
    console.log(`want to finish:: ${name}`);
    if (current === name) {
      wantToFinish = name;
      updateStatus(false);
    }
  });
  socket.on('ask for next', name => {
    console.log(`ask for next:: ${name}`);
    if (next === '' && urgent === '' && current !== name) {
      next = name;
      updateStatus(false);
    }
  });
  socket.on('ask for urgent', name => {
    console.log(`ask for urgent:: ${name}`);
    if (current !== name) {
      urgent = name;
      next = '';
      updateStatus(false);
    }
  });
});
