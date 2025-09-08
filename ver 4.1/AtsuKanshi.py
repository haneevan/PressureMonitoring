# app.py
# The main Flask application for the air pressure dashboard.

from flask import Flask, render_template, jsonify
import threading
import time
from pressure_sensor import get_front_pressure, get_rear_pressure
from database import setup_database, log_reading, get_historical_readings, get_latest_reading, get_hourly_average_readings, get_minutes_average_readings

app = Flask(__name__)

# The background thread will continuously read the sensors and log data.

def initialize_system():
    """
    Initializes the database.
    """
    setup_database()

@app.route('/')
def index():
    """
    Renders the main dashboard HTML page.
    """
    return render_template('dashboard.html')

@app.route('/api/realtime')
def get_realtime_data():
    data = get_latest_reading()
    if data:
        return jsonify(data)
    return jsonify({'error': 'No data available'}), 404

@app.route('/api/history')
def get_history_data():
    """
    API endpoint to get all historical pressure readings for both sensors.
    """
    data = get_historical_readings()
    return jsonify(data)

@app.route('/api/average/hour')
def get_average_hourly_data():
    """
    API endpoint to get the average pressure over the last hour.
    """
    data = get_hourly_average_readings()
    if data:
        return jsonify(data)
    return jsonify({'error': 'No data available'}), 404

@app.route('/api/average/minute')
def get_average_minute_data():
    """
    API endpoint to get the average pressure over the last minute.
    """
    data = get_minutes_average_readings()
    if data:
        return jsonify(data)
    return jsonify({'error': 'No data available'}), 404
    
@app.route('/logs')
def logs():
    """
    Renders the log page HTML file.
    """
    return render_template('log.html')   

@app.route('/api/log')
def get_log_data():
    """
    API endpoint to get all historical pressure readings for both sensors.
    Used by log.html for live log display.
    """
    data = get_historical_readings()  # Should return a list of dicts with timestamp, front_pressure, rear_pressure
    return jsonify(data)

if __name__ == '__main__':
    initialize_system()
    app.run(host='0.0.0.0', port=5000, debug=True)
