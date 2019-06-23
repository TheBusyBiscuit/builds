const http = require('http');
const url = require('url');
const dns = require('dns');
const os = require('os');
const FileSystem = require('fs');
const path = require('path');
const child_process = require('child_process');

const program = require('./main.js');

const port = 8085;
const interval = 15;

global.status = {
    log: "",
    task: {},
    version: {},
    updates: {},
    cpu: 0,
    running: true,
    timestamp: Date.now()
};

var cpu = [0, 0];
var log = console.log;
var instance, timer;

console.log = function(msg) {
    log(msg);
    status.log += msg + "<br>";
}

var libraries = [
    {
        name: "Node.js",
        command: "node -v"
    },
    {
        name: "Java",
        command: "java -version"
    },
    {
        name: "Apache Maven",
        command: "mvn -v"
    },
    {
        name: "Git",
        command: "git --version"
    }
]

for (let i in libraries) {
    let library = libraries[i];

    child_process.exec(library.command, callback(library));
}

function callback(lib) {
    return function(err, stdout, stderr) {
        console.log("");
        console.log("==== Environment: " + lib.name + " ====")

        if (stderr) {
            console.log(stderr);
        }

        if (!err) {
            console.log(stdout);
            var index = libraries.indexOf(lib);
            libraries.splice(index, 1);
            run();
        }
        else {
            console.log("ERROR: " + lib.name + " not found!");
            throw err;
        }
    };
}

function start() {
    if (instance) {
        console.log("The program is still running!");
        return;
    }

    if (timer) {
        clearTimeout(timer);
    }

    var done = (err) => {
        if (err) console.log(err.stack);
        instance = null;
        console.log("");
        console.log("-- FINISHED --");

        var elapsedTime = Date.now() - global.status.timestamp;
        var delta = (interval * 60 * 1000) - elapsedTime;

        if (delta < 0) delta = 0;

        console.log("\n\n");
        console.log("Elapsed time: " + (elapsedTime / 1000) + "s")
        console.log("Time until next iteration: " + (delta / 1000) + "s");
        console.log("\n\n");

        timer = setTimeout(start, delta);
    };

    global.status.timestamp = Date.now();
    instance = program.start(true).then(done, done);
}

function run() {
    if (libraries.length > 0) {
        return;
    }

    console.log("");
    FileSystem.readFile(path.resolve(__dirname, "../resources/remote.html"), 'UTF-8', function(err, page) {
        if (!err) {
            http.createServer(function(request, response) {
                switch(url.parse(request.url, true).pathname) {
                    case '/': {
                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.write(page);
                        response.end();
                        break;
                    }
                    case '/status.json': {
                        response.writeHead(200, {'Content-Type': 'application/json'});
                        response.write(JSON.stringify(global.status));
                        response.end();
                        break;
                    }
                    case '/run': {
                        response.writeHead(302, {'Location': "/"});
                        response.end();

                        console.log("Restarting Submodule...");
                        start();

                        break;
                    }
                    case '/prompt': {
                        var project = url.parse(request.url, true).query.project;
                        var version = global.status.version[project];

                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.write('<script>var version = prompt("Please enter a Version for ' + project + '", "' + version + '"); window.location.href="update?project=' + project + '&version=" + version;</script>');
                        response.end();

                        break;
                    }
                    case '/update': {
                        var query = url.parse(request.url, true).query;
                        global.status.updates[query.project] = query.version;
                        console.log("Scheduled Update: " + query.project + " => " + query.version);

                        console.log("Restarting Submodule...");
                        start();

                        response.writeHead(302, {'Location': "/"});
                        response.end();

                        break;
                    }
                    case '/shutdown': {
                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.write("Goodbye!");
                        response.end();

                        child_process.exec("sudo shutdown -h now");

                        break;
                    }
                    default: {
                        response.end();
                        break;
                    }
                }

            }).listen(port);

            dns.lookup(os.hostname(), function (e, ip) {
                if (e) console.log(e);
                log("Now serving at " + ip + ":" + port);

                console.log("Starting Submodule...");
                start();
            })

            usage();
        }
        else {
            console.log(err);
        }
    })
}

function usage() {
  var idle = 0;
  var tick = 0;
  var cpus = os.cpus();

  for(let id = 0; id < cpus.length; id++) {
    var core = cpus[id];

    for (let type in core.times) {
        tick += core.times[type];
    }

    idle += core.times.idle;
  }

  var p = 100 - ~~(100 * (idle / cpus.length - cpu[1]) / (tick / cpus.length - cpu[0]));

  cpu[0] = tick / cpus.length;
  cpu[1] = idle / cpus.length;

  global.status.cpu = p;

  setTimeout(usage, 200);
}
