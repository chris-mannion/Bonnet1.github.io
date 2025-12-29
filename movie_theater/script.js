const MOVIES = [
  {
    title: "Bluey: The Sign",
    year: 2024,
    runtime: "28 min",
    rating: "G",
    score: 8.4,
    streaming: "Disney+",
  },
  {
    title: "The Lego Movie",
    year: 2014,
    runtime: "1h 40m",
    rating: "PG",
    score: 7.7,
    streaming: "Max",
  },
  {
    title: "Encanto",
    year: 2021,
    runtime: "1h 42m",
    rating: "PG",
    score: 7.3,
    streaming: "Disney+",
  },
  {
    title: "Finding Nemo",
    year: 2003,
    runtime: "1h 40m",
    rating: "G",
    score: 8.2,
    streaming: "Disney+",
  },
  {
    title: "The Peanuts Movie",
    year: 2015,
    runtime: "1h 28m",
    rating: "G",
    score: 7.0,
    streaming: "Disney+",
  },
  {
    title: "Paddington",
    year: 2014,
    runtime: "1h 36m",
    rating: "PG",
    score: 7.3,
    streaming: "Hulu",
  },
  {
    title: "Paddington 2",
    year: 2017,
    runtime: "1h 43m",
    rating: "PG",
    score: 7.8,
    streaming: "Max",
  },
  {
    title: "Moana",
    year: 2016,
    runtime: "1h 47m",
    rating: "PG",
    score: 7.6,
    streaming: "Disney+",
  },
  {
    title: "Toy Story",
    year: 1995,
    runtime: "1h 21m",
    rating: "G",
    score: 8.3,
    streaming: "Disney+",
  },
  {
    title: "Toy Story 2",
    year: 1999,
    runtime: "1h 32m",
    rating: "G",
    score: 7.9,
    streaming: "Disney+",
  },
  {
    title: "Toy Story 3",
    year: 2010,
    runtime: "1h 43m",
    rating: "G",
    score: 8.2,
    streaming: "Disney+",
  },
  {
    title: "Toy Story 4",
    year: 2019,
    runtime: "1h 40m",
    rating: "G",
    score: 7.7,
    streaming: "Disney+",
  },
  {
    title: "Cars",
    year: 2006,
    runtime: "1h 57m",
    rating: "G",
    score: 7.2,
    streaming: "Disney+",
  },
  {
    title: "Cars 2",
    year: 2011,
    runtime: "1h 46m",
    rating: "G",
    score: 6.1,
    streaming: "Disney+",
  },
  {
    title: "Cars 3",
    year: 2017,
    runtime: "1h 42m",
    rating: "G",
    score: 6.7,
    streaming: "Disney+",
  },
  {
    title: "The Mitchells vs. the Machines",
    year: 2021,
    runtime: "1h 54m",
    rating: "PG",
    score: 7.6,
    streaming: "Netflix",
  },
  {
    title: "Sing",
    year: 2016,
    runtime: "1h 48m",
    rating: "PG",
    score: 7.1,
    streaming: "Peacock",
  },
  {
    title: "Sing 2",
    year: 2021,
    runtime: "1h 50m",
    rating: "PG",
    score: 7.4,
    streaming: "Peacock",
  },
  {
    title: "Klaus",
    year: 2019,
    runtime: "1h 38m",
    rating: "PG",
    score: 8.2,
    streaming: "Netflix",
  },
  {
    title: "A Bug's Life",
    year: 1998,
    runtime: "1h 35m",
    rating: "G",
    score: 7.2,
    streaming: "Disney+",
  },
  {
    title: "Ratatouille",
    year: 2007,
    runtime: "1h 51m",
    rating: "G",
    score: 8.1,
    streaming: "Disney+",
  },
  {
    title: "The Incredibles",
    year: 2004,
    runtime: "1h 55m",
    rating: "PG",
    score: 8.0,
    streaming: "Disney+",
  },
  {
    title: "Turning Red",
    year: 2022,
    runtime: "1h 40m",
    rating: "PG",
    score: 7.0,
    streaming: "Disney+",
  },
  {
    title: "Frozen",
    year: 2013,
    runtime: "1h 42m",
    rating: "PG",
    score: 7.4,
    streaming: "Disney+",
  },
  {
    title: "Frozen II",
    year: 2019,
    runtime: "1h 43m",
    rating: "PG",
    score: 6.8,
    streaming: "Disney+",
  },
  {
    title: "The Super Mario Bros. Movie",
    year: 2023,
    runtime: "1h 32m",
    rating: "PG",
    score: 7.0,
    streaming: "Peacock",
  },
  {
    title: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    runtime: "1h 57m",
    rating: "PG",
    score: 8.4,
    streaming: "Netflix",
  },
  {
    title: "Puss in Boots: The Last Wish",
    year: 2022,
    runtime: "1h 42m",
    rating: "PG",
    score: 7.8,
    streaming: "Peacock",
  },
  {
    title: "The Many Adventures of Winnie the Pooh",
    year: 1977,
    runtime: "1h 14m",
    rating: "G",
    score: 7.5,
    streaming: "Disney+",
  },
  {
    title: "The Secret Life of Pets",
    year: 2016,
    runtime: "1h 27m",
    rating: "PG",
    score: 6.5,
    streaming: "Peacock",
  },
];

const DATA_URL = "data/movies.json";

const grid = document.getElementById("movie-grid");
const introCopy = document.querySelector(".results__intro p");
const buttons = document.querySelectorAll(".btn");

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const wrapTitle = (title, maxChars) => {
  const words = title.split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const testLine = current ? `${current} ${word}` : word;
    if (testLine.length <= maxChars) {
      current = testLine;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
};

const stringToHue = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
};

const buildPosterDataUrl = (movie) => {
  const hue = stringToHue(movie.title);
  const start = `hsl(${hue}, 70%, 42%)`;
  const end = `hsl(${(hue + 30) % 360}, 65%, 18%)`;
  const accent = `hsl(${(hue + 65) % 360}, 75%, 70%)`;
  const lines = wrapTitle(movie.title, 16);
  const lineHeight = 34;
  const titleStartY = 250 - ((lines.length - 1) * lineHeight) / 2;
  const titleText = lines
    .map(
      (line, index) =>
        `<tspan x="24" y="${titleStartY + index * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${start}" />
      <stop offset="100%" stop-color="${end}" />
    </linearGradient>
  </defs>
  <rect width="300" height="450" fill="url(#bg)" />
  <rect x="16" y="16" width="268" height="418" rx="18" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" />
  <circle cx="242" cy="68" r="38" fill="rgba(247,229,0,0.22)" />
  <text x="24" y="50" fill="${accent}" font-family="Sora, Arial, sans-serif" font-size="14" letter-spacing="4" font-weight="600">MCI KIDS</text>
  <text x="24" y="78" fill="rgba(255,255,255,0.72)" font-family="Sora, Arial, sans-serif" font-size="12">${movie.year} | ${movie.runtime}</text>
  <text x="24" y="104" fill="rgba(255,255,255,0.6)" font-family="Sora, Arial, sans-serif" font-size="11">${movie.streaming}</text>
  <text fill="#ffffff" font-family="Baloo 2, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="2">
    ${titleText}
  </text>
  <rect x="24" y="368" width="252" height="46" rx="12" fill="rgba(0,0,0,0.35)" />
  <text x="40" y="397" fill="#ffffff" font-family="Sora, Arial, sans-serif" font-size="13" letter-spacing="1">NOW PLAYING</text>
  <text x="198" y="397" fill="${accent}" font-family="Sora, Arial, sans-serif" font-size="13" font-weight="600">MCI</text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const formatRuntime = (runtime) => {
  if (typeof runtime === "number") {
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
  return runtime || "";
};

const normalizeMovies = (list) =>
  list.map((movie) => ({
    ...movie,
    runtime: formatRuntime(movie.runtime),
    score: Number(movie.score) || 0,
    poster: movie.poster || "",
  }));

let activeMovies = normalizeMovies(MOVIES);

const loadMovies = async () => {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Movie data not found");
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length) {
      activeMovies = normalizeMovies(data);
    }
  } catch (error) {
    activeMovies = normalizeMovies(MOVIES);
  }
};

const shuffle = (list) => {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const buildCard = (movie, index) => {
  const card = document.createElement("article");
  card.className = "card";
  card.style.animationDelay = `${index * 0.06}s`;
  const scoreValue = Number(movie.score);
  const scoreLabel = Number.isFinite(scoreValue) && scoreValue > 0 ? scoreValue.toFixed(1) : "NR";
  const posterFallback = buildPosterDataUrl(movie);
  const posterSrc = movie.poster || "";

  card.innerHTML = `
    <div class="card__poster-wrap">
      <img
        class="card__poster"
        src="${posterFallback}"
        alt="Poster for ${movie.title}"
        loading="lazy"
        decoding="async"
      />
      <div class="card__poster-vignette"></div>
      <div class="card__poster-top">
        <span class="card__label">MCI Theater ${index + 1}</span>
        <span class="card__rating">${movie.rating}</span>
      </div>
      <div class="card__score">Avg ${scoreLabel}</div>
    </div>
    <div class="card__details">
      <h3 class="card__title">${movie.title}</h3>
      <p class="card__meta">${movie.year} | ${movie.runtime}</p>
      <div class="card__stream">Streaming on ${movie.streaming}</div>
    </div>
  `;

  const posterImg = card.querySelector(".card__poster");
  if (posterImg) {
    posterImg.addEventListener("error", () => {
      if (posterImg.src !== posterFallback) {
        posterImg.src = posterFallback;
      }
    });
    if (posterSrc) {
      posterImg.referrerPolicy = "no-referrer";
      posterImg.src = posterSrc;
    }
  }

  return card;
};

const renderMovies = (count) => {
  grid.innerHTML = "";
  const picks = shuffle(activeMovies).slice(0, Math.min(count, activeMovies.length));

  picks.forEach((movie, index) => {
    grid.appendChild(buildCard(movie, index));
  });

  introCopy.textContent = `Fresh picks for ${picks.length} MCI theaters with poster art and average ratings.`;
};

const moviesReady = loadMovies();

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const count = Number(button.dataset.count);
    moviesReady.then(() => {
      renderMovies(count);
    });
  });
});
