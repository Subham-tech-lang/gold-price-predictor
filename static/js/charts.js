console.log("charts.js loaded ✅");

let priceChart = null;

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

            const candles = data.dates.map((d, i) => ({
                x: new Date(d).getTime(),
                o: Number(data.open[i]),
                h: Number(data.high[i]),
                l: Number(data.low[i]),
                c: Number(data.close[i])
            }));

            if (priceChart) {
                priceChart.data.datasets[0].data = candles;
                priceChart.update();
            }
        })
        .catch(err => console.error("Historical error:", err));
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