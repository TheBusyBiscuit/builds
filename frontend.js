$(function() {
    var body = $(document.body);
    var owner = body.attr("owner");
    var repository = body.attr("repository");
    var branch = body.attr("branch");

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

        // Build List
        var list_builds = $("#buildlist");

        list_builds.html("");
        for (var i = builds.latest; i > 0; i--) {
            list_builds.append(build(builds, i));
        }

        // Add Click Events
        $(".trigger").click(function() {
            loadBuild(builds, parseInt($(this).attr("href").substr(1)));
        })
    });

    function build(builds, id) {
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

        var html = "<div class=\"build\" id=\"" + id + "\">";
        html += "<svg class=\"build_child build_state\">";
        html += "<circle cx=\"12\" cy=\"29\" r=\"11\" stroke=\"" + stroke + "\" stroke-width=\"2\" fill=\"" + color + "\"/></svg>";
        html += "<a class=\"trigger build_child link_build\" href=\"#" + id + "\">#" + id + "</a>";
        html += "<a class=\"trigger build_child link_date\" href=\"#" + id + "\">" + builds[id].date + "</a>";
        html += "<a class=\"build_child link_commit\" href=https://github.com/" + owner + "/" + repository + "/commit/" + builds[id].sha + ">#" + builds[id].sha.substr(0, 5) + "</a>";
        html += "</div>";

        return html;
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
        $("#current_name").text(repository + " - #" + id);

        if (builds[id].status === "SUCCESS") {
            $(".download_section").css("display", "");

            var download_jar = $("#current_download_jar");
            download_jar.text(repository + "-" + id + ".jar");
            download_jar.attr("href", repository + "-" + id + ".jar");

            var download_log = $("#current_download_log");
            download_log.text(repository + "-" + id + ".log");
            download_log.attr("href", repository + "-" + id + ".log");
        }
        else {
            $(".download_section").css("display", "none");
        }

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
        $("#current_commit_message").text("\"" + builds[id].message + "\"");
    }
});
