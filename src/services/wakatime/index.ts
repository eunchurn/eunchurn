import "dotenv/config";
import fs from "node:fs";
import { Octokit } from "@octokit/rest";
import gitUtils from "./utils";
// const gitUtils = require("./utils");
const repoQuery = require("./query");

const {
  WAKATIME_API_KEY: wakatimeApiKey,
  GH_TOKEN: gitHubToken,
  SHOW_TOTAL_TIME: showTime,
  SHOW_PROFILE: showProfile,
  SHORT_INFO: shortInfo,
  SHOW_WAKASTAT: showWakaStat,
  SHOW_COMMIT: showCommit,
  SHOW_WEEK: showDayOfWeek,
  SHOW_LANGUAGE: showLanguage,
  SHOW_EDITORS: showEditors,
  SHOW_OS: showOs,
  SHOW_PROJECTS: showProject,
  SHOW_LANGUAGE_PER_REPO: showLanguagePerRepo,
  SHOW_UPDATE_DATE: showUpdateDate,
  INPUT_COMMIT_MESSAGE: commitMessage,
} = process.env;

const octokit = new Octokit({
  auth: gitHubToken,
});

const templateTag = "```";
let readme = "";
let stats = "";
const date = new Date();
let today, traffic, user, contrib, userStat, contributed;
const gitProfile = {
  userId: "",
  userName: "",
  userEmail: "",
};

const commitData = {
  owner: "",
  repo: "",
  message: commitMessage || "Update Readme with Waka Stats",
  sha: "",
  path: "",
  content: "",
};
const START_COMMENT = "<!--START_SECTION:waka-->";
const END_COMMENT = "<!--END_SECTION:waka-->";

function generateBarChart(perc: number) {
  const empty_block = "░";
  const done_block = "█";
  const mid_block = "▒";
  return `${
    perc / 4 < 4 && perc / 4 != 0
      ? mid_block.repeat(1)
      : done_block.repeat(perc / 4)
  }${empty_block.repeat(25 - perc / 4)}`;
}

function makeStandardList(list: any[]) {
  let string = `${templateTag}text`;
  for (const l of list) {
    let lname = l.name.length;
    let ltext = l.text.length;
    string = `${string}\n${l.name}${" ".repeat(25 - lname)}${
      l.text
    }${" ".repeat(20 - ltext)}${generateBarChart(l.percent)}   ${Number(
      l.percent
    )}%\n`;
  }
  return `${string.substr(0, string.length - 1)}\n${templateTag}\n`;
}

function makeCommitList(list: any[]) {
  let string = `${templateTag}text`;
  for (const l of list) {
    let lname = l.name.length;
    let ltext = l.text.length;
    string = `${string}\n${l.name}${" ".repeat(13 - lname)}${
      l.text
    }${" ".repeat(15 - ltext)}${generateBarChart(l.percent)}   ${Number(
      l.percent
    )}%\n`;
  }
  return `${string.substr(0, string.length - 1)}\n${templateTag}\n`;
}

function currentReadme(): Promise<string> {
  return new Promise((resolve, reject) => {
    gitUtils
      .gitApiGraphQl(gitHubToken!, repoQuery.userInfoQuery)
      .then((d: any) => {
        gitProfile.userId = d.response.viewer.id;
        gitProfile.userEmail = d.response.viewer.email;
        gitProfile.userName = d.response.viewer.login;
        gitUtils
          .gitApi(
            `/repos/${gitProfile.userName}/${gitProfile.userName}/contents/README.md`,
            gitHubToken!
          )
          .then((d: any) => {
            commitData.sha = d.response.sha;
            commitData.path = d.response.path;
            commitData.repo = gitProfile.userName;
            commitData.owner = gitProfile.userName;
            fs.readFile("README.md", (err, data) => {
              const readme = data.toString("utf-8");
              resolve(readme);
            });
            // const readme = buff.toString("utf-8");
            // resolve(readme);
          });
      });
  });
}

function initialize() {
  return new Promise((resolve, reject) => {
    gitUtils
      .gitApiGraphQl(gitHubToken!, repoQuery.userInfoQuery)
      .then((d: any) => {
        gitProfile.userId = d.response.viewer.id;
        gitProfile.userEmail = d.response.viewer.email;
        gitProfile.userName = d.response.viewer.login;
        gitUtils
          .gitApi(
            `/repos/${gitProfile.userName}/${gitProfile.userName}/contents/README.md`,
            gitHubToken!
          )
          .then((d: any) => {
            commitData.sha = d.response.sha;
            commitData.path = d.response.path;
            commitData.repo = gitProfile.userName;
            commitData.owner = gitProfile.userName;
            const buff = Buffer.from(d.response.content, "base64");
            const readme = buff.toString("utf-8");
            resolve(readme);
          });
      });
  });
}

function getRepos() {
  return new Promise((resolve, reject) => {
    gitUtils
      .gitApiGraphQl(
        gitHubToken!,
        gitUtils.substitute(
          repoQuery.list_repos,
          ["$username", "$id"],
          [gitProfile.userName, gitProfile.userId]
        ),
        {},
        "repos"
      )
      .then((d: any) => {
        resolve(d.repos.user.repositories);
      });
  });
}

function getStats() {
  return new Promise((resolve, reject) => {
    let prom = [];
    let stats = "";
    if (showTime == "true") {
      prom.push(
        gitUtils.wakatimeApi(
          `all_time_since_today?api_key=${wakatimeApiKey}`,
          "today"
        )
      );
    }
    if (showProfile == "true") {
      prom.push(
        gitUtils.gitApi(
          `repos/${gitProfile.userName}/${gitProfile.userName}/traffic/views?per=week`,
          gitHubToken!,
          "traffic"
        )
      );
    }
    if (shortInfo == "true") {
      prom.push(gitUtils.gitApi(`user`, gitHubToken!, "user"));
      prom.push(
        gitUtils.gitApi(
          `https://github-contributions.now.sh/api/v1/${gitProfile.userName}`,
          gitHubToken!,
          "contrib",
          true
        )
      );
    }
    if (showWakaStat == "true") {
      prom.push(
        gitUtils.wakatimeApi(
          `stats/last_30_days?api_key=${wakatimeApiKey}`,
          "userStat"
        )
      );
    }
    if (showCommit == "true") {
      prom.push(
        gitUtils.gitApiGraphQl(
          gitHubToken!,
          gitUtils.substitute(
            repoQuery.contributedQuery,
            "$username",
            gitProfile.userName
          ),
          {},
          "contributed"
        )
      );
    }
    Promise.all(prom)
      .then((values) => {
        let statistics = "";
        let contribution = "";
        let traffics = "";
        let userInfo = "";
        let repos = [];
        [today, traffic, user, contrib, userStat, contributed] = values.map(
          (el, key) => {
            // @ts-ignore
            return values[key][Object.keys(el)];
          }
        );
        if (today) {
          statistics = `![Code Time](http://img.shields.io/badge/Code_Time-${today.text.replace(
            /\s/g,
            "%20"
          )}-blue)   `;
        }
        if (contrib) {
          let contr = 0;
          if (contrib.years.length > 0) {
            contrib.years.forEach((c: any) => {
              contr = contr + c.total;
            });
          }
          contribution = `🏆 ${contrib.years[0].total} Personal contributions in the last year\n\n🛡️ ${contr} Total contributions when i start a github profile\n`;
        }
        if (traffic) {
          traffics = `![Profile Views](http://img.shields.io/badge/Profile_Views-${traffic.count}-red)\n\n`;
        }
        if (user) {
          userInfo = `💾 ${gitUtils.convertData(
            user.disk_usage
          )} Used in Github's Storage\n\n${
            user.hireable ? "Not Opted to hire" : "🚫 Not Opted to hire"
          }\n\n📖 ${user.public_repos} Public repos \n\n🔐 ${
            user.total_private_repos !== null ? user.total_private_repos : 0
          } Private repos \n\n🔃 ${user.followers} Followers \n\n🔄 ${
            user.following
          } Following \n`;
        }
        stats = `${statistics}${traffics} **🤓 My Personal GitHub Info** \n\n${templateTag}properties\n${contribution.trimLeft()}\n${userInfo}\n${templateTag}`;
        if (contributed) {
          repos = contributed.user.repositoriesContributedTo.nodes.filter(
            (a: any) => !a.isFork
          );
        }
        const obj = {
          repos,
          stats,
          userStat,
        };
        resolve(obj);
      })
      .catch((error) => {
        console.log(error);
      });
  });
}

function generateCommitList(repos: any, stat: any) {
  return new Promise((resolve, reject) => {
    if (showCommit !== "true") {
      resolve("");
    }
    let string = ``;
    let sumAll = 0;
    let sum_week = 0;
    const weekDay = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayPeriod = {
      morning: 0,
      daytime: 0,
      evening: 0,
      night: 0,
    };
    const dayOfWeek = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };
    const prom = [];
    for (let r of repos) {
      prom.push(
        gitUtils.gitApiGraphQl(
          gitHubToken!,
          gitUtils.substitute(
            repoQuery.createCommitQuery,
            ["$owner", "$name", "$id"],
            [gitProfile.userName, r.name, gitProfile.userId]
          )
        )
      );
    }
    Promise.all(prom).then((values: any[]) => {
      const no_activity = "No Activity Tracked This Week";
      let target: any[] = [];
      for (let c of values) {
        if (c.response.repository) {
          if (c.response.repository.defaultBranchRef != null) {
            target = target.concat(
              c.response.repository.defaultBranchRef.target.history.edges
            );
          }
        }
      }
      for (let c of target) {
        const date = new Date(c.node.committedDate);
        const hour = date.getHours();
        const day = weekDay[date.getDay()];
        // @ts-ignore
        dayOfWeek[day] += 1;
        if (hour <= 0 && hour < 6) {
          dayPeriod.night += 1;
        } else if (hour <= 6 && hour < 12) {
          dayPeriod.morning += 1;
        } else if (hour <= 12 && hour < 18) {
          dayPeriod.daytime += 1;
        } else if (hour <= 18 && hour < 24) {
          dayPeriod.evening += 1;
        }
      }
      sumAll = Object.values(dayPeriod).reduce((a, b) => a + b);
      sum_week = Object.values(dayOfWeek).reduce((a, b) => a + b);
      const one_day = [
        {
          name: `🌞 Morning`,
          text: `${dayPeriod.morning} commits`,
          percent: ((dayPeriod.morning / sumAll) * 100).toFixed(2),
        },
        {
          name: `🌆 Daytime`,
          text: `${dayPeriod.daytime} commits`,
          percent: ((dayPeriod.daytime / sumAll) * 100).toFixed(2),
        },
        {
          name: `🌉 Evening`,
          text: `${dayPeriod.evening} commits`,
          percent: ((dayPeriod.evening / sumAll) * 100).toFixed(2),
        },
        {
          name: `🌕 Night`,
          text: `${dayPeriod.night} commits`,
          percent: ((dayPeriod.night / sumAll) * 100).toFixed(2),
        },
      ];
      let dayTitle;
      dayTitle =
        dayPeriod.morning + dayPeriod.daytime >
        dayPeriod.evening + dayPeriod.night
          ? "I am human 👨‍💻"
          : "Maybe i am a vampire 🧛";
      string = `${string}\n📆 **${dayTitle}** \n${makeCommitList(one_day)}\n`;

      const day_of_week = [
        {
          name: `Monday`,
          text: `${dayOfWeek.Monday} commits`,
          percent: ((dayOfWeek.Monday / sum_week) * 100).toFixed(2),
        },
        {
          name: `Tuesday`,
          text: `${dayOfWeek.Tuesday} commits`,
          percent: ((dayOfWeek.Tuesday / sum_week) * 100).toFixed(2),
        },
        {
          name: `Wednesday`,
          text: `${dayOfWeek.Wednesday} commits`,
          percent: ((dayOfWeek.Wednesday / sum_week) * 100).toFixed(2),
        },
        {
          name: `Thursday`,
          text: `${dayOfWeek.Thursday} commits`,
          percent: ((dayOfWeek.Thursday / sum_week) * 100).toFixed(2),
        },
        {
          name: `Friday`,
          text: `${dayOfWeek.Friday} commits`,
          percent: ((dayOfWeek.Friday / sum_week) * 100).toFixed(2),
        },
        {
          name: `Saturday`,
          text: `${dayOfWeek.Saturday} commits`,
          percent: ((dayOfWeek.Saturday / sum_week) * 100).toFixed(2),
        },
        {
          name: `Sunday`,
          text: `${dayOfWeek.Sunday} commits`,
          percent: ((dayOfWeek.Sunday / sum_week) * 100).toFixed(2),
        },
      ];
      if (showDayOfWeek == "true") {
        let maxElement = {
          name: "",
          text: "",
          percent: 0,
        };
        let dayWeekTitle;
        for (let d of day_of_week) {
          if (Number(d.percent) > Number(maxElement.percent)) {
            maxElement = { ...d, percent: Number(d.percent) };
          }
          dayWeekTitle = `**I do my best effort on** ${maxElement.name}`;
        }
        string = `${string}📅 ${dayWeekTitle}\n ${makeCommitList(
          day_of_week
        )}\n`;
      }

      if (showLanguage == "true" && stat.languages) {
        string = `${string}🏷️ ***Languages*** \n${
          stat.languages.length > 0
            ? makeStandardList(stat.languages)
            : no_activity
        }\n`;
      }
      if (showEditors == "true") {
        string = `${string}🧰 ***Editors*** \n${
          stat.editors.length > 0 ? makeStandardList(stat.editors) : no_activity
        }\n`;
      }
      if (showOs == "true") {
        string = `${string}📀 ***Operating System*** \n${
          stat.operating_systems.length > 0
            ? makeStandardList(stat.operating_systems)
            : no_activity
        }\n`;
      }
      if (showProject == "true") {
        const projects = stat.projects;
        projects.sort(function (a: any, b: any) {
          return b.percent - a.percent;
        });
        string = `${string}💻 ***Projects*** \n${
          stat.projects.length > 0 ? makeStandardList(projects) : no_activity
        }\n`;
      }
      resolve(string);
    });
  });
}

function generateLanguagePerRepo(repos: any) {
  return new Promise((resolve, reject) => {
    const lang = {};
    let total = 0;
    const data = [];
    for (let r of repos.edges) {
      if (r.node.primaryLanguage != null) {
        const language = r.node.primaryLanguage.name;
        const color_code = r.node.primaryLanguage.color;
        total += 1;
        if (lang.hasOwnProperty(language) === false) {
          // @ts-ignore
          lang[language] = {};
          // @ts-ignore
          lang[language]["count"] = 1;
        } else {
          // @ts-ignore
          lang[language]["count"] += 1;
        }
        // @ts-ignore
        lang[language]["color"] = color_code;
      }
    }
    const labels = Object.keys(lang).sort((a, b) => {
      // @ts-ignore
      return lang[b].count - lang[a].count;
    });
    const mostLanguageRepo = labels[0];
    for (let label of labels) {
      // @ts-ignore
      const perc = ((lang[label].count / total) * 100).toFixed(2);
      // @ts-ignore
      const extension = lang[label].count === 1 ? " repo" : " repos";
      data.push({
        name: label,
        // @ts-ignore
        text: `${String(lang[label].count)}${extension}`,
        percent: perc,
      });
    }
    const string = `***I Mostly Code in*** ${mostLanguageRepo} \n${makeStandardList(
      data
    )}\n`;
    resolve(string);
  });
}

function generateNewReadme(readme: any, stats: any) {
  return new Promise((resolve, reject) => {
    const regex = new RegExp(`(${START_COMMENT})[^]+(${END_COMMENT})[^*]`);
    const old = readme.match(regex)[0];
    const string = readme.replace(
      old,
      `${START_COMMENT}\n${stats}\n${END_COMMENT}\n`
    );
    resolve(string);
  });
}

export const wakatime = async () => {
  let string = ``;
  console.log(`Start on ${date.toLocaleString()}`);
  // const readme = await initialize();
  const readme = await currentReadme();
  const repos = await getRepos();
  const stats = (await getStats()) as any;
  const wakaStat = await generateCommitList(stats.repos, stats.userStat);
  string = `${string}${stats.stats}${wakaStat}`;
  if (showLanguagePerRepo == "true") {
    string = `${string}${await generateLanguagePerRepo(repos)}\n\n`;
  }
  if (showUpdateDate == "true") {
    const last_update = new Date();
    string = `${string}⌚ ***Last Stats Update on***\n${last_update.toUTCString()}`;
  }
  const newReadme = (await generateNewReadme(readme, string)) as any;
  commitData.content = Buffer.from(newReadme).toString("base64");
  const result = await octokit.repos.createOrUpdateFileContents(commitData);
  console.log(`Readme updated ${result.status}`);
  const end_time = new Date();
  console.log(`End on ${end_time.toLocaleString()}`);
  console.log(
    `Program processed in ${Math.round(
      (end_time.getTime() - date.getTime()) / 1000
    )} seconds\n`
  );
};
