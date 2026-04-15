console.log("charts.js FIXED ✅");

let priceChart = null;
let currentRange = "5D";

// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initializeChart();
    loadData(currentRange);

    setupButtons();
});

// ==============================
// INIT CHART
// ==============================
function initializeChart() {
    const canvas = document.getElementById("priceChart");
    if (!canvas) return;

    if (priceChart) priceChart.destroy();

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
// LOAD DATA FROM BACKEND
// ==============================
function loadData(range) {

    const intervalMap = {
        "1D": "1m",
        "5D": "5m",
        "1M": "15m",
        "3M": "30m",
        "1Y": "1h"
    };

    const interval = intervalMap[range] || "5m";

    fetch(`/api/historical-data?interval=${interval}`)
        .then(res => res.json())
        .then(data => {

            if (!data || !data.dates) return;

            const candles = data.dates.map((d, i) => ({
                x: new Date(d * 1000),   // ✅ FIXED timestamp
                o: Number(data.open[i]),
                h: Number(data.high[i]),
                l: Number(data.low[i]),
                c: Number(data.close[i])
            }));

            updateChart(candles);

        })
        .catch(err => console.error("Fetch error:", err));
}

// ==============================
// UPDATE CHART
// ==============================
function updateChart(data) {
    if (!priceChart) return;

    priceChart.data.datasets[0].data = data;
    priceChart.update();
}

// ==============================
// BUTTONS (MAIN FIX)
// ==============================
function setupButtons() {

    document.querySelectorAll(".timeframe-btn").forEach(btn => {

        btn.addEventListener("click", function () {

            const range = this.dataset.range;

            currentRange = range;

            // UI active state
            document.querySelectorAll(".timeframe-btn")
                .forEach(b => b.classList.remove("active"));

            this.classList.add("active");

            // 🔥 IMPORTANT: reload from backend
            loadData(range);
        });
    });
}