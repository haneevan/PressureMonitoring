# pressure_sensor.py
# Handles all sensor communication and pressure calculations.

import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn

# I2C bus initialization
i2c = busio.I2C(board.SCL, board.SDA)

# Initialize ADC for Front Sensor (assuming address 0x48)
ads_front = ADS.ADS1115(i2c, address=0x48)
ads_front.gain = 1  # ±4.096V gain
chan_front = AnalogIn(ads_front, ADS.P0) # Using channel A0

# Initialize ADC for Rear Sensor (assuming address 0x49, you might need to adjust this)
# If both sensors are on the same ADC, you would use a different channel (e.g., ADS.P1)
# For example: chan_rear = AnalogIn(ads_front, ADS.P1)
# ads_rear = ADS.ADS1115(i2c, address=0x49)
# ads_rear.gain = 1  # ±4.096V gain
# chan_rear = AnalogIn(ads_rear, ADS.P0) # Using channel A0

# Voltage to Pressure Conversion Constants (from your sensayomitori.py)
Rtop = 15000   # Upper resistor in voltage divider (Ω)
Rbot = 10000   # Lower resistor in voltage divider (Ω)
Vmax_sensor = 5.0  # Maximum sensor output voltage (V)
Pmax = 1.0     # Maximum pressure of the sensor (MPa)

def convert_voltage_to_pressure(voltage):
    """
    Converts a voltage reading from the ADC into a pressure value in MPa.
    """
    V_sensor = voltage * (Rtop + Rbot) / Rbot
    pressure = V_sensor / Vmax_sensor * Pmax
    return pressure

def get_front_pressure():
    """
    Reads the voltage from the front pressure sensor and returns the pressure in MPa.
    """
    v_in = chan_front.voltage
    pressure = convert_voltage_to_pressure(v_in)
    return pressure

def get_rear_pressure():
    """
    Reads the voltage from the rear pressure sensor and returns the pressure in MPa.
    
    NOTE: This function is currently a placeholder until the second sensor is added.
    """
    # v_in = chan_rear.voltage
    # pressure = convert_voltage_to_pressure(v_in)
    # return pressure
    return 0.0 # Return a placeholder value for now

if __name__ == '__main__':
    # Simple test loop to read and print both sensor values
    while True:
        front_pressure = get_front_pressure()
        rear_pressure = get_rear_pressure()
        print(f"Front Pressure: {front_pressure:.3f} MPa, Rear Pressure: {rear_pressure:.3f} MPa")
        time.sleep(1)
