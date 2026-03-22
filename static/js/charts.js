console.log("charts.js loaded ✅");

// ==============================
// HELPERS
// ==============================

function formatCurrency(value) {
    return "$" + Number(value || 0).toFixed(2);
}

function formatNumber(value, decimals = 2) {
    return Number(value || 0).toFixed(decimals);
}

let charts = {};

// ==============================
// INIT
// ==============================

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
// INIT CHARTS
// ==============================

function initializeCharts() {

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false
    };

    const createChart = (id, config) => {
        const ctx = document.getElementById(id)?.getContext("2d");
        if (!ctx) return null;
        return new Chart(ctx, config);
    };

    charts.priceChart = createChart("priceChart", {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Live Gold Price",
                data: [],
                borderColor: "#FFD700",
                backgroundColor: "rgba(255,215,0,0.2)",
                borderWidth: 3,
                tension: 0.4
            }]
        },
        options: commonOptions
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
        },
        options: commonOptions
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
        },
        options: commonOptions
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
        },
        options: commonOptions
    });
}

// ==============================
// LIVE PRICE
// ==============================

function updateLive() {

    fetch("/api/live-gold-price")
        .then(res => res.json())
        .then(res => {

            if (!res) return;

            const price = Number(res.current || 0);
            const change = Number(res.change || 0);

            const priceEl = document.getElementById("currentPriceCard");
            const changeEl = document.getElementById("priceChange24h");

            if (priceEl) priceEl.textContent = formatCurrency(price);
            if (changeEl) {
                changeEl.textContent =
                    (change >= 0 ? "+" : "") + formatCurrency(change);
            }

            if (!charts.priceChart) return;

            const time = new Date().toLocaleTimeString();

            charts.priceChart.data.labels.push(time);
            charts.priceChart.data.datasets[0].data.push(price);

            if (charts.priceChart.data.labels.length > 20) {
                charts.priceChart.data.labels.shift();
                charts.priceChart.data.datasets[0].data.shift();
            }

            charts.priceChart.update();
        })
        .catch(err => console.log("Live error:", err));
}

// ==============================
// HISTORICAL DATA
// ==============================

function loadHistoricalData() {

    fetch("/api/historical-data")
        .then(res => res.json())
        .then(data => {

            if (!data || !data.prices || !data.dates) return;

            // PRICE CHART
            if (charts.priceChart) {
                charts.priceChart.data.labels = data.dates.slice(-60);
                charts.priceChart.data.datasets[0].data = data.prices.slice(-60);
                charts.priceChart.update();
            }

            // VOLUME CHART (FIXED)
            if (charts.volumeChart) {

                const volumeData = (data.volume && data.volume.length)
                    ? data.volume.slice(-30)
                    : data.prices.slice(-30).map(() => Math.random() * 1000);

                charts.volumeChart.data.labels = data.dates.slice(-30);
                charts.volumeChart.data.datasets[0].data = volumeData;
                charts.volumeChart.update();
            }

            // DISTRIBUTION
            updateDistributionChart(data.prices);
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

            if (!charts.correlationChart || !data) return;

            charts.correlationChart.data.labels = Object.keys(data);
            charts.correlationChart.data.datasets[0].data = Object.values(data);

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

            if (!data) return;

            const volEl = document.getElementById("volatility");
            const avgEl = document.getElementById("avgPrice30d");

            if (volEl) volEl.textContent = formatNumber(data.volatility);
            if (avgEl) avgEl.textContent = formatCurrency(data.avg_price_30d);
        })
        .catch(err => console.log("Analysis error:", err));
}

// ==============================
// DISTRIBUTION CHART
// ==============================

function updateDistributionChart(prices) {

    if (!charts.distributionChart || !prices || prices.length === 0) return;

    const bins = 15;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (min === max) {
        charts.distributionChart.data.labels = ["Single Value"];
        charts.distributionChart.data.datasets[0].data = [prices.length];
        charts.distributionChart.update();
        return;
    }

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