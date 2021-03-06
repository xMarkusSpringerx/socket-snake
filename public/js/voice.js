/*************************************
 //
 // snake app
 //
 **************************************/

var socket = window.io.connect("http://localhost:1337/");
var app = app || {};


$(function () {
    moment.locale('de');

    var info_text = "Willst du nochmal ein Spiel spielen?<br /><h1>Highscores:</h1>";

    var act_room_nr;

    var act_highscores;

    var anzahl_grid = 80;
    var game_width = anzahl_grid * Math.floor((window.innerWidth - 100) / anzahl_grid);
    var length_single_block = game_width / anzahl_grid;

    var game_height = length_single_block * Math.floor((window.innerHeight - 200) / length_single_block);

    var next_dir;

    var food;
    var score = 0;

    var snake_array;

    // Gets overwritten
    var act_speed;
    var inverted_directions;

    /* SNAKE */
    var snake_color = "green";
    var snake_stroke_color = "white";

    var canvas = $("#canvas")[0];
    var ctx = canvas.getContext("2d");

    /* Set canvas to maximum width */

    $('#game').width(game_width + "px");
    ctx.canvas.width = game_width;
    ctx.canvas.height = game_height;

    var playground_width = $("#canvas").width();
    var playground_height = $("#canvas").height();


    var act_dir = "right";
    if (!('webkitSpeechRecognition' in window)) {
        alert('Dein Browser unterstützt keine Sprachsteuerung');
    } else {
        var recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        recognition.onresult = function (e) {
            for (var i = e.resultIndex; i < e.results.length; ++i) {
                console.log(e.results[i][0].transcript.replace(/^\s+|\s+$/g, ''));

                var result = e.results[i][0].transcript.replace(/^\s+|\s+$/g, '');

                var result_ary = result.split(" ");

                $.each(result_ary, function(index, res){
                    console.log("Test", res);
                    if (left_dict.indexOf(res) != -1 && act_dir != 'right') {
                        act_dir = "left";
                        update_direction('left');
                    }

                    if (up_dict.indexOf(res) != -1 && act_dir != 'down') {
                        act_dir = 'up';
                        update_direction('up');
                    }

                    if (right_dict.indexOf(res) != -1 && act_dir != 'left') {
                        act_dir = 'right';
                        update_direction('right');
                    }

                    if (down_dict.indexOf(res) != -1 && act_dir != 'up') {
                        act_dir = 'down';
                        update_direction('down');
                    }
                });
            }
        };
        // start listening
        recognition.start();
    }


    /* JOIN ROOM END */

    socket.on('set_highscores', function (data) {
        act_highscores = data.all_highscores;

        console.log(act_highscores);

        info_text = '<table width="100%" style="table-layout: fixed">' +
            '<th>Position</th><th>Name</th><th>Score</th><th>Wann?</th>';

        var pos = 1;
        $.each(act_highscores, function (index, obj) {
            console.log(obj);
            var test = moment(obj.date).format('DD MMMM YYYY hh:mm:ss a');

            info_text += "<tr><td>" + pos + ".</td><td>" + obj.name + "</td><td>" + obj.score + "</td><td>" + moment(test).fromNow() + "</td></tr>"
            pos++;
        });
        info_text += '</table>';
        $('#all_highscores').empty();
        $('#all_highscores').html(info_text);
    });

    function update_direction(data) {
        if (
            data == "left" && next_dir != "right" ||
            data == "up" && next_dir != "down" ||
            data == "down" && next_dir != "up" ||
            data == "right" && next_dir != "left"
        ) {
            if (inverted_directions) {
                if (data == "right") next_dir = "left";
                else if (data == "left") next_dir = "right";
                else if (data == "up") next_dir = "down";
                else if (data == "down") next_dir = "up";
            } else {
                next_dir = data;
            }
        }
    };


    $('#start').on('click', function () {
        init();
    });

    function init() {


        inverted_directions = false;
        act_speed = 100;
        swal.close();
        $('#score').text("0");
        $('#score_view').show();
        act_dir = "right";
        next_dir = "right";
        create_snake();
        create_food("green");
        score = 0;

        socket.emit('update_score', {score: score});

        if (typeof game_loop != "undefined") clearInterval(game_loop);
        game_loop = setInterval(paint, act_speed);
    }

    socket.on('device_disconnected', function () {
        $('#device_connected').hide();
        $('#connection_window').show();
    });


    socket.on('update_live_score', function (data) {
        $('#act_pos').text(data.act_pos + ". Position");
        $('#act_pos').animateCss("bounceIn");
    });

    socket.on('lose_game', function () {
        main_audio.pause();
        main_audio.duration = 0;
        applaus_audio.play();
        socket.emit('sync_data_to_control', {score: score});
        swal({
            title: "Leider verloren!",
            text: "<div id='all_highscores'>" + info_text + "</div>",
            type: "info",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Neues Spiel",
            closeOnConfirm: true,
            closeOnCancel: true,
            html: true
        }, function (isConfirm) {
            if (isConfirm) {
                socket.emit('c_start_game');
            }
        });
    });

    function create_snake() {
        var length = 5;
        snake_array = [];
        for (var i = length - 1; i >= 0; i--) {
            snake_array.push({x: i, y: 0});
        }
    }

    function snake_faster() {
        console.log('faster');
        act_speed = act_speed * 0.8;
        clearInterval(game_loop);
        game_loop = setInterval(paint, act_speed);
    }

    function snake_slower() {
        console.log('slower');
        act_speed = act_speed * 1.2;
        clearInterval(game_loop);
        game_loop = setInterval(paint, act_speed);
    }

    function snake_invert_directions() {
        console.log("invert");
        inverted_directions = true;
    }

    function create_food(next_food_color) {

        socket.emit("update_score", {score: score});

        food = {
            x: Math.round(Math.random() * (playground_width - length_single_block) / length_single_block),
            y: Math.round(Math.random() * (playground_height - length_single_block) / length_single_block),
            color: next_food_color
        };

        var rgba = "";
        switch (food.color) {
            case "green":
                rgba = "rgba(0, 128, 0, 0)";
                break;
            case "red":
                rgba = "rgba(255, 0, 0, 0)";
                break;
            case "blue":
                rgba = "rgba(0, 0, 255, 0)";
                break;
            case "pink":
                rgba = "rgba(255, 192, 203, 0)";
                break;
        }

        $('body').css('background', rgba);
    }

    //Lets paint the snake now

    function paint() {
        if (
            act_dir == "left" && next_dir != "right" ||
            act_dir == "up" && next_dir != "down" ||
            act_dir == "down" && next_dir != "up" ||
            act_dir == "right" && next_dir != "left"
        ) {
            act_dir = next_dir;
        } else {
            // Do nothing
            console.log("Fehler erkannt");
        }

        /* BACKGROUND  */

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, playground_width, playground_height);
        ctx.strokeStyle = "black";
        ctx.strokeRect(0, 0, playground_width, playground_height);

        var nx = snake_array[0].x;
        var ny = snake_array[0].y;

        if (act_dir == "right") nx++;
        else if (act_dir == "left") nx--;
        else if (act_dir == "up") ny--;
        else if (act_dir == "down") ny++;

        if (nx == -1 || nx == playground_width / length_single_block || ny == -1 || ny == playground_height / length_single_block || (check_collision(nx, ny, snake_array))) {
            // New Game
            socket.emit('set_lose');
            clearInterval(game_loop);
        }

        /* Berechnung für Background-Color Wechsel */

        var act_distance_to_next_food = Math.sqrt(Math.pow(Math.abs(food.x - nx), 2) + Math.pow(Math.abs(food.y - ny), 2));

        var background_ary = $('body').css('background-color').split(',');

        if (act_distance_to_next_food < 10) {
            background_ary[3] = Math.abs(((act_distance_to_next_food / 10) - 1));
        } else {
            background_ary[3] = 0;
        }

        $('body').css('background-color', background_ary.join() + ")");

        //console.log(act_speed);
        if (nx == food.x && ny == food.y) {

            inverted_directions = false;
            switch (food.color) {
                case "green":
                    // Do noghting;
                    break;
                case "red":
                    snake_faster();
                    break;
                case "blue":
                    snake_slower();
                    break;
                case "pink":
                    snake_invert_directions();
                    break;
            }


            var tail = {x: nx, y: ny};
            score++;

            $('#score').text(score);
            //Create new food

            /* CHECK, damit keine zwei Invert-Foods hintereinader folgen können */
            var rand_food = Math.floor(Math.random() * 100);
            while (rand_food >= 81 && rand_food <= 100 && food.color == "pink") {
                rand_food = Math.floor(Math.random() * 100);
            }


            console.log(rand_food);
            if (rand_food >= 0 && rand_food <= 40) {
                // Normal Food
                next_food_color = "green";
                console.log("normal");
                /* DO NOTHING */
            }
            if (rand_food >= 41 && rand_food <= 60) {
                // Speed Food
                next_food_color = "red";


            }
            if (rand_food >= 61 && rand_food <= 80) {
                // Slow Food
                next_food_color = "blue";

            }

            if (rand_food >= 81 && rand_food <= 100) {
                // Slow Food
                next_food_color = "pink";
            }

            console.log("Speed:" + act_speed);

            $('body').css("background-color", next_food_color);

            create_food(next_food_color);
        }
        else {
            tail = snake_array.pop();
            tail.x = nx;
            tail.y = ny;
        }

        snake_array.unshift(tail);

        /* DRAW SNAKE */
        for (var i = 0; i < snake_array.length; i++) {
            paint_cell(snake_array[i].x, snake_array[i].y, snake_color);
        }
        paint_cell(food.x, food.y);
    }

    function paint_cell(x, y, fillcolor) {
        ctx.fillStyle = fillcolor;
        ctx.fillRect(x * length_single_block, y * length_single_block, length_single_block, length_single_block);
        ctx.strokeStyle = snake_stroke_color;
        ctx.strokeRect(x * length_single_block, y * length_single_block, length_single_block, length_single_block);
    }

    function check_collision(x, y, array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].x == x && array[i].y == y)
                return true;
        }
        return false;
    }


    /* Wird gebraucht um animate.css besser hernehmen zu können */
    $.fn.extend({
        animateCss: function (animationName) {
            var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
            $(this).addClass('animated ' + animationName).one(animationEnd, function () {
                $(this).removeClass('animated ' + animationName);
            });
        }
    });


});

