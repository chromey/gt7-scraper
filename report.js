const { writeToString } = require("@fast-csv/format");
const { Workbook, Worksheet } = require("exceljs");
const { promises } = require("fs");

exports.writeToOutputFile = async function (allPages, outputFile) {
  console.log(`Writing to file ${outputFile}`);
  await promises.unlink(outputFile).catch(() => {});
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");
  let cars = {};
  try {
    cars = require("./cars.json");
  } catch (e) {
    console.log("No cars.json found, skipping car name lookup");
  }
  worksheet.columns = [
    ["rank", 10],
    ["drivers_name", 20],
    ["drivers_online_id", 20],
    ["drivers_name_url", 80],
    ["drivers_time", 10],
    ["drivers_DR", 10],
    ["drivers_SR", 10],
    ["drivers_country", 10],
    ["car", 30],
  ].map(([header, width]) => ({ header, key: header, width }));

  worksheet.getRow(1).font = { bold: true };
  let i = 2;
  for (const page of allPages) {
    if (!page.result?.list) {
      continue;
    }
    for (const entry of page.result.list) {
      const row = worksheet.getRow(i++);
      row.values = {
        rank: entry.display_rank,
        drivers_name: entry.user.nick_name,
        drivers_online_id: entry.user.np_online_id,
        drivers_name_url: `https://www.gran-turismo.com/gb/gt7/user/mymenu/${entry.user.user_id}/profile`,
        drivers_time: entry.score / 86400000,
        drivers_DR: ["E", "D", "C", "B", "A", "A+", "S"][
          entry.user.driver_rating - 1
        ],
        drivers_SR: ["E", "D", "C", "B", "A", "S"][
          entry.user.sportsmanship_rating - 1
        ],
        drivers_country: entry.user.country_code,
        car: cars[entry.ranking_stats.car_code] || entry.ranking_stats.car_code,
      };

      row.getCell("drivers_time").numFmt = "mm:ss.000";
    }
  }
  workbook.xlsx.writeFile(outputFile);
};
