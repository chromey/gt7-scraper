const { writeToString } = require("@fast-csv/format");
const { Workbook, Worksheet } = require("exceljs");
const { promises } = require("fs");

exports.writeToOutputFile = async function (allPages, outputFile) {
  const members = require("./leaderboard-members.json");
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
    if (!page.payload?.list) {
      continue;
    }
    for (const entry of page.payload.list) {
      const row = worksheet.getRow(i++);
      row.values = {
        rank: entry.position,
        drivers_name: entry.player.nickname,
        drivers_online_id: entry.player.onlineId,
        drivers_name_url: members.find((m) => m.nickName === entry.player.nickname)?.profileUrl || "",
        drivers_time: entry.timeMS / 86400000,
        drivers_DR: entry.player.DR,
        drivers_SR: entry.player.SR,
        drivers_country: entry.player.countryCode,
        car: entry.car.brand + " " + entry.car.name,
      };

      row.getCell("drivers_time").numFmt = "mm:ss.000";
    }
  }
  workbook.xlsx.writeFile(outputFile);
};
