$(() => {
    let body = $(document.body);
    let owner = body.attr("owner");
    let repository = body.attr("repository");
    let branch = body.attr("branch");

    $.getJSON("https://thebusybiscuit.github.io/builds/resources/repos.json", repos => {
        let info = repos[`${owner}/${repository}:${branch}`];
        let directory = `${owner}/${repository}/${branch}`;

        // Override via custom directory option
        if (info.options && info.options.custom_directory) {
            directory = info.options.custom_directory;
        }

        createBadge(directory, "markdown");
        createBadge(directory, "html");

        let i = 1;
        for (let key in info.dependencies) {
            $("#dependencies").append(`<tr id="custom-info-${i++}">${key}</td>`);
        }

        if (i > 1) {
            $("#dependency_section").show();
        }

        function selectBuild(builds, id) {
            let stroke = "rgb(110, 110, 110)";
            let color = "rgb(160, 160, 160)";

            if (builds[id].status === "SUCCESS") {
                stroke = "rgb(60, 100, 60)";
                color = "rgb(20, 255, 20)";
            } else if (builds[id].status === "FAILURE") {
                stroke = "rgb(100, 60, 60)";
                color = "rgb(255, 20, 20)";
            } else if (builds[id].status === "COMPILE_ONLY") {
                stroke = "rgb(10, 160, 160)";
                color = "rgb(16, 200, 160)";
            }

            let current_icon = `<circle cx="31" cy="31" r="23" stroke="${stroke}" stroke-width="2" fill="${color}"/>`;

            $("#current_icon").html(current_icon);
            $("#current_status").text(builds[id].status);

            let download_jar = $("#current_download_jar");

            if (builds[id].status === "SUCCESS") {
                $("#download_section").css("display", "");
                download_jar.attr("href", `${repository}-${id}.jar`);
            } else {
                $("#download_section").css("display", "none");
            }

            if (builds[id].candidate === "RELEASE") {
                download_jar.text(`${repository} ${builds[id].tag}.jar`);
                download_jar.attr("download", `${repository} ${builds[id].tag}.jar`);

                $("#current_name").text(`${repository} ${builds[id].tag}`);
                $("#tag_section").css("display", "");

                let current_tag = $("#current_tag");
                current_tag.attr("href", `https://github.com/${owner}/${repository}/releases/tag/${builds[id].tag}`);
                current_tag.text(builds[id].tag);
            } else {
                let prefix = info.options ? info.options.prefix : "DEV";
                download_jar.text(`${repository} - ${prefix} ${id} (git ${builds[id].sha.substr(0, 5)}).jar`);
                download_jar.attr("download", `${repository} - ${prefix} ${id} (git ${builds[id].sha.substr(0, 5)}).jar`);

                $("#current_name").text(`${repository} - #${id}`);
                $("#tag_section").css("display", "none");
            }

            let download_log = $("#current_download_log");
            download_log.text(`${repository}-${id}.log`);
            download_log.attr("href", `${repository}-${id}.log`);

            $("#current_tree").attr("href", `https://github.com/${owner}/${repository}/tree/${builds[id].sha}`);

            if (builds[id].license === "") {
                $("#license_section").css("display", "none");
            } else {
                $("#license_section").css("display", "");

                let current_license = $("#current_license");
                current_license.attr("href", builds[id].license.url);
                current_license.text(builds[id].license.name);
            }

            let current_commit = $("#current_commit");
            current_commit.attr("href", `https://github.com/${owner}/${repository}/commit/${builds[id].sha}`);
            current_commit.text("#" + builds[id].sha.substr(0, 5));

            $("#current_commit_avatar").attr("src", builds[id].avatar);
            $("#current_commit_committer").text(builds[id].author);
            $("#current_commit_date").text(builds[id].date);

            let msg = `"${builds[id].message}"`;

            // Prevent XSS
            msg = msg.replace(/</g, "")
            msg = msg.replace(/>/g, "")

            let matches = msg.match(/#[0-9]+/g);

            for (let n in matches) {
                msg = msg.replace(matches[n], `<a class="link_info" href=https://github.com/${owner}/${repository}/issues/${matches[n].replace("#", "")}>${matches[n]}</a>`);
            }

            $("#current_commit_message").html(msg);

            let j = 1;
            for (let label in info.dependencies) {
                let content = "";
                let prev = 0;

                for (let min in info.dependencies[label]) {
                    if (id >= parseInt(min) && parseInt(min) > prev) {
                        content = info.dependencies[label][min];
                    }
                }

                $("#custom-info-" + j++).html(`
                    <td class="icon">
                        <img class="icon" alt="package icon" src="https://cdnjs.cloudflare.com/ajax/libs/octicons/8.5.0/svg/package.svg">
                    </td>
                    <td class="info_table_middle">${label}</td>
                    <td>${content}</td>
                `);
            }
        }

        $.getJSON(`https://thebusybiscuit.github.io/builds/${directory}/builds.json`, builds => {
            let last_successful = builds.last_successful;

            // Get currently selected Build
            let current = builds.latest;

            if (window.location.hash) {
                let hash = window.location.hash.substr(1);

                if (!isNaN(hash)) {
                    let id = parseInt(hash);

                    if (id > 0 && id < builds.latest) {
                        current = id;
                    }
                }
            }

            // Load currently selected Build
            selectBuild(builds, current);

            // "Last Successful Build" Link
            let link_last_successful = $("#link_last_successful_build");
            link_last_successful.text(`Last successful build (#${last_successful})`);
            link_last_successful.attr("href", "#" + last_successful);

            $(".build_header").text("Builds (" + builds.latest + ")");

            // Build List
            let list_builds = $("#buildlist");

            list_builds.html("");

            for (let buildID = builds.latest; buildID > 0; buildID--) {
                list_builds.append(build(builds, buildID));
            }

            // This cannot be converted to a lambda function (We'd lose the contextualized 'this')
            $(".trigger").click(function() {
                let target = $(this).attr("href").substr(1);
                selectBuild(builds, parseInt(target));
            });
        });
    });

    $("#badge_click").click(() => {
        $(".overlay").css("display", "");
    });

    $("#close_badge").click(() => {
        $(".overlay").css("display", "none");
    });

    function build(builds, id) {
        let stroke = "rgb(110, 110, 110)";
        let color = "rgb(160, 160, 160)";
        let name = "#" + id;

        if (builds[id].status === "SUCCESS") {
            stroke = "rgb(60, 100, 60)";
            color = "rgb(20, 255, 20)";
        } else if (builds[id].status === "FAILURE") {
            stroke = "rgb(100, 60, 60)";
            color = "rgb(255, 20, 20)";
        } else if (builds[id].status === "COMPILE_ONLY") {
            stroke = "rgb(10, 160, 160)";
            color = "rgb(16, 200, 160)";
        }

        if (builds[id].candidate === "RELEASE") {
            name = builds[id].tag;
        }

        return `
            <div class="build ${builds[id].candidate === "RELEASE" ? "release" : "dev"}" id="build_${id}">
                <svg class="build_child build_state">
                    <circle cx="12" cy="24" r="12" stroke="${stroke}" stroke-width="2" fill="${color}"/>
                </svg>
                <a class="trigger build_child link_build" href="#${id}">${name}</a>
                <a class="trigger build_child link_date" href="#${id}">${builds[id].date}</a>
            </div>
        `;
    }
});

function createBadge(directory, language) {
    var url = "";

    if (language === "markdown") {
        url = `[![Build Status](https://thebusybiscuit.github.io/builds/${directory}/badge.svg)](https://thebusybiscuit.github.io/builds/${directory})`;
    } else if (language === "html") {
        url = `<a href="https://thebusybiscuit.github.io/builds/${directory}"><img src="https://thebusybiscuit.github.io/builds/${directory}/badge.svg" alt="Build Status"/></a>`;
    }

    $("#badge_" + language).attr("value", url);

    $("#copy_" + language).click(() => {
        $("#badge_" + language).select();
        document.execCommand("Copy");
    });
}
