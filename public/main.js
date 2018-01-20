$(function() {

  function getUrlParam(paramName) {
    var url = window.location.search.substring(1);
    var vars = url.split('&');
    for (var i = 0; i < vars.length; i++) {
      var nameVal = vars[i].split('=');
      if (nameVal[0] === paramName) {
        return nameVal[1];
      }
    }
    return 'not_found';
  }

  var $window = $(window);
  var $yourname = $('#yourname');
  $yourname.html(getUrlParam('name'));
  var $conntected = $('#conntected');
  var $current = $('#current');
  var $queue = $('#queue');
  var $since = $('#since');


  var btnExt = $('#btnNext');
  var btnUrgent = $('#btnUrgent');
  var btnTookOver = $('#btnTookOver');
  var btnWantToFinish = $('#btnWantToFinish');

  var socket = io();

  btnExt.click(function() {
    socket.emit('ask for next', $yourname.html());
  });
  btnUrgent.click(function() {
    socket.emit('ask for urgent', $yourname.html());
  });
  btnTookOver.click(function() {
    socket.emit('took over', $yourname.html());
  });
  btnWantToFinish.click(function() {
    socket.emit('want to finish', $yourname.html());
  });

  var sinceCounter = 0;
  setInterval(function() {
    $since.html(sinceCounter);
    sinceCounter++;
  }, 1000);

  socket.on('update status', function (data) {
    if (data.resetTime) {
      sinceCounter = 0;
      $since.html(sinceCounter);
    }

    // "I want to finish" button is only available for member who is current and the button
    // wasn't already pressed
    if (data.current === $yourname.html() && data.wantToFinish !== $yourname.html()) {
      btnWantToFinish.show();
    } else {
      btnWantToFinish.hide();
    }
    // "I took over" button is only available if the member is already current
    if (data.current !== $yourname.html()) {
      btnTookOver.show();
    } else {
      btnTookOver.hide();
    }
    // "I want next" button is only available if member is not already current and
    // next or urgent is not pressed yet
    if (data.current !== $yourname.html() && data.next === '' && data.urgent === '') {
      btnExt.show();
    } else {
      btnExt.hide();
    }
    // "I want NOW" button is only available if member is not already current and
    // urgent is not pressed by this member yet
    if (data.current !== $yourname.html() && data.urgent !== $yourname.html()) {
      btnUrgent.show();
    } else {
      btnUrgent.hide();
    }

    if (data.wantToFinish) {
      $current.attr("src", "./images/done_" + data.wantToFinish.toLowerCase() + ".png");
    } else {
      $current.attr("src", "./images/profile_" + data.current.toLowerCase() + ".png");
    }
    if (data.urgent) {
      $queue.attr("src", "./images/urgent_" + data.urgent.toLowerCase() + ".gif");
      $queue.show();
    } else if (data.next) {
      $queue.attr("src", "./images/next_" + data.next.toLowerCase() + ".png");
      $queue.show();
    } else {
      $queue.hide();
    }
  });

  socket.on('user join failed', function (error) {
    alert(error);
  });

  socket.on('user joined', function (usernames) {
    var s = '';
    $.each(usernames, function(propertyName, valueOfProperty) {
      if (s !== '') {
        s += ', ';
      }
      s += '<span class="userSpan" id="userSpan' + propertyName.toLowerCase() + '">' + propertyName + "</span>";
    });
    $conntected.html(s);
    $.each(usernames, function(propertyName, valueOfProperty) {
      $("#userSpan" + propertyName.toLowerCase()).click(function() {
        socket.emit('took over', propertyName.toLowerCase());
      });
    });
  });

  socket.emit('transfer name', $yourname.html());
});
