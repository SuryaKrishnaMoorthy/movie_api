const express = require("express"),
  morgan = require("morgan"),
  fs = require("fs"),
  path = require("path");

const topMovies = require("./data/movies.json");

const app = express();

app.use(morgan("common"));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Welcome to movies_API");
});

app.get("/movies", (req, res) => {
  res.send(topMovies);
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send("Something went wrong");
});

app.listen(8080, (req, res) => {
  console.log("listening on 8080");
});
