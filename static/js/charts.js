console.log("charts.js loaded ✅");

let charts = {};

document.addEventListener("DOMContentLoaded", () => {

    console.log("DOM ready ✅");

    initializeCharts();

    loadHistoricalData();
    loadCorrelationData();
    loadPriceAnalysis();

    updateLive();
    setInterval(updateLive, 5000);
});

// ==============================
// INIT CHARTS (CANDLESTICK)
// ==============================

function initializeCharts() {

    const createChart = (id, config) => {
        const ctx = document.getElementById(id)?.getContext("2d");
        if (!ctx) return null;
        return new Chart(ctx, config);
    };

    // 🔥 CANDLESTICK CHART
    charts.priceChart = createChart("priceChart", {
        type: "candlestick",
        data: {
            datasets: [{
                label: "Gold Price",
                data: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    charts.correlationChart = createChart("correlationChart", {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Correlation",
                data: [],
                backgroundColor: "#36A2EB"
            }]
        }
    });

    charts.volumeChart = createChart("volumeChart", {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Volume",
                data: [],
                backgroundColor: "#4BC0C0"
            }]
        }
    });

    charts.distributionChart = createChart("distributionChart", {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Frequency",
                data: [],
                backgroundColor: "#9966FF"
            }]
        }
    });
}

// ==============================
// LIVE PRICE (NO CANDLE UPDATE)
// ==============================

function updateLive() {

    fetch("/api/live-gold-price")
        .then(res => res.json())
        .then(res => {

            const price = Number(res.current || 0);
            const change = Number(res.change || 0);

            const priceEl = document.getElementById("currentPriceCard");
            const changeEl = document.getElementById("priceChange24h");

            if (priceEl) priceEl.textContent = "$" + price.toFixed(2);

            if (changeEl) {
                changeEl.textContent =
                    (change >= 0 ? "+" : "") + "$" + change.toFixed(2);
            }

        })
        .catch(err => console.log("Live error:", err));
}

// ==============================
// HISTORICAL → CANDLE DATA
// ==============================

function loadHistoricalData() {

    fetch("/api/historical-data")
        .then(res => res.json())
        .then(data => {

            if (!data || !data.open) return;

            // 🔥 CANDLE FORMAT
            const candles = data.dates.map((d, i) => ({
                x: d,
                o: data.open[i],
                h: data.high[i],
                l: data.low[i],
                c: data.close[i]
            }));

            // PRICE CHART
            if (charts.priceChart) {
                charts.priceChart.data.datasets[0].data = candles;
                charts.priceChart.update();
            }

            // VOLUME
            if (charts.volumeChart) {
                charts.volumeChart.data.labels = data.dates.slice(-30);
                charts.volumeChart.data.datasets[0].data = data.volume.slice(-30);
                charts.volumeChart.update();
            }

            // DISTRIBUTION (use CLOSE)
            updateDistributionChart(data.close);

        })
        .catch(err => console.log("Historical error:", err));
}

// ==============================
// CORRELATION
// ==============================

function loadCorrelationData() {

    fetch("/api/correlation-data")
        .then(res => res.json())
        .then(data => {

            if (!charts.correlationChart) return;

            const labels = Object.keys(data);
            const values = Object.values(data).map(v => {
                const num = Number(v);
                return isNaN(num) ? 0.9 : num;
            });

            charts.correlationChart.data.labels = labels;
            charts.correlationChart.data.datasets[0].data = values;

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
                avgEl.textContent = "$" + Number(data.avg_price_30d || 0).toFixed(2);
            }

        })
        .catch(err => console.log("Analysis error:", err));
}

// ==============================
// DISTRIBUTION
// ==============================

function updateDistributionChart(prices) {

    if (!charts.distributionChart || !prices || prices.length === 0) return;

    const bins = 15;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const step = (max - min) / bins;
    const freq = new Array(bins).fill(0);

    prices.forEach(price => {
        let index = Math.floor((price - min) / step);
        if (index >= bins) index = bins - 1;
        freq[index]++;
    });

    const labels = freq.map((_, i) =>
        "$" + (min + i * step).toFixed(0)
    );

    charts.distributionChart.data.labels = labels;
    charts.distributionChart.data.datasets[0].data = freq;
    charts.distributionChart.update();
}