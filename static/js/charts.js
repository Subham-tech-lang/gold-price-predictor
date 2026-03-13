function formatCurrency(value){
return "$"+Number(value).toFixed(2)
}

function formatNumber(value,decimals=2){
return Number(value).toFixed(decimals)
}

let charts={}

document.addEventListener("DOMContentLoaded",function(){

initializeCharts()
loadPredictionComparison()
loadHistoricalData()
loadCorrelationData()
loadPriceAnalysis()

setInterval(loadPredictionComparison,5000)

})

function initializeCharts(){

const commonOptions={
responsive:true,
maintainAspectRatio:false
}

const priceCtx=document.getElementById("priceChart").getContext("2d")

charts.priceChart=new Chart(priceCtx,{
type:"line",
data:{
labels:[],
datasets:[{
label:"Gold Price (USD)",
data:[],
borderColor:"#FFD700",
backgroundColor:"rgba(255,215,0,0.2)",
borderWidth:3,
tension:0.4
}]
},
options:commonOptions
})

const corrCtx=document.getElementById("correlationChart").getContext("2d")

charts.correlationChart=new Chart(corrCtx,{
type:"bar",
data:{
labels:[],
datasets:[{
label:"Correlation",
data:[],
backgroundColor:"#36A2EB"
}]
},
options:commonOptions
})

const volumeCtx=document.getElementById("volumeChart").getContext("2d")

charts.volumeChart=new Chart(volumeCtx,{
type:"bar",
data:{
labels:[],
datasets:[{
label:"Volume",
data:[],
backgroundColor:"#4BC0C0"
}]
},
options:commonOptions
})

const distCtx=document.getElementById("distributionChart").getContext("2d")

charts.distributionChart=new Chart(distCtx,{
type:"bar",
data:{
labels:[],
datasets:[{
label:"Frequency",
data:[],
backgroundColor:"#9966FF"
}]
},
options:commonOptions
})

}

function loadHistoricalData(){

fetch("/api/historical-data")

.then(res=>res.json())

.then(data=>{

charts.priceChart.data.labels=data.dates.slice(-90)
charts.priceChart.data.datasets[0].data=data.prices.slice(-90)
charts.priceChart.update()

charts.volumeChart.data.labels=data.dates.slice(-30)
charts.volumeChart.data.datasets[0].data=data.volume.slice(-30)
charts.volumeChart.update()

updateDistributionChart(data.prices)

})

.catch(err=>console.log("historical error",err))

}

function loadCorrelationData(){

fetch("/api/correlation-data")

.then(res=>res.json())

.then(data=>{

charts.correlationChart.data.labels=Object.keys(data)
charts.correlationChart.data.datasets[0].data=Object.values(data)
charts.correlationChart.update()

})

.catch(err=>console.log("correlation error",err))

}

function loadPriceAnalysis(){

fetch("/api/price-analysis")

.then(res=>res.json())

.then(data=>{

document.getElementById("currentPriceCard").textContent=
formatCurrency(data.current_price)

document.getElementById("priceChange24h").textContent=
(data.price_change_24h>=0?"+":"")+formatCurrency(data.price_change_24h)

document.getElementById("volatility").textContent=
formatNumber(data.volatility)

document.getElementById("avgPrice30d").textContent=
formatCurrency(data.avg_price_30d)

})

.catch(err=>console.log("price analysis error",err))

}

function updateDistributionChart(prices){

const bins=20

const min=Math.min(...prices)
const max=Math.max(...prices)

const binSize=(max-min)/bins

const histogram=new Array(bins).fill(0)
const labels=[]

for(let i=0;i<bins;i++){

labels.push(
"$"+(min+i*binSize).toFixed(0)+"-$"+(min+(i+1)*binSize).toFixed(0)
)

}

prices.forEach(price=>{

const index=Math.min(Math.floor((price-min)/binSize),bins-1)

histogram[index]++

})

charts.distributionChart.data.labels=labels
charts.distributionChart.data.datasets[0].data=histogram
charts.distributionChart.update()

}

setInterval(updateLiveDashboard, 5000);

function updateLiveDashboard(){

fetch("/api/price-analysis")

.then(response => response.json())

.then(data => {

document.getElementById("currentPriceCard").textContent =
"$" + data.current_price.toFixed(2)

document.getElementById("priceChange24h").textContent =
(data.price_change_24h >= 0 ? "+" : "") +
"$" + data.price_change_24h.toFixed(2)

document.getElementById("volatility").textContent =
data.volatility.toFixed(2)

document.getElementById("avgPrice30d").textContent =
"$" + data.avg_price_30d.toFixed(2)

})

.catch(error => console.log(error))

}

function loadPredictionComparison(){

fetch("/api/prediction-vs-real")

.then(response => response.json())

.then(data => {

const ctx = document.getElementById("priceChart")

charts.priceChart.data.labels = data.dates

charts.priceChart.data.datasets = [

{
label: "Real Gold Price",
data: data.real,
borderColor: "#FFD700",
backgroundColor: "rgba(255,215,0,0.15)",
borderWidth: 3,
tension: 0.4
},

{
label: "Predicted Price",
data: data.predicted,
borderColor: "#00e6b8",
backgroundColor: "rgba(0,230,184,0.05)",
borderWidth: 2,
borderDash: [6,4],
tension: 0.4
},

{
label: "Confidence",
data: data.upper,
borderColor: "transparent",
backgroundColor: "rgba(0,230,184,0.15)",
pointRadius: 0,
fill: "+1"
},

{
data: data.lower,
borderColor: "transparent",
pointRadius: 0
}

]

charts.priceChart.update()

})

}