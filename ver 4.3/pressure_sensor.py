# pressure_sensor.py
# Handles all sensor communication and pressure calculations.

import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn

# I2C bus initialization
i2c = busio.I2C(board.SCL, board.SDA)

# Initialize ADC (assuming address 0x48)
ads = ADS.ADS1115(i2c, address=0x48)
ads.gain = 1  # ±4.096V gain

# Define channels for front and rear sensors
chan_front = AnalogIn(ads, ADS.P0) # Using channel A0
chan_rear = AnalogIn(ads, ADS.P1) # Using channel A1

# Voltage to Pressure Conversion Constants
Rtop = 15000   # Upper resistor in voltage divider (Ω)
Rbot = 10000   # Lower resistor in voltage divider (Ω)
Vmax_sensor = 5.0  # Maximum sensor output voltage (V)
Pmax = 1.0     # Maximum pressure of the sensor (MPa)

# Two-point linear calibration constants
# These values are calculated to correct for both zero-point offset and sensor range
# True = (raw * slope) + offset

# Front Sensor Calibration
# Based on observations: Raw 0.160 MPa should be 0 MPa. Raw 0.764 MPa should be 0.760 MPa.
FRONT_CALIBRATION_SLOPE = 1.258  # (0.760 - 0) / (0.764 - 0.160)
FRONT_CALIBRATION_OFFSET = -0.254 # 0 - (1.258 * 0.160)

# Rear Sensor Calibration
# Based on observations: Raw 0.160 MPa should be 0 MPa. Raw 0.767 MPa should be 0.760 MPa.
REAR_CALIBRATION_SLOPE = 1.254 # (0.760 - 0) / (0.767 - 0.160)
REAR_CALIBRATION_OFFSET = -0.254 # 0 - (1.252 * 0.160)

def convert_voltage_to_raw_pressure(voltage):
    """
    Converts a voltage reading from the ADC into a raw pressure value in MPa,
    without any calibration applied.
    """
    V_sensor = voltage * (Rtop + Rbot) / Rbot
    pressure = V_sensor / Vmax_sensor * Pmax
    return pressure

def get_front_pressure():
    """
    Reads the voltage from the front pressure sensor and returns the calibrated pressure in MPa.
    """
    v_in = chan_front.voltage
    raw_pressure = convert_voltage_to_raw_pressure(v_in)
    calibrated_pressure = (raw_pressure * FRONT_CALIBRATION_SLOPE) + FRONT_CALIBRATION_OFFSET
    # Ensure pressure is not negative
    return max(0, calibrated_pressure)

def get_rear_pressure():
    """
    Reads the voltage from the rear pressure sensor and returns the calibrated pressure in MPa.
    """
    v_in = chan_rear.voltage
    raw_pressure = convert_voltage_to_raw_pressure(v_in)
    calibrated_pressure = (raw_pressure * REAR_CALIBRATION_SLOPE) + REAR_CALIBRATION_OFFSET
    # Ensure pressure is not negative
    return max(0, calibrated_pressure)
    
if __name__ == '__main__':
    # Simple test loop to read and print both sensor values
    while True:
        front_pressure = get_front_pressure()
        rear_pressure = get_rear_pressure()
        print(f"Front Pressure: {front_pressure:.3f} MPa, Rear Pressure: {rear_pressure:.3f} MPa")
        time.sleep(0.5)
