// Constants for API endpoints and update interval
const REALTIME_API = '/api/realtime';
const HISTORY_API = '/api/history';
const UPDATE_INTERVAL = 1000; // 5 seconds

let pressureChart;

// Function to fetch the latest data and update the real-time display
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

// Function to create the initial chart with historical data
async function createChart() {
    try {
        const response = await fetch(HISTORY_API);
        const data = await response.json();

        const timestamps = data.map(item => new Date(item.timestamp).toLocaleTimeString());
        const frontPressures = data.map(item => item.front_pressure);
        const rearPressures = data.map(item => item.rear_pressure);

        const ctx = document.getElementById('pressure-chart').getContext('2d');
        pressureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [
                    {
                        label: 'Front Pressure (MPa)',
                        data: frontPressures,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Rear Pressure (MPa)',
                        data: rearPressures,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Pressure (MPa)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error fetching historical data:', error);
    }
}

// Function to update the chart with a single new data point
async function updateChart() {
    try {
        const response = await fetch(REALTIME_API);
        const data = await response.json();
        
        if (data.front_pressure !== undefined && data.rear_pressure !== undefined && pressureChart) {
            const latestTimestamp = new Date(data.timestamp).toLocaleTimeString();

            pressureChart.data.labels.push(latestTimestamp);
            pressureChart.data.datasets[0].data.push(data.front_pressure);
            pressureChart.data.datasets[1].data.push(data.rear_pressure);

            // Keep the graph clean by removing old data points
            const maxDataPoints = 50;
            if (pressureChart.data.labels.length > maxDataPoints) {
                pressureChart.data.labels.shift();
                pressureChart.data.datasets[0].data.shift();
                pressureChart.data.datasets[1].data.shift();
            }
            pressureChart.update();
        }
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

// Initial load and periodic updates
document.addEventListener('DOMContentLoaded', () => {
    updateRealtimeData();
    createChart();

    // Periodically fetch and update data
    setInterval(updateRealtimeData, UPDATE_INTERVAL);
    setInterval(updateChart, UPDATE_INTERVAL);
});
