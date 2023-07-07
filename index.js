const express = require("express"),
  morgan = require("morgan"),
  fs = require("fs"),
  path = require("path"),
  { v4: uuidv4 } = require("uuid");

const topMovies = require("./data/movies.json");
let users = require("./data/users.json");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());
app.use(morgan("common"));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Welcome to movies_API");
});

//GET all movies
app.get("/movies", (req, res) => {
  res.status(200).send(topMovies);
});

//GET a single movie
app.get("", (req, res) => {
  const movie = topMovies.find((mov) => mov.title === req.params.movieTitle);

  if (movie) {
    res.status(200).send(movie);
  } else {
    res.status(404).send("Movie cant be found!");
  }
});

//GET genre by name
app.get("/movies/genre/:genreName", (req, res) => {
  const { genreName } = req.params;
  const genre = topMovies.find(
    (mov) => mov.genre.name.toLowerCase === genreName.toLowerCase
  );

  if (genre) {
    res.status(200).send(genre.genre);
  } else {
    res.status(404).send("Genre cant be found!");
  }
});

//GET director by name
app.get("/movies/director/:directorName", (req, res) => {
  const { directorName } = req.params;
  const movie = topMovies.find(
    (mov) => mov.director.name.toLowerCase() === directorName.toLowerCase()
  );

  if (movie) {
    res.status(200).send(movie.director);
  } else {
    res.status(404).send("Director cant be found!");
  }
});

app.get("/users", (req, res) => {
  res.status(200).send(users);
});

app.post("/users", (req, res) => {
  if (!req.body.name) {
    res.status(400).send("User details required");
  } else {
    const newUser = {
      id: uuidv4(),
      name: req.body.name,
      favoriteMovies: req.body.favoriteMovies || [],
    };
    users.push(newUser);
    res.status(201).send(newUser);
  }
});

//Allow users to update their user info (username)
app.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const updatedUser = req.body;

  let user = users.find((user) => user.id == id);

  if (!user) {
    res.status(400).send("User not found");
  } else {
    user.name = updatedUser.name;
    res.status(200).send(user);
  }
});

//Allow users to add a movie to their list of favorites
app.put("/users/:id/:movieId", (req, res) => {
  const { id, movieId } = req.params;
  const updatedUser = req.body;

  let user = users.find((user) => user.id === id);
  let movie = topMovies.find((movie) => movie.id === movieId);

  if (!user) {
    res.status(400).send("User not found");
  } else if (!movie) {
    res.status(400).send("Movie not found");
  } else {
    user.favoriteMovies.push(movie.title);
    res
      .status(200)
      .send(`${movie.title} has been added to user ${id}'s favorites`);
  }
});

//Allow users to remove a movie from their list of favorites
app.delete("/users/:id/:movieId", (req, res) => {
  const { id, movieId } = req.params;

  let user = users.find((user) => user.id === id);
  let movie = topMovies.find((movie) => movie.id === movieId);

  if (!user) {
    res.status(400).send("User not found");
  } else if (!movie) {
    res.status(400).send("Movie not found");
  } else {
    user.favoriteMovies = user.favoriteMovies.filter(
      (item) => item !== movie.title
    );

    res
      .status(200)
      .send(`${movie.title} has been removed from user ${id}'s favorites`);
  }
});

//Allow existing users to deregister
app.delete("/users/:id", (req, res) => {
  const { id } = req.params;

  let user = users.find((user) => user.id === id);

  if (!user) {
    res.status(400).send("User not found");
  } else {
    users = users.filter((user) => user.id !== id);
    res.status(200).send(`User ${id} has been deregistered`);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send("Something went wrong");
});

app.listen(8080, (req, res) => {
  console.log("listening on 8080");
});
