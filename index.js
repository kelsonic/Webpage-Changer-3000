// Node modules.
require('colors');
const Diff = require('diff');
const { exec } = require("child_process");
// Relative imports.
const {
  COOKIE,
  EXTERNAL_URL,
  KEYWORD,
  REQUEST_EVERY_MS,
  SLACK_WEBHOOK_URL,
} = require('./config');

// Global variables.
let oldHTML = undefined;

// Helpers.
const checkWebsite = async () => {
  console.log("making request");
  exec(
    `curl '${EXTERNAL_URL}' \
    -H 'authority: www.amd.com' \
    -H 'pragma: no-cache' \
    -H 'cache-control: no-cache' \
    -H 'upgrade-insecure-requests: 1' \
    -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.193 Safari/537.36' \
    -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
    -H 'sec-fetch-site: none' \
    -H 'sec-fetch-mode: navigate' \
    -H 'sec-fetch-user: ?1' \
    -H 'sec-fetch-dest: document' \
    -H 'accept-language: en-US,en;q=0.9' \
    -H 'cookie: ${COOKIE}' \
    --compressed`,
    (error, newHTML) => {
      if (error) {
        console.log("Error", error, newHTML);
        console.log('Error ^^');
        exec(`curl -X POST -H 'Content-type: application/json' --data '{"text":"There was an error fetching ${EXTERNAL_URL}.\n\n\n\`\`\`${JSON.stringify(
          error,
          null,
          2
        )}\`\`\`"}' ${SLACK_WEBHOOK_URL}`);
        process.exit(1);
        return;
      }

      if (newHTML.includes('Access Denied')) {
        exec(`curl -X POST -H 'Content-type: application/json' --data '{"text":"There was an error fetching ${EXTERNAL_URL}. Access denied. You need to refresh the cookie."}' ${SLACK_WEBHOOK_URL}`);
        process.exit(1);
        return;
      }

      if (oldHTML === undefined) {
        console.log(newHTML);
        console.log(
          `The Webpage Changer 3000 has started listening to HTML changes of ${EXTERNAL_URL} every ${REQUEST_EVERY_MS / 1000} seconds.`
        );
        // exec(`curl -X POST -H 'Content-type: application/json' --data '{"text":"The Webpage Changer 3000 has started listening to HTML changes of ${EXTERNAL_URL} every ${REQUEST_EVERY_MS / 1000} seconds."}' ${SLACK_WEBHOOK_URL}`);
        oldHTML = newHTML;
        return;
      }

      if (oldHTML !== newHTML) {
        const difference = Diff.diffChars(oldHTML, newHTML);
        let differenceText = '';
        difference.forEach((part) => {
          // green for additions, red for deletions
          // grey for common parts
          const color = part.added ? 'green' :
            part.removed ? 'red' : 'grey';
          if (part.added || part.removed) {
            differenceText = `${differenceText}${part.value}`;
            process.stderr.write(part.value[color]);
          }
        });
        console.log();
        console.log("UPDATED HTML FOUND!!!!");
        // Alert.
        if (differenceText.includes(KEYWORD)) {
          exec(`curl -X POST -H 'Content-type: application/json' --data '{"text":"The HTML has changed at ${EXTERNAL_URL}. They keyword ${KEYWORD} exists in it, check it out now! @here\n\n\n\`\`\`${differenceText}\`\`\`"}' ${SLACK_WEBHOOK_URL}`);
        } else {
          exec(`curl -X POST -H 'Content-type: application/json' --data '{"text":"The HTML has changed at ${EXTERNAL_URL}.\n\n\n\`\`\`${differenceText}\`\`\`"}' ${SLACK_WEBHOOK_URL}`);
        }
        oldHTML = newHTML;
        return;
      }

      console.log(`No changes, will repeat request in ${REQUEST_EVERY_MS}`)
    }
  );
};

// Execution code.
console.log("Starting up...");
checkWebsite();
setInterval(checkWebsite, REQUEST_EVERY_MS);
