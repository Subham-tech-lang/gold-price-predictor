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

console.log("charts.js FINAL FIXED ✅");

// ==============================
let chartInstance = null;
let currentRange = "5D";

// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initializeChart();
    bindButtons();
    fetchData(currentRange);
});

// ==============================
// CREATE CHART
// ==============================
function initializeChart() {

    const canvas = document.getElementById("priceChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // destroy old instance if exists
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
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,

            scales: {
                x: {
                    type: "time",   // ✅ IMPORTANT FIX
                    time: {
                        tooltipFormat: "dd MMM HH:mm"
                    }
                },
                y: {
                    beginAtZero: false
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

    fetch(`/api/historical-data?interval=${intervalMap[range]}`)
        .then(res => res.json())
        .then(data => {

            if (!data || !data.length) {
                updateChart([]);
                return;
            }

            // ✅ CORRECT FORMAT FOR CHART.JS FINANCIAL
            const formattedData = data.map(item => ({
                x: new Date(item.x * 1000), // timestamp → Date
                o: Number(item.o),
                h: Number(item.h),
                l: Number(item.l),
                c: Number(item.c)
            }));

            updateChart(formattedData);
        })
        .catch(err => {
            console.error("Fetch error:", err);
            updateChart([]);
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
// FORMAT TIME
// ==============================
function formatTime(date) {
    return new Date(date).toLocaleString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        hour12: false
    });
}