// --- 1. Constants and Globals ---
const REALTIME_API = '/api/realtime';
const HOURLY_AVERAGE_API = '/api/average/hour';
const MINUTES_AVERAGE_API = '/api/average/minute';
const REALTIME_UPDATE_INTERVAL = 500; 
const CHART_UPDATE_INTERVAL = 1000; 
const IDLE_PRESSURE_THRESHOLD = 0.029;
const LOW_PRESSURE_THRESHOLD = 0.125;

let frontPressureChart, rearPressureChart;
let frontPressure = 0.0;
let rearPressure = 0.0;

let alarmWasManuallyDismissed = false;
let idleWasManuallyDismissed = false; 

// --- 2. Real-time Monitoring Logic ---
async function updateRealtimeData() {
    try {
        const response = await fetch(REALTIME_API);
        const data = await response.json();        
        if (data.front_pressure !== undefined && data.rear_pressure !== undefined) {
            frontPressure = data.front_pressure;
            rearPressure = data.rear_pressure;
            
            document.getElementById('front-pressure-value').innerText = frontPressure.toFixed(3);
            document.getElementById('rear-pressure-value').innerText = rearPressure.toFixed(3);
            
            // State Logic: Normal vs Idle vs Alarm
            if (frontPressure >= LOW_PRESSURE_THRESHOLD && rearPressure >= LOW_PRESSURE_THRESHOLD) {
                alarmWasManuallyDismissed = false;
                idleWasManuallyDismissed = false; 
                hideAllModals();
            } else if (frontPressure <= IDLE_PRESSURE_THRESHOLD || rearPressure <= IDLE_PRESSURE_THRESHOLD) {
                if (!idleWasManuallyDismissed) showIdleNotification();
                document.getElementById('pressureAlarmModal').classList.remove('show');
            } else {
                if (!alarmWasManuallyDismissed) showPressureAlarm();
                document.getElementById('idleSystemModal').classList.remove('show');
            }
        }
    } catch (error) { console.error('Data fetch error:', error); }
}

// --- 3. Chart Initialization (The Missing Piece) ---
function createCharts(initialLabels = Array(60).fill(''), initialFront = Array(60).fill(null), initialRear = Array(60).fill(null)) {
    const chartOptions = (label, color, bgColor, dataArray) => ({
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [{
                label: label,
                data: dataArray,
                borderColor: color,
                backgroundColor: bgColor,
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 0.25, title: { display: true, text: 'MPa' } },
                x: { 
                    display: true, // Show the timestamps
                    ticks: { maxTicksLimit: 60 } 
                }
            },
            plugins: {
                annotation: {
                    annotations: {
                        lowLine: { type: 'line', yMin: LOW_PRESSURE_THRESHOLD, yMax: LOW_PRESSURE_THRESHOLD, borderColor: 'orange', borderDash: [6, 6] },
                        idleLine: { type: 'line', yMin: IDLE_PRESSURE_THRESHOLD, yMax: IDLE_PRESSURE_THRESHOLD, borderColor: 'grey', borderDash: [6, 6] }
                    }
                }
            }
        }
    });

    const frontCtx = document.getElementById('front-pressure-chart').getContext('2d');
    frontPressureChart = new Chart(frontCtx, chartOptions('Front (MPa)', 'rgb(75, 192, 192)', 'rgba(75, 192, 192, 0.2)', initialFront));

    const rearCtx = document.getElementById('rear-pressure-chart').getContext('2d');
    rearPressureChart = new Chart(rearCtx, chartOptions('Rear (MPa)', 'rgb(255, 99, 132)', 'rgba(255, 99, 132, 0.2)', initialRear));
}

// New Function: Fetch history before starting intervals
async function loadInitialData() {
    try {
        const response = await fetch('/api/history');
        const history = await response.json();

        if (history.length > 0) {
            const labels = history.map(item => new Date(item.timestamp).toLocaleTimeString('ja-JP', { hour12: false }));
            const frontData = history.map(item => item.front_pressure);
            const rearData = history.map(item => item.rear_pressure);
            
            createCharts(labels, frontData, rearData);
        } else {
            createCharts(); // Fallback to empty if no DB records
        }
    } catch (error) {
        console.error("Failed to load history:", error);
        createCharts(); 
    }
}

async function updateCharts() {
    if (!frontPressureChart || !rearPressureChart) return;
    const nowLabel = new Date().toLocaleTimeString('ja-JP', { hour12: false });

    // Update Front
    frontPressureChart.data.labels.shift();
    frontPressureChart.data.labels.push(nowLabel);
    frontPressureChart.data.datasets[0].data.shift();
    frontPressureChart.data.datasets[0].data.push(frontPressure);
    frontPressureChart.update('none');

    // Update Rear
    rearPressureChart.data.labels.shift();
    rearPressureChart.data.labels.push(nowLabel);
    rearPressureChart.data.datasets[0].data.shift();
    rearPressureChart.data.datasets[0].data.push(rearPressure);
    rearPressureChart.update('none');
}

// --- 4. Modal & Display Helpers ---
function showIdleNotification() {
    const modal = document.getElementById('idleSystemModal');
    if (modal) {
        document.getElementById('idle-timestamp').textContent = new Date().toLocaleTimeString();
        document.getElementById('idle-front-pressure').textContent = `${frontPressure.toFixed(3)} MPa`;
        document.getElementById('idle-rear-pressure').textContent = `${rearPressure.toFixed(3)} MPa`;
        modal.classList.add('show');
    }
}

function showPressureAlarm() {
    const modal = document.getElementById('pressureAlarmModal');
    if (modal) {
        document.getElementById('alarm-timestamp').textContent = new Date().toLocaleTimeString();
        document.getElementById('alarm-front-pressure').textContent = `${frontPressure.toFixed(3)} MPa`;
        document.getElementById('alarm-rear-pressure').textContent = `${rearPressure.toFixed(3)} MPa`;
        modal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (modalId === 'pressureAlarmModal') alarmWasManuallyDismissed = true;
        if (modalId === 'idleSystemModal') idleWasManuallyDismissed = true;
        modal.classList.remove('show');
    }
}

function hideAllModals() {
    document.getElementById('pressureAlarmModal').classList.remove('show');
    document.getElementById('idleSystemModal').classList.remove('show');
}

function updateDateTimeDisplay() {
    const now = new Date();
    document.getElementById('current-date').textContent = `日付: ${now.toLocaleDateString('ja-JP')}`;
    document.getElementById('current-time').textContent = `時間: ${now.toLocaleTimeString('ja-JP', { hour12: false })}`;
}

async function updateAverages() {
    try {
        const [hRes, mRes] = await Promise.all([fetch(HOURLY_AVERAGE_API), fetch(MINUTES_AVERAGE_API)]);
        const hData = await hRes.json();
        const mData = await mRes.json();
        document.getElementById('front-average-value').innerText = hData.front_average?.toFixed(3) || '0.000';
        document.getElementById('rear-average-value').innerText = hData.rear_average?.toFixed(3) || '0.000';
        document.getElementById('front-averageM-value').innerText = mData.front_averageM?.toFixed(3) || '0.000';
        document.getElementById('rear-averageM-value').innerText = mData.rear_averageM?.toFixed(3) || '0.000';
    } catch (e) { console.error("Avg error", e); }
}

// --- 5. Lifecycle ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData(); // Load history first
    updateDateTimeDisplay();
    updateRealtimeData();
    updateAverages();

    setInterval(updateRealtimeData, REALTIME_UPDATE_INTERVAL);
    setInterval(updateCharts, CHART_UPDATE_INTERVAL);
    setInterval(updateDateTimeDisplay, 1000);
    setInterval(updateAverages, 10000);
});
