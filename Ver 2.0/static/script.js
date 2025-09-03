// Constants for API endpoints and update interval
const REALTIME_API = '/api/realtime';
const HISTORY_API = '/api/history';
const HOURLY_AVERAGE_API = '/api/average/hour';
const MINUTES_AVERAGE_API = '/api/average/minute';
const REALTIME_UPDATE_INTERVAL = 500; // 0.5 seconds for instant card updates
const CHART_UPDATE_INTERVAL = 1000; // 1 second for smoother chart visualization

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
            document.getElementById('front-pressure-value').innerText = data.front_pressure.toFixed(2);
            document.getElementById('rear-pressure-value').innerText = data.rear_pressure.toFixed(2);
            
            const timestamp = new Date(data.timestamp).toLocaleTimeString();
            document.getElementById('front-last-updated').innerText = timestamp;
            document.getElementById('rear-last-updated').innerText = timestamp;
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
            const frontAverage = data.front_average !== 0.0 ? data.front_average.toFixed(2) : '...';
            const rearAverage = data.rear_average !== 0.0 ? data.rear_average.toFixed(2) : '...';
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
            const frontAverageM = data.front_averageM !== 0.0 ? data.front_averageM.toFixed(2) : '...';
            const rearAverageM = data.rear_averageM !== 0.0 ? data.rear_averageM.toFixed(2) : '...';
            document.getElementById('front-averageM-value').innerText = frontAverageM;
            document.getElementById('rear-averageM-value').innerText = rearAverageM;
        }
    } catch (error) {
        console.error('Error fetching minute average data:', error);
    }
}

/**
 * Fetches historical data and creates the initial line charts.
 */
async function createCharts() {
    try {
        const response = await fetch(HISTORY_API);
        const data = await response.json();

        const timestamps = data.map(item => new Date(item.timestamp).toLocaleTimeString());
        const frontPressures = data.map(item => item.front_pressure);
        const rearPressures = data.map(item => item.rear_pressure);

        // Front Pressure Chart
        const frontCtx = document.getElementById('front-pressure-chart').getContext('2d');
        frontPressureChart = new Chart(frontCtx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [{
                    label: 'Front Pressure (MPa)',
                    data: frontPressures,
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
                        min: -1, // Set minimum Y-axis value
                        max: 1   // Set maximum Y-axis value
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
                labels: timestamps,
                datasets: [{
                    label: 'Rear Pressure (MPa)',
                    data: rearPressures,
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
                        min: -1, // Set minimum Y-axis value
                        max: 1   // Set maximum Y-axis value
                    },
                    x: { title: { display: true, text: 'Time' } }
                },
                plugins: { tooltip: { mode: 'index', intersect: false } }
            }
        });

    } catch (error) {
        console.error('Error fetching historical data:', error);
    }
}

/**
 * Fetches the latest data point and appends it to the charts.
 */
async function updateCharts() {
    try {
        const response = await fetch(REALTIME_API);
        const data = await response.json();
        
        if (data.front_pressure !== undefined && data.rear_pressure !== undefined && frontPressureChart && rearPressureChart) {
            const latestTimestamp = new Date(data.timestamp).toLocaleTimeString();
            const maxDataPoints = 50;

            // Update Front Chart
            frontPressureChart.data.labels.push(latestTimestamp);
            frontPressureChart.data.datasets[0].data.push(data.front_pressure);
            if (frontPressureChart.data.labels.length > maxDataPoints) {
                frontPressureChart.data.labels.shift();
                frontPressureChart.data.datasets[0].data.shift();
            }
            frontPressureChart.update();

            // Update Rear Chart
            rearPressureChart.data.labels.push(latestTimestamp);
            rearPressureChart.data.datasets[0].data.push(data.rear_pressure);
            if (rearPressureChart.data.labels.length > maxDataPoints) {
                rearPressureChart.data.labels.shift();
                rearPressureChart.data.datasets[0].data.shift();
            }
            rearPressureChart.update();
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

    // Periodically fetch and update data
    setInterval(updateRealtimeData, REALTIME_UPDATE_INTERVAL);
    setInterval(updateHourlyAverageData, REALTIME_UPDATE_INTERVAL);
    setInterval(updateMinutesAverageData, REALTIME_UPDATE_INTERVAL);
    setInterval(updateCharts, CHART_UPDATE_INTERVAL);
});
