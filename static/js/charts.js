// 🔥 REQUIRED: Register financial chart components
Chart.register(
    Chart.controllers.candlestick,
    Chart.controllers.ohlc,
    Chart.elements.CandlestickElement,
    Chart.elements.OhlcElement,
    Chart.scales.TimeScale,
    Chart.scales.LinearScale,
    Chart.plugins.Legend,
    Chart.plugins.Tooltip
);
console.log("charts.js FINAL STABLE ✅");

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

            // ✅ FIX: CATEGORY SCALE (NO STACKING)
            scales: {
                x: {
                    type: "category"
                },
                y: {
                    beginAtZero: false
                }
            },

            plugins: {
                legend: {
                    display: true
                },

                // ✅ TOOLTIP WITH REAL TIME
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const d = context.raw;
                            return [
                                "Time: " + d.time,
                                "O: " + d.o,
                                "H: " + d.h,
                                "L: " + d.l,
                                "C: " + d.c
                            ];
                        }
                    }
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

            if (!Array.isArray(data) || data.length === 0) {
                console.warn("No data received");
                return;
            }

            // ✅ FIX: USE INDEX FOR SPACING
            const candles = data.map((item, index) => ({
                x: index,  // evenly spaced candles
                o: Number(item.o),
                h: Number(item.h),
                l: Number(item.l),
                c: Number(item.c),

                // keep real timestamp for tooltip
                time: new Date(item.x * 1000)
            }));

            updateChart(candles);

        })
        .catch(err => console.error("Fetch error:", err));
}

// ==============================
// UPDATE CHART
// ==============================
function updateChart(candles) {

    if (!priceChart) return;

    priceChart.data.datasets[0].data = candles;

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

            loadData(range);
        });
    });
}