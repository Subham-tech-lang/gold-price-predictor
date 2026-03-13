import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    UPLOAD_FOLDER = 'data'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Model configuration
    MODEL_PATH = 'models/'
    DATA_PATH = 'data/'
    
    # Chart configuration
    CHART_COLORS = {
        'primary': '#FFD700',    # Gold
        'secondary': '#FFA500',  # Orange
        'success': '#28a745',
        'danger': '#dc3545',
        'info': '#17a2b8',
        'dark': '#343a40'
    }
