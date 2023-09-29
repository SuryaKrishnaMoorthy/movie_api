const express = require("express"),
  morgan = require("morgan"),
  fs = require("fs"),
  path = require("path"),
  { v4: uuidv4 } = require("uuid"),
  mongoose = require("mongoose"),
  bodyParser = require("body-parser"),
  cors = require("cors");

const { check, validationResult } = require("express-validator");

const Models = require("./models");
const topMovies = require("./data/movies.json");

let users = require("./data/users.json");

const Movies = Models.Movie;
const Users = Models.User;

// Test commit
// mongoose.connect("mongodb://localhost:27017/FlicksDB", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = express();
//
let allowedOrigins = ["http://localhost:8080/", "http://testsite.com"];

app.use(cors()); //allow all domains
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
      .catch((err) => {
        console.error(err);
        res.status(404).send("Movies cant be found!");
      });
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

//GET all Users
app.get("/users", (req, res) => {
  Users.find()
    .then((users) => res.status(200).send(users))
    .catch((err) => res.status(404).send("No users found"));
});

//GET one user
app.get(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOne({ _id: req.params.id })
      .then((user) => res.status(200).send(user))
      .catch((err) => res.status(404).send("No user found"));
  }
);

//Create a new User
app.post(
  "/users",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username should contain only alphanumeric characters"
    ).isAlphanumeric(),
    check("Password", "Password should have minLength 8 and maxLength 20")
      .not()
      .isEmpty()
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/, "i"),
    check("Email", "Email needs to be valid").isEmail(),
    check("Birthday", "Birthday has to be a date").trim().isDate(),
  ],
  (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const { Username, Password, Email, Birthday, FavoriteMovies } = req.body;
    let hashedPassword = Users.hashPassword(Password);
    // let hashedPassword = Password;
    Users.findOne({ Username: Username }).then((user) => {
      if (user) {
        return res.status(400).send(`${Username} already exists`);
      } else {
        const newUser = {
          Username: Username,
          Password: hashedPassword,
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
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username should contain only alphanumeric characters"
    ).isAlphanumeric(),
    check("Password", "Password should have minLength 8 and maxLength 20")
      .not()
      .isEmpty()
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/, "i"),
    check("Email", "Email needs to be valid").isEmail(),
    check("Birthday", "Birthday has to be a date").trim().isDate(),
  ],
  (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const { id } = req.params;
    let hashedPassword = Users.hashPassword(req.body?.Password);
    Users.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          Username: req.body?.Username,
          Password: hashedPassword,
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

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", (req, res) => {
  console.log("listening on port " + port);
});
