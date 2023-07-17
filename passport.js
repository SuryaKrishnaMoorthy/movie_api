const passport = require("passport"),
  LocalStrategy = require("passport-local").Strategy,
  Models = require("./models"),
  passportJWT = require("passport-jwt");

let Users = Models.User,
  JWTStrategy = passportJWT.Strategy,
  ExtractJWT = passportJWT.ExtractJwt;

/** “LocalStrategy,” defines your basic HTTP authentication for login requests. */
passport.use(
  new LocalStrategy(
    {
      usernameField: "Username",
      passwordField: "Password",
    },
    (username, password, callback) => {
      console.log(username, password);
      Users.findOne({ Username: username })
        .then((user) => {
          console.log(user);
          if (!user) {
            console.log("incorrect username");
            return callback(null, false, {
              message: "Incorrect username or password",
            });
          }

          console.log("finished");
          callback(null, user);
        })
        .catch((err) => callback(err));
    }
  )
);

/**“JWTStrategy”, it allows you to authenticate users based on the JWT submitted alongside their request */
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: "netflix_inspired_secret",
    },
    (jwtPayload, callback) => {
      return Users.findById(jwtPayload._id)
        .then((user) => callback(null, user))
        .catch((err) => callback(err));
    }
  )
);
