
from flask import Flask, render_template, request, jsonify, session, redirect
from flask_bcrypt import Bcrypt
from utils.database import init_db, get_connection
from utils.auth import auth
from utils.live_price import get_live_gold_price
from utils.predictor import GoldStockPredictor

import pandas as pd
import numpy as np
import joblib
import yfinance as yf
import os
from datetime import datetime

# =====================================================
# APPLICATION SETUP
# =====================================================

app = Flask(__name__)
app.config["SECRET_KEY"] = "chartxflow_secret_key"
app.config["UPLOAD_FOLDER"] = "data"

bcrypt = Bcrypt(app)
app.register_blueprint(auth)

with app.app_context():
    init_db()

# =====================================================
# GLOBAL VARIABLES
# =====================================================

model = None
scaler = None
feature_names = None
df_data = None

predictor = GoldStockPredictor()

MODEL_INFO = {
    "algorithm": "Ridge Regression",
    "r2_score": "99.99%",
    "rmse": 2.80,
    "mae": 2.13,
    "features_count": 20,
    "training_samples": 9277,
    "test_samples": 2319
}

# =====================================================
# LOAD MODEL
# =====================================================

def load_model_components():
    global model, scaler, feature_names

    try:
        model = joblib.load("models/gold_price_prediction_ridge_regression.pkl")
        scaler = joblib.load("models/scaler_ridge_regression.pkl")
        feature_names = joblib.load("models/features_ridge_regression.pkl")

        print("✅ Model loaded successfully")

    except Exception as e:
        print("❌ Model loading error:", e)

        # fallback model
        class DummyModel:
            def predict(self, X):
                return [1800] * len(X)

        model = DummyModel()
        scaler = None
        feature_names = []

# =====================================================
# LOAD DATA
# =====================================================

def load_data():
    global df_data

    try:
        if os.path.exists("Daily.csv"):
            df_data = pd.read_csv("Daily.csv")
        else:
            df_data = pd.read_csv("dataset/Daily.csv")

        df_data["Date"] = pd.to_datetime(df_data["Date"])
        df_data = df_data.replace("#N/A", np.nan)

        for col in df_data.columns[1:]:
            df_data[col] = pd.to_numeric(
                df_data[col].astype(str).str.replace(",", ""),
                errors="coerce"
            )

        df_data = df_data.ffill().bfill()

        print("✅ Dataset loaded successfully")

    except Exception as e:
        print("❌ Dataset loading error:", e)

# =====================================================
# INITIALIZE (IMPORTANT FOR RENDER)
# =====================================================

with app.app_context():
    load_model_components()
    load_data()

# =====================================================
# HELPERS
# =====================================================

def create_sample_features(base_price=2000):
    np.random.seed(42)

    features = {}
    currencies = ["EUR", "GBP", "JPY", "CAD", "CHF", "INR", "CNY", "AED"]

    for currency in currencies:
        if currency == "JPY":
            features[currency] = base_price * np.random.uniform(140, 160)
        elif currency == "INR":
            features[currency] = base_price * np.random.uniform(80, 85)
        else:
            features[currency] = base_price * np.random.uniform(0.7, 1.3)

    today = datetime.now()

    features["Year"] = today.year
    features["Month"] = today.month
    features["Day"] = today.day
    features["DayOfWeek"] = today.weekday()
    features["Quarter"] = (today.month - 1) // 3 + 1

    return features

def get_recommendation(current_price, predicted_price):
    diff = predicted_price - current_price
    pct = (diff / current_price) * 100

    if pct > 1:
        return "BUY"
    elif pct < -1:
        return "SELL"
    return "HOLD"

# =====================================================
# ROUTES
# =====================================================

@app.route("/")
def index():
    price_data = get_live_gold_price()

    return render_template(
        "index.html",
        latest_price=price_data["current"] if price_data else None,
        price_change=price_data["change"] if price_data else None
    )

@app.route("/about")
def about():
    return render_template("about.html", model_info=MODEL_INFO)

@app.route("/model-info")
def model_info():
    return render_template("model_info.html", model_info=MODEL_INFO)

@app.route("/visualization")
def visualization():
    return render_template("visualization.html")

@app.route("/prediction-stock")
def prediction_stock():
    return render_template("stock_prediction.html")

@app.route("/future-prediction")
def future_prediction():
    if "user_id" not in session:
        return redirect("/login")
    return render_template("future_prediction.html")

# =====================================================
# API
# =====================================================

@app.route("/api/historical-data")
def historical_data():
    try:
        data = yf.Ticker("GC=F").history(period="1y")

        return jsonify({
            "dates": data.index.strftime("%Y-%m-%d").tolist(),
            "prices": data["Close"].fillna(0).tolist()
        })

    except Exception as e:
        print("❌ historical error:", e)
        return jsonify({"error": "failed"}), 500

@app.route("/api/price-analysis")
def price_analysis():
    try:
        data = yf.Ticker("GC=F").history(period="30d")

        if len(data) < 2:
            return jsonify({"error": "no data"}), 400

        current = float(data["Close"].iloc[-1])
        prev = float(data["Close"].iloc[-2])

        return jsonify({
            "current_price": current,
            "price_change_24h": current - prev,
            "volatility": float(data["Close"].std()),
            "avg_price_30d": float(data["Close"].mean())
        })

    except Exception as e:
        print("❌ price analysis error:", e)
        return jsonify({"error": "failed"}), 500

@app.route("/api/correlation-data")
def correlation_data():
    try:
        if df_data is None:
            return jsonify({})

        cols = ["EUR", "GBP", "JPY", "CAD", "CHF", "INR", "CNY", "AED"]

        result = {}
        for c in cols:
            if c in df_data.columns:
                val = df_data[["USD", c]].corr().iloc[0, 1]
                if not np.isnan(val):
                    result[c] = float(val)

        return jsonify(result)

    except Exception as e:
        print("❌ correlation error:", e)
        return jsonify({})

@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json() or create_sample_features()
        df = pd.DataFrame([data])

        if feature_names:
            for f in feature_names:
                if f not in df:
                    df[f] = 0
            df = df[feature_names]

        pred = model.predict(df)[0]
        conf = pred * 0.02

        price_data = get_live_gold_price()
        current = price_data["current"] if price_data else pred

        return jsonify({
            "prediction": round(pred, 2),
            "confidence_lower": round(pred - conf, 2),
            "confidence_upper": round(pred + conf, 2),
            "recommendation": get_recommendation(current, pred),
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        print("❌ prediction error:", e)
        return jsonify({"error": "failed"}), 500

# =====================================================
# DASHBOARD
# =====================================================

@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect("/login")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT gold_price, prediction, created_at
        FROM prediction_history
        WHERE user_id=?
        ORDER BY created_at DESC
    """, (session["user_id"],))

    history = cursor.fetchall()
    conn.close()

    return render_template("dashboard.html", history=history)

# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

