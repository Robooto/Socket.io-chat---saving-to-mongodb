var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');

//another way
// var io = require('socket.io').listen(app.listen(3000));

// nickname array
var users = {};

server.listen(3000);

mongoose.connect('mongodb://localhost/socketchat', function(err) {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected to mongodb');
    }
});

var chatSchema = mongoose.Schema({
    nick: String,
    msg: String,
    created: {
        type: Date,
        default: Date.now
    }
});

var Chat = mongoose.model('Message', chatSchema);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// connection for all io events
io.sockets.on('connection', function(socket) {

	// load old messages to the user
	var query = Chat.find({});
	query.sort('-created').limit(10).exec(function(err, docs) {
		if(err) throw err;

		socket.emit('load old msgs', docs);
	});

    // receive nicknames and send them to the client if new
    socket.on('new user', function(data, callback) {
        if (data in users) {
            callback(false);
        } else {
            callback(true);
            socket.nickname = data;
            users[socket.nickname] = socket;
            updateNicknames();
        }
    });

    // receiving message
    socket.on('send message', function(data, callback) {

        var msg = data.trim();
        if (msg.substr(0, 1) === '@') {
            msg = msg.substr(1);
            var ind = msg.indexOf(' ');
            if (ind !== -1) {
                var name = msg.substr(0, ind);
                var msg = msg.substr(ind + 1);
                if (name in users) {
                    users[name].emit('whisper', {
                        msg: msg,
                        nick: socket.nickname
                    });
                    console.log('whisper');
                } else {
                    callback('Error!  Enter a valid user.');
                }

            } else {
                callback('Error!  Please enter a message for your whisper.');
            }

        } else {

            // save to mongodb
            var newMsg = new Chat({
                msg: msg,
                nick: socket.nickname
            });
            newMsg.save(function(err) {
                if (err) throw err;

                // send message back to users
                io.sockets.emit('new message', {
                    msg: msg,
                    nick: socket.nickname
                });
            });


            // broadcast sends to everyone execpt sender
            //sockets.broadcast.emit('new message', data);
        }

    });

    //diconnect remove users
    socket.on('disconnect', function(data) {
        if (!socket.nickname) return;

        delete users[socket.nickname];
        updateNicknames();
    });

    function updateNicknames() {
        io.sockets.emit('usernames', Object.keys(users));
    }

});