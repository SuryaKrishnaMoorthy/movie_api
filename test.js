console.log("Hello Node!");

console.log("Goodbye.");

const os = require("os");
const fs = require("fs");

console.log("type : " + os.type());

fs.readFile("./file.txt", "utf8", function (err, data) {
  if (err) throw err;
  console.log("data: ", data);
});
