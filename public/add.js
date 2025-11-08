// Utility: show inline error messages
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

    // Use API base injected from HTML; fall back to same-origin (localhost:8080)
    const API_BASE =
        (typeof window !== "undefined" && window.API_BASE) ? window.API_BASE : window.location.origin;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // reset errors
        showError("err-setup", "");
        showError("err-punchline", "");
        showError("err-category", "");
        result.textContent = "";
        result.style.color = "";

        // required validation
        let ok = true;
        if (!setup.value.trim()) { showError("err-setup", "Setup is required."); ok = false; }
        if (!punchline.value.trim()) { showError("err-punchline", "Punchline is required."); ok = false; }
        if (!category.value.trim()) { showError("err-category", "Please choose a category."); ok = false; }
        if (!ok) return;

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

            await resp.json();
            result.textContent = "✅ Joke saved successfully!";
            result.style.color = "green";

            // clear form
            setup.value = "";
            punchline.value = "";
            category.value = "";
        } catch (err) {
            console.error(err);
            result.textContent = "❌ Failed to save joke. Please try again.";
            result.style.color = "#b00020";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Save Joke";
        }
    });
});
