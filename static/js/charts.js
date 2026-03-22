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
// REGISTER
// ==============================

if (window.Chart && window['chartjs-chart-financial']) {
    Chart.register(...Chart.registerables);
}

// ==============================
// INIT
// ==============================

function initializeCharts() {

    const createChart = (id, config) => {
        const canvas = document.getElementById(id);
        if (!canvas) return null;

        if (charts[id]) {
            charts[id].destroy();
        }

        const chart = new Chart(canvas.getContext("2d"), config);
        charts[id] = chart;
        return chart;
    };

    charts.priceChart = createChart("priceChart", {
        type: "candlestick",
        data: {
            datasets: [{
                label: "Gold Price",
                data: [],
                parsing: false,
                color: { up: "#26a69a", down: "#ef5350" },
                borderColor: { up: "#26a69a", down: "#ef5350" }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,

            plugins: {
                legend: { display: false },

                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const d = new Date(items[0].raw.x);
                            return d.toDateString();
                        },
                        label: (ctx) => {
                            const d = ctx.raw;
                            return [
                                `Open : $${d.o}`,
                                `High : $${d.h}`,
                                `Low  : $${d.l}`,
                                `Close: $${d.c}`
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
                        displayFormats: { day: "MMM dd" }
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 6
                    }
                },
                y: {
                    ticks: {
                        callback: v => "$" + v
                    }
                }
            }
        }
    });

    charts.correlationChart = createChart("correlationChart", {
        type: "bar",
        data: { labels: [], datasets: [{ data: [] }] }
    });

    charts.volumeChart = createChart("volumeChart", {
        type: "bar",
        data: { labels: [], datasets: [{ data: [] }] }
    });

    charts.distributionChart = createChart("distributionChart", {
        type: "bar",
        data: { labels: [], datasets: [{ data: [] }] }
    });
}

// ==============================
// 🔥 FIXED DATA LOAD
// ==============================

function loadHistoricalData() {

    fetch("/api/historical-data")
        .then(res => res.json())
        .then(data => {

            if (!data || !data.dates) return;

            const candles = [];
            const limit = 25;

            const start = Math.max(0, data.dates.length - limit);

            for (let i = start; i < data.dates.length; i++) {
                candles.push({
                    x: new Date(data.dates[i]).getTime(), // 🔥 FIX HERE
                    o: Number(data.open[i]),
                    h: Number(data.high[i]),
                    l: Number(data.low[i]),
                    c: Number(data.close[i])
                });
            }

            charts.priceChart.data.datasets[0].data = candles;
            charts.priceChart.update("none");

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

            document.getElementById("currentPriceCard").textContent =
                "$" + price.toFixed(2);

            document.getElementById("priceChange24h").textContent =
                (change >= 0 ? "+" : "") + "$" + change.toFixed(2);
        });
}

// ==============================
// OTHER
// ==============================

function loadCorrelationData() {
    fetch("/api/correlation-data")
        .then(res => res.json())
        .then(data => {
            charts.correlationChart.data.labels = Object.keys(data);
            charts.correlationChart.data.datasets[0].data = Object.values(data);
            charts.correlationChart.update();
        });
}

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

    charts.distributionChart.data.labels =
        freq.map((_, i) => "$" + (min + i * step).toFixed(0));

    charts.distributionChart.data.datasets[0].data = freq;
    charts.distributionChart.update();
}