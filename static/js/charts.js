// ==============================
// REGISTER FINANCIAL COMPONENTS
// ==============================
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

console.log("charts.js FINAL WORKING ✅");

// ==============================
let chart = null;
let currentRange = "5D";

// ==============================
document.addEventListener("DOMContentLoaded", () => {
    createChart();
    bindButtons();
    fetchData(currentRange);
});

// ==============================
function createChart() {

    const canvas = document.getElementById("priceChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    chart = new Chart(ctx, {
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
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,

            scales: {
                x: {
                    type: "category"
                },
                y: {
                    beginAtZero: false
                }
            },

            elements: {
                candlestick: {
                    barThickness: 10
                }
            },

            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const d = ctx.raw;
                            if (!d) return "";

                            return [
                                `Time: ${formatTime(d.time)}`,
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
function fetchData(range) {

    const map = {
        "1D": "1m",
        "5D": "5m",
        "1M": "15m",
        "3M": "30m",
        "1Y": "1h"
    };

    fetch(`/api/historical-data?interval=${map[range]}`)
        .then(r => r.json())
        .then(data => {

            if (!data.length) {
                updateChart([]);
                return;
            }

            const formatted = data.map((item, i) => ({
                x: i,
                o: +item.o,
                h: +item.h,
                l: +item.l,
                c: +item.c,
                time: new Date(item.x * 1000)
            }));

            updateChart(formatted);
        });
}

// ==============================
function updateChart(data) {
    if (!chart) return;
    chart.data.datasets[0].data = data;
    chart.update();
}

// ==============================
function bindButtons() {

    const buttons = document.querySelectorAll(".timeframe-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", function () {

            const range = this.dataset.range;
            if (range === currentRange) return;

            currentRange = range;

            buttons.forEach(b => b.classList.remove("active"));
            this.classList.add("active");

            fetchData(range);
        });
    });
}

// ==============================
function formatTime(date) {
    return date.toLocaleString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        hour12: false
    });
}