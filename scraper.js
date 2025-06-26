const args = require("minimist")(process.argv.slice(2));
const { range } = require("lodash");
const pLimit = require("p-limit");
const { writeToOutputFile } = require("./report");

if (!args.event) {
  console.log(
    "Usage: node scraper.js --event={eventNumber} --outputFile={outputFile}"
  );
  return;
} else {
  scrapeEvent(args.event, args.outputFile);
}

async function scrapeEvent(
  eventNumber,
  outputFile = `event_${eventNumber}.xlsx`
) {
  const allPages = await fetchAllPages(eventNumber);
  await writeToOutputFile(allPages, outputFile);
  console.log("Done");
}

async function fetchAllPages(eventNumber) {
  const params = await fetch(
    `https://web-api.gt7.game.gran-turismo.com/event/get_parameter`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: +eventNumber }),
    }
  ).then((response) => response.json());

  const board_id = params.result.online.ranking_id;
  const firstPage = await getPage(board_id, 0);
  const totalPages = firstPage.result.total;
  const now = new Date();
  const limit = pLimit(1);
  let count = 0;
  const remainingPages = await Promise.all(
    range(1, totalPages).map((pageNumber) =>
      limit(() =>
        getPage(board_id, pageNumber).then((page) => {
          count++;
          process.stdout.write(
            `Fetching pages: ${Math.floor(
              (count / (totalPages - 1)) * 100
            )}% \r`
          );
          return page;
        })
      )
    )
  );
  console.log("\nAll pages fetched in ", (new Date() - now) / 1000, "s");
  return [firstPage, ...remainingPages];
}

function getPage(board_id, page) {
  return fetch(
    "https://web-api.gt7.game.gran-turismo.com/ranking/get_list_by_page",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id, page }),
    }
  ).then((res) => {
    const status = res.status;
    if (status === 429) {
      const waitSeconds = res.headers.get("x-ratelimit-reset");
      console.log(
        `\nRate limit exceeded, have to wait for ${waitSeconds} seconds`
      );
      return new Promise((resolve) =>
        setTimeout(resolve, waitSeconds * 1000)
      ).then(() => getPage(board_id, page));
    }
    const json = res.json();
    return json;
  });
}
