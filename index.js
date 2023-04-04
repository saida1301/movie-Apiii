import express from "express";
import { createConnection } from "mysql";
import axios from "axios";
import passport from "passport";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();

const connection = createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "movieapp",
});

connection.connect(function (err) {
  if (err) {
    console.error("Error connecting to database: " + err.stack);
    return;
  }

  console.log("Connected to database with ID " + connection.threadId);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use("/movies", async (req, res) => {
  try {
    connection.query("SELECT * FROM movies", (error, results, fields) => {
      if (error) throw error;
      res.json(results);
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.use("/movies/best", async (req, res) => {
  try {
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    connection.query(
      "SELECT * FROM movies WHERE YEAR(release_date) = ? AND MONTH(release_date) = ? ORDER BY vote_average DESC LIMIT 10",
      [year, month],
      (error, results, fields) => {
        if (error) throw error;
        res.json(results);
      }
    );
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.use("/reviews/:id", async (req, res) => {
  try {
    const { id } = req.params;

    connection.query(
      "SELECT * FROM reviews WHERE movie_id = ?",
      [id],
      (error, results, fields) => {
        if (error) throw error;
        res.json(results);
      }
    );
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/reviews", async (req, res) => {
  try {
    const { movie_id, author, content, movie_title  } = req.body;
    connection.query(
      "INSERT INTO reviews (movie_id, author, content, movie_title) VALUES (?, ?, ?, ?)",
      [movie_id, author, content, movie_title],
      (error, results, fields) => {
        if (error) throw error;
        console.log(`Review ${results.insertId} added`);
        res.sendStatus(201);
      }
    );
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
        return;
      }

      if (results.length === 0) {
        res.status(401).json({ message: "Email or password is incorrect" });
        return;
      }

      const user = results[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Internal server error" });
          return;
        }

        if (!isMatch) {
          res.status(401).json({ message: "Email or password is incorrect" });
          return;
        }

        const token = jwt.sign({ id: user.id }, "secret", { expiresIn: "1h" });
        res.json({ token });
      });
    }
  );
});



app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
        return;
      }

      if (results.length > 0) {
        res.status(400).json({ message: "Email already in use" });
        return;
      }

      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Internal server error" });
          return;
        }

        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            console.log(err);
            res.status(500).json({ message: "Internal server error" });
            return;
          }

          connection.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hash],
            (err, results) => {
              if (err) {
                console.log(err);
                res.status(500).json({ message: "Internal server error" });
                return;
              }

              const token = jwt.sign({ id: results.insertId }, "secret", {
                expiresIn: "1h",
              });
              res.json({ token });
            }
          );
        });
      });
    }
  );
});
app.get("/reviews/:movie_id", (req, res) => {
  const movie_id = req.params?.movie_id;
  const page = parseInt(req.query.page || "1", 25);
  const limit = parseInt(req.query.limit || "25", 25);
  const offset = (page - 1) * limit;
  console.log(
    "movie_id:",
    movie_id,
    "page:",
    page,
    "limit:",
    limit,
    "offset:",
    offset
  );
  connection.query(
    "SELECT * FROM reviews WHERE movie_id = ? LIMIT ? OFFSET ?",
    [movie_id, limit, offset],
    (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send("Internal server error");
      } else {
        res.json(results);
      }
    }
  );
});

app.get("/user/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = "SELECT * FROM users WHERE id = ?";
  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error retrieving user: " + err.stack);
      res.status(500).send("Error retrieving user");
      return;
    }

    if (results.length === 0) {
      res.status(404).send("User not found");
      return;
    }

    const user = results[0];
    res.send(user);
  });
});

app.get("/review/user/:userName", (req, res) => {
  const userName = req.params.userName;

  connection.query(
    "SELECT * FROM reviews INNER JOIN users ON reviews.author = users.name WHERE users.name = ?",
    [userName],
    (error, results, fields) => {
      if (error) {
        console.error(error);
        res.sendStatus(500);
        return;
      }

      res.json(results);
    }
  );
});

app.put("/review/:ids", (req, res) => {
  const ids = req.params.ids;
  const { content } = req.body;

  console.log( ids, content);

  const sql = `UPDATE reviews SET content='${content}' WHERE  ids= '${ids}'`;

  connection.query(sql, (err, result) => {
    if (err) throw err;

    console.log(`Updated ${result.affectedRows} row(s)`);
    res.send(`Updated ${result.affectedRows} row(s)`);
  });
});

app.delete("/review/:ids", (req, res) => {
  const ids = req.params.ids;

  const sql = `DELETE FROM reviews WHERE ids='${ids}'`;

  connection.query(sql, (err, result) => {
    if (err) throw err;

    console.log(`Deleted ${result.affectedRows} row(s)`);
    res.send(`Deleted ${result.affectedRows} row(s)`);
  });
});







app.post("/favorites", (req, res) => {
  const { movie_id, user_id } = req.body;

  const sql = `INSERT INTO favorites (user_id, movie_id) VALUES (${user_id}, ${movie_id})`;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Error adding movie to favorites");
    }

    return res.send("Movie added to favorites");
  });
});

app.get("/favorites/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `SELECT * FROM movies WHERE id IN (SELECT movie_id FROM favorites WHERE user_id = ${userId})`;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Error retrieving favorites");
    }

    return res.json(results);
  });
});

app.delete("/favorites/:userId/:movieId", (req, res) => {
  const { userId, movieId } = req.params;

  const sql = `DELETE FROM favorites WHERE user_id = ${userId} AND movie_id = ${movieId}`;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Error removing from favorites");
    }

    return res.status(200).send("Movie removed from favorites");
  });
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
