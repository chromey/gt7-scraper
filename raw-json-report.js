const { promises } = require("fs");

exports.writeRawJson = async function (allPages, eventNumber) {
  await promises.mkdir(`./raw/${eventNumber}`, { recursive: true });
  for (const [index, page] of allPages.entries()) {
    await promises.writeFile(
      `./raw/${eventNumber}/${index + 1}.json`,
      JSON.stringify(page, null, 2),
      "utf8"
    );
  }
};
