import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn

# I2C初期化
i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1115(i2c, address=0x48)

# PGA(ゲイン)を±4.096Vに設定
ads.gain = 1  # ±4.096V

# 単一入力モードで A0
chan = AnalogIn(ads, ADS.P0)

# 電圧 → 圧力換算
Rtop = 15000  # 上流抵抗 Ω
Rbot = 10000  # 下流抵抗 Ω
Vmax_sensor = 5.0  # センサー最大電圧 V
Pmax = 1.0  # センサー最大圧力 MPa

while True:
    V_in = chan.voltage
    # 分圧を元に戻す
    V_sensor = V_in * (Rtop + Rbot) / Rbot
    # 圧力換算
    P = V_sensor / Vmax_sensor * Pmax
    print(f"ADC電圧: {V_in:.3f} V, センサー電圧: {V_sensor:.3f} V, 圧力: {P:.3f} MPa")
    time.sleep(1)
