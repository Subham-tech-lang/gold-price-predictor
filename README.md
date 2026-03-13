# Gold Price Predictor 🏆

A sophisticated machine learning web application that predicts gold prices using Ridge Regression with 99.99% accuracy. The system analyzes historical data, currency correlations, and market trends to provide reliable gold price forecasts.



## 🌟 Features

- **Real-time Price Predictions**: Get instant gold price predictions with confidence intervals
- **Interactive Visualizations**: Analyze historical trends and market correlations
- **Multiple Data Views**: Daily, weekly, monthly, and yearly price analysis
- **Currency Correlations**: Track relationships between gold and major currencies
- **Advanced Analytics**: Technical indicators and market trend analysis
- **Responsive Design**: Seamless experience across all devices

## 🚀 Technology Stack

### Backend
- Python 3.10+
- Flask (Web Framework)
- NumPy (Numerical Computing)
- Pandas (Data Analysis)
- Scikit-learn (Machine Learning)
- Joblib (Model Serialization)

### Frontend
- HTML5 & CSS3
- JavaScript (ES6+)
- Bootstrap 5
- Chart.js (Data Visualization)
- Font Awesome (Icons)

### Machine Learning
- Ridge Regression Model
- Feature Engineering
- Data Preprocessing
- Model Validation

## 📊 Model Performance

- **R² Score**: 99.99%
- **RMSE**: $2.80
- **MAE**: $2.13
- **MAPE**: 0.15%

## 💻 Installation

1. Clone the repository:
```bash
git clone https://github.com/ajayoneness/Gold-Price-Predictor.git
cd Gold-Price-Predictor
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
python app.py
```

5. Open your browser and navigate to:
```
http://localhost:5000
```

## 📁 Project Structure

```
GoldPrice Predictions/
├── app.py                 # Main Flask application
├── config.py             # Configuration settings
├── requirements.txt      # Python dependencies
├── dataset/             # Historical price data
│   ├── Daily.csv
│   ├── Monthly_Avg.csv
│   ├── Monthly_EoP.csv
│   └── ...
├── models/              # Trained ML models
│   ├── features_ridge_regression.pkl
│   ├── gold_price_prediction_ridge_regression.pkl
│   └── scaler_ridge_regression.pkl
├── static/             # Static assets
│   ├── css/
│   ├── js/
│   └── img/
└── templates/          # HTML templates
    ├── base.html
    ├── index.html
    ├── prediction.html
    └── visualization.html
```

## 📈 Data Sources

The model is trained on historical gold price data including:
- Daily price records
- End-of-period prices
- Monthly averages
- Currency exchange rates
- Market indicators

## 🔍 Model Features

- Currency Exchange Rates (EUR, GBP, JPY, etc.)
- Technical Indicators
- Moving Averages (7, 14, 30 days)
- Price Momentum
- Volatility Measures
- Seasonal Patterns
- Market Trends

## 🛠️ API Endpoints

### Price Prediction
```http
POST /api/predict
Content-Type: application/json

{
    "EUR": 0.85,
    "GBP": 0.73,
    "JPY": 148.50,
    "CAD": 1.37
}
```

### Historical Data
```http
GET /api/historical-data
```

### Price Analysis
```http
GET /api/price-analysis
```

### Currency Correlations
```http
GET /api/correlation-data
```

## 🔄 Model Updates

The model is regularly updated with new market data to maintain prediction accuracy. The training process includes:
1. Data preprocessing and cleaning
2. Feature engineering and selection
3. Model training and validation
4. Performance evaluation
5. Model deployment

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile devices
- Various screen sizes

## 🔒 Security

- Input validation and sanitization
- Error handling and logging
- Secure API endpoints
- Data validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - Initial work and maintenance

## 🙏 Acknowledgments

- Historical data providers
- Open-source community
- Contributors and testers

## 📞 Support

For support and queries:
- Create an issue in the repository
- Contact: contact@codeaj.com

## 🔮 Future Enhancements

- Integration with more data sources
- Advanced feature engineering
- Real-time market data integration
- Mobile application development
- Enhanced visualization options

---
⭐ Star this repository if you find it helpful! 