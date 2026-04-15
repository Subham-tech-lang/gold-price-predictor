console.log("charts.js READY ✅");

// ==============================
// STATE
// ==============================
let chartInstance = null;
let selectedRange = "5D";

// ==============================
// BOOTSTRAP
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initChart();
    bindTimeframeControls();
    fetchAndRender(selectedRange);
});

// ==============================
// CHART SETUP
// ==============================
function initChart() {

    const canvasEl = document.getElementById("priceChart");

    if (!canvasEl) {
        console.warn("priceChart canvas not found");
        return;
    }

    const ctx = canvasEl.getContext("2d");

    chartInstance = new Chart(ctx, {
        type: "candlestick",

        data: {
            datasets: [
                {
                    label: "Gold Price",
                    data: [],
                    parsing: false,

                    borderColor: "#999",

                    color: {
                        up: "#26a69a",
                        down: "#ef5350",
                        unchanged: "#999"
                    }
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,

            scales: {
                x: {
                    type: "time",
                    time: {
                        unit: "minute"
                    },
                    ticks: {
                        maxRotation: 0
                    }
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
                    intersect: false,
                    mode: "index",
                    callbacks: {
                        label: (context) => {
                            const d = context.raw;

                            if (!d) return "";

                            return [
                                `Open: ${d.o}`,
                                `High: ${d.h}`,
                                `Low: ${d.l}`,
                                `Close: ${d.c}`
                            ];
                        }
                    }
                }
            }
        }
    });
}
// ==============================
// DATA FETCH
// ==============================
function fetchAndRender(range) {

    const intervalLookup = {
        "1D": "1m",
        "5D": "5m",
        "1M": "15m",
        "3M": "30m",
        "1Y": "1h"
    };

    const interval = intervalLookup[range] || "5m";

    fetch(`/api/historical-data?interval=${interval}`)
        .then(response => response.json())
        .then(raw => {

            if (!Array.isArray(raw) || raw.length === 0) {
                console.warn("Empty dataset");
                updateChart([]);
                return;
            }

            const candles = transformData(raw);

            updateChart(candles);
        })
        .catch(error => {
            console.error("Data fetch failed:", error);
        });
}

// ==============================
// DATA TRANSFORM
// ==============================
function transformData(data) {
    return data.map(item => ({
        x: new Date(item.x * 1000), // ✅ MUST be Date object
        o: Number(item.o),
        h: Number(item.h),
        l: Number(item.l),
        c: Number(item.c)
    }));
}
// ==============================
// UPDATE CHART
// ==============================
function updateChart(candleData) {

    if (!chartInstance) return;

    chartInstance.data.datasets[0].data = candleData;
    chartInstance.update("none");
}

// ==============================
// TIMEFRAME BUTTON HANDLING
// ==============================
function bindTimeframeControls() {

    const buttons = document.querySelectorAll(".timeframe-btn");

    buttons.forEach(button => {

        button.addEventListener("click", function () {

            const range = this.dataset.range;

            if (!range || range === selectedRange) return;

            selectedRange = range;

            // update active UI state
            buttons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");

            fetchAndRender(range);
        });
    });
}

// ==============================
// UTIL: FORMAT TIME
// ==============================
function formatTime(dateObj) {

    if (!(dateObj instanceof Date)) return "";

    return dateObj.toLocaleString("en-IN", {
        hour12: false,
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}