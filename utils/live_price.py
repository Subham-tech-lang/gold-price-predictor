import yfinance as yf

last_price = None

def get_live_gold_price():
    global last_price

    try:
        gold = yf.Ticker("GC=F")
        data = gold.history(period="1d", interval="1m")

        price = float(data["Close"].iloc[-1])

        if last_price is None:
            change = 0
        else:
            change = price - last_price

        last_price = price

        return {
            "current": price,
            "change": change
        }

    except Exception as e:
        print("Gold price error:", e)
        return None