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

//Please note the app argument you're passing here. This ensures that Express is available in your “auth.js” file as well.
let auth = require("./auth")(app);
const passport = require("passport");
require("./passport");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Welcome to movies_API");
});

//GET all movies
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.find()
      .then((movies) => res.status(200).send(movies))
      .catch((err) => console.error(err));
  }
);

//GET a single movie
app.get(
  "/movies/:movieTitle",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.movieTitle })
      .then((movie) => {
        res.status(200).send(movie);
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send("Movie cant be found!");
      });
  }
);

//GET genre by name
app.get(
  "/movies/genre/:genreName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { genreName } = req.params;
    const genre = genreName;
    Movies.findOne({ "Genre.Name": genreName })
      .then(({ Genre: genre }) => {
        res.status(200).send(genre);
      })
      .catch((err) => {
        res.status(404).send("Genre cant be found!");
      });
  }
);

//GET director by name
app.get(
  "/movies/director/:directorName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { directorName } = req.params;

    Movies.findOne({ "Director.Name": directorName })
      .then(({ Director: director }) => {
        res.status(200).send(director);
      })
      .catch((err) => res.status(404).send("Director not found"));
  }
);

app.get("/users", (req, res) => {
  Users.find()
    .then((users) => res.status(200).send(users))
    .catch((err) => res.status(404).send("No users found"));
});

app.post(
  "/users",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { Username, Password, Email, Birthday, FavoriteMovies } = req.body;
    console.log(req.body);
    if (!Username || !Password || !Email) {
      return res.status(400).send("User details required");
    }

    Users.findOne({ Username: Username }).then((user) => {
      if (user) {
        return res.status(400).send(`${Username} already exists`);
      } else {
        const newUser = {
          Username: Username,
          Password: Password,
          Email: Email,
          Birthday: new Date(Birthday) || null,
          FavoriteMovies: FavoriteMovies || [],
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
  }
);

//Allow users to update their user info (username)
app.put(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { id } = req.params;

    Users.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          Username: req.body?.Username,
          Password: req.body?.Password,
          Email: req.body?.Email,
          Birthday: req.body?.Birthday,
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
  }
);

//Allow users to add a movie to their list of favorites
app.put(
  "/users/:id/:movieId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
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
  }
);

//Allow users to remove a movie from their list of favorites
app.delete(
  "/users/:id/:movieId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
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
  }
);

//Allow existing users to deregister
app.delete(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
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
  }
);

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send("Something went wrong");
});

app.listen(8080, (req, res) => {
  console.log("listening on 8080");
});
