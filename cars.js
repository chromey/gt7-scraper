const { chain } = require("lodash");
const fs = require("fs");

fetchCars();

// Function to fetch the JavaScript file from the server
async function fetchCars() {
  // Fetch the JavaScript file from the server
  const response = await fetch(
    "https://www.gran-turismo.com/common/dist/gt7/companion/localize16.js"
  ).then((res) => res.text());
  const cars = chain(parseCars(response))
    .mapKeys((_val, key) => +key.substring(4))
    .mapValues((val) => val.name)
    .value();
  // write to json
  fs.writeFileSync("cars.json", JSON.stringify(cars, null, 2));
}

function parseCars(response) {
  // Use a regular expression to extract the object literal
  const regex = /cars:(.*?}})/s;
  const match = regex.exec(response);
  if (match) {
    const objectLiteralString = match[1].trim();

    try {
      const cars = eval(`(${objectLiteralString})`);
      return cars;
    } catch (error) {
      console.error("Error evaluating the object literal:", error);
    }
  }

  return null; // Return null if no object literal is found
}
