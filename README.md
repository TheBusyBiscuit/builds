# Maven Builds Server
This is the repository of the backend for my builds-page.
The page can be found here: https://thebusybiscuit.github.io/builds/

This kinda serves as a "Continous Deployment" Service for Maven Projects,
but it utilises GitHub Pages.

# Status
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=security_rating)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=bugs)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=code_smells)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=TheBusyBiscuit_builds&metric=coverage)](https://sonarcloud.io/dashboard?id=TheBusyBiscuit_builds)


## How it works
The code itself is basically just a basic node.js Program.
It reads repositories from 'resources/repos.json' and connects to the GitHub-API.
If you are interested in the specifics, then feel free to keep on reading.

1. Commits
The first step is to retrieve the latest commit from [GitHub's API](https://developer.github.com/v3/repos/commits/)
It will compare that commit's timestamp to the locally stored repository.
If the remote version is newer or if there isn't even a local version, we are calculating the new build id.
After that it will proceed to step 2.

2. Cloning
After we established that our repository is out of date, this program will ```git clone``` said repository.
It will also locate it's pom.xml file and set the version to "DEV - <build id> (git <commit>)".

3. Compiling
This is the easiest step, the program just runs ```mvn clean package -B``` to compile our Maven Project.
It will also catch the state (Success / Failure).

4. Gathering Resources
Since the page can also display some additional information, the program will now fetch the project's license and tags.
It will also relocate the compiled jar to our main project directory.

5. Preparing the upload
Now the program will update our local builds.json file for the project.
It will add the newly compiled build, set the latest and lastSuccessful version 
and it's going to tag any builds that match up with our previously fetched tags, with that tag.
Then it will generate a fresh index.html page for the project (from "resources/template.html").
And it will also generate a Status Badge (see "resources/badge.svg").
If we specified a discord webhook, it will also post a message on your discord server.

6. Finishing / Uploading
Now that everything completed, the program will add, commit and push all changed files to this repository.
After it's done, it will clear out any source files that arised during ```git clone```.
