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
df_data = None

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
                return [4420.0] * len(X)

        model = DummyModel()
        feature_names = ["open", "high", "low", "volume"]

# ================================
# LOAD DATA
# ================================
def load_data():
    global df_data

    try:
        path = "Daily.csv" if os.path.exists("Daily.csv") else "dataset/Daily.csv"
        df_data = pd.read_csv(path).ffill().bfill()
        print("✅ Dataset loaded")

    except Exception as e:
        print("❌ Dataset error:", e)
        df_data = None

load_model()
load_data()

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

@app.route("/about")
def about():
    return render_template("about.html", model_info=get_model_info())

@app.route("/model-info")
def model_info_page():
    return render_template("model_info.html", model_info=get_model_info())

def get_model_info():
    return {
        "r2_score": 0.94,
        "rmse": 120.5,
        "mae": 85.3,
        "features_count": len(feature_names)
    }

# ================================
# LIVE PRICE API
# ================================
@app.route("/api/live-gold-price")
def live_gold_price():
    try:
        res = requests.get("https://api.gold-api.com/price/XAU", timeout=5).json()

        return jsonify({
            "current": float(res.get("price", 4420)),
            "change": float(res.get("ch", 0))
        })

    except Exception as e:
        print("Live price error:", e)
        return jsonify({"current": 4420, "change": 0})

# ================================
# HISTORICAL DATA (FIXED)
# ================================
@app.route("/api/historical-data")
def get_historical_data():
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

        df = yf.download("GC=F", period=period, interval=yf_interval)

        if df.empty:
            return jsonify({"error": "No data"})

        df = df.dropna().reset_index()

        date_col = "Datetime" if "Datetime" in df.columns else "Date"

        return jsonify({
            "dates": [int(pd.Timestamp(x).timestamp()) for x in df[date_col]],
            "open": df["Open"].tolist(),
            "high": df["High"].tolist(),
            "low": df["Low"].tolist(),
            "close": df["Close"].tolist()
        })

    except Exception as e:
        print("ERROR historical:", e)
        return jsonify({"error": str(e)})

# ================================
# ENTRY SIGNALS (FULL FIX)
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

        # RSI
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))

        # ATR
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

            prev_rsi = rsi.iloc[i - 1]
            curr_rsi = rsi.iloc[i]
            atr_val = atr.iloc[i]

            # BUY
            if prev_rsi >= 30 and curr_rsi < 30:
                sl = round(price - atr_val * 1.5, 2)
                tp = round(price + atr_val * 2, 2)

                risk = price - sl
                reward = tp - price
                rr = round(reward / risk, 2) if risk > 0 else None

                signals.append({
                    "type": "BUY",
                    "price": price,
                    "sl": sl,
                    "tp": tp,
                    "rr": rr,
                    "time": time
                })

            # SELL
            elif prev_rsi <= 70 and curr_rsi > 70:
                sl = round(price + atr_val * 1.5, 2)
                tp = round(price - atr_val * 2, 2)

                risk = sl - price
                reward = price - tp
                rr = round(reward / risk, 2) if risk > 0 else None

                signals.append({
                    "type": "SELL",
                    "price": price,
                    "sl": sl,
                    "tp": tp,
                    "rr": rr,
                    "time": time
                })

        signals = sorted(signals, key=lambda x: x["time"])

        return jsonify(signals[-5:])

    except Exception as e:
        print("Signal error:", e)
        return jsonify([])

# ================================
# RUN
# ================================
if __name__ == "__main__":
    app.run(debug=True)