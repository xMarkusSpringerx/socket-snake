/*************************************
 //
 // snake app
 //
 **************************************/

// express magic
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var moment = require('moment');

var device = require('express-device');
var runningPortNumber = process.env.PORT;

app.configure(function () {
    app.use(express.static(__dirname + '/public'));
    app.use(express.static(__dirname + '/node_modules'));
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views/');
    app.use(device.capture());
});

// logs every request
app.use(function (req, res, next) {
    console.log({method: req.method, url: req.url, device: req.device});
    next();
});

app.get("/", function (req, res) {
    if (req.device.type == 'desktop') {
        res.render('index', {});
    } else {
        //Mobile phone
        res.render('control', {});
    }
});

app.get("/control", function (req, res) {
    res.render('control', {});
});

app.get("/voice", function (req, res) {
    res.render('voice', {});
});

// Device Initialization
var is_first_room = true;
var device_connected = false;

var connected_rooms = [];


function getNewRoom() {

    var roomNr = Math.floor(Math.random() * 10000);

    return {
        roomNr: roomNr,
        controlConnected: false
    }
}

function roomNrExistsAndAvailable(roomNr) {
    for (i = 0; i < connected_rooms.length; i++) {
        if (connected_rooms[i].roomNr == roomNr && connected_rooms[i].controlConnected == false) {
            return true
        }
    }
    return false;
}

function newHighScore(name, score, date) {
    return {
        name: name,
        score: score,
        date: date
    }
}

/* HANDLERS */

function HighscoreArray(handler) {
    this.highscores = [];
    this.mutationHandler = handler || function () {
        };

    this.setHandler = function (f) {
        this.mutationHandler = f;
    };

    this.callHandler = function () {
        if (typeof this.mutationHandler === 'function') {
            this.mutationHandler();
        }
    };

    this.push = function (obj) {

        if(!obj.date) {
            obj.date = moment().format('DD MMMM YYYY hh:mm:ss a');
        }

        var i;
        for(i = 0; i < this.highscores.length; i++) {
            if(this.highscores[i].score < obj.score) {
                break;
            }
        }

        this.highscores.splice(i, 0, obj);

        this.callHandler();
    };
    this.pop = function () {
        this.callHandler();
        return this.highscores.pop();
    };

    this.getArray = function () {
        return this.highscores;
    }
}

function nameAlreadyInHighscore(name) {
    for (i = 0; i < highscores.length; i++) {
        if (highscores[i].name == name) {
            return true;
        }
    }

    return false;
}

var highscores = new HighscoreArray();

io.sockets.on('connection', function (socket) {

    /* Highscore Handler */
    var highscoreHandler = function () {

        io.sockets.emit('set_highscores', {all_highscores: highscores.highscores});
    };

    highscores.setHandler(highscoreHandler);

    socket.on('get_direction', function (data) {

        socket.broadcast.to(socket.room).emit('update_direction', {dir: data.dir});

    });

    socket.on('c_start_game', function () {
        if (typeof socket.room != "undefined") {
            io.sockets.to(socket.room).emit('start_game');
        } else {
            console.log("KEIN ROOM VERFÜGBAR");
        }
    });

    socket.on('set_lose', function (data) {
        io.sockets.emit('set_highscores', {all_highscores: highscores.highscores});
        io.sockets.to(socket.room).emit('lose_game');
    });


    socket.on('new_highscore', function (data) {
        if (typeof data != "undefined") {
            if (nameAlreadyInHighscore(data.name) == false) {
                highscores.push(newHighScore(data.name, data.score));
            } else {
                socket.emit('highscorename_already_in_use');
            }
        } else {
            console.log('Es wurde kein Highscore übergeben.')
        }
    });

    socket.on('new_room', function () {
        var room = getNewRoom();
        connected_rooms.push(room);
        socket.emit('get_room_nr', {roomNr: room.roomNr});
    });

    socket.on('join_room', function (data) {
        socket.room = data.roomNr;
        socket.join(data.roomNr);
    });

    socket.on('check_for_roomnr', function (data) {
        var roomNr = data.roomNr;
        if (roomNrExistsAndAvailable(roomNr)) {
            socket.join(roomNr);
            socket.room = roomNr;

            io.sockets.to(socket.room).emit('device_connected_to_room');

            // Set Default Highscores
            io.sockets.to(socket.room).emit('set_highscores', {all_highscores: highscores.highscores});

            if(is_first_room) {
                highscores.push(newHighScore("Adi Pös", 1, moment().subtract(80, "minutes") ));

                highscores.push(newHighScore("Andi Bar", 4, moment().subtract(7, 'hours')));
                highscores.push(newHighScore("Anna Konda", 2, moment().subtract(7, 'days')));
                highscores.push(newHighScore("B. Kloppt", 9, moment().subtract(60, 'minutes')));
                highscores.push(newHighScore("Axel Haar", 10, moment().subtract(2, 'hours')));
                highscores.push(newHighScore("Axel Zucken", 25, moment().subtract(12, 'hours')));
                highscores.push(newHighScore("Mätt Brötchen", 7, moment().subtract(400, 'minutes')));
                highscores.push(newHighScore("Nico Laus", 14, moment().subtract(2, 'days')));
                highscores.push(newHighScore("Paul Lahner", 6, moment().subtract(1, 'days')));

                is_first_room = false;
            }

            for (i = 0; i < connected_rooms.length; i++) {
                if (connected_rooms[i].roomNr == roomNr) {
                    connected_rooms[i].controlConnected = true;
                }
            }
        } else {
            socket.emit('failure_for_roomNr', {roomNr: roomNr});
        }
    });

    socket.on('c_set_new_highscore', function (data) {
        username = data.name;
    });

    socket.on('sync_data_to_control', function (data) {

        socket.broadcast.to(socket.room).emit('sync_data', {score: data.score});
    });

    socket.on('update_score', function (data) {

        var i;
        for (i = 0; i < highscores.highscores.length; i++) {
            console.log('--------');
            console.log(i, highscores.highscores[i].score, data.score);
            console.log('--------');

            if (highscores.highscores[i].score <= data.score) {
                break;
            }
        }

        socket.emit('update_live_score', {act_pos: i + 1});
    });

    socket.on('disconnect', function () {
        console.log('DISCONNECTED');
        device_connected = false;
        //socket.broadcast.to(roomNr).emit('device_disconnected');
    });


});

server.listen(1337);
