$(function() {
    $.getJSON("https://thebusybiscuit.github.io/builds/resources/repos.json", repos => {
        $("#repos").html("");
        let profiles = [];

        for (let repo in repos) {
            if (!profiles.includes(repo.split("/")[0])) {
                let username = repo.split("/")[0];
                console.log(`Found Author "${username}"`);

                profiles.push(username);
                addProfile(username, repos);
            }
        }

        console.log(profiles);
    });
});

function addProfile(user, repos) {
    $("#repos").append(
        `<div class="box box_user">
            <a style="padding-top: 1vh;" class="link_repo" href="https://github.com/${user}">
                <img alt="profile" src="https://cdnjs.cloudflare.com/ajax/libs/octicons/8.5.0/svg/person.svg" class="profile_icon">
                <span>${user}</span>
            </a>
            <table id="projects_${user}" class="info_table"></table>
        </div>`
    );

    let table = $("#projects_" + user);

    for (let repo in repos) {
        if (repo.split("/")[0] !== user) {
            continue;
        }

        console.log(`Found Project "${repo}"`);
        let repository = repo.split('/')[1].split(":")[0];
        let branch = repo.split('/')[1].split(":")[1];

        // The directory for the project
        let directory = `${user}/${repository}/${branch}`;

        // Might be overridden via the config
        if (repos[repo].options && repos[repo].options.custom_directory) {
            directory = repos[repo].options.custom_directory;
        }

        let projectType = repos[repo].options && repos[repo].options.abandoned ? "abandoned" : "alive";
        addRepository(table, directory, user, repository, branch, projectType);
    }

    // Alphabetical sorting (abandoned projects to the bottom)
    $(table).append(table.children("tr").sort((a, b) => sortProjects($(a), $(b))));
}

function addRepository(table, directory, owner, repo, branch, projectType) {
    table.append(
        `<tr class="${projectType}" project="${repo}:${branch}">
            <td class="icon">
                <img alt="project page" src="https://cdnjs.cloudflare.com/ajax/libs/octicons/8.5.0/svg/beaker.svg" />
            </td>
            <td class="table_label" style="width: auto;">
                <a class="link_info" href="${directory}">${repo} (${branch})${projectType == 'abandoned' ? " [abandoned]" : ""}</a>
            </td>
            <td>
                <img class="badge" alt="project badge" src="https://thebusybiscuit.github.io/builds/${directory}/badge.svg" />
            </td>
        </tr>
    `);
}

function sortProjects(a, b) {
    if (a.hasClass("abandoned") && !b.hasClass("abandoned")) {
        return 1;
    } else if (!a.hasClass("abandoned") && b.hasClass("abandoned")) {
        return -1;
    } else {
        return a.attr("project").toUpperCase() > b.attr("project").toUpperCase() ? 1 : -1;
    }
}
