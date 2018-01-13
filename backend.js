const https = require('https');
const FileSystem = require('fs');
const child_process = require('child_process');

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const header = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "The Busy Biscuit's Repository Compiler",
    "Time-Zone": "UTC"
}
var stopwatch;
var jobs = [];

if (FileSystem.existsSync("app.log")) {
    FileSystem.unlinkSync("app.log");
}

var log = console.log;

console.log = function(msg) {
    log(msg);
    FileSystem.appendFile("app.log", msg + "\n", "UTF-8", function(err) {
        if (err) {
            log(err);
        }
    });
}

startWatcher();

function startWatcher() {
    stopwatch = Date.now();
    jobs = [];

    console.log("Watching Repositories...");

    FileSystem.readFile('repos.json', 'UTF-8', function(err, data) {
        if (!err) {
            var repos = JSON.parse(data);

            for (var author in repos) {
                console.log(" Watching Author \"" + author + "\"...");
                for (var i in repos[author]) {
                    var repo = repos[author][i];
                    var repository = repo.split(':')[0];
                    var branch = repo.split(':')[1];

                    jobs.push({"author": author, "repo": repository, "branch": branch});
                }
            }

            nextJob();
        }
        else {
            console.log(error);
        }
    });
}

function loadLatestCommit(job) {
    console.log("  Watching Repository \"" + job.author + "/" + job.repo + "\" on Branch \"" + job.branch + "\"...");

    var options = {
        host: "api.github.com",
        path: "/repos/" + job.author +"/" + job.repo + "/commits?per_page=1&sha=" + job.branch,
        headers: header
    }

    https.get(options, function(response) {
        console.log("COMMITS: " + response.statusCode + " - " + response.statusMessage);
        if (response.statusCode == 200) {
            var body = '';

            response.on('data', function(data) {
                body += data;
            });

            response.on('end', function() {
                var json = JSON.parse(body);

                if (!json.documentation_url) {
                    getLicense(job, json[0]);
                }
                else {
                    console.log(job.author + "/" + job.repo + ": " + json.message);
                }
            });
        }
    }).on('error', function(err) {
        console.log(err);
    });
}

function getLicense(job, commit) {
    var options = {
        host: "api.github.com",
        path: "/repos/" + job.author +"/" + job.repo + "/license",
        headers: header
    }

    https.get(options, function(response) {
        console.log("LICENSE: " + response.statusCode + " - " + response.statusMessage);
        if (response.statusCode == 200) {
            var body = '';

            response.on('data', function(data) {
                body += data;
            });

            response.on('end', function() {
                var json = JSON.parse(body);

                if (!json.documentation_url && json.license.url != null) {
                    commit.license = {
                        name: json.license.name,
                        id: json.license.spdx_id,
                        url: json.download_url
                    };
                }
                else {
                    commit.license = {
                        name: "",
                        id: "",
                        url: ""
                    }
                }

                getTags(job, commit);
            });
        }
    }).on('error', function(err) {
        console.log(err);
    });
}

function getTags(job, commit) {
    var options = {
        host: "api.github.com",
        path: "/repos/" + job.author +"/" + job.repo + "/tags",
        headers: header
    }

    https.get(options, function(response) {
        console.log("TAGS: " + response.statusCode + " - " + response.statusMessage);
        if (response.statusCode == 200) {
            var body = '';

            response.on('data', function(data) {
                body += data;
            });

            response.on('end', function() {
                var json = JSON.parse(body);

                if (!json.documentation_url) {
                    for (var i in json) {
                        if (json[i].commit.sha === commit.sha) {
                            commit.candidate = "RELEASE";
                            commit.tag = json[i].name;
                            watchRepository(job, commit);
                            return;
                        }
                    }
                }

                commit.candidate = "DEVELOPMENT";
                watchRepository(job, commit);
            });
        }
    }).on('error', function(err) {
        console.log(err);
    });
}

function watchRepository(job, commit) {
    if (!FileSystem.existsSync(job.author)) {
        FileSystem.mkdirSync(job.author);
    }
    if (!FileSystem.existsSync(job.author + "/" + job.repo)) {
        FileSystem.mkdirSync(job.author + "/" + job.repo);
    }
    if (!FileSystem.existsSync(job.author + "/" + job.repo + "/" + job.branch)) {
        FileSystem.mkdirSync(job.author + "/" + job.repo + "/" + job.branch);
    }
    if (!FileSystem.existsSync(job.author + "/" + job.repo + "/" + job.branch + "/files")) {
        FileSystem.mkdirSync(job.author + "/" + job.repo + "/" + job.branch + "/files");
    }

    if (FileSystem.existsSync(job.author + "/" + job.repo + "/" + job.branch + "/builds.json")) {
        FileSystem.readFile(job.author + "/" + job.repo + "/" + job.branch + "/builds.json", 'UTF-8', function(err, data) {
            if (err) {
                console.log(err);
            }
            else {
                compareBuilds(job, JSON.parse(data), commit);
            }
        });
    }
    else {
        compareBuilds(job, {}, commit);
    }
}

function compareBuilds(job, builds, commit) {
    var date = "";

    date += commit.commit.committer.date.split("T")[0].split("-")[2] + " ";
    date += months[parseInt(commit.commit.committer.date.split("T")[0].split("-")[1]) - 1] + " ";
    date += commit.commit.committer.date.split("T")[0].split("-")[0] + " (";
    date += commit.commit.committer.date.split("T")[1].replace("Z", "") + ")";

    var data = {
        id: 1,
        sha: commit.sha,
        date: date,
        timestamp: parseInt(commit.commit.committer.date.replace(/\D/g, "")),
        message: commit.commit.message,
        author: commit.author.login,
        avatar: commit.author.avatar_url,
        license: commit.license,
        candidate: commit.candidate,
        tag: commit.tag,
        status: "PENDING"
    }

    if (builds.latest && builds[builds.latest].timestamp < data.timestamp) {
        data.id = builds.latest + 1;
    }

    if (!builds.latest || (builds.latest && builds[builds.latest].timestamp < data.timestamp)) {
        builds.latest = data.id;

        builds[data.id] = data;

        FileSystem.writeFile(job.author + "/" + job.repo + "/" + job.branch + "/builds.json", JSON.stringify(builds, null, 4), 'UTF-8');

        job.id = data.id;
        clone(job, commit.sha, builds);
        generateHTML(job);
    }
    else {
        nextJob(job);
    }
}

function clone(job, commit, builds) {
    console.log("Cloning Repository \"" + job.author + "/" + job.repo + "\"...");
    var clone = child_process.spawn("git", ["clone", "https://github.com/" + job.author + "/" + job.repo + ".git", job.author + "/" + job.repo + "/" + job.branch + "/files", "-b", job.branch, "--single-branch"]);

    clone.stderr.on('data', function(data) {
        console.log(" " + data);
    });

    clone.stdout.on('data', function(data) {
        console.log(" " + data);
    });

    clone.on('close', function(status) {
        var reset = child_process.spawn("git", ["reset", "--hard", commit], {cwd: __dirname + "/" + job.author + "/" + job.repo + "/" + job.branch + "/files"});

        reset.stderr.on('data', function(data) {
            console.log(" " + data);
        });

        reset.stdout.on('data', function(data) {
            console.log(" " + data);
        });

        reset.on('close', function() {
            pom(job, builds);
        });
    });
}

function pom(job, builds) {
    FileSystem.readFile(job.author + "/" + job.repo + "/" + job.branch + "/files/pom.xml", 'UTF-8', function(err, data) {
        if (!err) {
            data = data.replace(/\r?\n|\r/g, "");
            var build = data.match(/<build>.*<\/build>/)[0];

            var important = "";
            important += pomFilter(build, /<resources>.*<\/resources>/);
            important += pomFilter(build, /<testResources>.*<\/testResources>/);
            important += pomFilter(build, /<sourceDirectory>.*<\/sourceDirectory>/);
            important += pomFilter(build, /<testSourceDirectory>.*<\/testSourceDirectory>/);

            function pomFilter(build, regex) {
                var match = build.match(regex);

                if (match) return match[0];
                else return "";
            }

            data = data.replace(/<build>.*<\/build>/, "<build><finalName>" + job.repo + "-" + job.id + "</finalName>" + important + "</build>");

            FileSystem.writeFile(job.author + "/" + job.repo + "/" + job.branch + "/files/pom.xml", data, 'UTF-8', function(err) {
                if (!err) {
                    compile(job, builds);
                }
                else {
                    console.log(err);
                }
            });
        }
        else {
            console.log(err);
        }
    });
}

function compile(job, builds) {
    console.log("Compiling Repository \"" + job.author + "/" + job.repo + "\"...");
    var maven = child_process.spawn("mvn", ["package"], {cwd: __dirname + "/" + job.author + "/" + job.repo + "/" + job.branch + "/files", shell: true});

    maven.stderr.on('data', function(data) {
        console.log(" " + data);

        FileSystem.appendFile(job.author + "/" + job.repo + "/" + job.branch + "/" + job.repo + "-" + job.id + ".log", data, "UTF-8", function(err) {
            if (err) {
                console.log(err);
            }
        });
    });

    maven.stdout.on('data', function(data) {
        console.log(" " + data);

        FileSystem.appendFile(job.author + "/" + job.repo + "/" + job.branch + "/" + job.repo + "-" + job.id + ".log", data, "UTF-8", function(err) {
            if (err) {
                console.log(err);
            }
        });
    });

    maven.on('close', function(status) {
        if (status == 0) {
            builds[job.id].status = "SUCCESS";
            builds.last_successful = job.id;

            FileSystem.writeFile(job.author + "/" + job.repo + "/" + job.branch + "/builds.json", JSON.stringify(builds, null, 4), 'UTF-8', function(err) {
                if (!err) {
                    FileSystem.rename(job.author + "/" + job.repo + "/" + job.branch + "/files/target/" + job.repo + "-" + job.id + ".jar", job.author + "/" + job.repo + "/" + job.branch + "/" + job.repo + "-" + job.id + ".jar", function(err) {
                        if (!err) {
                            clearFolder(job.author + "/" + job.repo + "/" + job.branch + "/files", function(err) {
                                if (!err) {
                                    finishJob(job, true);
                                }
                                else {
                                    console.log(err);
                                }
                            });
                        }
                        else {
                            console.log(err);
                        }
                    });
                }
                else {
                    console.log(err);
                }
            });
        }
        else {
            builds[job.id].status = "FAILURE";
            FileSystem.writeFile(job.author + "/" + job.repo + "/" + job.branch + "/builds.json", JSON.stringify(builds, null, 4), 'UTF-8');

            clearFolder(job.author + "/" + job.repo + "/" + job.branch + "/files", function(err) {
                if (!err) {
                    finishJob(job, false);
                }
                else {
                    console.log(err);
                }
            });
        }
    });
}

function generateHTML(job) {
    console.log("Exporting \"index.html\" for Job \"" + job.author + "/" + job.repo + ":" + job.branch + "\"");
    FileSystem.readFile("template.html", 'UTF-8', function(err, data) {
        if (!err) {
            data = data.replace(/\${owner}/g, job.author);
            data = data.replace(/\${repository}/g, job.repo);
            data = data.replace(/\${branch}/g, job.branch);

            FileSystem.writeFile(job.author + "/" + job.repo + "/" + job.branch + "/index.html", data, 'UTF-8');
        }
        else {
            console.log(err);
        }
    });
}

function clearFolder(path, callback) {
    FileSystem.stat(path, function(err, stats) {
        if(err) {
            callback(err);
            return;
        }

        if(stats.isFile()) {
            FileSystem.unlink(path, function(err) {
                if(err) {
                    callback(err);
                }
                else{
                    callback(null);
                }
            });
        }
        else if(stats.isDirectory()) {
            FileSystem.readdir(path, function(err, files) {
                if(err) {
                    callback(err);
                    return;
                }

                var length = files.length;
                var index = 0;

                function check() {
                    if(length === index) {
                        FileSystem.rmdir(path, function(err) {
                            if(err) {
                                callback(err);
                            }
                            else{
                                callback(null);
                            }
                        });
                        return true;
                    }
                    return false;
                };

                if(!check()) {
                    for (var i = 0; i < length; i++) {
                        clearFolder(path + '/' + files[i], function(err, status) {
                            if(!err) {
                                index++;
                                check();
                            }
                            else {
                                callback(err);
                                return;
                            }
                        });
                    }
                }
            });
        }
    });
}

function finishJob(job, status) {
    generateBadge(job, status);
}

function generateBadge(job, status) {
    FileSystem.readFile("badge.svg", 'UTF-8', function(err, data) {
        if (!err) {
            data = data.replace(/\${status}/g, status ? "SUCCESS": "FAILURE");
            data = data.replace(/\${color}/g, status ? "rgb(30, 220, 30)": "rgb(220, 30, 30)");

            FileSystem.writeFile(job.author + "/" + job.repo + "/" + job.branch + "/badge.svg", data, 'UTF-8');
            nextJob(job);
        }
        else {
            console.log(err);
        }
    });
}

function nextJob(job) {
    function continueWorkflow() {
        if (jobs.length > 0) {
            loadLatestCommit(jobs[0]);
        }
        else {
            console.log("-- FINISHED --");
            var delta = (10 * 60 * 1000) - (Date.now() - stopwatch);

            if (delta < 0) delta = 0;

            console.log("\n\n");
            console.log("Waiting " + (delta / 1000) + "s...");
            console.log("\n\n");
            setTimeout(startWatcher, delta);
        }
    }

    if (job) {
        if (job.id) {
            var add = child_process.spawn("git", ["add", job.author + "/" + job.repo + "/" + job.branch + "/*"]);

            add.stderr.on('data', function(data) {
                console.log(" " + data);
            });

            add.stdout.on('data', function(data) {
                console.log(" " + data);
            });

            add.on('close', function(status) {
                var name = job.author + "/" + job.repo + ":" + job.branch;
                if (job.id) name += " (" + job.id + ")";

                var commit = child_process.spawn("git", ["commit", "-m", "Compiled: " + name]);

                commit.stderr.on('data', function(data) {
                    console.log(" " + data);
                });

                commit.stdout.on('data', function(data) {
                    console.log(" " + data);
                });

                commit.on('close', function(status) {
                    var push = child_process.spawn("git", ["push"]);

                    push.stderr.on('data', function(data) {
                        console.log(" " + data);
                    });

                    push.stdout.on('data', function(data) {
                        console.log(" " + data);
                    });

                    push.on('close', function(status) {
                        var index = jobs.indexOf(job);
                        jobs.splice(index, 1);
                        continueWorkflow();
                    });
                });
            });
        }
        else {
            var index = jobs.indexOf(job);
            jobs.splice(index, 1);
            continueWorkflow();
        }
    }
    else {
        continueWorkflow();
    }
}
