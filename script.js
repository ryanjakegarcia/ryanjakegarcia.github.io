const portfolioConfig = {
  githubUsername: "ryanjakegarcia",
  featuredRepos: [
    "Sorting-Visualizer",
    "Connect4-Solver",
    "PaintAtHome",
    "Simple-Raycaster",
    "AD-DSpellGen"
  ],
  knownRepoDetails: {
    "sorting-visualizer": {
      problemStatement: "Visualize sorting algorithms step-by-step to compare behavior and performance intuition.",
      tags: ["Algorithms", "Visualization", "Education"],
      previewVideo: "images/previews/sorting-visualizer.mp4"
    },
    "connect4-solver": {
      problemStatement: "Compute strong Connect4 move choices from a board state with game tree search techniques.",
      tags: ["Algorithms", "Game AI", "Search"],
      previewVideo: "images/previews/connect4-solver.mp4"
    },
    "paintathome": {
      problemStatement: "Create a practical digital drawing experience with simple, accessible controls.",
      tags: ["Tooling", "Graphics", "UI"],
      previewVideo: "images/previews/paintathome.mp4"
    },
    "simple-raycaster": {
      problemStatement: "Render a pseudo-3D environment from a 2D map using core raycasting concepts.",
      tags: ["Graphics", "Game Dev", "Rendering"],
      previewVideo: "images/previews/simple-raycaster.mp4"
    },
    "ad-dspellgen": {
      problemStatement: "Generate themed spell ideas for tabletop campaigns quickly and repeatedly.",
      tags: ["Tooling", "Generator", "Game Utility"],
      previewVideo: "images/previews/ad-dspellgen.mp4"
    }
  },
  manualProjects: [
    {
      name: "Building Protection",
      description: "Tower defense game built in Unity. Survive to wave 20 without letting an enemy through, then keep playing for endless challenge.",
      tags: ["Game Dev", "Unity", "C#"],
      updatedAt: null,
      previewVideo: "images/previews/building-protection.mp4",
      links: {
        live: "https://sirsplash.itch.io/building-protection",
        repo: null
      }
    }
  ]
};

const state = {
  projects: [],
  activeTag: "All",
  query: ""
};

const projectsGrid = document.getElementById("projectsGrid");
const projectsStatus = document.getElementById("projectsStatus");
const searchInput = document.getElementById("searchInput");
const tagFilters = document.getElementById("tagFilters");

function formatDate(isoDateString) {
  if (!isoDateString) return "";
  const date = new Date(isoDateString);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function normalizeGitHubRepo(repo) {
  const key = repo.name.toLowerCase();
  const known = portfolioConfig.knownRepoDetails[key] || {};

  return {
    name: repo.name,
    description: known.problemStatement || repo.description || "Repository with implementation details and setup instructions.",
    tags: known.tags || [repo.language || "Code"],
    updatedAt: repo.pushed_at,
    previewVideo: known.previewVideo || null,
    links: {
      live: repo.homepage || null,
      repo: repo.html_url
    }
  };
}

function toMediaHTML(project) {
  if (!project.previewVideo) {
    return `
      <div class="project-media project-media-fallback" aria-hidden="true">
        <span>${project.name}</span>
      </div>
    `;
  }

  return `
    <div class="project-media">
      <video class="preview-video" muted loop playsinline preload="metadata">
        <source src="${project.previewVideo}" type="video/mp4">
      </video>
      <span class="hover-hint">Hover to preview</span>
    </div>
  `;
}

function toCardHTML(project) {
  const updated = project.updatedAt ? `<p class="repo-updated">Updated ${formatDate(project.updatedAt)}</p>` : "";
  const tags = project.tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
  const links = [
    project.links.live ? `<a href="${project.links.live}" target="_blank" rel="noopener noreferrer">Live</a>` : "",
    project.links.repo ? `<a href="${project.links.repo}" target="_blank" rel="noopener noreferrer">Repo</a>` : ""
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="project-card">
      ${toMediaHTML(project)}
      <header class="project-header">
        <h3>${project.name}</h3>
      </header>
      ${updated}
      <p class="project-description">${project.description}</p>
      <div class="tag-row">${tags}</div>
      <div class="card-links">${links}</div>
    </article>
  `;
}

function attachPreviewInteractions() {
  projectsGrid.querySelectorAll(".project-card").forEach((card) => {
    const video = card.querySelector(".preview-video");
    if (!video) return;

    const play = () => {
      const promise = video.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => {
          // Ignore autoplay blocking and leave static frame in place.
        });
      }
    };

    const pause = () => {
      video.pause();
      video.currentTime = 0;
    };

    card.addEventListener("mouseenter", play);
    card.addEventListener("mouseleave", pause);
    card.addEventListener("focusin", play);
    card.addEventListener("focusout", pause);
  });
}

function renderProjects() {
  const q = state.query.trim().toLowerCase();
  const filtered = state.projects.filter((project) => {
    const tagMatch = state.activeTag === "All" || project.tags.includes(state.activeTag);
    const searchTarget = `${project.name} ${project.description} ${project.tags.join(" ")}`.toLowerCase();
    const textMatch = q === "" || searchTarget.includes(q);
    return tagMatch && textMatch;
  });

  projectsGrid.innerHTML = filtered.map(toCardHTML).join("");
  attachPreviewInteractions();

  if (filtered.length === 0) {
    projectsStatus.textContent = "No matching projects. Try a different search or filter.";
  } else {
    projectsStatus.textContent = `Showing ${filtered.length} project${filtered.length === 1 ? "" : "s"}.`;
  }
}

function renderTagFilters() {
  const allTags = new Set(["All"]);
  state.projects.forEach((project) => {
    project.tags.forEach((tag) => allTags.add(tag));
  });

  tagFilters.innerHTML = [...allTags]
    .map((tag) => {
      const isActive = tag === state.activeTag ? "active" : "";
      return `<button class="filter-chip ${isActive}" type="button" data-tag="${tag}">${tag}</button>`;
    })
    .join("");

  tagFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTag = button.dataset.tag;
      renderTagFilters();
      renderProjects();
    });
  });
}

async function loadProjects() {
  const url = `https://api.github.com/users/${portfolioConfig.githubUsername}/repos?per_page=100&sort=updated`;
  const featuredSet = new Set(portfolioConfig.featuredRepos.map((name) => name.toLowerCase()));

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("GitHub API request failed");

    const repos = await response.json();
    const featuredRepos = repos
      .filter((repo) => featuredSet.has(repo.name.toLowerCase()))
      .map(normalizeGitHubRepo);

    const orderedFeatured = portfolioConfig.featuredRepos
      .map((name) => featuredRepos.find((repo) => repo.name.toLowerCase() === name.toLowerCase()))
      .filter(Boolean);

    state.projects = [...orderedFeatured, ...portfolioConfig.manualProjects];
    renderTagFilters();
    renderProjects();

    if (orderedFeatured.length < portfolioConfig.featuredRepos.length) {
      const foundNames = new Set(orderedFeatured.map((repo) => repo.name.toLowerCase()));
      const missing = portfolioConfig.featuredRepos.filter((name) => !foundNames.has(name.toLowerCase()));
      projectsStatus.textContent = `Loaded ${state.projects.length} projects. Missing repo matches: ${missing.join(", ")}.`;
    }
  } catch (error) {
    state.projects = [...portfolioConfig.manualProjects];
    renderTagFilters();
    renderProjects();
    projectsStatus.textContent = "GitHub repos could not be loaded right now. Showing manual projects only.";
    console.error(error);
  }
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProjects();
});

loadProjects();
