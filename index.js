import express from 'express';
import { createConnection } from 'mysql';
import axios from 'axios';

import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();

const connection = createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'my_movies_db'
});

connection.connect(function(err) {
  if (err) {
    console.error('Error connecting to database: ' + err.stack);
    return;
  }

  console.log('Connected to database with ID ' + connection.threadId);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));




app.use('/movies',  async (req, res) => {
  const maxPages = 50;
  const movies = [];

  for (let page = 1; page <= maxPages; page++) {
    const movieEndpoint = `https://api.themoviedb.org/3/movie/popular?page=${page}&api_key=3d6e79ce250ad232454ebce43ea754b8`;

    axios.get(movieEndpoint)
      .then(response => {
        const movieData = response.data.results.map(movie => {
          const { id, title, overview, release_date, poster_path } = movie;
          return { id, title, overview, release_date, poster_path };
        });
        movies.push(...movieData);

        if (page === maxPages) {
          res.json(movies);
        }
      })
      .catch(error => {
        console.log(error);
        res.sendStatus(500);
      });
  }
});
app.use('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reviewEndpoint = `https://api.themoviedb.org/3/movie/${id}/reviews?api_key=3d6e79ce250ad232454ebce43ea754b8`;

    const response = await axios.get(reviewEndpoint);
    const reviews = response.data.results.map(review => {
      const { author, content } = review;
      return { movie_id: id, author, content };
    });
    res.json(reviews);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});


app.post('/reviews', async (req, res) => {
  try {
    const { movie_id, author, content } = req.body;
    connection.query(
      'INSERT INTO reviews (movie_id, author, content) VALUES (?, ?, ?)',
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


app.post('/login', (req, res) => {
  const { email, password } = req.body;


  connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }

    if (results.length === 0) {
      res.status(401).json({ message: 'Email or password is incorrect' });
      return;
    }

    const user = results[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
        return;
      }

      if (!isMatch) {
        res.status(401).json({ message: 'Email or password is incorrect' });
        return;
      }

      const token = jwt.sign({ id: user.id }, 'secret', { expiresIn: '1d' });
      res.json({ token });
    });
  });
});

app.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }

    if (results.length > 0) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }

    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
        return;
      }

      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: 'Internal server error' });
          return;
        }

        connection.query('INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())', [name, email, hash], (err, results) => {
          if (err) {
            console.log(err);
            res.status(500).json({ message: 'Internal server error' });
            return;
          }

    
          const token = jwt.sign({ id: results.insertId }, 'secret', { expiresIn: '1d' });
          res.json({ token });
        });
      });
    });
  });
});


app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
