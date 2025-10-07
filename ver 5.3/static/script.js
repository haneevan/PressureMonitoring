// Constants for API endpoints and update interval
const REALTIME_API = '/api/realtime';
const HISTORY_API = '/api/history';
const HOURLY_AVERAGE_API = '/api/average/hour';
const MINUTES_AVERAGE_API = '/api/average/minute';
const REALTIME_UPDATE_INTERVAL = 500; // 0.5 seconds for instant card updates
const CHART_UPDATE_INTERVAL = 1000; // 1 second for smoother chart visualization
const LOW_PRESSURE_THRESHOLD = 0.100;

let frontPressureChart;
let rearPressureChart;

/**
 * Fetches the latest data and updates the real-time display values.
 */
async function updateRealtimeData() {
    try {
        const response = await fetch(REALTIME_API);
        const data = await response.json();
        
        if (data.front_pressure !== undefined && data.rear_pressure !== undefined) {
            frontPressure = data.front_pressure;
            rearPressure = data.rear_pressure;
            
            document.getElementById('front-pressure-value').innerText = frontPressure.toFixed(3);
            document.getElementById('rear-pressure-value').innerText = rearPressure.toFixed(3);
            
            // Check pressure threshold
            if (frontPressure < LOW_PRESSURE_THRESHOLD || rearPressure < LOW_PRESSURE_THRESHOLD) {
                showPressureAlarm();
                alarmWasManuallyDismissed = false; // Reset flag when pressure drops again
            } else if (alarmWasManuallyDismissed) {
                hidePressureAlarm();
            }
        }
    } catch (error) {
        console.error('Error fetching real-time data:', error);
    }
}

/**
 * Fetches the hourly average data and updates the display.
 */
async function updateHourlyAverageData() {
    try {
        const response = await fetch(HOURLY_AVERAGE_API);
        const data = await response.json();
        
        if (data.front_average !== undefined && data.rear_average !== undefined) {
            const frontAverage = data.front_average !== 0.0 ? data.front_average.toFixed(3) : '...';
            const rearAverage = data.rear_average !== 0.0 ? data.rear_average.toFixed(3) : '...';
            document.getElementById('front-average-value').innerText = frontAverage;
            document.getElementById('rear-average-value').innerText = rearAverage;
        }
    } catch (error) {
        console.error('Error fetching hourly average data:', error);
    }
}

async function updateMinutesAverageData() {
    try {
        const response = await fetch(MINUTES_AVERAGE_API);
        const data = await response.json();
        
        if (data.front_averageM !== undefined && data.rear_averageM !== undefined) {
            const frontAverageM = data.front_averageM !== 0.0 ? data.front_averageM.toFixed(3) : '...';
            const rearAverageM = data.rear_averageM !== 0.0 ? data.rear_averageM.toFixed(3) : '...';
            document.getElementById('front-averageM-value').innerText = frontAverageM;
            document.getElementById('rear-averageM-value').innerText = rearAverageM;
        }
    } catch (error) {
        console.error('Error fetching minute average data:', error);
    }
}

// Helper to generate fixed time labels (e.g., last 60 seconds)
function getFixedTimeLabels(numPoints) {
    const now = new Date();
    const labels = [];
    for (let i = numPoints - 1; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 1000);
        labels.push(t.toLocaleTimeString());
    }
    return labels;
}

/**
 * Fetches historical data and creates the initial line charts.
 */
async function createCharts() {
    const maxDataPoints = 60;
    let frontLabels = JSON.parse(localStorage.getItem('frontChartLabels'));
    let frontData = JSON.parse(localStorage.getItem('frontChartData'));
    let rearLabels = JSON.parse(localStorage.getItem('rearChartLabels'));
    let rearData = JSON.parse(localStorage.getItem('rearChartData'));

    // If no saved data, use default
    if (!frontLabels || frontLabels.length !== maxDataPoints) {
        frontLabels = getFixedTimeLabels(maxDataPoints);
        frontData = Array(maxDataPoints).fill(null);
    }
    if (!rearLabels || rearLabels.length !== maxDataPoints) {
        rearLabels = getFixedTimeLabels(maxDataPoints);
        rearData = Array(maxDataPoints).fill(null);
    }

    // Front Pressure Chart
    const frontCtx = document.getElementById('front-pressure-chart').getContext('2d');
    frontPressureChart = new Chart(frontCtx, {
        type: 'line',
        data: {
            labels: frontLabels,
            datasets: [{
                label: 'Front Pressure (MPa)',
                data: frontData,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'Pressure (MPa)' },
                    min: 0,
                    max: 0.25
                },
                x: { title: { display: true, text: 'Time' } }
            },
            plugins: { tooltip: { mode: 'index', intersect: false } }
        }
    });

    // Rear Pressure Chart
    const rearCtx = document.getElementById('rear-pressure-chart').getContext('2d');
    rearPressureChart = new Chart(rearCtx, {
        type: 'line',
        data: {
            labels: rearLabels,
            datasets: [{
                label: 'Rear Pressure (MPa)',
                data: rearData,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'Pressure (MPa)' },
                    min: 0,
                    max: 0.25
                },
                x: { title: { display: true, text: 'Time' } }
            },
            plugins: { tooltip: { mode: 'index', intersect: false } }
        }
    });
}

/**
 * Fetches the latest data point and appends it to the charts.
 */
async function updateCharts() {
    try {
        const response = await fetch(REALTIME_API);
        const data = await response.json();
        
        if (data.front_pressure !== undefined && data.rear_pressure !== undefined && frontPressureChart && rearPressureChart) {
            // Get current time label
            const nowLabel = new Date().toLocaleTimeString();

            // Shift and push for front chart
            frontPressureChart.data.labels.shift();
            frontPressureChart.data.labels.push(nowLabel);
            frontPressureChart.data.datasets[0].data.shift();
            frontPressureChart.data.datasets[0].data.push(data.front_pressure);
            frontPressureChart.update();

            // Shift and push for rear chart
            rearPressureChart.data.labels.shift();
            rearPressureChart.data.labels.push(nowLabel);
            rearPressureChart.data.datasets[0].data.shift();
            rearPressureChart.data.datasets[0].data.push(data.rear_pressure);
            rearPressureChart.update();

            // Store updated chart data in localStorage
            localStorage.setItem('frontChartLabels', JSON.stringify(frontPressureChart.data.labels));
            localStorage.setItem('frontChartData', JSON.stringify(frontPressureChart.data.datasets[0].data));
            localStorage.setItem('rearChartLabels', JSON.stringify(rearPressureChart.data.labels));
            localStorage.setItem('rearChartData', JSON.stringify(rearPressureChart.data.datasets[0].data));
        }
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Initial load and periodic updates
document.addEventListener('DOMContentLoaded', () => {
    updateRealtimeData();
    // Add a small delay for the averages to allow data to be logged.
    setTimeout(() => {
        updateHourlyAverageData();
        updateMinutesAverageData();
    }, 1000); 
    createCharts();
    updateDateTimeDisplay();

    // Periodically fetch and update data
    setInterval(updateRealtimeData, REALTIME_UPDATE_INTERVAL);
    setInterval(updateHourlyAverageData, REALTIME_UPDATE_INTERVAL);
    setInterval(updateMinutesAverageData, REALTIME_UPDATE_INTERVAL);
    setInterval(updateCharts, CHART_UPDATE_INTERVAL);
    setInterval(updateDateTimeDisplay, 1000);
});

function updateDateTimeDisplay() {
    const now = new Date();
    const dateOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const formattedDate = now.toLocaleDateString('ja-JP', dateOptions);
    const formattedTime = now.toLocaleTimeString('ja-JP', timeOptions);

    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');

    if (dateElement) {
        dateElement.textContent = `日付: ${formattedDate}`;
    }
    if (timeElement) {
        timeElement.textContent = `時間: ${formattedTime}`;
    }
}

// Dropdown functionality
window.myFunction = function() {
    document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
    // Check if the click occurred outside of the entire dropdown element
    if (!event.target.closest('.dropdown')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// JS functions for the new modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
            modal.querySelector('div').classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        alarmWasManuallyDismissed = true;
        // Keep the last values displayed even after closing
        setTimeout(() => {
            if (frontPressure >= LOW_PRESSURE_THRESHOLD && 
                rearPressure >= LOW_PRESSURE_THRESHOLD) {
                alarmWasManuallyDismissed = false;
            }
        }, 1000);
    }
}

function showPressureAlarm() {
    const modal = document.getElementById('pressureAlarmModal');
    if (!modal.classList.contains('show') && !alarmWasManuallyDismissed) {
        // Get current time in Japanese format
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Store alarm details
        lastAlarmTime = timeStr;
        lastAlarmFrontPressure = frontPressure;
        lastAlarmRearPressure = rearPressure;

        // Update alarm details in modal
        document.getElementById('alarm-timestamp').textContent = timeStr;
        document.getElementById('alarm-front-pressure').textContent = 
            `${frontPressure.toFixed(3)} MPa`;
        document.getElementById('alarm-rear-pressure').textContent = 
            `${rearPressure.toFixed(3)} MPa`;

        modal.classList.add('show');
    }
}

function hidePressureAlarm() {
    // Only hide if manually dismissed
    if (alarmWasManuallyDismissed) {
        const modal = document.getElementById('pressureAlarmModal');
        modal.classList.remove('show');
    }
}

// Add at the top with other globals
let alarmWasManuallyDismissed = false;
let lastAlarmTime = null;
let lastAlarmFrontPressure = null;
let lastAlarmRearPressure = null;

// Modify the showPressureAlarm function
function showPressureAlarm() {
    const modal = document.getElementById('pressureAlarmModal');
    if (!modal.classList.contains('show') && !alarmWasManuallyDismissed) {
        // Get current time in Japanese format
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Store alarm details
        lastAlarmTime = timeStr;
        lastAlarmFrontPressure = frontPressure;
        lastAlarmRearPressure = rearPressure;

        // Update alarm details in modal
        document.getElementById('alarm-timestamp').textContent = timeStr;
        document.getElementById('alarm-front-pressure').textContent = 
            `${frontPressure.toFixed(3)} MPa`;
        document.getElementById('alarm-rear-pressure').textContent = 
            `${rearPressure.toFixed(3)} MPa`;

        modal.classList.add('show');
    }
}

// Modify closeModal function to preserve alarm info
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        alarmWasManuallyDismissed = true;
        // Keep the last values displayed even after closing
        setTimeout(() => {
            if (frontPressure >= LOW_PRESSURE_THRESHOLD && 
                rearPressure >= LOW_PRESSURE_THRESHOLD) {
                alarmWasManuallyDismissed = false;
            }
        }, 1000);
    }
}

// Modify hidePressureAlarm to only hide when manually dismissed
function hidePressureAlarm() {
    // Only hide if manually dismissed
    if (alarmWasManuallyDismissed) {
        const modal = document.getElementById('pressureAlarmModal');
        modal.classList.remove('show');
    }
}

// Modify updateRealtimeData to track pressure values
let frontPressure = 0;
let rearPressure = 0;

async function updateRealtimeData() {
    try {
        const response = await fetch(REALTIME_API);
        const data = await response.json();
        
        if (data.front_pressure !== undefined && data.rear_pressure !== undefined) {
            frontPressure = data.front_pressure;
            rearPressure = data.rear_pressure;
            
            document.getElementById('front-pressure-value').innerText = frontPressure.toFixed(3);
            document.getElementById('rear-pressure-value').innerText = rearPressure.toFixed(3);
            
            // Check pressure threshold
            if (frontPressure < LOW_PRESSURE_THRESHOLD || rearPressure < LOW_PRESSURE_THRESHOLD) {
                showPressureAlarm();
                alarmWasManuallyDismissed = false; // Reset flag when pressure drops again
            } else if (alarmWasManuallyDismissed) {
                hidePressureAlarm();
            }
        }
    } catch (error) {
        console.error('Error fetching real-time data:', error);
    }
}
