# pressure_sensor.py
# Handles all sensor communication and pressure calculations.
##Hasing the analog input module for simulation

import time
import random #simulation feature
import math #simulation feature
import RPi.GPIO as GPIO
#-----------------------------------------------------#
#import board
#import busio
#import adafruit_ads1x15.ads1115 as ADS
#from adafruit_ads1x15.analog_in import AnalogIn
#-----------------------------------------------------#
# I2C bus initialization
##i2c = busio.I2C(board.SCL, board.SDA)##
#-----------------------------------------------------#
# Initialize ADC (assuming address 0x48)
#ads = ADS.ADS1115(i2c, address=0x48)
#ads.gain = 1  # ±4.096V gain
#-----------------------------------------------------#
# Define channels for front and rear sensors

#Simulation parameters
SIM_BASE_PRESSURE_FRONT = 0.130  # MPa
SIM_BASE_PRESSURE_REAR = 0.130  # MPa
SIM_VARIATION = 0.005         # MPa
SIM_NOISE = 0.0005         # MPa
SIM_FREQUENCY = 0.05 #Mpa

# GPIO Setup
GPIO_PIN = 26  # Using GPIO26
LOW_PRESSURE_THRESHOLD = 0.100  # MPa

#Simulation input
class MockAnalogInF:
    """Mock class to simulate AnalogIn for front sensor"""
    def __init__(self):
        self.timestamp = time.time()
    @property
    def voltage(self):
        """Simulate a voltage reading with some variation"""
        t = time.time() - self.timestamp
        # Create a slower varying sine wave + minimal noise
        variation = math.sin((t * SIM_FREQUENCY) + math.pi/4) * SIM_VARIATION  # Phase shift for different pattern
        noise = random.uniform(-SIM_NOISE, SIM_NOISE)
        simulated_pressure = SIM_BASE_PRESSURE_FRONT + variation + noise
        # Convert pressure back to equivalent voltage
        return simulated_pressure * 5  # Using 3.3V for Raspberry Pi

class MockAnalogInR:
    """Mock class to simulate AnalogIn for rear sensor"""
    def __init__(self):
        self.timestamp = time.time()
    @property
    def voltage(self):
        """Simulate a voltage reading with some variation"""
        t = time.time() - self.timestamp
        # Create a slower varying sine wave + minimal noise
        variation = math.sin((t * SIM_FREQUENCY) + math.pi/4) * SIM_VARIATION  # Phase shift for different pattern
        noise = random.uniform(-SIM_NOISE, SIM_NOISE)
        simulated_pressure = SIM_BASE_PRESSURE_REAR + variation + noise
        # Convert pressure back to equivalent voltage
        return simulated_pressure * 5  # Using 3.3V for Raspberry Pi
    

chan_front = MockAnalogInF()    #hashing the input for simulation using mock data removing AnalogIn(ads, ADS.P0) # Using channel A0
chan_rear =  MockAnalogInR()   #AnalogIn(ads, ADS.P1) # Using channel A1

# Voltage to Pressure Conversion Constants
Rtop = 15000   # Upper resistor in voltage divider (Ω)
Rbot = 10000   # Lower resistor in voltage divider (Ω)
Vmax_sensor = 5  # Maximum sensor output voltage (V)
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

# GPIO Setup
def setup_gpio():
    """Initialize GPIO for alarm output"""
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(GPIO_PIN, GPIO.OUT)
    GPIO.output(GPIO_PIN, GPIO.LOW)  # LOW means normal operation (LED OFF)

def check_pressure_threshold(front_pressure, rear_pressure):
    """Check if pressures are above threshold and control GPIO"""
    if front_pressure < LOW_PRESSURE_THRESHOLD or rear_pressure < LOW_PRESSURE_THRESHOLD:
        GPIO.output(GPIO_PIN, GPIO.HIGH)  # HIGH means alarm (LED ON bright)
        return False
    GPIO.output(GPIO_PIN, GPIO.LOW)  # LOW means normal operation (LED OFF)
    return True

if __name__ == '__main__':
    setup_gpio()
    try:
        # Simple test loop to read and print both sensor values
        while True:
            front_pressure = get_front_pressure()
            rear_pressure = get_rear_pressure()
            check_pressure_threshold(front_pressure, rear_pressure)
            print(f"Front Pressure: {front_pressure:.3f} MPa, Rear Pressure: {rear_pressure:.3f} MPa")
            time.sleep(0.5)
    finally:
        GPIO.cleanup()
