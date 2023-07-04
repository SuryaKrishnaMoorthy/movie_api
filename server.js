const http = require("http"),
  url = require("url"),
  fs = require("fs");

http
  .createServer(function (req, res) {
    let reqUrl = req.url,
      parsedUrl = url.parse(reqUrl, true),
      filePath = "";

    if (parsedUrl.pathname.includes("documentation")) {
      filePath = __dirname + "/documentation.html";
    } else {
      filePath = "index.html";
    }

    const singleReqDetails = `URL: ${reqUrl}, \nTimestamp: ${new Date()}\n\n`;

    fs.appendFile("log.txt", singleReqDetails, (err, data) => {
      if (err) throw err;
      else console.log("Added to log.txt");
    });

    fs.readFile(filePath, "utf8", function (err, data) {
      if (err) throw err;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(data);
      res.end();
    });
  })
  .listen(8080);

console.log("Listening to port 8080..");
