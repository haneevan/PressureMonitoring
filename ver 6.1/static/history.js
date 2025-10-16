let chart = null;
let lastData = [];

function updateDateTimeDisplay() {
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
}
setInterval(updateDateTimeDisplay, 1000);
updateDateTimeDisplay();

// Calendar setup
flatpickr("#date-picker", {
    dateFormat: "Y-m-d",
    defaultDate: new Date(),
    onChange: function(selectedDates, dateStr, instance) {
        window.loadHistoryData(dateStr);
    }
});

// Initial load for today
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('date-picker').value = today;
    window.loadHistoryData(today);
});

window.loadHistoryData = async function(dateStr) {
    const ctx = document.getElementById('pressure-history-graph').getContext('2d');
    document.getElementById('pressure-history-graph').height = 400;

    // Show loading
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { plugins: { legend: { display: true } }, scales: { x: { title: { display: true, text: '時刻' } }, y: { title: { display: true, text: '圧力 (MPa)' } } } }
    });

    try {
        const res = await fetch(`/api/history?date=${dateStr}`);
        if (!res.ok) throw new Error('データ取得失敗');
        const data = await res.json();
        lastData = data;

        // Filter data between 8:00 and 17:00
        const filtered = data.filter(entry => {
            const hour = new Date(entry.timestamp).getHours();
            return hour >= 8 && hour <= 17;
        });

        // Prepare data for Chart.js
        const labels = filtered.map(entry => {
            const d = new Date(entry.timestamp);
            return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
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
                        tension: 0.2,
                        spanGaps: true
                    },
                    {
                        label: '後圧力 (Rear)',
                        data: rear,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52,152,219,0.1)',
                        tension: 0.2,
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    x: { title: { display: true, text: '時刻' } },
                    y: { title: { display: true, text: '圧力 (MPa)' } }
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

// CSVダウンロード
document.getElementById('download-csv').addEventListener('click', function() {
    if (!lastData.length) {
        alert('データがありません');
        return;
    }
    let csv = 'timestamp,front_pressure,rear_pressure\n';
    lastData.forEach(entry => {
        csv += `${entry.timestamp},${entry.front_pressure},${entry.rear_pressure}\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pressure_history_${document.getElementById('date-picker').value}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
