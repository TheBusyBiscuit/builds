$(function() {
    $.getJSON("https://thebusybiscuit.github.io/builds/repos.json", function(repos) {
        $("#repos").html("");
        for (var author in repos) {
            for (var i in repos[author]) {
                var repo = repos[author][i];
                var repository = repo.split(':')[0];
                var branch = repo.split(':')[1];

                addRepository(author, repository, branch);
            }
        }
    });
});

function addRepository(owner, repo, branch) {
    var html = "<div class=\"box repo\">";
    html += "<a class=\"link_build link_repo\" href=\"" + owner + "/" + repo + "/" + branch + "\">";
    html += owner + "/" + repo + " (" + branch + ")</a>";
    html += "<table class=\"info_table\">";
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/briefcase.svg\"></td>";
    html += "<td>Builds</td><td>";
    html += "<a class=\"link_info\" href=\"" + owner + "/" + repo + "/" + branch + "\">Repo Server</a></td></tr>";
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/repo.svg\"></td>";
    html += "<td>Repository</td><td>";
    html += "<a class=\"link_info\" href=\"https://github.com/" + owner + "/" + repo + "/tree/" + branch + "\">GitHub</a></td></tr>";
    html += "<tr><td class=\"icon\"><img class=\"icon\" src=\"https://thebusybiscuit.github.io/content/octicons/checklist.svg\"></td>";
    html += "<td>Last Successful Build</td><td>";
    html += "<a id=\"build_" + owner + "_" + repo + "_" + branch + "\" class=\"link_info\" href=\"${last-successful}\">";
    html += "<img style=\"width: 20px;\" class=\"loading\" src=\"https://thebusybiscuit.github.io/content/octicons/sync.svg\"/></a></td></tr>";
    html += "</table></div>";

    $("#repos").append(html);

    $.getJSON("https://thebusybiscuit.github.io/builds/" + owner + "/" + repo + "/" + branch + "/builds.json", function(builds) {
        var build = $("#build_" + owner + "_" + repo + "_" + branch);

        build.attr("href", owner + "/" + repo + "/" + branch + "#" + builds.last_successful);
        build.text("#" + builds.last_successful + " - " + builds[builds.last_successful].date);
    });
}
