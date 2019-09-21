const projects = require('../src/projects.js');

projects.getProjects().then((jobs) => {
    for (var i in jobs) {
        projects.generateHTML(jobs[i], true);
    }
});
