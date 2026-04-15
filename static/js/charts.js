// ✅ REQUIRED: register financial chart components
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
console.log("charts.js PRODUCTION READY ✅");

// ==============================
// GLOBAL STATE
// ==============================
let chartInstance = null;
let activeRange = "5D";

// ==============================
// APP START
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initChart();
    initTimeframeButtons();
    loadChartData(activeRange);
});

// ==============================
// INITIALIZE CHART
// ==============================
function initChart() {

    const canvas = document.getElementById("priceChart");

    if (!canvas) {
        console.warn("priceChart canvas missing");
        return;
    }

    const ctx = canvas.getContext("2d");

    chartInstance = new Chart(ctx, {
        type: "candlestick",

        data: {
            datasets: [
                {
                    label: "Gold Price",
                    data: [],
                    parsing: false,

                    borderColor: "#000",
                    borderWidth: 1,

                    color: {
                        up: "#00ff88",
                        down: "#ff3b3b",
                        unchanged: "#999"
                    }
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,

            // ==============================
            // SCALES (STABLE)
            // ==============================
            scales: {
                x: {
                    type: "category"
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: (value) => value.toFixed(2)
                    }
                }
            },

            // ==============================
            // CANDLE VISIBILITY FIX
            // ==============================
            elements: {
                candlestick: {
                    barThickness: 8,
                    borderWidth: 1
                }
            },

            // ==============================
            // PLUGINS
            // ==============================
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
// FETCH DATA
// ==============================
function loadChartData(range) {

    const intervalMap = {
        "1D": "1m",
        "5D": "5m",
        "1M": "15m",
        "3M": "30m",
        "1Y": "1h"
    };

    const interval = intervalMap[range] || "5m";

    fetch(`/api/historical-data?interval=${interval}`)
        .then(response => response.json())
        .then(data => {

            if (!Array.isArray(data) || data.length === 0) {
                console.warn("No chart data available");
                updateChart([]);
                return;
            }

            const formattedData = formatCandles(data);
            updateChart(formattedData);
        })
        .catch(error => {
            console.error("Error fetching chart data:", error);
        });
}

// ==============================
// FORMAT DATA
// ==============================
function formatCandles(rawData) {

    return rawData.map((item, index) => ({
        x: index, // stable spacing

        o: Number(item.o),
        h: Number(item.h),
        l: Number(item.l),
        c: Number(item.c),

        // real timestamp for tooltip
        time: new Date(item.x * 1000)
    }));
}

// ==============================
// UPDATE CHART
// ==============================
function updateChart(candles) {

    if (!chartInstance) return;

    chartInstance.data.datasets[0].data = candles;

    // 🔥 IMPORTANT: force redraw
    chartInstance.update();
}

// ==============================
// TIMEFRAME BUTTONS
// ==============================
function initTimeframeButtons() {

    const buttons = document.querySelectorAll(".timeframe-btn");

    buttons.forEach(button => {

        button.addEventListener("click", function () {

            const range = this.dataset.range;

            if (!range || range === activeRange) return;

            activeRange = range;

            // update UI
            buttons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");

            loadChartData(range);
        });
    });
}

// ==============================
// FORMAT TIME
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