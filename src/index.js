#!/usr/bin/env node

const fetch = require("node-fetch");
const imgur = require("imgur");
const glob = require("glob");
const execa = require("execa");
const dotenv = require("dotenv");
dotenv.config();

// https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/
// https://github.com/settings/tokens

console.log(process.env.TRAVIS_PULL_REQUEST);
console.log(process.env.TRAVIS_REPO_SLUG);

const repo = process.env.TRAVIS_REPO_SLUG;
const pr = process.env.TRAVIS_PULL_REQUEST;
const token = process.env.GH_TOKEN;

function postComment(comment) {
  return fetch(`https://api.github.com/repos/${repo}/issues/${pr}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: comment }),
    headers: { Authorization: `token ${token}` }
  })
    .then(res => res.json())
    .then(json => console.log(json));
}

function postImages(cb) {
  const path = "cypress/snapshots/*/__diff_output__/*.diff.png";
  console.log(
    `[test-output-to-pr] Posting images from ${path} to ${repo}#${pr}`
  );
  glob(path, (err, files) => {
    imgur
      .uploadImages(files, "File")
      .then(uploads => uploads.map(upload => upload.link))
      .then(links => {
        const lines = links.map(link => `![diff](${link})`);
        const comment = [
          "### Failed Snapshots",
          ...lines,
          "> Automatically posted with [test-output-to-pr](https://github.com/pomber/test-output-to-pr)"
        ].join("\n\n");
        postComment(comment).then(cb);
      });
  });
}

function run(args) {
  // const test = execa("npm", ["run", test], { stdio: "inherit" });
  return execa("yarn", [...args], { stdio: "inherit" })
    .then(x => console.log("then: ", x))
    .catch(e => {
      console.log("catch: ", e, e.code);
      postImages(() => {
        process.exit(e.code);
      });
    });
}

/*
TODO:
- test may fail without failing snapshots: dont post comment
- if we are not in travis and/or not triggered from a pr: do nothing
 */

const args = process.argv.slice(2);
run(args);
