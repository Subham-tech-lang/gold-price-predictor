console.log("charts.js loaded ✅");

let priceChart = null;
let fullData = [];

// ==============================
// START
// ==============================

document.addEventListener("DOMContentLoaded", () => {
    initializeChart();
    loadHistoricalData();
    updateLive();

    setInterval(updateLive, 5000);
});

// ==============================
// INIT CHART
// ==============================

function initializeChart() {

    const canvas = document.getElementById("priceChart");
    if (!canvas) return;

    if (priceChart) {
        priceChart.destroy();
    }

    priceChart = new Chart(canvas.getContext("2d"), {
        type: "candlestick",
        data: {
            datasets: [{
                label: "Gold Price",
                data: [],
                parsing: false,
                color: {
                    up: "#26a69a",
                    down: "#ef5350"
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false
        }
    });
}

// ==============================
// HISTORICAL DATA
// ==============================

function loadHistoricalData() {

    fetch("/api/historical-data")
        .then(res => res.json())
        .then(data => {

            if (!data || !data.dates) return;

            fullData = data.dates.map((d, i) => ({
                x: new Date(d).getTime(),
                o: Number(data.open[i]),
                h: Number(data.high[i]),
                l: Number(data.low[i]),
                c: Number(data.close[i])
            }));

            // Default load = full data
            updateChart(fullData);
        })
        .catch(err => console.error("Historical error:", err));
}

// ==============================
// UPDATE CHART (REUSABLE)
// ==============================

function updateChart(data) {
    if (!priceChart) return;

    priceChart.data.datasets[0].data = data;
    priceChart.update();
}

// ==============================
// LIVE PRICE
// ==============================

function updateLive() {

    fetch("/api/live-gold-price")
        .then(res => res.json())
        .then(data => {

            const price = Number(data.current || 0);
            const change = Number(data.change || 0);

            const priceEl = document.getElementById("currentPriceCard");
            const changeEl = document.getElementById("priceChange24h");

            if (priceEl)
                priceEl.textContent = "$" + price.toFixed(2);

            if (changeEl)
                changeEl.textContent =
                    (change >= 0 ? "+" : "") + change.toFixed(2) + "%";
        })
        .catch(err => console.error("Live error:", err));
}

// ==============================
// TIMEFRAME FILTER
// ==============================

function filterData(range) {

    if (!fullData.length) return [];

    const now = fullData[fullData.length - 1].x;

    let ms = 0;

    switch (range) {
        case "1D": ms = 24 * 60 * 60 * 1000; break;
        case "5D": ms = 5 * 24 * 60 * 60 * 1000; break;
        case "1M": ms = 30 * 24 * 60 * 60 * 1000; break;
        case "3M": ms = 90 * 24 * 60 * 60 * 1000; break;
        case "1Y": ms = 365 * 24 * 60 * 60 * 1000; break;
    }

    return fullData.filter(d => d.x >= (now - ms));
}

// ==============================
// BUTTON EVENTS
// ==============================

document.addEventListener("click", (e) => {

    if (!e.target.classList.contains("timeframe-btn")) return;

    const range = e.target.dataset.range;

    const filtered = filterData(range);

    updateChart(filtered);

    // OPTIONAL: highlight active button
    document.querySelectorAll(".timeframe-btn").forEach(btn =>
        btn.classList.remove("active")
    );
    e.target.classList.add("active");
});