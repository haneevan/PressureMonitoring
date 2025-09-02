# database.py
# Handles all database interactions for the pressure monitoring system.

import sqlite3
from datetime import datetime

DB_FILE = 'pressure_data.db'

def setup_database():
    """
    Sets up the SQLite database and creates the readings table if it doesn't exist.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
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
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    cursor.execute('INSERT INTO readings (timestamp, front_pressure, rear_pressure) VALUES (?, ?, ?)',
                   (timestamp, front_pressure, rear_pressure))
    conn.commit()
    conn.close()

def get_historical_readings():
    """
    Retrieves all historical pressure readings from the database.
    Returns a list of dictionaries.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT timestamp, front_pressure, rear_pressure FROM readings ORDER BY timestamp')
    data = cursor.fetchall()
    conn.close()
    
    # Convert list of tuples to list of dictionaries for easier JSON handling
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
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT timestamp, front_pressure, rear_pressure FROM readings ORDER BY timestamp DESC LIMIT 1')
    data = cursor.fetchone()
    conn.close()
    
    if data:
        return {'timestamp': data[0], 'front_pressure': data[1], 'rear_pressure': data[2]}
    return None
