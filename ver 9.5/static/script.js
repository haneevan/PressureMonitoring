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

// --- 3. localStorage Management ---
function saveChartDataToLocalStorage() {
    if (!frontPressureChart || !rearPressureChart) return;
    
    const chartData = {
        labels: frontPressureChart.data.labels,
        frontData: frontPressureChart.data.datasets[0].data,
        rearData: rearPressureChart.data.datasets[0].data,
        timestamp: new Date().getTime()
    };
    localStorage.setItem('dashboardChartData', JSON.stringify(chartData));
}

function loadChartDataFromLocalStorage() {
    const stored = localStorage.getItem('dashboardChartData');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse stored chart data:', e);
            return null;
        }
    }
    return null;
}

// --- 4. Chart Initialization ---
function createCharts(initialLabels = Array(30).fill(''), initialFront = Array(30).fill(null), initialRear = Array(30).fill(null)) {
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
        // Check if we have saved chart data from previous session (less than 5 minutes old)
        const storedData = loadChartDataFromLocalStorage();
        const now = new Date().getTime();
        
        if (storedData && (now - storedData.timestamp) < 5 * 60 * 1000) {
            // Use the stored data
            createCharts(storedData.labels, storedData.frontData, storedData.rearData);
            console.log("Chart restored from previous session");
            return;
        }
        
        // Otherwise, fetch the latest 30 minutes of data from the database
        const response = await fetch('/api/history');
        
        if (!response.ok) {
            // If API fails, use empty charts
            const emptyLabels = Array(30).fill('');
            const emptyData = Array(30).fill(null);
            createCharts(emptyLabels, emptyData, emptyData);
            console.log("Chart initialized with empty data (API unavailable)");
            return;
        }
        
        const historyData = await response.json();
        
        if (!Array.isArray(historyData) || historyData.length === 0) {
            // No history data, use empty charts
            const emptyLabels = Array(30).fill('');
            const emptyData = Array(30).fill(null);
            createCharts(emptyLabels, emptyData, emptyData);
            console.log("Chart initialized with empty data (no history available)");
            return;
        }
        
        // Prepare labels and data from history
        const labels = historyData.map(entry => {
            const d = new Date(entry.timestamp);
            return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        });
        
        const frontData = historyData.map(entry => entry.front_pressure);
        const rearData = historyData.map(entry => entry.rear_pressure);
        
        // Create charts with historical data
        createCharts(labels, frontData, rearData);
        console.log(`Chart initialized with ${historyData.length} historical data points`);
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        // Fallback to empty charts
        const emptyLabels = Array(30).fill('');
        const emptyData = Array(30).fill(null);
        createCharts(emptyLabels, emptyData, emptyData);
    }
}

async function updateCharts() {
    if (!frontPressureChart || !rearPressureChart) return;
    
    const nowLabel = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const MAX_POINTS = 30; // 30 seconds

    // Add new data
    frontPressureChart.data.labels.push(nowLabel);
    frontPressureChart.data.datasets[0].data.push(frontPressure);
    
    rearPressureChart.data.labels.push(nowLabel);
    rearPressureChart.data.datasets[0].data.push(rearPressure);

    // Keep the array at exactly 30 points
    if (frontPressureChart.data.labels.length > MAX_POINTS) {
        frontPressureChart.data.labels.shift();
        frontPressureChart.data.datasets[0].data.shift();
        
        rearPressureChart.data.labels.shift();
        rearPressureChart.data.datasets[0].data.shift();
    }

    frontPressureChart.update('none');
    rearPressureChart.update('none');
    
    // Save chart data to localStorage for persistence across page refreshes
    saveChartDataToLocalStorage();
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

// --- 6. Lifecycle ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData(); // Load history / stored data first
    updateDateTimeDisplay();
    updateRealtimeData();
    updateAverages();

    setInterval(updateRealtimeData, REALTIME_UPDATE_INTERVAL);
    setInterval(updateCharts, CHART_UPDATE_INTERVAL);
    setInterval(updateDateTimeDisplay, 1000);
    setInterval(updateAverages, 10000);
});

// Save chart data before page unload
window.addEventListener('beforeunload', () => {
    saveChartDataToLocalStorage();
});
