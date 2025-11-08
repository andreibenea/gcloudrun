// 🌐 Replace this with your own Cloud Run service URL:
const API_BASE = "https://jotd-api-wl6ruoti2q-uc.a.run.app";

// LOCALHOST
// const API_BASE = "http://localhost:8000";

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg || "";
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("joke-form");
    const setup = document.getElementById("setup");
    const punchline = document.getElementById("punchline");
    const category = document.getElementById("category");
    const result = document.getElementById("result");
    const submitBtn = document.getElementById("submit-btn");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // reset errors
        showError("err-setup", "");
        showError("err-punchline", "");
        showError("err-category", "");
        result.textContent = "";

        // simple required validation
        let ok = true;
        if (!setup.value.trim()) {
            showError("err-setup", "Setup is required.");
            ok = false;
        }
        if (!punchline.value.trim()) {
            showError("err-punchline", "Punchline is required.");
            ok = false;
        }
        if (!category.value.trim()) {
            showError("err-category", "Please choose a category.");
            ok = false;
        }
        if (!ok) return;

        // submit to API
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";

        try {
            const resp = await fetch(`${API_BASE}/api/jokes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    setup: setup.value.trim(),
                    punchline: punchline.value.trim(),
                    category: category.value.trim(),
                }),
            });

            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data.detail || `HTTP ${resp.status}`);
            }

            const data = await resp.json();
            result.textContent = "✅ Joke saved!";

            // optional: clear the form
            setup.value = "";
            punchline.value = "";
            category.value = "";
        } catch (err) {
            console.error(err);
            result.textContent = "❌ Failed to save joke.";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Save Joke";
        }
    });
});
