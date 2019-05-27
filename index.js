$(function() {
    $.getJSON("https://thebusybiscuit.github.io/builds/repos.json", function(repos) {
        $("#repos").html("");

        for (var repo in repos) {
            console.log("Found Project \"" + repo + "\"");
            addRepository(repo.split("/")[0], repo.split('/')[1].split(":")[0], repo.split('/')[1].split(":")[1]);
        }
    });
});

function addRepository(owner, repo, branch) {
    let html = "<div class=\"box repo\">";
    html += "<a class=\"link_build link_repo\" href=\"" + owner + "/" + repo + "/" + branch + "\">";
    html += owner + "/" + repo + " (" + branch + ")</a>";
    html += "<table class=\"info_table\">";
    
//    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/briefcase.svg\"></td>";
//    html += "<td class=\"table_label\">Builds</td><td>";
//    html += "<a class=\"link_info\" href=\"" + owner + "/" + repo + "/" + branch + "\">Repo Server</a></td></tr>";
    
//    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/repo.svg\"></td>";
//    html += "<td class=\"table_label\">Repository</td><td>";
//    html += "<a class=\"link_info\" href=\"https://github.com/" + owner + "/" + repo + "/tree/" + branch + "\">GitHub</a></td></tr>";
    
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/calendar.svg\"></td>";
    html += "<td class=\"table_label\">Latest Build</td><td>";
    html += "<a id=\"latest_" + owner + "_" + repo + "_" + branch + "\" class=\"link_info\" href=\"${latest}\">";
    html += "<img style=\"width: 20px;\" class=\"loading\" src=\"https://thebusybiscuit.github.io/content/octicons/sync.svg\"/></a></td></tr>";
    
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/beaker.svg\"></td>";
    html += "<td class=\"table_label\">Status</td><td>";
    html += "<img src=\"https://thebusybiscuit.github.io/builds/" + owner + "/" + repo + "/" + branch + "/badge.svg\"/></td></tr>";
    html += "</table></div>";

    $("#repos").append(html);

    $.getJSON("https://thebusybiscuit.github.io/builds/" + owner + "/" + repo + "/" + branch + "/builds.json", function(builds) {
        let latest = $("#latest_" + owner + "_" + repo + "_" + branch);

        latest.attr("href", owner + "/" + repo + "/" + branch + "#" + builds.latest);
        latest.text((builds[builds.latest].candidate === "RELEASE" ? builds[builds.latest].tag: ("#" + builds.latest)) + " - " + builds[builds.latest].date);
    });
}
