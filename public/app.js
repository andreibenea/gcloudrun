// Use API base injected from HTML; fall back to same-origin (works on localhost:8080)
const API_BASE =
    (typeof window !== "undefined" && window.API_BASE) ? window.API_BASE : window.location.origin;

let ALL_JOKES = [];
let ACTIVE_CATEGORY = "All";

document.addEventListener("DOMContentLoaded", async () => {
    const btn = document.getElementById("joke-btn");
    const jokeP = document.getElementById("joke");

    try {
        // Fetch all jokes from REST API
        const resp = await fetch(`${API_BASE}/api/jokes`, { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        ALL_JOKES = await resp.json();
    } catch (err) {
        console.error(err);
        jokeP.textContent = "Couldn't load jokes.";
    }

    // Category filter buttons
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach((b) => {
        b.addEventListener("click", () => {
            ACTIVE_CATEGORY = b.dataset.cat;
            filterBtns.forEach((x) => x.classList.remove("active"));
            b.classList.add("active");
        });
    });

    // Generate random joke
    btn.addEventListener("click", () => {
        let pool = ALL_JOKES;
        if (ACTIVE_CATEGORY !== "All") {
            pool = ALL_JOKES.filter((j) => j.category === ACTIVE_CATEGORY);
        }

        if (!pool.length) {
            jokeP.textContent = "No jokes match this category.";
            return;
        }

        const idx = Math.floor(Math.random() * pool.length);
        const joke = pool[idx];
        jokeP.textContent = `${joke.setup} ${joke.punchline}`;
    });
});
