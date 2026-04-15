console.log("charts.js FINAL FIXED ✅");

// ==============================
// GLOBAL STATE
// ==============================
let chartInstance = null;
let currentRange = "5D";

// ==============================
// INIT ON LOAD
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initializeChart();
    setupTimeframeButtons();
    fetchData(currentRange);
});

// ==============================
// CREATE CHART
// ==============================
function initializeChart() {

    const canvas = document.getElementById("priceChart");

    if (!canvas) {
        console.warn("Canvas not found");
        return;
    }

    const ctx = canvas.getContext("2d");

    chartInstance = new Chart(ctx, {
        type: "candlestick",

        data: {
            datasets: [{
                label: "Gold Price",
                data: [],
                parsing: false,

                borderColor: "#888",

                color: {
                    up: "#26a69a",
                    down: "#ef5350",
                    unchanged: "#999"
                }
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,

            // ✅ STABLE SCALE (NO TIME BUG)
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
                    display: true,
                    position: "top"
                },

                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const d = ctx.raw;

                            if (!d) return "";

                            return [
                                "Time: " + formatTime(d.time),
                                "Open: " + d.o,
                                "High: " + d.h,
                                "Low: " + d.l,
                                "Close: " + d.c
                            ];
                        }
                    }
                }
            }
        }
    });
}

// ==============================
// FETCH DATA FROM BACKEND
// ==============================
function fetchData(range) {

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
                updateChart([]);
                return;
            }

            const candles = transformData(data);
            updateChart(candles);
        })
        .catch(err => console.error("Fetch error:", err));
}

// ==============================
// TRANSFORM DATA (KEY FIX)
// ==============================
function transformData(data) {

    return data.map((item, index) => ({
        x: index,  // evenly spaced candles (stable)

        o: Number(item.o),
        h: Number(item.h),
        l: Number(item.l),
        c: Number(item.c),

        // keep real time for tooltip
        time: new Date(item.x * 1000)
    }));
}

// ==============================
// UPDATE CHART
// ==============================
function updateChart(candles) {

    if (!chartInstance) return;

    chartInstance.data.datasets[0].data = candles;
    chartInstance.update("none");
}

// ==============================
// BUTTON CONTROLS
// ==============================
function setupTimeframeButtons() {

    const buttons = document.querySelectorAll(".timeframe-btn");

    buttons.forEach(btn => {

        btn.addEventListener("click", function () {

            const range = this.dataset.range;

            if (!range || range === currentRange) return;

            currentRange = range;

            // update UI
            buttons.forEach(b => b.classList.remove("active"));
            this.classList.add("active");

            fetchData(range);
        });
    });
}

// ==============================
// FORMAT TIME FOR TOOLTIP
// ==============================
function formatTime(date) {

    if (!(date instanceof Date)) return "";

    return date.toLocaleString("en-IN", {
        hour12: false,
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}