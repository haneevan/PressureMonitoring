# database.py
# Handles all database interactions for the pressure monitoring system.

import sqlite3
from datetime import datetime, timedelta

DB_FILE = 'pressure_data.db'

def setup_database():
    """
    Sets up the SQLite database and creates the readings table if it doesn't exist.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    cursor.execute('PRAGMA journal_mode=WAL;')  # Enable WAL mode
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY,
            timestamp TEXT,
            front_pressure REAL,
            rear_pressure REAL
        )
    ''')
    conn.commit()
    conn.close()

def log_reading(front_pressure, rear_pressure):
    """
    Logs a new pressure reading to the database.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    cursor.execute('INSERT INTO readings (timestamp, front_pressure, rear_pressure) VALUES (?, ?, ?)',
                   (timestamp, front_pressure, rear_pressure))
    conn.commit()
    conn.close()

def get_historical_readings():
    """
    Retrieves historical pressure readings from the last minute.
    Returns a list of dictionaries.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    one_minute_ago = datetime.now() - timedelta(minutes=1)
    cursor.execute('SELECT timestamp, front_pressure, rear_pressure FROM readings WHERE timestamp >= ? ORDER BY timestamp',
                   (one_minute_ago.isoformat(),))
    data = cursor.fetchall()
    conn.close()
    
    formatted_data = [
        {'timestamp': r[0], 'front_pressure': r[1], 'rear_pressure': r[2]}
        for r in data
    ]
    return formatted_data   

def get_latest_reading():
    """
    Retrieves the latest pressure reading from the database.
    Returns a dictionary.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    cursor.execute('SELECT timestamp, front_pressure, rear_pressure FROM readings ORDER BY timestamp DESC LIMIT 1')
    data = cursor.fetchone()
    conn.close()
    
    if data:
        return {'timestamp': data[0], 'front_pressure': data[1], 'rear_pressure': data[2]}
    return None

def get_hourly_average_readings():
    """
    Calculates the average pressure for the last hour.
    Returns a dictionary with the average values.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    
    # Calculate the timestamp for one hour ago
    one_hour_ago = datetime.now() - timedelta(hours=1)
    
    # Query for all readings in the last hour
    cursor.execute('''
        SELECT AVG(front_pressure), AVG(rear_pressure)
        FROM readings
        WHERE timestamp >= ?
    ''', (one_hour_ago.isoformat(),))
    
    data = cursor.fetchone()
    conn.close()
    
    if data and data[0] is not None and data[1] is not None:
        return {'front_average': data[0], 'rear_average': data[1]}
    return {'front_average': 0.0, 'rear_average': 0.0} # Return 0 if no data is found

def get_minutes_average_readings():
    """
    Calculates the average pressure for the last minute.
    Returns a dictionary with the average values.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    
    # Calculate the timestamp for one minute ago
    one_minute_ago = datetime.now() - timedelta(minutes=1)
    
    # Query for all readings in the last minute
    cursor.execute('''
        SELECT AVG(front_pressure), AVG(rear_pressure)
        FROM readings
        WHERE timestamp >= ?
    ''', (one_minute_ago.isoformat(),))
    
    data = cursor.fetchone()
    conn.close()
    
    if data and data[0] is not None and data[1] is not None:
        return {'front_averageM': data[0], 'rear_averageM': data[1]}
    return {'front_averageM': 0.0, 'rear_averageM': 0.0} # Return 0 if no data is found

def get_historical_readings_json():
    """
    Retrieves historical pressure readings from the last minute.
    Returns a JSON formatted string.
    """
    readings = get_historical_readings()
    return json.dumps(readings)
