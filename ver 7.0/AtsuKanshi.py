# app.py
# The main Flask application for the air pressure dashboard.

from flask import Flask, render_template, jsonify
import threading
import time
import atexit
import RPi.GPIO as GPIO
from apscheduler.schedulers.background import BackgroundScheduler
from pressure_sensor import (
    get_front_pressure, 
    get_rear_pressure, 
    setup_gpio, 
    check_pressure_threshold
)
from database import (
    setup_database, 
    log_reading, 
    get_historical_readings, 
    get_latest_reading, 
    get_hourly_average_readings, 
    get_minutes_average_readings,
    cleanup_old_data,
    is_working_hours,
    WORKING_HOURS_START,  # Add this
    WORKING_HOURS_END     # Add this
)

app = Flask(__name__)

# Make scheduler global
scheduler = None

def initialize_system():
    """
    Initializes the database, starts the background logging thread,
    and sets up the cleanup scheduler.
    """
    global scheduler  # Declare scheduler as global
    
    setup_database()
    setup_gpio()
    
    # Set up the cleanup scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(cleanup_old_data, 'cron', hour=18, minute=5)
    scheduler.start()
    
    # Start the background logging thread
    t = threading.Thread(target=background_logging_task, daemon=True)
    t.start()

def background_logging_task():
    """
    A continuous task to read sensor data and log it to the database.
    This runs in a separate thread to not block the Flask web server.
    """
    print("Starting background sensor logging task...")
    while True:
        try:
            # Only log if within working hours
            if is_working_hours():
                front_pressure = get_front_pressure()
                rear_pressure = get_rear_pressure()
                if front_pressure is not None and rear_pressure is not None:
                    check_pressure_threshold(front_pressure, rear_pressure)
                    log_reading(front_pressure, rear_pressure)
                    print(f"Logged new reading: Front={front_pressure:.2f} MPa, Rear={rear_pressure:.2f} MPa")
            else:
                print("Outside working hours - no data collection")
                time.sleep(60)  # Sleep longer outside working hours
                continue
        except Exception as e:
            print(f"Error in background task: {e}")
        time.sleep(0.5)

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

@app.route('/api/error-log')
def get_error_log_data():
    """API endpoint for error logs"""
    error_logs = get_error_logs()
    return jsonify(error_logs)

if __name__ == '__main__':
    initialize_system()
    app.run(host='0.0.0.0', port=5000, debug=True)

# Add cleanup handler at the end of the file
@atexit.register
def cleanup():
    """Ensure GPIO is cleaned up and scheduler is shut down when the application exits"""
    global scheduler  # Reference the global scheduler
    GPIO.cleanup()
    if scheduler:  # Only shutdown if scheduler exists
        scheduler.shutdown()
