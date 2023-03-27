export const getMovies = async (req, res) => {
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
}