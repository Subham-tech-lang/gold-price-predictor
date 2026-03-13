import plotly.graph_objs as go
import plotly.express as px
import pandas as pd
import json
import plotly

def create_visualizations(model_comparison_df):
    """Create interactive visualizations using Plotly"""
    
    plots = {}
    
    # 1. Model Performance Comparison - R² Score
    fig_r2 = go.Figure()
    
    fig_r2.add_trace(go.Bar(
        name='Test R²',
        x=model_comparison_df['Model'],
        y=model_comparison_df['Test_R2'],
        marker_color='#3498db',
        text=model_comparison_df['Test_R2'].round(4),
        textposition='outside'
    ))
    
    fig_r2.add_trace(go.Bar(
        name='Train R²',
        x=model_comparison_df['Model'],
        y=model_comparison_df['Train_R2'],
        marker_color='#e74c3c',
        opacity=0.7,
        text=model_comparison_df['Train_R2'].round(4),
        textposition='outside'
    ))
    
    fig_r2.update_layout(
        title='Model Performance Comparison - R² Score',
        xaxis_title='Model',
        yaxis_title='R² Score',
        barmode='group',
        template='plotly_white',
        height=500,
        xaxis_tickangle=-45,
        font=dict(size=12),
        legend=dict(x=0.7, y=1)
    )
    
    plots['r2_comparison'] = json.dumps(fig_r2, cls=plotly.utils.PlotlyJSONEncoder)
    
    # 2. RMSE Comparison
    fig_rmse = go.Figure()
    
    fig_rmse.add_trace(go.Bar(
        name='Test RMSE',
        x=model_comparison_df['Model'],
        y=model_comparison_df['Test_RMSE'],
        marker_color='#e67e22',
        text=model_comparison_df['Test_RMSE'].round(2),
        textposition='outside'
    ))
    
    fig_rmse.update_layout(
        title='Model RMSE Comparison (Lower is Better)',
        xaxis_title='Model',
        yaxis_title='RMSE ($)',
        template='plotly_white',
        height=500,
        xaxis_tickangle=-45,
        font=dict(size=12)
    )
    
    plots['rmse_comparison'] = json.dumps(fig_rmse, cls=plotly.utils.PlotlyJSONEncoder)
    
    # 3. MAE Comparison
    fig_mae = go.Figure()
    
    fig_mae.add_trace(go.Bar(
        name='Test MAE',
        x=model_comparison_df['Model'],
        y=model_comparison_df['Test_MAE'],
        marker_color='#9b59b6',
        text=model_comparison_df['Test_MAE'].round(2),
        textposition='outside'
    ))
    
    fig_mae.update_layout(
        title='Model MAE Comparison (Lower is Better)',
        xaxis_title='Model',
        yaxis_title='MAE ($)',
        template='plotly_white',
        height=500,
        xaxis_tickangle=-45,
        font=dict(size=12)
    )
    
    plots['mae_comparison'] = json.dumps(fig_mae, cls=plotly.utils.PlotlyJSONEncoder)
    
    # 4. Cross-Validation Scores
    fig_cv = go.Figure()
    
    fig_cv.add_trace(go.Bar(
        x=model_comparison_df['Model'],
        y=model_comparison_df['CV_Score_Mean'],
        error_y=dict(
            type='data',
            array=model_comparison_df['CV_Score_Std'],
            visible=True,
            color='red'
        ),
        marker_color='#16a085',
        text=model_comparison_df['CV_Score_Mean'].round(4),
        textposition='outside'
    ))
    
    fig_cv.update_layout(
        title='Cross-Validation Performance',
        xaxis_title='Model',
        yaxis_title='CV R² Score',
        template='plotly_white',
        height=500,
        xaxis_tickangle=-45,
        font=dict(size=12)
    )
    
    plots['cv_comparison'] = json.dumps(fig_cv, cls=plotly.utils.PlotlyJSONEncoder)
    
    # 5. Radar Chart for Top 5 Models
    top_5 = model_comparison_df.head(5)
    
    fig_radar = go.Figure()
    
    for idx, row in top_5.iterrows():
        fig_radar.add_trace(go.Scatterpolar(
            r=[row['Test_R2'], 
               1 - (row['Test_RMSE'] / model_comparison_df['Test_RMSE'].max()),
               1 - (row['Test_MAE'] / model_comparison_df['Test_MAE'].max()),
               row['CV_Score_Mean']],
            theta=['Test R²', 'RMSE (Normalized)', 'MAE (Normalized)', 'CV Score'],
            fill='toself',
            name=row['Model']
        ))
    
    fig_radar.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 1]
            )
        ),
        title='Top 5 Models - Multi-Metric Comparison',
        template='plotly_white',
        height=600,
        showlegend=True
    )
    
    plots['radar_chart'] = json.dumps(fig_radar, cls=plotly.utils.PlotlyJSONEncoder)
    
    return plots

def create_price_visualization(historical_data):
    """Create price trend visualization"""
    
    df = pd.DataFrame(historical_data)
    df['Date'] = pd.to_datetime(df['Date'])
    
    fig = go.Figure()
    
    # Add candlestick chart
    fig.add_trace(go.Candlestick(
        x=df['Date'],
        open=df['Open'],
        high=df['High'],
        low=df['Low'],
        close=df['Close'],
        name='Gold Price'
    ))
    
    fig.update_layout(
        title='Gold Stock Price History',
        xaxis_title='Date',
        yaxis_title='Price ($)',
        template='plotly_white',
        height=500,
        xaxis_rangeslider_visible=False
    )
    
    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
