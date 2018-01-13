const FileSystem = require('fs');
const child_process = require('child_process');

var jobs = [];

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

function generateHTML(job) {
    console.log("Exporting \"index.html\" for Job \"" + job.author + "/" + job.repo + ":" + job.branch + "\"");
    FileSystem.readFile("template.html", 'UTF-8', function(err, data) {
        if (!err) {
            data = data.replace(/\${owner}/g, job.author);
            data = data.replace(/\${repository}/g, job.repo);
            data = data.replace(/\${branch}/g, job.branch);

            FileSystem.writeFile(job.author + "/" + job.repo + "/" + job.branch + "/index.html", data, 'UTF-8', function(err) {
                if (!err) {
                    nextJob();
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

function nextJob() {
    if (jobs.length > 0) {
        var job = jobs[0];
        jobs.splice(0, 1);

        generateHTML(job);
    }
    else {
        var add = child_process.spawn("git", ["add", "*"]);

        add.stderr.on('data', function(data) {
            console.log(" " + data);
        });

        add.stdout.on('data', function(data) {
            console.log(" " + data);
        });

        add.on('close', function(status) {
            var commit = child_process.spawn("git", ["commit", "-m", "Updated .html"]);

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
