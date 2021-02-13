# Maven Builds Server
This is the repository of the backend for my builds-page.
The page can be found here: https://thebusybiscuit.github.io/builds/

This kinda serves as a "Continous Integration/Deployment" Service for Maven Projects which utilises static GitHub Pages.

# Status
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=security_rating)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=bugs)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=code_smells)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=coverage)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)


## How it works
The code itself is basically just a basic node.js Program.<br>
It reads repositories from 'resources/repos.json' ([How to add your own repository](#how-to-add-your-own-repository)) and connects to the GitHub-API.<br>
If you are interested in the specifics, then feel free to keep on reading.<br>

### 1. Commits
The first step is to retrieve the latest commit from [GitHub's API](https://developer.github.com/v3/repos/commits/).<br>
It will compare that commit's timestamp to the locally stored repository.<br>
If the remote version is newer or if there isn't even a local version, we are calculating the new build id.<br>
After that it will proceed to step 2.<br>

### 2. Cloning
After we established that our repository is out of date, this program will ```git clone``` said repository.<br>
It will also locate it's pom.xml file and set the version to "DEV - $id (git $commit)".<br>

### 3. Compiling
This is the easiest step, the program just runs ```mvn clean package -B``` to compile our Maven Project.<br>
It will also catch the state (Success / Failure).<br>
If you enabled Sonar-Integration for this project, then it will also run a sonar-scan on the repository.<br>

### 4. Gathering Resources
Since the page can also display some additional information, the program will now fetch the project's license and tags.<br>
It will also relocate the compiled jar to our main project directory.<br>

### 5. Preparing the upload
Now the program will update our local builds.json file for the project.<br>
It will add the newly compiled build, set the latest and lastSuccessful version 
and it's going to tag any builds that match up with our previously fetched tags, with that tag.<br>
Then it will generate a fresh index.html page for the project (from "resources/template.html").<br>
And it will also generate a Status Badge (see "resources/badge.svg").<br>
If we specified a discord webhook, it will also post a message on your discord server.<br>

### 6. Finishing / Uploading
Now that everything completed, the program will add, commit and push all changed files to this repository.<br>
After it's done, it will clear out any source files that arised during ```git clone```.<br>

## How to add your own repository
This repository hosts several of my Maven projects, including [Slimefun](https://github.com/Slimefun/Slimefun4) and a couple of [Slimefun Addons](https://github.com/Slimefun/Slimefun4/wiki/Addons) developed by the community.<br>
If you want your own project to be added, simply submit a Pull Request to this repository with your desired changes and a description of why you want your project to be added.
All you have to do is to modify the `resources/repos.json` file, go down to the bottom and add your repository as another JSON object.

### Guidelines
Repositories on this page must adhere to the following guidelines.
If a project violates any of these rules, it will be removed from the site.
If you see a project on our site which violates these guidelines, feel free to report it on the Issues Tracker.
Note that many of these guidelines are requirements of technical nature.

1. They must be publicly available on GitHub and Open-Source.
2. They must have a valid `LICENSE` file with a permissive Open-Source license (e.g. MIT, Apache or GNU GPL or similar).
3. They must have a valid `pom.xml` file.
4. They are not allowed to force auto-updates on people without providing an option to disable it.

### Example
```javascript
    // ...
    // Replace this with your username, repo and branch you wish to publish. For example: AwesomeUser/CoolAddon:main
    "User/Repo:branch": {
        // Some repositories support the usage of sonar-scanner, custom repositories cannot have this feature though (yet)
        "sonar": {
            "enabled": false
        },
        // What the builds will be prefixed with. "DEV" would make builds like "CoolAddon - DEV 1 (githash)"
        "options": {
            "prefix": "DEV"
        },
        // What your addon supports/depends on. The number key indicates the minium build.
        // You can list any text or even links here.
        "dependencies": {
            "Minecraft Version(s)": {
                "1": "1.13.x, 1.14.x, 1.15.x, 1.16.x"
            },
            "CS-CoreLib Version": {
                "1": "<a class=\"link_info\" href=\"/builds/TheBusyBiscuit/CS-CoreLib/master/#100\">dev #100</a>"
            },
            "Slimefun Version": {
                "1": "<a class=\"link_info\" href=\"/builds/TheBusyBiscuit/Slimefun4/master/#600\">dev #600</a>"
            },
        }
    }
}
```

### Auto-Updater
If you are using [CS-CoreLib v2](https://github.com/TheBusyBiscuit/CS-CoreLib2) or [Slimefun](https://github.com/Slimefun/Slimefun4) for your project, you can use our premade Auto-Updater for your project.
You can add our Auto-Updater by placing this inside the `onEnable()` method of your main class which extends `JavaPlugin`.

```java
if (autoUpdatesEnabled) {
    Updater updater = new GitHubBuildsUpdater(this, this.getFile(), "USER/REPO/BRANCH");
    updater.start();
}
```

**Make sure to add a config option for enabling/disabling auto-updates though!**
