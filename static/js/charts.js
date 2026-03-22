console.log("charts.js loaded ✅");

function formatCurrency(value) {
    return "$" + Number(value || 0).toFixed(2);
}

function formatNumber(value, decimals = 2) {
    return Number(value || 0).toFixed(decimals);
}

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
// INIT CHARTS
// ==============================

function initializeCharts() {

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false
    };

    const priceCtx = document.getElementById("priceChart")?.getContext("2d");

    if (priceCtx) {
        charts.priceChart = new Chart(priceCtx, {
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
    }

    const corrCtx = document.getElementById("correlationChart")?.getContext("2d");

    if (corrCtx) {
        charts.correlationChart = new Chart(corrCtx, {
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
    }

    const volumeCtx = document.getElementById("volumeChart")?.getContext("2d");

    if (volumeCtx) {
        charts.volumeChart = new Chart(volumeCtx, {
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
    }

    const distCtx = document.getElementById("distributionChart")?.getContext("2d");

    if (distCtx) {
        charts.distributionChart = new Chart(distCtx, {
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
}

// ==============================
// LIVE UPDATE
// ==============================


function updateLive() {

    fetch("/api/live-gold-price")
    .then(res => res.json())
    .then(res => {

        const data = res.data || res;

        const price = Number(data.current || 0);
        const change = Number(data.change || 0);

        // ✅ SAFE DOM UPDATE (NO CRASH)
        const priceEl = document.getElementById("currentPriceCard");
        const changeEl = document.getElementById("priceChange24h");

        if (priceEl) {
            priceEl.textContent = formatCurrency(price);
        }

        if (changeEl) {
            changeEl.textContent =
                (change >= 0 ? "+" : "") + formatCurrency(change);
        }

        // ✅ CHART SAFE UPDATE
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
// HISTORICAL
// ==============================


function loadHistoricalData() {

    fetch("/api/historical-data")
    .then(res => res.json())
    .then(data => {

        console.log("HISTORICAL DATA:", data); // 🔍 DEBUG

        if (!data || !data.prices || data.prices.length === 0) return;

        // 🔹 PRICE CHART
        if (charts.priceChart) {
            charts.priceChart.data.labels = data.dates.slice(-60);
            charts.priceChart.data.datasets[0].data = data.prices.slice(-60);
            charts.priceChart.update();
        }

        // 🔹 VOLUME CHART (FIXED)
        if (charts.volumeChart) {

            const volumeData = data.volume && data.volume.length
                ? data.volume.slice(-30)
                : new Array(30).fill(0);

            charts.volumeChart.data.labels = data.dates.slice(-30);
            charts.volumeChart.data.datasets[0].data = volumeData;
            charts.volumeChart.update();
        }

        // 🔹 DISTRIBUTION (FIXED)
        if (data.prices.length > 0) {
            updateDistributionChart(data.prices);
        }

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

        charts.correlationChart.data.labels = Object.keys(data);
        charts.correlationChart.data.datasets[0].data = Object.values(data);

        charts.correlationChart.update();

    });
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
            volEl.textContent = formatNumber(data.volatility);
        }

        if (avgEl) {
            avgEl.textContent = formatCurrency(data.avg_price_30d);
        }

    });
}



// ==============================
// DISTRIBUTION CHART
// ==============================

function updateDistributionChart(prices) {

    if (!prices || prices.length === 0) return;
    if (!charts.distributionChart) return;

    const bins = 20;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (min === max) return;

    const binSize = (max - min) / bins;

    const histogram = new Array(bins).fill(0);
    const labels = [];

    for (let i = 0; i < bins; i++) {
        labels.push(
            "$" + (min + i * binSize).toFixed(0) +
            "-$" + (min + (i + 1) * binSize).toFixed(0)
        );
    }

    prices.forEach(price => {
        const idx = Math.min(
            Math.floor((price - min) / binSize),
            bins - 1
        );
        histogram[idx]++;
    });

    charts.distributionChart.data.labels = labels;
    charts.distributionChart.data.datasets[0].data = histogram;
    charts.distributionChart.update();
}
