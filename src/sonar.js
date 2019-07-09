const process = require('child-process-promise');
const path = require('path');

require('../src/config.js')(path.resolve(__dirname, "../resources/credentials.json")).then((cfg) => {
    if (cfg.sonar.isEnabled()) {
        console.log("Connecting with Sonar...");

        var args = cfg.sonar.args.splice(0);
        args.push("-Dsonar.login=" + cfg.sonar.token);

        var scanner = process.spawn("sonar-scanner", args, {shell: true});

        scanner.childProcess.stdout.on('data', (data) => console.log("-> " + data));
        scanner.childProcess.stderr.on('data', (data) => console.log("-> " + data));

        scanner.then(() => {
            console.log("-> Finished!");
        })
        .catch((err) => console.log(err.stack));
    }
})
