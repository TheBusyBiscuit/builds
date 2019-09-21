$(function() {
    var body = $(document.body);
    var owner = body.attr("owner");
    var repository = body.attr("repository");
    var branch = body.attr("branch");

    createBadge(owner, repository, branch, "markdown");
    createBadge(owner, repository, branch, "html");

    $.getJSON("https://thebusybiscuit.github.io/builds/resources/repos.json", function(repos) {
        var info = repos[owner + "/" + repository + ":" + branch];

	    let i = 1;
        for (var key in info.dependencies) {
            $("#dependencies").append('<tr id="custom-info-' + i++ + '">' + key + '</td>');
        }

        if (i > 1) {
            $("#dependency_section").show();
        }

        function loadBuild(builds, id) {
            var stroke = "rgb(110, 110, 110)";
            var color = "rgb(160, 160, 160)";

            if (builds[id].status === "SUCCESS") {
                stroke = "rgb(60, 100, 60)";
                color = "rgb(20, 255, 20)";
            }
            else if (builds[id].status === "FAILURE") {
                stroke = "rgb(100, 60, 60)";
                color = "rgb(255, 20, 20)";
            }

            var current_icon = "<circle cx=\"31\" cy=\"31\" r=\"23\" stroke=\"" + stroke + "\" stroke-width=\"2\" fill=\"" + color + "\"/>";

            $("#current_icon").html(current_icon);
            $("#current_status").text(builds[id].status);

            var download_jar = $("#current_download_jar");

            if (builds[id].status === "SUCCESS") {
                $("#download_section").css("display", "");
                download_jar.attr("href", repository + "-" + id + ".jar");
            }
            else {
                $("#download_section").css("display", "none");
            }

            if (builds[id].candidate === "RELEASE") {
                download_jar.text(repository + " " + builds[id].tag + ".jar");
                download_jar.attr("download", repository + " " + builds[id].tag + ".jar");

                $("#current_name").text(repository + " " + builds[id].tag);
                $("#tag_section").css("display", "");

                var current_tag = $("#current_tag");
                current_tag.attr("href", "https://github.com/" + owner +"/" + repository + "/releases/tag/" + builds[id].tag);
                current_tag.text(builds[id].tag);
            }
            else {
                download_jar.text(repository + " - DEV " + id + " (git " + builds[id].sha.substr(0, 5) + ").jar");
                download_jar.attr("download", repository + " - DEV " + id + " (git " + builds[id].sha.substr(0, 5) + ").jar");

                $("#current_name").text(repository + " - #" + id);
                $("#tag_section").css("display", "none");
            }

            var download_log = $("#current_download_log");
            download_log.text(repository + "-" + id + ".log");
            download_log.attr("href", repository + "-" + id + ".log");

            $("#current_tree").attr("href", "https://github.com/" + owner + "/" + repository + "/tree/" + builds[id].sha);

            if (builds[id].license === "") {
                $("#license_section").css("display", "none");
            }
            else {
                $("#license_section").css("display", "");

                var current_license = $("#current_license");
                current_license.attr("href", builds[id].license.url);
                current_license.text(builds[id].license.name);
            }

            var current_commit = $("#current_commit");
            current_commit.attr("href", "https://github.com/" + owner +"/" + repository + "/commit/" + builds[id].sha);
            current_commit.text("#" + builds[id].sha.substr(0, 5));

            $("#current_commit_avatar").attr("src", builds[id].avatar);
            $("#current_commit_committer").text(builds[id].author);
            $("#current_commit_date").text(builds[id].date);

            var msg = "\"" + builds[id].message + "\"";
            // Prevent XSS
            msg = msg.replace(/</g, "")
            msg = msg.replace(/>/g, "")

            var matches = msg.match(/#[0-9]+/g);

            for (let n in matches) {
                msg = msg.replace(matches[n], "<a class=\"link_info\" href=https://github.com/" + owner + "/" + repository + "/issues/" + matches[n].replace("#", "") + ">" + matches[n] + "</a>");
            }

            $("#current_commit_message").html(msg);

            var j = 1;
            for (var label in info.dependencies) {
                var content = "";
                var prev = 0;

                for (var min in info.dependencies[label]) {
                    if (id >= parseInt(min) && parseInt(min) > prev) {
                        content = info.dependencies[label][min];
                    }
                }

                $("#custom-info-" + j++).html('<td class="icon"><img class="icon" src="https://thebusybiscuit.github.io/content/octicons/package.svg"></td><td class="info_table_middle">' + label + '</td><td>' + content + '</td>');
            }
        }

        $.getJSON("https://thebusybiscuit.github.io/builds/" + owner + "/" + repository + "/" + branch + "/builds.json", function(builds) {
            var last_successful = builds.last_successful;

            // Get currently selected Build
            var current = builds.latest;

            if(window.location.hash) {
                var hash = window.location.hash.substr(1);

                if (!isNaN(hash)) {
                    var id = parseInt(hash);
                    if (id > 0 && id < builds.latest) {
                        current = id;
                    }
                }
            }

            // Load currently selected Build
            loadBuild(builds, current);

            // "Last Successful Build" Link
            var link_last_successful = $("#link_last_successful_build");

            link_last_successful.text("#" + last_successful);
            link_last_successful.attr("href", "#" + last_successful);

            $(".build_header").text("Builds (" + builds.latest + ")");

            // Build List
            var list_builds = $("#buildlist");

            list_builds.html("");
            for (var buildID = builds.latest; buildID > 0; buildID--) {
                list_builds.append(build(builds, buildID));
            }

            // Add Click Events
            $(".trigger").click(function() {
                loadBuild(builds, parseInt($(this).attr("href").substr(1)));
            });
        });
    });

    $("#badge_click").click(function() {
        $(".overlay").css("display", "");
    });

    $("#close_badge").click(function() {
        $(".overlay").css("display", "none");
    });

    function build(builds, id) {
        var stroke = "rgb(110, 110, 110)";
        var color = "rgb(160, 160, 160)";
        var name = "#" + id;

        if (builds[id].status === "SUCCESS") {
            stroke = "rgb(60, 100, 60)";
            color = "rgb(20, 255, 20)";
        }
        else if (builds[id].status === "FAILURE") {
            stroke = "rgb(100, 60, 60)";
            color = "rgb(255, 20, 20)";
        }

        if (builds[id].candidate === "RELEASE") {
            name = builds[id].tag;
        }

        var html = "<div class=\"build";

        if (builds[id].candidate === "RELEASE") html += " release";
        else html += " dev";

        html += "\" id=\"build_" + id + "\">";
        html += "<svg class=\"build_child build_state\">";
        html += "<circle cx=\"12\" cy=\"29\" r=\"11\" stroke=\"" + stroke + "\" stroke-width=\"2\" fill=\"" + color + "\"/></svg>";
        html += "<a class=\"trigger build_child link_build\" href=\"#" + id + "\">" + name + "</a>";
        html += "<a class=\"trigger build_child link_date\" href=\"#" + id + "\">" + builds[id].date + "</a>";
        html += "<a class=\"build_child link_commit\" href=https://github.com/" + owner + "/" + repository + "/commit/" + builds[id].sha + ">#" + builds[id].sha.substr(0, 5) + "</a>";
        html += "</div>";

        return html;
    }
});

function createBadge(owner, repository, branch, language) {
    var url = "";

    if (language === "markdown") {
        url = "[![Build Status](https://thebusybiscuit.github.io/builds/" + owner + "/" + repository + "/" + branch + "/badge.svg)](https://thebusybiscuit.github.io/builds/" + owner + "/" + repository + "/" + branch + ")"
    }
    else if (language === "html") {
        url = "<a href=\"https://thebusybiscuit.github.io/builds/" + owner + "/" + repository + "/" + branch + "\"><img src=\"https://thebusybiscuit.github.io/builds/" + owner + "/" + repository + "/" + branch + "/badge.svg\" alt=\"Build Status\"/></a>";
    }

    $("#badge_" + language).attr("value", url);
    $("#copy_" + language).click(function() {
        $("#badge_" + language).select();
        document.execCommand("Copy");
    });
}
