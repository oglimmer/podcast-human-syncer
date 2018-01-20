// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

var connectedUsers = {};
var current = '';
var next = '';
var urgent = '';
var wantToFinish = '';

io.on('connection', function (socket) {

  socket.on('transfer name', function (name) {
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

  socket.on('disconnect', function () {
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

  socket.on('took over', function (name) {
    if (current !== name) {
      current =  name;
      next = '';
      urgent = '';
      wantToFinish = '';
      updateStatus(true);
    }
  });
  socket.on('want to finish', function (name) {
    if (current === name) {
      wantToFinish = name;
      updateStatus(false);
    }
  });
  socket.on('ask for next', function (name) {
    if (next === '' && urgent === '' && current !== name) {
      next = name;
      updateStatus(false);
    }
  });
  socket.on('ask for urgent', function (name) {
    if (current !== name) {
      urgent = name;
      next = '';
      updateStatus(false);
    }
  });
});
