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
  database: "my_movies_db",
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
  const maxPages = 50;
  const movies = [];

  for (let page = 1; page <= maxPages; page++) {
    const movieEndpoint = `https://api.themoviedb.org/3/movie/popular?page=${page}&api_key=3d6e79ce250ad232454ebce43ea754b8`;

    axios
      .get(movieEndpoint)
      .then((response) => {
        const movieData = response.data.results.map((movie) => {
          const { id, title, overview, release_date, poster_path } = movie;
          return { id, title, overview, release_date, poster_path };
        });
        movies.push(...movieData);

        if (page === maxPages) {
          res.json(movies);
        }
      })
      .catch((error) => {
        console.log(error);
        res.sendStatus(500);
      });
  }
});
app.use("/reviews/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const reviewEndpoint = `https://api.themoviedb.org/3/movie/${id}/reviews?api_key=3d6e79ce250ad232454ebce43ea754b8`;

    const response = await axios.get(reviewEndpoint);
    const reviews = response.data.results.map((review) => {
      const { author, content } = review;
      return { movie_id: id, author, content };
    });
    res.json(reviews);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/reviews", async (req, res) => {
  try {
    const { movie_id, author, content } = req.body;
    connection.query(
      "INSERT INTO my_reviews (movie_id, author, content) VALUES (?, ?, ?)",
      [movie_id, author, content],
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
            "INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())",
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
    "SELECT * FROM my_reviews WHERE movie_id = ? LIMIT ? OFFSET ?",
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
    "SELECT * FROM my_reviews INNER JOIN users ON my_reviews.author = users.name WHERE users.name = ?",
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

app.put('/review/:id', (req, res) => {
    const reviewId = req.params.id;
    const { content } = req.body;

    connection.query('UPDATE my_reviews SET content = ? WHERE id = ?', [content, reviewId], (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error updating review');
        } else {
            res.send('Review updated successfully');
        }
    });
});

app.delete('/review/:id', (req, res) => {
    const reviewId = req.params.id;

    connection.query('DELETE FROM my_reviews WHERE id = ?', [reviewId], (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error deleting review');
        } else {
            res.send('Review deleted successfully');
        }
    });
});

app.post('/favorites', (req, res) => {
  const { movie_id, user_id } = req.body;

  const sql = `INSERT INTO favorites (user_id, movie_id) VALUES (${user_id}, ${movie_id})`;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error adding movie to favorites');
    }

    return res.send('Movie added to favorites');
  });
});

app.get('/favorites/:userId', (req, res) => {
  const { userId } = req.params;

  const sql = `SELECT * FROM my_movies WHERE id IN (SELECT movie_id FROM favorites WHERE user_id = ${userId})`;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error retrieving favorites');
    }

    return res.json(results);
  });
});

app.delete('/favorites/:userId/:movieId', (req, res) => {
  const { userId, movieId } = req.params;

  const sql = `DELETE FROM favorites WHERE user_id = ${userId} AND movie_id = ${movieId}`;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error removing from favorites');
    }

    return res.status(200).send('Movie removed from favorites');
  });
});



app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
