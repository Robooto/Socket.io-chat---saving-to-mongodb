var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

// nickname array
var nicknames = [];

server.listen(3000);

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

// connection for all io events
io.sockets.on('connection', function(socket) {
	
	// receive nicknames and send them to the client if new
	socket.on('new user', function (data, callback) {
		if(nicknames.indexOf(data) !== -1) {
			callback(false);
		} else {
			callback(true);
			socket.nickname = data;
			nicknames.push(socket.nickname);
			updateNicknames();
		}
	});

	// receiving message
	socket.on('send message', function (data) {
		// send message back to users
		io.sockets.emit('new message', {
			msg: data, nick: socket.nickname
		});

		// broadcast sends to everyone execpt sender
		//sockets.broadcast.emit('new message', data);
	});

	//diconnect remove users
	socket.on('disconnect', function (data) {
		if(!socket.nickname) return;

		nicknames.splice(nicknames.indexOf(socket.nickname), 1);
		updateNicknames();
	});

	function updateNicknames() {
		io.sockets.emit('usernames', nicknames);
	}

});

