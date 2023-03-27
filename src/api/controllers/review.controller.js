export const getReviews  = async (req, res) => {
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