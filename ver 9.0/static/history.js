let chart = null;
let lastData = [];

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
setInterval(updateDateTimeDisplay, 1000);
updateDateTimeDisplay();

// Calendar setup
const datePickers = flatpickr(".date-picker", {
    dateFormat: "Y-m-d",
    defaultDate: new Date(),
    onChange: function(selectedDates, dateStr, instance) {
        loadHistoryDataFromPickers();
    }
});

function loadHistoryDataFromPickers() {
    const startDate = document.getElementById('start-date-picker').value;
    const endDate = document.getElementById('end-date-picker').value;
    if (startDate && endDate) {
        window.loadHistoryData(startDate, endDate);
    }
}

// Initial load for today
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toLocaleDateString('sv-SE');
    // Use flatpickr's API to set the date
    flatpickr("#start-date-picker", {defaultDate: today, dateFormat: "Y-m-d", onChange: loadHistoryDataFromPickers});
    flatpickr("#end-date-picker", {defaultDate: today, dateFormat: "Y-m-d", onChange: loadHistoryDataFromPickers});
    
    // Initial load
    window.loadHistoryData(today, today);
});

window.loadHistoryData = async function(startDate, endDate) {
    const ctx = document.getElementById('pressure-history-graph').getContext('2d');

    // Show loading
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { plugins: { legend: { display: true } }, scales: { x: { title: { display: true, text: '時刻' } }, y: { title: { display: true, text: '圧力 (MPa)' } } } }
    });

    try {
        const res = await fetch(`/api/history?start_date=${startDate}&end_date=${endDate}`);
        if (!res.ok) throw new Error('データ取得失敗');
        const data = await res.json();
        lastData = data;

        // Filter data between 6:00 and 18:00 (6 PM)
        const filtered = data.filter(entry => {
            const hour = new Date(entry.timestamp).getHours();
            return hour >= 6 && hour < 18;
        });

        // Prepare data for Chart.js
        const labels = filtered.map(entry => {
            const d = new Date(entry.timestamp);
            // If the range is more than one day, include the date in the label
            if (startDate !== endDate) {
                return d.toLocaleDateString('ja-JP', {month: '2-digit', day: '2-digit'}) + ' ' + d.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
            } else {
                return d.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
            }
        });
        const front = filtered.map(entry => entry.front_pressure);
        const rear = filtered.map(entry => entry.rear_pressure);

        // Draw chart
        chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '前圧力 (Front)',
                        data: front,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46,204,113,0.1)',
                        tension: 0.1,
                        spanGaps: true
                    },
                    {
                        label: '後圧力 (Rear)',
                        data: rear,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52,152,219,0.1)',
                        tension: 0.1,
                        spanGaps: true
                    }
                ]
            },
            options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: true },
        // --- Merge Zoom and Annotation here ---
        zoom: {
            pan: {
                enabled: true,
                mode: 'x',
                threshold: 5,
            },
            zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'x',
            },
            limits: {
                x: { min: 'original', max: 'original' }
            }
        },
        annotation: {
            annotations: {
                lowLine: { 
                    type: 'line', 
                    yMin: 0.125, 
                    yMax: 0.125, 
                    borderColor: 'orange', 
                    borderDash: [6, 6],
                },
                idleLine: { 
                    type: 'line', 
                    yMin: 0.029, 
                    yMax: 0.029, 
                    borderColor: 'grey', 
                    borderDash: [6, 6],
                }
            }
        }
    },
    scales: {
        x: { title: { display: true, text: '時刻' },
            ticks: {
            autoSkip: true,
            maxRotation: 45, // Rotates labels to fit better
            minRotation: 45
        } },
        y: {
            beginAtZero: true,
            title: { display: true, text: '圧力 (MPa)' },
            min: 0,
            max: 0.25
        }
    }
}
        });

    } catch (err) {
        chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: { plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: '時刻' } }, y: { title: { display: true, text: '圧力 (MPa)' } } } }
        });
        alert('履歴データの取得に失敗しました');
    }
};

// Reset Zoom button
document.getElementById('reset-zoom').addEventListener('click', () => {
    if (chart) chart.resetZoom();
});

// CSVダウンロード
document.getElementById('download-csv').addEventListener('click', function() {
    if (!lastData.length) {
        alert('データがありません');
        return;
    }
    const startDate = document.getElementById('start-date-picker').value;
    const endDate = document.getElementById('end-date-picker').value;
    let csv = 'timestamp,front_pressure,rear_pressure\n';
    lastData.forEach(entry => {
        csv += `${entry.timestamp},${entry.front_pressure},${entry.rear_pressure}\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pressure_history_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
