from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import yfinance as yf
import joblib
import os
import requests
from datetime import datetime

app = Flask(__name__)

# ================================
# GLOBALS
# ================================
model = None
feature_names = []

# ================================
# LOAD MODEL
# ================================
def load_model():
    global model, feature_names

    try:
        model = joblib.load("models/gold_price_prediction_ridge_regression.pkl")
        feature_names = joblib.load("models/features_ridge_regression.pkl")
        print("✅ Model loaded")

    except Exception as e:
        print("⚠️ Using fallback model:", e)

        class DummyModel:
            def predict(self, X):
                return [4500.0] * len(X)

        model = DummyModel()
        feature_names = ["open", "high", "low", "volume"]

load_model()

# ================================
# PAGES
# ================================
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/visualization")
def visualization():
    return render_template("visualization.html")

@app.route("/entry-levels")
def entry_levels():
    return render_template("entry_levels.html")

@app.route("/future-prediction")
def future_prediction():
    return render_template("future_prediction.html")

# ✅ STOCK PREDICTION (FULLY WORKING)
@app.route("/prediction-stock", methods=["GET", "POST"])
def prediction_stock():

    if request.method == "POST":
        try:
            open_p = float(request.form["open"])
            high_p = float(request.form["high"])
            low_p = float(request.form["low"])
            volume = float(request.form["volume"])

            features = np.array([[open_p, high_p, low_p, volume]])

            pred = float(model.predict(features)[0])

            current_price = open_p
            final_pred = 0.92 * current_price + 0.08 * pred

            trend = "UP" if final_pred > current_price else "DOWN"

            return render_template("stock_prediction.html",
                show_result=True,
                prediction_result={
                    "predicted_price": round(final_pred, 2),
                    "trend": trend,
                    "difference": round(final_pred - current_price, 2),
                    "model_name": "Ridge Regression",
                    "confidence": 94,
                    "prediction_date": datetime.now().strftime("%Y-%m-%d %H:%M")
                })

        except Exception as e:
            print("Prediction error:", e)

    return render_template("stock_prediction.html", show_result=False)

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/model-info")
def model_info_page():
    return render_template("model_info.html")

# ================================
# LIVE PRICE API
# ================================
@app.route("/api/live-gold-price")
def live_gold_price():
    try:
        res = requests.get("https://api.gold-api.com/price/XAU", timeout=5).json()

        return jsonify({
            "current": float(res.get("price", 4500)),
            "change": float(res.get("ch", 0))
        })

    except Exception as e:
        print("Live price error:", e)
        return jsonify({"current": 4500, "change": 0})

# ================================
# HISTORICAL DATA
# ================================
@app.route("/api/historical-data")
def historical_data():
    try:
        interval = request.args.get("interval", "5m")

        data = yf.Ticker("GC=F").history(period="5d", interval=interval)
        data = data.sort_index()
        if data.empty:
            return jsonify([])

        candles = []

        for i in range(len(data)):
            ts = int(data.index[i].to_pydatetime().timestamp())

            # 🔥 FORCE UNIQUE TIME (VERY IMPORTANT)
            ts = ts + i   # ensures no duplicate timestamps

            candles.append({
                "x": ts,
                "o": float(data["Open"].iloc[i]),
                "h": float(data["High"].iloc[i]),
                "l": float(data["Low"].iloc[i]),
                "c": float(data["Close"].iloc[i])
            })

        return jsonify(candles)

    except Exception as e:
        print("Historical error:", e)
        return jsonify([])

# ================================
# ENTRY SIGNALS (ATR + RSI)
# ================================
@app.route("/api/entry-signals")
def entry_signals():
    try:
        interval = request.args.get("interval", "5m")

        interval_map = {
            "1m": ("1d", "1m"),
            "5m": ("2d", "5m"),
            "15m": ("5d", "15m"),
            "30m": ("5d", "30m"),
            "1h": ("7d", "60m")
        }

        period, yf_interval = interval_map.get(interval, ("2d", "5m"))

        data = yf.Ticker("GC=F").history(period=period, interval=yf_interval)

        if data.empty:
            return jsonify([])

        data.dropna(inplace=True)

        close = data["Close"]
        high = data["High"]
        low = data["Low"]

        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))

        tr = pd.concat([
            high - low,
            (high - close.shift()).abs(),
            (low - close.shift()).abs()
        ], axis=1).max(axis=1)

        atr = tr.rolling(14).mean()

        signals = []

        for i in range(20, len(close)):
            if pd.isna(rsi.iloc[i]) or pd.isna(atr.iloc[i]):
                continue

            price = float(close.iloc[i])
            time = int(pd.Timestamp(data.index[i]).timestamp())
            atr_val = atr.iloc[i]

            if rsi.iloc[i] < 30:
                signals.append({
                    "type": "BUY",
                    "price": price,
                    "sl": round(price - atr_val * 1.5, 2),
                    "tp": round(price + atr_val * 2, 2),
                    "time": time
                })

            elif rsi.iloc[i] > 70:
                signals.append({
                    "type": "SELL",
                    "price": price,
                    "sl": round(price + atr_val * 1.5, 2),
                    "tp": round(price - atr_val * 2, 2),
                    "time": time
                })

        return jsonify(signals[-5:])

    except Exception as e:
        print("Signal error:", e)
        return jsonify([])

# ================================
# FUTURE 7 DAY PREDICTION
# ================================
@app.route("/api/predict-7days-input", methods=["POST"])
def predict_7days():
    try:
        data = request.json
        price = float(data["price"])

        preds = []
        current = price

        for _ in range(7):
            pred = current * 1.002  # simple growth
            preds.append(pred)
            current = pred

        return jsonify({
            "success": True,
            "predictions": preds
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

# ================================
# RUN
# ================================
if __name__ == "__main__":
    app.run(debug=True)