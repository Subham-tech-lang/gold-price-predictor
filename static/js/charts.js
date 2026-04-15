console.log("charts.js FINAL ✅");

// ==============================
// GLOBALS
// ==============================
let priceChart = null;
let currentRange = "5D";

// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initializeChart();
    setupButtons();
    loadData(currentRange);
});

// ==============================
// INITIALIZE CHART
// ==============================
function initializeChart() {

    const canvas = document.getElementById("priceChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    priceChart = new Chart(ctx, {
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
            animation: false,
            scales: {
                x: {
                    type: "time",
                    time: {
                        tooltipFormat: "yyyy-MM-dd HH:mm",
                        unit: "minute"
                    }
                },
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
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

            // 🔥 EXPECTED FORMAT FROM BACKEND:
            // [
            //   { x: 1713180000, o: 4800, h: 4820, l: 4790, c: 4810 }
            // ]

            if (!Array.isArray(data) || data.length === 0) {
                console.warn("No data received");
                return;
            }

            const candles = data.map(item => ({
                x: item.x * 1000,   // ✅ FIX: use timestamp directly
                o: Number(item.o),
                h: Number(item.h),
                l: Number(item.l),
                c: Number(item.c)
            }));

            updateChart(candles);

        })
        .catch(err => console.error("Fetch error:", err));
}

// ==============================
// UPDATE CHART (NO RE-CREATION)
// ==============================
function updateChart(candles) {

    if (!priceChart) return;

    priceChart.data.datasets[0].data = candles;

    // 🔥 IMPORTANT: clear internal cache
    priceChart.update("none");
}

// ==============================
// TIMEFRAME BUTTONS
// ==============================
function setupButtons() {

    document.querySelectorAll(".timeframe-btn").forEach(btn => {

        btn.addEventListener("click", function () {

            const range = this.dataset.range;

            if (!range || range === currentRange) return;

            currentRange = range;

            // UI ACTIVE STATE
            document.querySelectorAll(".timeframe-btn")
                .forEach(b => b.classList.remove("active"));

            this.classList.add("active");

            // LOAD NEW DATA
            loadData(range);
        });
    });
}