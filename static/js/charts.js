// ==============================
// PREVENT MULTIPLE INITIALIZATION
// ==============================
if (window.__chartInitialized) {
    console.warn("Chart already initialized ❌");
} else {
    window.__chartInitialized = true;
}

console.log("charts.js FINAL STABLE ✅");

// ==============================
let chartInstance = null;
let currentRange = "5D";
let isFetching = false;

// ==============================
// INTERVAL MAP
// ==============================
const intervalMap = {
    "1D": "1m",
    "5D": "5m",
    "1M": "15m",
    "3M": "30m",
    "1Y": "1h"
};

// ==============================
// INIT ON LOAD
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initializeChart();
    attachButtonEvents();
    fetchChartData(currentRange);
});

// ==============================
// CREATE CHART
// ==============================
function initializeChart() {

    const canvas = document.getElementById("priceChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Destroy previous instance if exists
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    chartInstance = new Chart(ctx, {
        type: "candlestick",
        data: {
            datasets: [{
                label: "Gold Price",
                data: [],
                parsing: false,

                color: {
                    up: "#00ff88",
                    down: "#ff3b3b",
                    unchanged: "#999"
                },

                barThickness: 5,
                maxBarThickness: 6
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
                        tooltipFormat: "dd MMM HH:mm"
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        autoSkip: true
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: (value) => Number(value).toFixed(2)
                    }
                }
            },

            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const d = ctx.raw;
                            if (!d) return "";

                            return [
                                `Time: ${formatTime(d.x)}`,
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
// FETCH DATA
// ==============================
function fetchChartData(range) {

    if (isFetching) return;
    isFetching = true;

    fetch(`/api/historical-data?interval=${intervalMap[range]}`)
        .then(res => res.json())
        .then(data => {

            if (!data || !data.length) {
                updateChart([]);
                return;
            }

            const formatted = formatChartData(data);
            updateChart(formatted);
        })
        .catch(err => {
            console.error("Chart fetch error:", err);
            updateChart([]);
        })
        .finally(() => {
            isFetching = false;
        });
}

// ==============================
// FORMAT DATA (🔥 CRITICAL FIX)
// ==============================
function formatChartData(data) {
    return data.map(item => ({
        x: new Date(item.x * 1000),   // ✅ REQUIRED for time scale
        o: Number(item.o),
        h: Number(item.h),
        l: Number(item.l),
        c: Number(item.c)
    }));
}

// ==============================
// UPDATE CHART
// ==============================
function updateChart(data) {
    if (!chartInstance) return;

    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
}

// ==============================
// BUTTON EVENTS
// ==============================
function attachButtonEvents() {

    const buttons = document.querySelectorAll(".timeframe-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", function () {

            const range = this.dataset.range;

            if (!range || range === currentRange) return;

            currentRange = range;

            buttons.forEach(b => b.classList.remove("active"));
            this.classList.add("active");

            fetchChartData(range);
        });
    });
}

// ==============================
// FORMAT TIME
// ==============================
function formatTime(date) {

    if (!date) return "";

    return new Date(date).toLocaleString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        hour12: false
    });
}