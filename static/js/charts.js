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
// REGISTER CHART + CROSSHAIR
// ==============================

if (window.Chart && window['chartjs-chart-financial']) {
    Chart.register(...Chart.registerables);
}

// 🔥 CROSSHAIR PLUGIN (WORKING)
const crosshairPlugin = {
    id: "crosshair",

    afterDraw(chart) {
        const active = chart.tooltip?._active;

        if (!active || active.length === 0) return;

        const ctx = chart.ctx;
        const x = active[0].element.x;
        const y = active[0].element.y;

        const { top, bottom, left, right } = chart.chartArea;

        ctx.save();

        ctx.setLineDash([4, 4]); // dotted style

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.stroke();

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.stroke();

        ctx.restore();
    }
};

Chart.register(crosshairPlugin);

// ==============================
// INIT CHARTS
// ==============================

function initializeCharts() {

    const createChart = (id, config) => {
        const canvas = document.getElementById(id);
        if (!canvas) return null;
        return new Chart(canvas.getContext("2d"), config);
    };

    // 🔥 CANDLESTICK (FINAL PRO VERSION)
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

                tooltip: {
                    enabled: true,
                    intersect: false,
                    mode: "nearest",
                    callbacks: {
                        title: (items) => {
                            const d = new Date(items[0].raw.x);
                            return d.toDateString();
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
                    grid: { display: false }
                },

                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: value => "$" + value
                    }
                }
            }
        }
    });

    // CORRELATION
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
            plugins: { legend: { display: false } }
        }
    });

    // VOLUME
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
            plugins: { legend: { display: false } }
        }
    });

    // DISTRIBUTION
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
            plugins: { legend: { display: false } }
        }
    });
}

// ==============================
// HISTORICAL DATA
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

            charts.volumeChart.data.labels = data.dates.slice(-limit);
            charts.volumeChart.data.datasets[0].data = data.volume.slice(-limit);
            charts.volumeChart.update();

            updateDistributionChart(data.close);
        });
}

// ==============================
// LIVE
// ==============================

function updateLive() {

    fetch("/api/live-gold-price")
        .then(res => res.json())
        .then(res => {

            const price = Number(res.current || 0);
            const change = Number(res.change || 0);

            document.getElementById("currentPriceCard").textContent = "$" + price.toFixed(2);
            document.getElementById("priceChange24h").textContent =
                (change >= 0 ? "+" : "") + "$" + change.toFixed(2);
        });
}

// ==============================
// CORRELATION
// ==============================

function loadCorrelationData() {

    fetch("/api/correlation-data")
        .then(res => res.json())
        .then(data => {

            charts.correlationChart.data.labels = Object.keys(data);
            charts.correlationChart.data.datasets[0].data =
                Object.values(data).map(Number);

            charts.correlationChart.update();
        });
}

// ==============================
// ANALYSIS
// ==============================

function loadPriceAnalysis() {

    fetch("/api/price-analysis")
        .then(res => res.json())
        .then(data => {

            document.getElementById("volatility").textContent =
                Number(data.volatility).toFixed(2);

            document.getElementById("avgPrice30d").textContent =
                "$" + Number(data.avg_price_30d).toFixed(2);
        });
}

// ==============================
// DISTRIBUTION
// ==============================

function updateDistributionChart(prices) {

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