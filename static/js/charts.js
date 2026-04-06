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
// INIT CHARTS
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

    // ✅ PRICE CHART
    charts.priceChart = createChart("priceChart", {
        type: "candlestick",
        data: {
            datasets: [{
                label: "Gold Price",
                data: [],
                parsing: false,
                color: { up: "#26a69a", down: "#ef5350" }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false
        }
    });

    // ✅ OTHER CHARTS
    charts.correlationChart = createChart("correlationChart", {
        type: "bar",
        data: { labels: [], datasets: [{ data: [] }] }
    });

    charts.distributionChart = createChart("distributionChart", {
        type: "bar",
        data: { labels: [], datasets: [{ data: [] }] }
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

            const candles = data.dates.map((d, i) => ({
                x: new Date(d).getTime(),
                o: Number(data.open[i]),
                h: Number(data.high[i]),
                l: Number(data.low[i]),
                c: Number(data.close[i])
            }));

            if (charts.priceChart) {
                charts.priceChart.data.datasets[0].data = candles;
                charts.priceChart.update();
            }

            updateDistributionChart(data.close);
        })
        .catch(err => console.error("Historical error:", err));
}

// ==============================
// LIVE PRICE (FIXED)
// ==============================

function updateLive() {
    fetch("/api/live-gold-price")
        .then(res => res.json())
        .then(data => {

            const price = Number(data.current || 0);
            const change = Number(data.change || 0);

            const priceEl = document.getElementById("currentPriceCard");
            const changeEl = document.getElementById("priceChange24h");

            if (priceEl)
                priceEl.textContent = "$" + price.toFixed(2);

            if (changeEl)
                changeEl.textContent =
                    (change >= 0 ? "+" : "") + change.toFixed(2) + "%";
        })
        .catch(err => console.error("Live error:", err));
}

// ==============================
// CORRELATION (FIXED)
// ==============================

function loadCorrelationData() {
    fetch("/api/correlation-data")
        .then(res => res.json())
        .then(data => {

            if (!charts.correlationChart) return;

            charts.correlationChart.data.labels = Object.keys(data);
            charts.correlationChart.data.datasets[0].data = Object.values(data);
            charts.correlationChart.update();
        })
        .catch(err => console.error("Correlation error:", err));
}

// ==============================
// PRICE ANALYSIS (FIXED)
// ==============================

function loadPriceAnalysis() {
    fetch("/api/price-analysis")
        .then(res => res.json())
        .then(data => {

            const volEl = document.getElementById("volatility");
            const avgEl = document.getElementById("avgPrice30d");

            if (volEl)
                volEl.textContent = Number(data.volatility || 0).toFixed(2);

            if (avgEl)
                avgEl.textContent = "$" + Number(data.average || 0).toFixed(2);
        })
        .catch(err => console.error("Analysis error:", err));
}

// ==============================
// DISTRIBUTION
// ==============================

function updateDistributionChart(prices) {

    if (!charts.distributionChart || !prices) return;

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