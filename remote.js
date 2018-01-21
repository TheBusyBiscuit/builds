const http = require('http');
const dns = require('dns');
const os = require('os');
const FileSystem = require('fs');
const child_process = require('child_process');
const backend = require('./backend.js');

const port = 8085;

global.status = {
    log: "",
    task: {},
    cpu: 0,
    timestamp: Date.now()
};

var cpu = [0, 0];

FileSystem.readFile("remote.html", 'UTF-8', function(err, page) {
    if (!err) {
        http.createServer(function(request, response) {
            switch(request.url) {
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
            console.log("Now serving at " + ip + ":" + port);

            var log = console.log;

            console.log = function(msg) {
                log(msg);
                status.log += msg + "<br>";
            }

            console.log("Starting Submodule...");

            backend();
        })

        usage();
    }
    else {
        console.log(err);
    }
})

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
