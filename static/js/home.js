console.log("home.js loaded ✅");

document.addEventListener("DOMContentLoaded", () => {
    updateHome();
    setInterval(updateHome, 5000);
});

function updateHome() {
    fetch("/api/live-gold-price")
        .then(res => res.json())
        .then(data => {

            const priceEl = document.getElementById("currentPriceCard");
            const changeEl = document.getElementById("priceChange24h");

            if (priceEl) {
                priceEl.textContent =
                    "$" + Number(data.current || 0).toFixed(2);
            }

            if (changeEl) {
                const change = Number(data.change || 0);
                changeEl.textContent =
                    (change >= 0 ? "+" : "") + change.toFixed(2) + "%";
            }
        })
        .catch(err => console.error("Home error:", err));
}