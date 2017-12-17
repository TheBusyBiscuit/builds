const https = require('https');
const FileSystem = require('fs');
const child_process = require('child_process');

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const header = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "The Busy Biscuit's Repository Compiler",
    "Time-Zone": "UTC"
}

FileSystem.unlinkSync("app.log");

var log = console.log;

console.log = function(msg) {
    log(msg);
    FileSystem.appendFile("app.log", msg + "\n", function(err) {
        if (err) {
            log(err);
        }
    });
}

console.log("Watching Repositories...");
var jobs = 0;

FileSystem.readFile('repos.json', 'UTF-8', function(err, data) {
    if (!err) {
        var repos = JSON.parse(data);

        for (var author in repos) {
            console.log(" Watching Author \"" + author + "\"...");
            for (var i in repos[author]) {
                jobs++;
                var repo = repos[author][i];
                var repository = repo.split(':')[0];
                var branch = repo.split(':')[1];

                console.log("  Watching Repository \"" + author + "/" + repository + "\" on Branch \"" + branch + "\"...");

                loadLatestCommit(author, repository, branch);
            }
        }
    }
    else {
        console.log(error);
    }
});

function loadLatestCommit(author, repo, branch) {
    var options = {
        host: "api.github.com",
        path: "/repos/" + author +"/" + repo + "/commits?per_page=1&sha=" + branch,
        headers: header
    }

    https.get(options, function(response) {
        console.log(response.statusCode + " - " + response.statusMessage);
        if (response.statusCode == 200) {
            var body = '';

            response.on('data', function(data) {
                body += data;
            });

            response.on('end', function() {
                var json = JSON.parse(body);

                if (!json.documentation_url) {
                    getLicense(author, repo, branch, json[0]);
                }
                else {
                    console.log(author + "/" + repo + ": " + json.message);
                }
            });
        }
    }).on('error', function(err) {
        console.log(err);
    });
}

function getLicense(author, repo, branch, commit) {
    var options = {
        host: "api.github.com",
        path: "/repos/" + author +"/" + repo + "/license",
        headers: header
    }
    https.get(options, function(response) {
        console.log(response.statusCode + " - " + response.statusMessage);
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

                watchRepository(author, repo, branch, commit);
            });
        }
    }).on('error', function(err) {
        console.log(err);
    });
}

function watchRepository(author, repo, branch, commit) {
    if (!FileSystem.existsSync(author)) {
        FileSystem.mkdirSync(author);
    }
    if (!FileSystem.existsSync(author + "/" + repo)) {
        FileSystem.mkdirSync(author + "/" + repo);
    }
    if (!FileSystem.existsSync(author + "/" + repo + "/" + branch)) {
        FileSystem.mkdirSync(author + "/" + repo + "/" + branch);
    }
    if (!FileSystem.existsSync(author + "/" + repo + "/" + branch + "/files")) {
        FileSystem.mkdirSync(author + "/" + repo + "/" + branch + "/files");
    }

    if (FileSystem.existsSync(author + "/" + repo + "/" + branch + "/builds.json")) {
        FileSystem.readFile(author + "/" + repo + "/" + branch + "/builds.json", 'UTF-8', function(err, data) {
            if (err) {
                console.log(err);
            }
            else {
                compareBuilds(author, repo, branch, JSON.parse(data), commit);
            }
        });
    }
    else {
        compareBuilds(author, repo, branch, {}, commit);
    }
}

function compareBuilds(author, repo, branch, builds, commit) {
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
        status: "PENDING"
    }

    if (builds.latest && builds[builds.latest].timestamp < data.timestamp) {
        data.id = builds.latest + 1;
    }

    if (!builds.latest || (builds.latest && builds[builds.latest].timestamp < data.timestamp)) {
        builds.latest = data.id;

        builds[data.id] = data;

        FileSystem.writeFile(author + "/" + repo + "/" + branch + "/builds.json", JSON.stringify(builds, null, 4), 'UTF-8');

        clone(author, repo, branch, commit.sha, builds, data);
        generateHTML(author, repo, branch, builds);
    }
    else {
        finishJob();
    }
}

function clone(author, repo, branch, commit, builds, data) {
    console.log("Cloning Repository \"" + author + "/" + repo + "\"...");
    var clone = child_process.spawn("git", ["clone", "https://github.com/" + author + "/" + repo + ".git", author + "/" + repo + "/" + branch + "/files", "-b", branch, "--single-branch"]);

    clone.stderr.on('data', function(data) {
        console.log(" " + data);
    });

    clone.stdout.on('data', function(data) {
        console.log(" " + data);
    });

    clone.on('close', function(status) {
        var reset = child_process.spawn("git", ["reset", "--hard", commit], {cwd: author + "/" + repo + "/" + branch + "/files"});

        reset.on('close', function() {
            pom(author, repo, branch, builds, data.id);
        });
    });
}

function pom(author, repo, branch, builds, id) {
    FileSystem.readFile(author + "/" + repo + "/" + branch + "/files/pom.xml", 'UTF-8', function(err, data) {
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

            data = data.replace(/<build>.*<\/build>/, "<build><finalName>" + repo + "-" + id + "</finalName>" + important + "</build>");

            FileSystem.writeFile(author + "/" + repo + "/" + branch + "/files/pom.xml", data, 'UTF-8', function(err) {
                if (!err) {
                    compile(author, repo, branch, builds, id);
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

function compile(author, repo, branch, builds, id) {
    console.log("Compiling Repository \"" + author + "/" + repo + "\"...");
    var maven = child_process.spawn("mvn", ["package"], {cwd: __dirname + "/" + author + "/" + repo + "/" + branch + "/files", shell: true});

    maven.stderr.on('data', function(data) {
        console.log(" " + data);

        FileSystem.appendFile(author + "/" + repo + "/" + branch + "/" + repo + "-" + id + ".log", data + "\n", function(err) {
            if (err) {
                console.log(err);
            }
        });
    });

    maven.stdout.on('data', function(data) {
        console.log(" " + data);

        FileSystem.appendFile(author + "/" + repo + "/" + branch + "/" + repo + "-" + id + ".log", data + "\n", function(err) {
            if (err) {
                console.log(err);
            }
        });
    });

    maven.on('close', function(status) {
        if (status == 0) {
            builds[id].status = "SUCCESS";
            builds.last_successful = id;

            FileSystem.writeFile(author + "/" + repo + "/" + branch + "/builds.json", JSON.stringify(builds, null, 4), 'UTF-8', function(err) {
                if (!err) {
                    FileSystem.rename(author + "/" + repo + "/" + branch + "/files/target/" + repo + "-" + id + ".jar", author + "/" + repo + "/" + branch + "/" + repo + "-" + id + ".jar", function(err) {
                        if (!err) {
                            clearFolder(author + "/" + repo + "/" + branch + "/files", function(err) {
                                if (!err) {
                                    // FINISHED: SUCCESS
                                    finishJob();
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
            builds[id].status = "FAILURE";
            FileSystem.writeFile(author + "/" + repo + "/" + branch + "/builds.json", JSON.stringify(builds, null, 4), 'UTF-8');

            // FINISHED: FAILURE
            finishJob();
        }
    });
}

function generateHTML(author, repo, branch, builds) {
    FileSystem.readFile("template.html", 'UTF-8', function(err, data) {
        if (!err) {
            data = data.replace(/\${owner}/g, author);
            data = data.replace(/\${repository}/g, repo);
            data = data.replace(/\${branch}/g, branch);
            data = data.replace(/\${builds}/g, builds.latest);

            FileSystem.writeFile(author + "/" + repo + "/" + branch + "/index.html", data, 'UTF-8');
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

function finishJob() {
    jobs--;

    if (jobs === 0) {
        var add = child_process.spawn("git", ["add", "*"]);

        add.stderr.on('data', function(data) {
            console.log(" " + data);
        });

        add.stdout.on('data', function(data) {
            console.log(" " + data);
        });

        add.on('close', function(status) {
            var commit = child_process.spawn("git", ["commit", "-m", "Automatically Compiled"]);

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
            });
        });
    }
}
