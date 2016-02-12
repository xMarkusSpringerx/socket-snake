// Generated on 2016-01-03 using generator-socketio 0.0.3
'use strict';
var moment = require('moment');
var LIVERELOAD_PORT = 35729;
var RUNNING_PORT = 1337; // <- if you change this, you need to change in public/js/app.js and recompile
var lrSnippet = require('connect-livereload')({port: LIVERELOAD_PORT});
var mountFolder = function (connect, dir) {
  return connect.static(require('path').resolve(dir));
};

module.exports = function (grunt) {
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({

    uglify: {
      options: {
        mangle: false
      },
      my_target: {
        files: {
          //Frontend
          'public/js/app.min.js': 'public/js/app.js',
          //Control
          'public/js/control.min.js': 'public/js/control.js'
        }
      }
    },

    // Watch Config
    watch: {
        files: ['views/**/*'],
        options: {
            livereload: true
        },
        scripts: {
            files: [
                'public/js/**/*.js'
            ],
            tasks:['build']
        },
        css: {
            files: [
                'public/css/**/*.css'
            ]
        },
        express: {
            files:  [ 'server.js', '!**/node_modules/**', '!Gruntfile.js' ],
            tasks:  [ 'watch' ],
            options: {
                nospawn: true // Without this option specified express won't be reloaded
            }
        }
    },

    connect: {
      options: {
        port: RUNNING_PORT,//variable at top of this file
        // change this to '0.0.0.0' to access the server from outside
        hostname: 'localhost'
      },
      livereload: {
        options: {
          middleware: function (connect) {
            return [
              lrSnippet,
              mountFolder(connect, '.')
            ];
          }
        }
      }
    },

    nodemon:{
      dev: {
        options: {
          file: 'server.js',
          //args: ['dev'],
          //nodeArgs: ['--debug'],
          ignoredFiles: ['node_modules/**'],
          //watchedExtensions: ['js'],
          watchedFolders: ['views', 'routes'],
          //delayTime: 1,
          legacyWatch: true,
          env: {
            PORT: RUNNING_PORT
          },
          cwd: __dirname
        }
      }
    },

    // run 'watch' and 'nodemon' indefinitely, together
    // 'launch' will just kick it off, and won't stay running
    concurrent: {
        target: {
            tasks: ['nodemon', 'watch', 'launch'],
            options: {
                logConcurrentOutput: true
            }
        }
    },

    wait:{
      options: {
          delay: 1000
      },
      pause:{
        options:{
          before:function(options){
            console.log('pausing %dms before launching page', options.delay);
          },
          after : function() {
              console.log('pause end, heading to page (using default browser)');
          }
        }
      }
    },

    open: {
      server: {
        path: 'http://localhost:' + RUNNING_PORT
      }
    }

  });

  grunt.registerTask('server', ['build', 'connect:livereload', 'open', 'watch']);

  grunt.registerTask('build', ['uglify']);

  grunt.registerTask('launch', ['wait', 'open']);

  grunt.registerTask('default', ['build', 'concurrent']);

};
