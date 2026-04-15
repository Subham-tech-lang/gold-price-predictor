console.log("home.js initialized ✅");

// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    loadHomeData();
    startLiveUpdates();
});

// ==============================
// START LIVE PRICE INTERVAL (ONLY ONCE)
// ==============================
function startLiveUpdates() {

    if (window.livePriceIntervalStarted) return;

    window.livePriceIntervalStarted = true;

    setInterval(() => {
        fetchLivePrice();
    }, 5000);
}

// ==============================
// INITIAL HOME LOAD
// ==============================
function loadHomeData() {

    fetch("/api/live-gold-price")
        .then(res => {
            if (!res.ok) throw new Error("API error");
            return res.json();
        })
        .then(data => updateHomeUI(data))
        .catch(err => console.error("Home load failed:", err.message));
}

// ==============================
// LIVE PRICE FETCH
// ==============================
function fetchLivePrice() {

    fetch("/api/live-gold-price")
        .then(res => res.json())
        .then(data => {

            if (!data) return;

            updateHomeUI(data);

        })
        .catch(() => {
            console.warn("Live update failed");
        });
}

// ==============================
// UI UPDATE FUNCTION (REUSABLE)
// ==============================
function updateHomeUI(data) {

    const priceEl = document.getElementById("currentPriceCard");
    const changeEl = document.getElementById("priceChange24h");

    const price = Number(data.current);
    const change = Number(data.change);

    // ✅ PRICE UPDATE
    if (priceEl && !isNaN(price)) {
        priceEl.textContent = "$" + price.toFixed(2);
    }

    // ✅ CHANGE UPDATE
    if (changeEl && !isNaN(change)) {
        changeEl.textContent =
            (change >= 0 ? "+" : "") + change.toFixed(2) + "%";
    }
}