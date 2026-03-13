from flask import Flask, render_template, request, jsonify, session, redirect
from flask_bcrypt import Bcrypt

from utils.database import get_connection
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

# register authentication blueprint
app.register_blueprint(auth)


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
# LOAD MACHINE LEARNING MODEL
# =====================================================

def load_model_components():
    global model, scaler, feature_names

    try:
        model = joblib.load("models/gold_price_prediction_ridge_regression.pkl")
        scaler = joblib.load("models/scaler_ridge_regression.pkl")
        feature_names = joblib.load("models/features_ridge_regression.pkl")

        print("Model loaded successfully")

    except Exception as e:
        print("Model loading error:", e)


# =====================================================
# LOAD DATASET
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

        print("Dataset loaded successfully")

    except Exception as e:
        print("Dataset loading error:", e)


# =====================================================
# SAMPLE FEATURE GENERATOR
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


# =====================================================
# INITIALIZE APPLICATION
# =====================================================

def initialize_app():
    load_model_components()
    load_data()


# =====================================================
# BUY / SELL RECOMMENDATION
# =====================================================

def get_recommendation(current_price, predicted_price):

    difference = predicted_price - current_price
    percent_change = (difference / current_price) * 100

    if percent_change > 1:
        return "BUY"

    elif percent_change < -1:
        return "SELL"

    return "HOLD"


# =====================================================
# ROUTES
# =====================================================

@app.route("/")
def index():

    price_data = get_live_gold_price()

    latest_price = None
    price_change = None

    if price_data:
        latest_price = price_data["current"]
        price_change = price_data["change"]

    return render_template(
        "index.html",
        latest_price=latest_price,
        price_change=price_change
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
# API : LIVE GOLD PRICE
# =====================================================

@app.route("/api/live-gold-price")
def live_gold_price():

    price = get_live_gold_price()

    if price:
        return jsonify({
            "status": "success",
            "data": price
        })

    return jsonify({
        "status": "error",
        "message": "Unable to fetch price"
    })


# =====================================================
# API : HISTORICAL DATA
# =====================================================

@app.route("/api/historical-data")
def historical_data():

    gold = yf.Ticker("GC=F")

    data = gold.history(period="1y", interval="1d")

    dates = data.index.strftime("%Y-%m-%d").tolist()
    prices = data["Close"].tolist()

    return jsonify({
        "dates": dates,
        "prices": prices
    })


# =====================================================
# API : PRICE ANALYSIS
# =====================================================

@app.route("/api/price-analysis")
def price_analysis():

    gold = yf.Ticker("GC=F")

    data = gold.history(period="30d", interval="1d")

    current_price = float(data["Close"].iloc[-1])
    prev_price = float(data["Close"].iloc[-2])

    price_change_24h = current_price - prev_price

    return jsonify({
        "current_price": current_price,
        "price_change_24h": price_change_24h,
        "volatility": float(data["Close"].std()),
        "avg_price_30d": float(data["Close"].mean())
    })


# =====================================================
# API : CURRENCY CORRELATION
# =====================================================

@app.route("/api/correlation-data")
def correlation_data():

    if df_data is None:
        return jsonify({})

    currency_cols = ["EUR", "GBP", "JPY", "CAD", "CHF", "INR", "CNY", "AED"]

    available = [c for c in currency_cols if c in df_data.columns]

    corr = {
        c: float(df_data[["USD", c]].corr().iloc[0, 1])
        for c in available
        if not np.isnan(df_data[["USD", c]].corr().iloc[0, 1])
    }

    return jsonify(corr)


# =====================================================
# API : MACHINE LEARNING PREDICTION
# =====================================================

@app.route("/api/predict", methods=["POST"])
def predict():

    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    try:

        input_data = request.get_json()

        features = input_data or create_sample_features()

        feature_df = pd.DataFrame([features])

        for feature in feature_names:
            if feature not in feature_df.columns:
                feature_df[feature] = np.random.uniform(100, 1000)

        feature_df = feature_df[feature_names]

        prediction = model.predict(feature_df)[0]

        confidence = prediction * 0.02

        price_data = get_live_gold_price()

        current_price = price_data["current"] if price_data else prediction

        recommendation = get_recommendation(current_price, prediction)

        return jsonify({

            "prediction": round(prediction, 2),
            "confidence_lower": round(prediction - confidence, 2),
            "confidence_upper": round(prediction + confidence, 2),
            "recommendation": recommendation,
            "timestamp": datetime.now().isoformat()

        })

    except Exception as e:

        print("Prediction error:", e)

        return jsonify({"error": "Prediction failed"}), 500


# =====================================================
# DASHBOARD
# =====================================================

@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect("/login")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT gold_price, prediction, created_at
        FROM prediction_history
        WHERE user_id=?
        ORDER BY created_at DESC
        """,
        (session["user_id"],)
    )

    history = cursor.fetchall()

    conn.close()

    return render_template("dashboard.html", history=history)


# =====================================================
# RUN SERVER
# =====================================================

if __name__ == "__main__":

    with app.app_context():
        initialize_app()

    port = int(os.environ.get("PORT", 8080))

    app.run(host="0.0.0.0", port=port)