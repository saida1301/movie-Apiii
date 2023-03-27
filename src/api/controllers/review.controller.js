 const getReviews  = async (req, res) => {
    const { id } = req.params;
    const reviewEndpoint = `https://api.themoviedb.org/3/movie/${id}/reviews?api_key=3d6e79ce250ad232454ebce43ea754b8`;
  
    axios.get(reviewEndpoint)
      .then(response => {
        const reviews = response.data.results.map(review => {
          const { author, content } = review;
          return { movie_id: id, author, content };
        });
        res.json(reviews);
      })
      .catch(error => {
        console.log(error);
        res.sendStatus(500);
      });
  }
 const createReview = async (req, res) => {
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
}

module.exports = {
  getReviews,
  createReview
};