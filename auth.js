const jwtSecret = "netflix_inspired_secret";

const jwt = require("jsonwebtoken"),
  passport = require("passport");

require("./passport");

const generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username,
    expiresIn: "7d",
    algorithm: "HS256",
  });
};

/**
 * @module loginUserModule
 * @description Module exporting a function that sets up user login handling for a given Express router.
 * @param {express.Router} router - The Express router to handle user login.
 */
module.exports = (router) => {
  /**
   * @function loginUserHandler
   * @description Middleware for handling user login.
   * @param {express.Request} req - The Express request object.
   * @param {express.Response} res - The Express response object.
   */
  router.post("/login", (req, res) => {
    /**
     * @function passportLocalAuth
     * @description Passport authentication for local strategy.
     * @param {Error} error - Passport authentication error.
     * @param {Object} user - Authenticated user object.
     * @param {Object} info - Additional information.
     */
    passport.authenticate("local", { session: false }, (error, user, info) => {
      if (error || !user) {
        return res
          .status(400)
          .json({ message: "Something is not right!", user: user });
      }

      /**
       * @function loginUserAndGenerateToken
       * @description Logs in the user and generates a JWT token.
       * @param {Error} error - Error during user login.
       */
      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }

        /* Generate JWT token for the authenticated user.*/
        let token = generateJWTToken(user.toJSON());

        /** Respond with user information and token.*/
        return res.json({ user, token });
      });
    })(req, res);
  });
};
