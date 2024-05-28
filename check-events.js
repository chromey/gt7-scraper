const fs = require("fs");
const args = require("minimist")(process.argv.slice(2));

if (!args.start || !args.end) {
  console.log("Usage: node check-events.js --start=1 --end=10000");
  process.exit(1);
}
crawl(+args.start, +args.end);
async function crawl(start, end) {
  // (Re-)create the events.txt file
  fs.writeFileSync("events.txt", "");
  const timeTrials = await getTimeTrials();
  for (let i = start; i <= end; i++) {
    if (i % 25 === 0) {
      console.log(`Checking event ${i}...`);
    }
    if (timeTrials.includes(i)) {
      console.log(`Event ${i} is a time trial, skipping`);
      continue;
    }
    // make sure i is a 4-digit number
    i = i.toString().padStart(4, "0");
    const res = await fetch(
      `https://static.gt7.game.gran-turismo.com/event/params/${i}.json`
    );
    if (res.status === 429) {
      const waitSeconds = res.headers.get("x-ratelimit-reset");
      console.log(
        `\nRate limit exceeded at event number ${i}, have to wait for ${waitSeconds} seconds`
      );
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      i++;
    } else if (res.status === 200) {
      const event = await res.json();
      const board_id = event.result.online.ranking_id;
      const firstPage = await fetch(
        "https://web-api.gt7.game.gran-turismo.com/ranking/get_list_by_page",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board_id, page: 0 }),
        }
      );
      const json = await firstPage.json();
      if (json?.result?.list?.length) {
        console.log(`Event ${i} found`);
        fs.appendFileSync("events.txt", `${i}\n`);
      }
    }
  }
  console.log("Done");
}

function getTimeTrials() {
  return fetch("https://web-api.gt7.game.gran-turismo.com/event/get_folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region_id: 2, folder_id: 249 }),
  })
    .then((res) => res.json())
    .then((json) => json.result.map((event) => event.event_id));
}
