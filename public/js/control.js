$(function () {

    var highscore;

    var room_nr;

    /* Input Object for Highscore Input */
    var input_obj;

    // Init Touch
    var touchsurface = document.getElementById('complete-control'),
        startX,
        startY,
        dist,
        threshold = 59;

    var is_already_inited = false;

    /* SWEETALERT */
    function new_highscore_obj() {
        return {
            name: "",
            score: "",
            date: ""
        }
    }

    function getButton(name) {
        info_text =
            '<div style="display: inline-block;position: relative;" class="highscore_btn">' +
            '<button class="add_highscore" tabindex="1" style="display: inline-block; box-shadow: rgba(221, 107, 85, 0.8) 0px 0px 2px, rgba(0, 0, 0, 0.0470588) 0px 0px 0px 1px inset; background-color: lightgreen;">' +
            name + '</button><div class="la-ball-fall">' +
            '<div></div>' +
            '<div></div>' +
            '<div></div>' +
            '</div>' +
            '</div>';
        return info_text;
    }

    /* HIGHSCORE Click Handler */

    FastClick.attach(document.body);

    var socket = io.connect(window.location.href, {
        'sync disconnect on unload': false
    });

    socket.on('connect', function () {

        $(document).on('click', '.add_highscore', function () {
            input_obj = $('.sweet-alert fieldset input[type=text]');
            if (input_obj.val() != "") {
                $('.add_highscore').hide();

                var inputValue = input_obj.val();
                input_obj.val("");
                input_obj.hide();
                highscore.name = inputValue;
                //console.log({name: highscore.name, score: highscore.score});
                socket.emit('new_highscore', {name: highscore.name, score: highscore.score});
                $('#infotext').remove();
            }
        });

        socket.on('highscorename_already_in_use', function () {
            input_obj.show();
            $('.add_highscore').show();
            $('#infotext').remove();
            $('.sweet-alert p').html('<div id="infotext">Name schon vergeben:</div>');
        });

        $('#submit_room_nr').on('click', function () {
            room_nr = $('input[name=input_room]').val();
            socket.emit('check_for_roomnr', {roomNr: room_nr});
        });
        // Control-Device is connected
        socket.emit('connected');
        $('body').height($(document).height());
        $('body').width($(document).width());

        window.addEventListener("orientationchange", function() {
            switch(window.orientation)
            {
                case -90:
                case 90:
                    alert('Das Spiel wird nur im Portrait Modus richtig dargestellt');
                    break;
                default:
                    break;
            }


        }, false);

        var touchobj;
        function initSwipe() {

            touchsurface.addEventListener('touchstart', function (e) {

                touchobj = e.changedTouches[0];
                dist = 0;
                startX = touchobj.pageX;
                startY = touchobj.pageY;

            }, false);

            var act_swipe_dir = "";

            touchsurface.addEventListener('touchmove', function (e) {
                e.preventDefault();
                var touchobj = e.changedTouches[0];

                dist_x = touchobj.pageX - startX;
                dist_y = touchobj.pageY - startY;
                //console.log(dist_x, dist_y);

                if ((Math.abs(dist_x) >= threshold || Math.abs(dist_y) >= threshold)) {
                    if (Math.abs(dist_x) > Math.abs(dist_y)) {
                        if (dist_x >= 0) {
                            if (act_swipe_dir != "right") {
                                console.log("Swipe right");
                                act_swipe_dir = "right";
                                socket.emit('get_direction', {dir: 'right', roomNr: room_nr});
                            }
                        } else {
                            if (act_swipe_dir != "left") {
                                console.log("Swipe left");
                                act_swipe_dir = "left";
                                socket.emit('get_direction', {dir: 'left', roomNr: room_nr});
                            }
                        }
                    }

                    else {
                        if (dist_y >= 0) {
                            if (act_swipe_dir != "down") {
                                console.log("Swipe Bottom");
                                act_swipe_dir = "down";
                                socket.emit('get_direction', {dir: 'down', roomNr: room_nr});
                            }
                        } else {
                            if (act_swipe_dir != "up") {
                                console.log("Swipe Top");
                                act_swipe_dir = "up";
                                socket.emit('get_direction', {dir: 'up', roomNr: room_nr});
                            }
                        }
                    }
                }
            }, false);
        }



        socket.on('lose_game', function () {
            var input_obj = $('.sweet-alert fieldset input[type=text]');
            input_obj.show();
            swal({
                title: "Leider verloren!",
                text: "Trage hier deinen Highscore ein wenn du willst.",
                showCancelButton: true,
                type: "input",
                showConfirmButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Neues Spiel",
                closeOnCancel: true,
                animation: "slide-from-top",
                inputPlaceholder: "Dein Name",
                html: true
            }, function () {
                socket.emit('c_start_game');
            });

            $('.sweet-alert').css({
                'margin-top' : -($(document).height() / 2) + 30 + "px"
            });

            $('.highscore_btn').remove();
            $('.sweet-alert fieldset').append(getButton("Highscore hinzufügen"));
        });

        socket.on('sync_data', function (data) {
            highscore = new new_highscore_obj;
            highscore.score = data.score;
        });

        socket.on('start_game', function () {
            if(!is_already_inited) {
                is_already_inited = true;
                initSwipe();
            }
            swal.close();

        });

        socket.on('failure_for_roomNr', function (data) {
            alert('Fehler: Die RoomNr ' + data.roomNr + " konnte nicht gefunden werden.");
        });

        socket.on('device_connected_to_room', function () {
            $('.input_room').hide();
            $('.start-btn').css('display', 'block');
        });

        $('.start-btn').on('click', function (e) {
            e.preventDefault();
            socket.emit('c_start_game');
            $('.start-btn').fadeOut();
        });
    });



});
