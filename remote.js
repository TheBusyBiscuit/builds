const http = require('http');
const url = require('url');
const dns = require('dns');
const os = require('os');
const FileSystem = require('fs');
const child_process = require('child_process');
const backend = require('./backend.js');

const port = 8085;

global.status = {
    log: "",
    task: {},
    version: {},
    updates: {},
    cpu: 0,
    timestamp: Date.now()
};

var cpu = [0, 0];
var log = console.log;

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

for (var i in libraries) {
    var lib = libraries[i];

    child_process.exec(lib.command, callback(lib));
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

function run() {
    if (libraries.length > 0) {
        return;
    }

    console.log("");
    FileSystem.readFile("remote.html", 'UTF-8', function(err, page) {
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
                        backend();

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
                        backend();

                        response.writeHead(302, {'Location': "/"});
                        response.end();

                        break;
                    }
                    case '/shutdown': {
                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.write("Goodbye!");
                        response.end();

                        if (process.platform === "win32") {
                            child_process.exec("shutdown -s -t 0");
                        }
                        else {
                            child_process.exec("sudo shutdown -h now");
                        }

                        break;
                    }
                    default: {
                        response.end();
                        break;
                    }
                }

            }).listen(port);

            dns.lookup(os.hostname(), function (err, ip, fam) {
                log("Now serving at " + ip + ":" + port);

                console.log("Starting Submodule...");

                backend();
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

  for(var i = 0; i < cpus.length; i++) {
    var core = cpus[i];

    for (type in core.times) {
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
