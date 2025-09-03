# app.py
# The main Flask application for the air pressure dashboard.

from flask import Flask, render_template, jsonify
import threading
import time
from pressure_sensor import get_front_pressure, get_rear_pressure
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
    """
    API endpoint to get the latest pressure readings for both sensors.
    """
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

if __name__ == '__main__':
    initialize_system()
    # Running on 0.0.0.0 makes the server accessible from other devices on the network.
    app.run(host='0.0.0.0', port=5100, debug=True)
