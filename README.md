# 🪙 Gold Price Prediction & Analysis System

## 📌 Overview
This project is a web-based application that predicts and analyzes gold prices using machine learning and real-time financial data. It provides visualization, trading signals, and future forecasting to assist users in decision-making.

---

## 🚀 Features
- 📊 Real-time gold price tracking  
- 📉 Candlestick chart visualization  
- 🤖 Machine learning-based prediction  
- 🔮 7-day future forecasting  
- 📍 Entry/Exit trading signals (RSI-based)  
- 📡 API integration for live data  

---

## 🧠 Machine Learning Model
- Model: Ridge Regression  
- Features:
  - Open
  - High
  - Low
  - Volume  

### Prediction Logic:
- **Stock Prediction:**  
  Final Price = 92% Market Price + 8% Model Output  

- **Future Prediction:**  
  Next Price = 90% Current Price + 10% Model Output  

---

## 🧩 System Architecture

**Frontend:**
- HTML, CSS, Bootstrap  
- JavaScript (Chart.js)

**Backend:**
- Flask (Python)  
- Pandas, NumPy  

**APIs:**
- yFinance (GC=F)  
- Gold API  

---

## 📡 API Endpoints

### `/api/live-gold-price`
Returns current gold price and percentage change.

### `/api/historical-data`
Returns OHLC data for visualization.

### `/api/entry-signals`
Generates BUY/SELL signals using RSI.

### `/api/predict-7days-input`
Returns 7-day predicted prices.

---

## 📁 Project Structure

```
project/
│
├── app.py
├── models/
├── templates/
│   ├── index.html
│   ├── visualization.html
│   ├── future_prediction.html
│   ├── entry_levels.html
│   ├── about.html
│   └── model_info.html
│
├── static/
│   ├── js/
│   └── css/
│
└── dataset/
```

---

## ⚙️ Installation

```bash
git clone <repo-url>
cd project
pip install -r requirements.txt
python app.py
```

---

## 🌐 Usage
- Open browser → http://127.0.0.1:5000  
- Navigate through:
  - Visualization  
  - Prediction  
  - Entry Levels  
  - Future Prediction  

---

## ⚠️ Limitations
- Depends on external APIs  
- Does not include macroeconomic factors  
- Predictions are probabilistic, not guaranteed  

---

## 📈 Future Scope
- Deep Learning models (LSTM)  
- News sentiment analysis  
- Portfolio optimization  
- Real-time trading integration  

---

## 👨‍💻 Author
Final Year Major Project – Gold Price Prediction System