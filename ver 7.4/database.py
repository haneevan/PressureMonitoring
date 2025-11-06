# database.py
# Handles all database interactions for the pressure monitoring system.

from datetime import datetime, timedelta
import json
import sqlite3

DB_FILE = 'pressure_data.db'

def setup_database():
    """
    Sets up the SQLite database and creates the required tables.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    cursor.execute('PRAGMA journal_mode=WAL;')
    
    # Create readings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY,
            timestamp TEXT,
            front_pressure REAL,
            rear_pressure REAL
        )
    ''')
    
    # Create error_logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS error_logs (
            id INTEGER PRIMARY KEY,
            timestamp TEXT,
            front_pressure REAL,
            rear_pressure REAL,
            error_type TEXT
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

def log_error_event(front_pressure, rear_pressure, error_type):
    """
    Logs an error event to the database. Error logging continues 24/7.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    
    try:
        cursor.execute('''
            INSERT INTO error_logs (timestamp, front_pressure, rear_pressure, error_type)
            VALUES (?, ?, ?, ?)
        ''', (timestamp, front_pressure, rear_pressure, error_type))
        conn.commit()
    except Exception as e:
        print(f"Error logging error event: {e}")
    finally:
        conn.close()

def cleanup_old_data():
    """
    Removes data older than 30 days from both readings and error_logs tables.
    Should be run once per day at end of working hours.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    
    # Calculate cutoff date (30 days ago)
    cutoff_date = (datetime.now() - timedelta(days=30)).isoformat()
    
    try:
        # Delete old readings
        cursor.execute('DELETE FROM readings WHERE timestamp < ?', (cutoff_date,))
        # Delete old error logs
        cursor.execute('DELETE FROM error_logs WHERE timestamp < ?', (cutoff_date,))
        conn.commit()
    except Exception as e:
        print(f"Error during cleanup: {e}")
    finally:
        conn.close()

def get_historical_readings():
    """
    Retrieves historical pressure readings from the last minute.
    Returns a list of dictionaries.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    one_minute_ago = datetime.now() - timedelta(minutes=1)
    cursor.execute('SELECT timestamp, front_pressure, rear_pressure FROM readings WHERE timestamp >= ? ORDER BY timestamp ASC',
                   (one_minute_ago.isoformat(),))
    data = cursor.fetchall()
    conn.close()
    
    formatted_data = [
        {'timestamp': r[0], 'front_pressure': r[1], 'rear_pressure': r[2]}
        for r in data
    ]
    return formatted_data   

def get_readings_by_date(date_str):
    """
    Retrieves all pressure readings for a specific date.
    'date_str' should be in 'YYYY-MM-DD' format.
    Returns a list of dictionaries.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    
    # The query will look for timestamps that start with the given date string
    query = "SELECT timestamp, front_pressure, rear_pressure FROM readings WHERE timestamp LIKE ? ORDER BY timestamp ASC"
    
    cursor.execute(query, (date_str + '%',))
    data = cursor.fetchall()
    conn.close()
    
    formatted_data = [
        {'timestamp': r[0], 'front_pressure': r[1], 'rear_pressure': r[2]}
        for r in data
    ]
    return formatted_data

def get_readings_by_date_range(start_date_str, end_date_str):
    """
    Retrieves all pressure readings within a specific date range (inclusive).
    'start_date_str' and 'end_date_str' should be in 'YYYY-MM-DD' format.
    Returns a list of dictionaries.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()

    # To include the entire end day, we search for timestamps up to the end of that day.
    end_date_inclusive = end_date_str + 'T23:59:59.999999'

    query = "SELECT timestamp, front_pressure, rear_pressure FROM readings WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC"

    cursor.execute(query, (start_date_str, end_date_inclusive))
    data = cursor.fetchall()
    conn.close()

    return [
        {'timestamp': r[0], 'front_pressure': r[1], 'rear_pressure': r[2]} for r in data
    ]

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

def get_error_logs():
    """
    Retrieves error logs from the last 24 hours.
    Returns a list of dictionaries.
    """
    conn = sqlite3.connect(DB_FILE, timeout=5.0)
    cursor = conn.cursor()
    one_day_ago = datetime.now() - timedelta(days=1)
    cursor.execute('''
        SELECT timestamp, front_pressure, rear_pressure, error_type
        FROM error_logs
        WHERE timestamp >= ?
        ORDER BY timestamp DESC
    ''', (one_day_ago.isoformat(),))
    data = cursor.fetchall()
    conn.close()
    
    return [
        {
            'timestamp': r[0],
            'front_pressure': r[1],
            'rear_pressure': r[2],
            'error_type': r[3]
        }
        for r in data
    ]
