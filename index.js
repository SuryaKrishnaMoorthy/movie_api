const express = require("express"),
  morgan = require("morgan"),
  fs = require("fs"),
  path = require("path"),
  { v4: uuidv4 } = require("uuid"),
  mongoose = require("mongoose"),
  bodyParser = require("body-parser");

const Models = require("./models");
const topMovies = require("./data/movies.json");

let users = require("./data/users.json");

const Movies = Models.Movie;
const Users = Models.User;

mongoose.connect("mongodb://localhost:27017/FlicksDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("common"));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Welcome to movies_API");
});

//GET all movies
app.get("/movies", (req, res) => {
  Movies.find()
    .then((movies) => res.status(200).send(movies))
    .catch((err) => console.error(err));
});

//GET a single movie
app.get("/movies/:movieTitle", (req, res) => {
  Movies.findOne({ Title: req.params.movieTitle })
    .then((movie) => {
      res.status(200).send(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(404).send("Movie cant be found!");
    });
});

//GET genre by name
app.get("/movies/genre/:genreName", (req, res) => {
  const { genreName } = req.params;
  const genre = genreName;
  Movies.findOne({ "Genre.Name": genreName })
    .then(({ Genre: genre }) => {
      res.status(200).send(genre);
    })
    .catch((err) => {
      res.status(404).send("Genre cant be found!");
    });
});

//GET director by name
app.get("/movies/director/:directorName", (req, res) => {
  const { directorName } = req.params;

  Movies.findOne({ "Director.Name": directorName })
    .then(({ Director: director }) => {
      res.status(200).send(director);
    })
    .catch((err) => res.status(404).send("Director not found"));
});

app.get("/users", (req, res) => {
  Users.find()
    .then((users) => res.status(200).send(users))
    .catch((err) => res.status(404).send("No users found"));
});

app.post("/users", (req, res) => {
  const { username, password, email, birthday, favoriteMovies } = req.body;
  if (!username || !password || !email) {
    return res.status(400).send("User details required");
  }

  Users.findOne({ Username: username }).then((user) => {
    if (user) {
      return res.status(400).send(`${username} already exists`);
    } else {
      const newUser = {
        Username: username,
        Password: password,
        Email: email,
        Birthday: new Date(birthday) || null,
        FavoriteMovies: favoriteMovies || [],
      };
      Users.create(newUser)
        .then((user) => {
          res.status(201).json(user);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).send("Error: " + error);
        });
    }
  });
});

//Allow users to update their user info (username)
app.put("/users/:id", (req, res) => {
  const { id } = req.params;

  Users.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        Username: req.body?.username,
        Password: req.body?.password,
        Email: req.body?.email,
        Birthday: req.body?.birthday,
      },
    },
    { new: true }
  )
    .then((updatedUser) => {
      res.status(200).json(updatedUser);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error: " + err);
    });
});

//Allow users to add a movie to their list of favorites
app.put("/users/:id/:movieId", (req, res) => {
  const { id, movieId } = req.params;
  const updatedUser = req.body;

  // Check if movie exists in the db
  Movies.findOne({ _id: movieId })
    .then((movie) => {
      if (!movie) {
        return res.status(400).send("Movie not found");
      }
      //Update the user
      Users.findOneAndUpdate(
        { _id: id },
        { $push: { FavoriteMovies: movie._id } },
        { new: true }
      )
        .then((updatedUser) => {
          res
            .status(200)
            .send(
              `${movie.Title} has been added to user ${updatedUser.Username}'s favorites`
            );
        })
        .catch((err) => {
          console.log(err);
          res.status(500).send("Error: " + err.message);
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error: " + err.message);
    });
});

//Allow users to remove a movie from their list of favorites
app.delete("/users/:id/:movieId", (req, res) => {
  const { id, movieId } = req.params;

  Users.findOneAndUpdate(
    { _id: id },
    {
      $pull: { FavoriteMovies: movieId },
    },
    { new: true }
  )
    .then((updatedUser) => {
      res
        .status(200)
        .send(
          `${movieId} has been removed from user ${updatedUser.Username}'s favorites`
        );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error: " + err.message);
    });
});

//Allow existing users to deregister
app.delete("/users/:id", (req, res) => {
  const { id } = req.params;

  Users.findOneAndDelete({ _id: id })
    .then((deletedUser) => {
      res
        .status(200)
        .send(`User ${deletedUser.Username} has been deregistered`);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error: " + err.message);
    });
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send("Something went wrong");
});

app.listen(8080, (req, res) => {
  console.log("listening on 8080");
});
