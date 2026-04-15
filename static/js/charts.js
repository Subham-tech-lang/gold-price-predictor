if (window.chartInitialized) {
    console.warn("Chart already initialized ❌");
} else {
    window.chartInitialized = true;
}
console.log("charts.js FINAL STABLE ✅");

// ==============================
let chartInstance = null;
let currentRange = "5D";

// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initChart();
    setupButtons();
    loadData(currentRange);
});

// ==============================
// INIT CHART
// ==============================
function initChart() {

    const canvas = document.getElementById("priceChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (chartInstance) {
        chartInstance.destroy();
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
                        callback: (v) => Number(v).toFixed(2)
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
                                `O: ${d.o}`,
                                `H: ${d.h}`,
                                `L: ${d.l}`,
                                `C: ${d.c}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// ==============================
// LOAD DATA
// ==============================
const map = {
    "1D": "1m",
    "5D": "5m",
    "1M": "15m",
    "3M": "30m",
    "1Y": "1h"
};
let isFetching = false;

function loadData(range) {
    if (isFetching) return;
    isFetching = true;

    fetch(`/api/historical-data?interval=${map[range]}`)
        .then(res => res.json())
        .then(data => {
            updateChart(formatData(data));
        })
        .finally(() => {
            isFetching = false;
        });
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
// BUTTON HANDLER
// ==============================
function setupButtons() {

    const buttons = document.querySelectorAll(".timeframe-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", function () {

            const range = this.dataset.range;
            if (!range || range === currentRange) return;

            currentRange = range;

            buttons.forEach(b => b.classList.remove("active"));
            this.classList.add("active");

            loadData(range);
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