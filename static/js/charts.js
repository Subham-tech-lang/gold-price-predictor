console.log("charts.js loaded ✅");

let charts = {};

document.addEventListener("DOMContentLoaded", () => {

    initializeCharts();

    loadHistoricalData();
    loadCorrelationData();
    loadPriceAnalysis();

    updateLive();
    setInterval(updateLive, 5000);
});

// ==============================
// REGISTER FINANCIAL
// ==============================

if (window.Chart && window['chartjs-chart-financial']) {
    Chart.register(...Chart.registerables);
}

// ==============================
// INIT CHARTS
// ==============================

function initializeCharts() {

    const createChart = (id, config) => {
        const canvas = document.getElementById(id);
        if (!canvas) return null;
        return new Chart(canvas.getContext("2d"), config);
    };

    // 🔥 CANDLESTICK CHART
    charts.priceChart = createChart("priceChart", {
    type: "candlestick",
    data: {
        datasets: [{
            label: "Gold Price",
            data: [],
            color: {
                up: "#26a69a",
                down: "#ef5350"
            },
            borderColor: {
                up: "#26a69a",
                down: "#ef5350"
            },
            barThickness: 6,
            maxBarThickness: 8
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,

        interaction: {
            mode: "index",
            intersect: false
        },

        plugins: {
            legend: { display: false },

            // 🔥 OHLC TOOLTIP
            tooltip: {
                enabled: true,
                mode: "nearest",
                intersect: false,
                callbacks: {
                    title: (items) => {
                        const d = new Date(items[0].raw.x);
                        return d.toDateString(); // clean date
                    },
                    label: (context) => {
                        const d = context.raw;
                        return [
                            "Open : $" + d.o,
                            "High : $" + d.h,
                            "Low  : $" + d.l,
                            "Close: $" + d.c
                        ];
                    }
                }
            }
        },

        scales: {
            x: {
                type: "time",

                // 🔥 FORCE DAILY CANDLES
                time: {
                    unit: "day",
                    round: "day",
                    tooltipFormat: "MMM dd yyyy",
                    displayFormats: {
                        day: "MMM dd"
                    }
                },

                ticks: {
                    autoSkip: true,
                    maxTicksLimit: 8
                },

                grid: {
                    display: false
                }
            },

            y: {
                beginAtZero: false,
                ticks: {
                    callback: value => "$" + value
                }
            }
        },

        // 🔥 CROSSHAIR PLUGIN (CUSTOM)
        plugins: [{
            id: "crosshair",

            afterDraw(chart) {
                if (!chart.tooltip || !chart.tooltip._active || chart.tooltip._active.length === 0) return;

                const ctx = chart.ctx;
                const activePoint = chart.tooltip._active[0];
                const x = activePoint.element.x;
                const y = activePoint.element.y;

                const { top, bottom, left, right } = chart.chartArea;

                ctx.save();

                // 🔵 Vertical Line
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x, bottom);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(255,255,255,0.3)";
                ctx.stroke();

                // 🔵 Horizontal Line
                ctx.beginPath();
                ctx.moveTo(left, y);
                ctx.lineTo(right, y);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(255,255,255,0.3)";
                ctx.stroke();

                ctx.restore();
            }
        }]
    }
});

    // 🔥 CORRELATION CHART
    charts.correlationChart = createChart("correlationChart", {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Correlation",
                data: [],
                backgroundColor: "#36A2EB"
            }]
        },
        options: {
            plugins: {
                legend: { display: false } // 🔥 remove "undefined"
            }
        }
    });

    // 🔥 VOLUME CHART
    charts.volumeChart = createChart("volumeChart", {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Volume",
                data: [],
                backgroundColor: "#4BC0C0"
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            }
        }
    });

    // 🔥 DISTRIBUTION CHART
    charts.distributionChart = createChart("distributionChart", {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Frequency",
                data: [],
                backgroundColor: "#9966FF"
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ==============================
// HISTORICAL DATA (FIXED)
// ==============================

function loadHistoricalData() {

    fetch("/api/historical-data")
        .then(res => res.json())
        .then(data => {

            if (!data || !data.dates) return;

            const candles = [];
            const seen = new Set();

            const limit = 25;
            const start = Math.max(0, data.dates.length - limit);

            for (let i = start; i < data.dates.length; i++) {

                const d = data.dates[i];

                if (seen.has(d)) continue;
                seen.add(d);

                candles.push({
                    x: new Date(d),
                    o: Number(data.open[i]),
                    h: Number(data.high[i]),
                    l: Number(data.low[i]),
                    c: Number(data.close[i])
                });
            }

            candles.sort((a, b) => a.x - b.x);

            charts.priceChart.data.datasets[0].data = candles;
            charts.priceChart.update();

            // VOLUME
            charts.volumeChart.data.labels = data.dates.slice(-limit);
            charts.volumeChart.data.datasets[0].data = data.volume.slice(-limit);
            charts.volumeChart.update();

            // DISTRIBUTION
            updateDistributionChart(data.close);

        })
        .catch(err => console.log("Historical error:", err));
}

// ==============================
// LIVE DATA
// ==============================

function updateLive() {

    fetch("/api/live-gold-price")
        .then(res => res.json())
        .then(res => {

            const price = Number(res.current || 0);
            const change = Number(res.change || 0);

            const priceEl = document.getElementById("currentPriceCard");
            const changeEl = document.getElementById("priceChange24h");

            if (priceEl) {
                priceEl.textContent = "$" + price.toFixed(2);
            }

            if (changeEl) {
                changeEl.textContent =
                    (change >= 0 ? "+" : "") + "$" + change.toFixed(2);
            }

        })
        .catch(err => console.log("Live error:", err));
}

// ==============================
// CORRELATION
// ==============================

function loadCorrelationData() {

    fetch("/api/correlation-data")
        .then(res => res.json())
        .then(data => {

            if (!charts.correlationChart) return;

            charts.correlationChart.data.labels = Object.keys(data);
            charts.correlationChart.data.datasets[0].data =
                Object.values(data).map(Number);

            charts.correlationChart.update();
        })
        .catch(err => console.log("Correlation error:", err));
}

// ==============================
// PRICE ANALYSIS
// ==============================

function loadPriceAnalysis() {

    fetch("/api/price-analysis")
        .then(res => res.json())
        .then(data => {

            const volEl = document.getElementById("volatility");
            const avgEl = document.getElementById("avgPrice30d");

            if (volEl) {
                volEl.textContent = Number(data.volatility || 0).toFixed(2);
            }

            if (avgEl) {
                avgEl.textContent =
                    "$" + Number(data.avg_price_30d || 0).toFixed(2);
            }

        })
        .catch(err => console.log("Analysis error:", err));
}

// ==============================
// DISTRIBUTION
// ==============================

function updateDistributionChart(prices) {

    if (!charts.distributionChart || !prices || prices.length === 0) return;

    const bins = 12;

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const step = (max - min || 1) / bins;

    const freq = new Array(bins).fill(0);

    prices.forEach(p => {
        let i = Math.floor((p - min) / step);
        if (i >= bins) i = bins - 1;
        freq[i]++;
    });

    const labels = freq.map((_, i) =>
        "$" + (min + i * step).toFixed(0)
    );

    charts.distributionChart.data.labels = labels;
    charts.distributionChart.data.datasets[0].data = freq;
    charts.distributionChart.update();
}