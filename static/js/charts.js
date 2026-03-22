console.log("charts.js loaded ✅");

let charts = {};

// ==============================
// INIT ON LOAD
// ==============================

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
// CROSSHAIR
// ==============================

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
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.stroke();

        ctx.restore();
    }
};

Chart.register(crosshairPlugin);

// ==============================
// INIT CHARTS (DESTROY FIX)
// ==============================

function initializeCharts() {

    const createChart = (id, config) => {

        const canvas = document.getElementById(id);
        if (!canvas) return null;

        // 🔥 DESTROY OLD CHART
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
                color: { up: "#26a69a", down: "#ef5350" },
                borderColor: { up: "#26a69a", down: "#ef5350" }
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
                    time: { unit: "day" },
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
// HISTORICAL (CRITICAL FIX)
// ==============================

function loadHistoricalData() {

    fetch("/api/historical-data")
        .then(res => res.json())
        .then(data => {

            if (!data || !data.dates) return;

            const candles = [];

            const limit = 20;
            const start = Math.max(0, data.dates.length - limit);

            for (let i = start; i < data.dates.length; i++) {
                candles.push({
                    x: new Date(data.dates[i]),
                    o: +data.open[i],
                    h: +data.high[i],
                    l: +data.low[i],
                    c: +data.close[i]
                });
            }

            // 🔥 RESET DATA (MOST IMPORTANT LINE)
            charts.priceChart.data.datasets[0].data = [];

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