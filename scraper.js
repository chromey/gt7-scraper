const args = require("minimist")(process.argv.slice(2));
const { range } = require("lodash");
const pLimit = require("p-limit");
const { writeToOutputFile } = require("./report");
const { writeRawJson } = require("./raw-json-report");

if (!args.event) {
  console.log(
    "Usage: node . --event={eventNumber} --outputFile={outputFile} --format={xlsx|json}",
  );
  return;
} else {
  scrapeEvents(args);
}

async function scrapeEvents(args) {
  const events = ("" + args.event).split(",");
  for (const event of events) {
    await scrapeEvent(event, args.outputFile, args.format);
  }
}

async function scrapeEvent(
  eventNumber,
  outputFile = `event_${eventNumber}.xlsx`,
  format = "xlsx",
) {
  console.log(`Scraping event ${eventNumber}`);
  const members = require("./leaderboard-members.json");
  const allPages = await fetchAllPages(eventNumber, members);
  if (format === "json") {
    await writeRawJson(allPages, eventNumber);
  } else {
    await writeToOutputFile(allPages, outputFile);
  }
  console.log("Done");
}

async function fetchAllPages(eventNumber, members) {
  const params = await getParams(eventNumber);

  const firstPage = await getPage(params.id, 1, members);
  const totalPages = firstPage.payload.pagination.total;
  const now = new Date();
  const limit = pLimit(1);
  let count = 0;
  const remainingPages = await Promise.all(
    range(2, totalPages + 1).map((pageNumber) =>
      limit(() =>
        getPage(params.id, pageNumber, members).then((page) => {
          count++;
          process.stdout.write(
            `Fetching pages: ${Math.floor((count / totalPages) * 100)}% \r`,
          );
          return page;
        }),
      ),
    ),
  );
  console.log("\nAll pages fetched in ", (new Date() - now) / 1000, "s");
  return [firstPage, ...remainingPages];
}

async function getParams(eventNumber) {
  const recentDgEventsResult = await fetch(
    "https://admin.dg-edge.com/api/b.events.retrieveEvents",
    {
      method: "POST",
      headers: {
        origin: "https://www.dg-edge.com",
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        filters: { type: "TT", trackId: "0", carType: "0", carId: "0" },
        page: 1,
      }),
    },
  );
  const recentDgEvents = await recentDgEventsResult.json();
  const params = recentDgEvents.payload.list.find(
    (e) => e.externalId === 1000000 + +eventNumber,
  );
  return params;
}

function getPlayerDetails(psnId) {
  return fetch("https://admin.dg-edge.com/api/b.players.retrievePlayer", {
    method: "POST",
    headers: {
      origin: "https://www.dg-edge.com",
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      onlineId: psnId,
    }),
  }).then((res) => res.json());
}

async function getPage(eventId, page, members) {
  const res = await fetch(
    "https://admin.dg-edge.com/api/b.events.retrieveRanking",
    {
      method: "POST",
      headers: {
        origin: "https://www.dg-edge.com",
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventId: "" + eventId,
        page,
      }),
    },
  );
  const status = res.status;
  if ([429, 403].includes(status)) {
    const waitSeconds = res.headers.get("retry-after") || 120;
    console.log(
      `\nRate limit exceeded, have to wait for ${waitSeconds} seconds`,
    );
    return new Promise((resolve) =>
      setTimeout(resolve, waitSeconds * 1000),
    ).then(() => getPage(board_id, page));
  }
  const json = await res.json();
  // debugging
  if (!json?.payload?.list?.length) {
    console.log("Empty page detected: ", page);
    console.log("HTTP status: ", status);
    console.log("Response: ", JSON.stringify(json, null, 2));
  }
  // end of debugging
  json.payload.list
    .map((e) => e.player)
    .filter((player) => members.includes(player.nickname))
    .forEach(async (player) => {
      const playerDetails = await getPlayerDetails(player.onlineId);
      player.externalId = playerDetails.payload.externalId;
      player.profileLink = playerDetails.payload.profileLink;
    });
  return json;
}
