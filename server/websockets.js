Array.prototype.remove = function(element) {
  const index = this.indexOf(element);
  this.splice(index, 1);
}
Array.prototype.findIgnoreCase = function(element) {
  return !!this.find(e => e.toLowerCase() === element.toLowerCase());
}

module.exports = server => {

  const io = require('socket.io')(server);

  const globalData = {
    connectedUsers: [],
    current: '',
    next: '',
    urgent: '',
    wantToFinish: '',
  };

  global.globalData = globalData;

  io.on('connection', socket => {

    socket.on('transfer name', name => {
      // console.log(`transfer name:: ${name}`);
      if (globalData.connectedUsers.findIgnoreCase(name)) {
        socket.emit('user join failed', 'Name already exists');
      } else {
        socket.username = name;
        globalData.connectedUsers.push(name);
        updateStatus(false);
      }
    });

    socket.on('rejoin user', name => {
      socket.username = name;
      if (!globalData.connectedUsers.findIgnoreCase(name)) {
        globalData.connectedUsers.push(name);
      }
      updateStatus(false);
    });

    socket.on('disconnect', () => {
      // console.log(`disconnect:: ${socket.username}`);
      globalData.connectedUsers.remove(socket.username);
      updateStatus(false);
    });

    function updateStatus(resetTime) {
      socket.broadcast.emit('update status', {
        current: globalData.current,
        next: globalData.next,
        urgent: globalData.urgent,
        wantToFinish: globalData.wantToFinish,
        resetTime: resetTime,
        conntected: globalData.connectedUsers
      });
      socket.emit('update status', {
        current: globalData.current,
        next: globalData.next,
        urgent: globalData.urgent,
        wantToFinish: globalData.wantToFinish,
        resetTime: resetTime,
        conntected: globalData.connectedUsers
      });
    }

    socket.on('took over', name => {
      // console.log(`took over:: ${name}`);
      if (globalData.current !== name) {
        globalData.current =  name;
        globalData.next = '';
        globalData.urgent = '';
        globalData.wantToFinish = '';
        updateStatus(true);
      }
    });
    socket.on('want to finish', name => {
      // console.log(`want to finish:: ${name}`);
      if (globalData.current === name) {
        globalData.wantToFinish = name;
        updateStatus(false);
      }
    });
    socket.on('ask for next', name => {
      // console.log(`ask for next:: ${name}`);
      if (globalData.next === '' && globalData.urgent === '' && globalData.current !== name) {
        globalData.next = name;
        updateStatus(false);
      }
    });
    socket.on('ask for urgent', name => {
      // console.log(`ask for urgent:: ${name}`);
      if (globalData.current !== name) {
        globalData.urgent = name;
        globalData.next = '';
        updateStatus(false);
      }
    });
  });

}
