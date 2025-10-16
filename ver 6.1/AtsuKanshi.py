# app.py
# The main Flask application for the air pressure dashboard.

from flask import Flask, render_template, jsonify
import threading
import time
from pressure_sensor import (
    get_front_pressure, 
    get_rear_pressure, 
    setup_gpio, 
    check_pressure_threshold
)
from database import setup_database, log_reading, get_historical_readings, get_latest_reading, get_hourly_average_readings, get_minutes_average_readings

app = Flask(__name__)

# The background thread will continuously read the sensors and log data.

def background_logging_task():
    """
    A continuous task to read sensor data and log it to the database.
    This runs in a separate thread to not block the Flask web server.
    """
    print("Starting background sensor logging task...")
    while True:
        try:
            front_pressure = get_front_pressure()
            rear_pressure = get_rear_pressure()
            # Add GPIO check here
            check_pressure_threshold(front_pressure, rear_pressure)
            log_reading(front_pressure, rear_pressure)
            print(f"Logged new reading: Front={front_pressure:.2f} MPa, Rear={rear_pressure:.2f} MPa")
        except Exception as e:
            print(f"Error in background task: {e}")
        time.sleep(0.5)  # Log data every 0.5 seconds

def initialize_system():
    """
    Initializes the database and starts the background logging thread.
    """
    setup_database()
    setup_gpio()  # Initialize GPIO
    t = threading.Thread(target=background_logging_task, daemon=True)
    t.start()

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

# Example: Get last 60 readings from DB
@app.route('/api/history')
def api_history():
    rows = db.session.query(Pressure).order_by(Pressure.timestamp.desc()).limit(60).all()
    # Reverse to chronological order
    rows = rows[::-1]
    return jsonify([
        {
            'timestamp': row.timestamp.isoformat(),
            'front_pressure': row.front_pressure,
            'rear_pressure': row.rear_pressure
        } for row in rows
    ])

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

# Add cleanup handler at the end of the file
import atexit
import RPi.GPIO as GPIO

@atexit.register
def cleanup():
    """Ensure GPIO is cleaned up when the application exits"""
    GPIO.cleanup()
