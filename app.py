@app.route("/api/entry-signals")
def entry_signals():
    try:
        interval = request.args.get("interval", "5m")

        # ==============================
        # TIMEFRAME MAPPING (CRITICAL)
        # ==============================
        interval_map = {
            "1m": ("1d", "1m"),
            "5m": ("2d", "5m"),
            "15m": ("5d", "15m"),
            "30m": ("5d", "30m"),
            "1h": ("7d", "60m")
        }

        period, yf_interval = interval_map.get(interval, ("2d", "5m"))

        # ==============================
        # FETCH DATA
        # ==============================
        data = yf.Ticker("GC=F").history(period=period, interval=yf_interval)

        if data.empty:
            return jsonify([])

        data.dropna(inplace=True)

        close = data["Close"]
        high = data["High"]
        low = data["Low"]

        # ==============================
        # RSI CALCULATION
        # ==============================
        delta = close.diff()

        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()

        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))

        # ==============================
        # ATR CALCULATION
        # ==============================
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(14).mean()

        signals = []

        # ==============================
        # SIGNAL GENERATION (IMPROVED)
        # ==============================
        for i in range(len(close)):

            # Skip early rows
            if i < 20:
                continue

            price = float(close.iloc[i])
            time = data.index[i]

            rsi_val = rsi.iloc[i]
            atr_val = atr.iloc[i]

            # Skip invalid values
            if pd.isna(rsi_val) or pd.isna(atr_val):
                continue

            prev_rsi = rsi.iloc[i - 1]

            # ==========================
            # BUY SIGNAL (RSI CROSS < 30)
            # ==========================
            if prev_rsi >= 30 and rsi_val < 30:

                sl = round(price - (atr_val * 1.5), 2)
                tp = round(price + (atr_val * 2), 2)

                risk = price - sl
                reward = tp - price
                rr = round(reward / risk, 2) if risk > 0 else None

                signals.append({
                    "type": "BUY",
                    "price": price,
                    "sl": sl,
                    "tp": tp,
                    "rr": rr,
                    "time": int(time.timestamp())
                })

            # ==========================
            # SELL SIGNAL (RSI CROSS > 70)
            # ==========================
            elif prev_rsi <= 70 and rsi_val > 70:

                sl = round(price + (atr_val * 1.5), 2)
                tp = round(price - (atr_val * 2), 2)

                risk = sl - price
                reward = price - tp
                rr = round(reward / risk, 2) if risk > 0 else None

                signals.append({
                    "type": "SELL",
                    "price": price,
                    "sl": sl,
                    "tp": tp,
                    "rr": rr,
                    "time": int(time.timestamp())
                })

        # ==============================
        # RETURN LAST SIGNALS (SORTED)
        # ==============================
        signals = sorted(signals, key=lambda x: x["time"])

        return jsonify(signals[-5:])

    except Exception as e:
        print("Signal error:", e)
        return jsonify([])