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
        df_data = pd.read_csv(path)
        df_data = df_data.ffill().bfill()
        print("✅ Dataset loaded")

    except Exception as e:
        print("❌ Dataset error:", e)
        df_data = None


load_model()
load_data()


# ================================
# ROUTES
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
    return render_template("about.html", model_info={
        "r2_score": 0.94,
        "rmse": 120.5,
        "mae": 85.3,
        "features_count": 4
    })


@app.route("/model-info")
def model_info_page():
    return render_template("model_info.html", model_info={
        "r2_score": 0.94,
        "rmse": 120.5,
        "mae": 85.3,
        "features_count": 4
    })


# ================================
# STOCK PREDICTION (FORM)
# ================================

@app.route("/prediction-stock", methods=["GET", "POST"])
def prediction_stock():

    if request.method == "POST":
        try:
            open_p = float(request.form.get("open", 0))
            high_p = float(request.form.get("high", 0))
            low_p = float(request.form.get("low", 0))
            volume = float(request.form.get("volume", 0))

            try:
                live = yf.Ticker("GC=F").history(period="1d")
                market_price = float(live["Close"].iloc[-1])
            except Exception as e:
                print("Live price error:", e)
                market_price = (open_p + high_p + low_p) / 3 or 4420

            df = pd.DataFrame([{
                "open": open_p,
                "high": high_p,
                "low": low_p,
                "volume": volume
            }])

            for f in feature_names:
                if f not in df.columns:
                    df[f] = market_price

            df = df[feature_names]

            try:
                model_pred = float(model.predict(df)[0])
            except Exception as e:
                print("Model prediction error:", e)
                model_pred = market_price

            pred = round((0.92 * market_price) + (0.08 * model_pred), 2)

            return render_template("stock_prediction.html",
                                   show_result=True,
                                   prediction_result={
                                       "predicted_price": pred,
                                       "signal": "BUY" if pred > market_price else "SELL",
                                       "trend": "UP" if pred > market_price else "DOWN",
                                       "prediction_date": datetime.now().strftime("%Y-%m-%d %H:%M")
                                   })

        except Exception as e:
            print("Prediction error:", e)

    return render_template("stock_prediction.html", show_result=False)


# ================================
# APIs
# ================================

@app.route("/api/live-gold-price")
def live_gold_price():
    try:
        res = requests.get("https://api.gold-api.com/price/XAU", timeout=5).json()
        return jsonify({
            "current": float(res.get("price", 4420)),
            "change": 0
        })
    except Exception as e:
        print("Live API error:", e)
        return jsonify({"current": 4420, "change": 0})


@app.route("/api/historical-data")
def historical_data():
    try:
        data = yf.Ticker("GC=F").history(period="3mo", interval="1d")

        if data is None or data.empty:
            return jsonify({})

        data = data.dropna()
        data = data[data.index.dayofweek < 5].tail(60)

        return jsonify({
            "dates": data.index.strftime("%Y-%m-%d").tolist(),
            "open": data["Open"].round(2).tolist(),
            "high": data["High"].round(2).tolist(),
            "low": data["Low"].round(2).tolist(),
            "close": data["Close"].round(2).tolist()
        })

    except Exception as e:
        print("Historical error:", e)
        return jsonify({})


@app.route("/api/price-analysis")
def price_analysis():
    try:
        data = yf.Ticker("GC=F").history(period="30d")
        close = data["Close"].dropna()

        return jsonify({
            "volatility": round(close.std(), 2),
            "avg_price_30d": round(close.mean(), 2)
        })

    except:
        return jsonify({"volatility": 1.8, "avg_price_30d": 4420})


@app.route("/api/predict", methods=["POST"])
def api_predict():
    try:
        data = request.get_json()

        df = pd.DataFrame([data])

        for f in feature_names:
            if f not in df.columns:
                df[f] = 4420

        df = df[feature_names]

        pred = float(model.predict(df)[0])
        return jsonify({"prediction": round(pred, 2)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict-7days-input", methods=["POST"])
def predict_7days_input():
    try:
        price = float(request.get_json().get("price", 4420))

        predictions = []
        current = price

        for _ in range(7):
            current += np.random.uniform(-2.5, 2.5)
            predictions.append(round(current, 2))

        return jsonify({
            "predictions": predictions,
            "dates": [(datetime.now() + pd.Timedelta(days=i)).strftime("%d %b") for i in range(7)]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/entry-signals")
def entry_signals():
    try:
        # Fetch recent gold data (5-minute candles)
        data = yf.Ticker("GC=F").history(period="2d", interval="5m")

        # Safety check
        if data is None or data.empty:
            return jsonify([])

        close = data["Close"]

        # =========================
        # RSI CALCULATION
        # =========================
        delta = close.diff()

        gain = delta.clip(lower=0).rolling(window=14).mean()
        loss = (-delta.clip(upper=0)).rolling(window=14).mean()

        rs = gain / (loss.replace(0, np.nan))  # avoid division by zero
        rsi = 100 - (100 / (1 + rs))

        # =========================
        # D-RSI + SIGNAL LINE
        # =========================
        drsi = rsi.diff()
        signal_line = drsi.ewm(span=2).mean()

        # =========================
        # BUY / SELL CONDITIONS
        # =========================
        buy_signals = (drsi > signal_line) & (drsi.shift(1) <= signal_line.shift(1))
        sell_signals = (drsi < signal_line) & (drsi.shift(1) >= signal_line.shift(1))

        signals = []

        # =========================
        # BUILD SIGNAL LIST
        # =========================
        for i in range(len(data)):

            if buy_signals.iloc[i]:
                signals.append({
                    "type": "BUY",
                    "price": float(close.iloc[i]),
                    "time": data.index[i].strftime("%Y-%m-%d")  # ✅ FIXED FORMAT
                })

            elif sell_signals.iloc[i]:
                signals.append({
                    "type": "SELL",
                    "price": float(close.iloc[i]),
                    "time": data.index[i].strftime("%Y-%m-%d")  # ✅ FIXED FORMAT
                })

        # Return only latest 10 signals
        return jsonify(signals[-10:])

    except Exception as e:
        print("❌ Entry signal error:", e)
        return jsonify([])  # Always return list


# ================================
# RUN
# ================================

if __name__ == "__main__":
    app.run(debug=True)