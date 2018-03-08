$(function() {
    $.getJSON("https://thebusybiscuit.github.io/builds/repos.json", function(repos) {
        $("#repos").html("");
        
        for (let author in repos) {
            for (let i in repos[author]) {
                let repo = repos[author][i];
                addRepository(author, repo.split(':')[0], repo.split(':')[1]);
            }
        }
    });
});

function addRepository(owner, repo, branch) {
    let html = "<div class=\"box repo\">";
    html += "<a class=\"link_build link_repo\" href=\"" + owner + "/" + repo + "/" + branch + "\">";
    html += owner + "/" + repo + " (" + branch + ")</a>";
    html += "<table class=\"info_table\">";
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/briefcase.svg\"></td>";
    html += "<td>Builds</td><td>";
    html += "<a class=\"link_info\" href=\"" + owner + "/" + repo + "/" + branch + "\">Repo Server</a></td></tr>";
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/repo.svg\"></td>";
    html += "<td>Repository</td><td>";
    html += "<a class=\"link_info\" href=\"https://github.com/" + owner + "/" + repo + "/tree/" + branch + "\">GitHub</a></td></tr>";
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/calendar.svg\"></td>";
    html += "<td>Latest Build</td><td>";
    html += "<a id=\"latest_" + owner + "_" + repo + "_" + branch + "\" class=\"link_info\" href=\"${latest}\">";
    html += "<img style=\"width: 20px;\" class=\"loading\" src=\"https://thebusybiscuit.github.io/content/octicons/sync.svg\"/></a></td></tr>";
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/beaker.svg\"></td>";
    html += "<td>Status</td><td>";
    html += "<img src=\"https://thebusybiscuit.github.io/builds/" + owner + "/" + repo + "/" + branch + "/badge.svg\"/></td></tr>";
    html += "</table></div>";

    $("#repos").append(html);

    $.getJSON("https://thebusybiscuit.github.io/builds/" + owner + "/" + repo + "/" + branch + "/builds.json", function(builds) {
        let latest = $("#latest_" + owner + "_" + repo + "_" + branch);

        latest.attr("href", owner + "/" + repo + "/" + branch + "#" + builds.latest);
        latest.text("#" + builds.latest + " - " + builds[builds.latest].date);

        let last_successful = $("#successful_" + owner + "_" + repo + "_" + branch);

        last_successful.attr("href", owner + "/" + repo + "/" + branch + "#" + builds.last_successful);
        last_successful.text("#" + (builds[builds.last_successful].tag ? builds[builds.last_successful].tag: builds.last_successful) + " - " + builds[builds.last_successful].date);
    });
}
