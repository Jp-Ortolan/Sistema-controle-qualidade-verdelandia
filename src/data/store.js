const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "database.json");

function readDatabase() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDatabase(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  readDatabase,
  writeDatabase,
};
