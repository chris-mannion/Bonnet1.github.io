const fs = require("node:fs/promises");
const path = require("node:path");

const MOVIE_SEED = [
  { title: "Bluey: The Sign", year: 2024, rating: "G", streaming: "Disney+" },
  { title: "The Lego Movie", year: 2014, rating: "PG", streaming: "Max" },
  { title: "Encanto", year: 2021, rating: "PG", streaming: "Disney+" },
  { title: "Finding Nemo", year: 2003, rating: "G", streaming: "Disney+" },
  { title: "The Peanuts Movie", year: 2015, rating: "G", streaming: "Disney+" },
  { title: "Paddington", year: 2014, rating: "PG", streaming: "Hulu" },
  { title: "Paddington 2", year: 2017, rating: "PG", streaming: "Max" },
  { title: "Moana", year: 2016, rating: "PG", streaming: "Disney+" },
  { title: "Toy Story", year: 1995, rating: "G", streaming: "Disney+" },
  { title: "Toy Story 2", year: 1999, rating: "G", streaming: "Disney+" },
  { title: "Toy Story 3", year: 2010, rating: "G", streaming: "Disney+" },
  { title: "Toy Story 4", year: 2019, rating: "G", streaming: "Disney+" },
  { title: "Cars", year: 2006, rating: "G", streaming: "Disney+" },
  { title: "Cars 2", year: 2011, rating: "G", streaming: "Disney+" },
  { title: "Cars 3", year: 2017, rating: "G", streaming: "Disney+" },
  { title: "The Mitchells vs. the Machines", year: 2021, rating: "PG", streaming: "Netflix" },
  { title: "Sing", year: 2016, rating: "PG", streaming: "Peacock" },
  { title: "Sing 2", year: 2021, rating: "PG", streaming: "Peacock" },
  { title: "Klaus", year: 2019, rating: "PG", streaming: "Netflix" },
  { title: "A Bug's Life", year: 1998, rating: "G", streaming: "Disney+" },
  { title: "Ratatouille", year: 2007, rating: "G", streaming: "Disney+" },
  { title: "The Incredibles", year: 2004, rating: "PG", streaming: "Disney+" },
  { title: "Turning Red", year: 2022, rating: "PG", streaming: "Disney+" },
  { title: "Frozen", year: 2013, rating: "PG", streaming: "Disney+" },
  { title: "Frozen II", year: 2019, rating: "PG", streaming: "Disney+" },
  { title: "The Super Mario Bros. Movie", year: 2023, rating: "PG", streaming: "Peacock" },
  { title: "Spider-Man: Into the Spider-Verse", year: 2018, rating: "PG", streaming: "Netflix" },
  { title: "Puss in Boots: The Last Wish", year: 2022, rating: "PG", streaming: "Peacock" },
  { title: "The Many Adventures of Winnie the Pooh", year: 1977, rating: "G", streaming: "Disney+" },
  { title: "The Secret Life of Pets", year: 2016, rating: "PG", streaming: "Peacock" },
];

const PROXY_BASE = process.env.TMDB_PROXY_URL || "http://127.0.0.1:8787/tmdb";
const OUTPUT_PATH = path.join(__dirname, "../data/movies.json");

const formatRuntime = (minutes) => {
  if (!minutes || Number.isNaN(Number(minutes))) {
    return "";
  }
  const total = Number(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const buildUrl = (endpoint, params) => {
  const url = new URL(`${PROXY_BASE}${endpoint}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url;
};

const fetchJson = async (endpoint, params) => {
  const response = await fetch(buildUrl(endpoint, params));
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${endpoint}`);
  }
  return response.json();
};

const enrichMovie = async (movie) => {
  const search = await fetchJson("/search/movie", {
    query: movie.title,
    year: movie.year,
    include_adult: "false",
  });

  const result = search.results && search.results[0];
  if (!result) {
    return { ...movie };
  }

  const details = await fetchJson(`/movie/${result.id}`, { language: "en-US" });
  const poster = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : "";
  const score = Number(details.vote_average || result.vote_average || 0);

  return {
    ...movie,
    runtime: formatRuntime(details.runtime) || movie.runtime || "",
    score: Number(score.toFixed(1)) || 0,
    poster: poster || movie.poster || "",
  };
};

const run = async () => {
  const results = [];

  for (const movie of MOVIE_SEED) {
    try {
      const enriched = await enrichMovie(movie);
      results.push(enriched);
      console.log(`Fetched: ${movie.title}`);
    } catch (error) {
      console.error(`Failed: ${movie.title} (${error.message})`);
      results.push({ ...movie });
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} movies to ${OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error("Fetch failed", error);
  process.exit(1);
});
