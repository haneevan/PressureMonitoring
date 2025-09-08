document.addEventListener('DOMContentLoaded', () => {
    const frontLogList = document.getElementById('front-log-list');
    const rearLogList = document.getElementById('rear-log-list');

    /**
     * Fetches historical data and populates the log lists.
     */
    async function fetchAndDisplayLogs() {
        try {
            const response = await fetch('/api/log');
            const data = await response.json();

            if (!data.length) {
                frontLogList.innerHTML = '<li class="log-entry">No data logged yet.</li>';
                rearLogList.innerHTML = '<li class="log-entry">No data logged yet.</li>';
                return;
            }

            // Clear the existing log entries
            frontLogList.innerHTML = '';
            rearLogList.innerHTML = '';

            // Reverse the array so the latest logs are first
            data.slice().reverse().forEach(entry => {
                const timestamp = new Date(entry.timestamp).toLocaleTimeString();

                // Front sensor log entry
                const frontLogEntry = document.createElement('li');
                frontLogEntry.className = 'log-entry';
                frontLogEntry.innerHTML = `<span class="log-timestamp">${timestamp}</span><span class="log-value">${entry.front_pressure.toFixed(2)} MPa</span>`;
                frontLogList.appendChild(frontLogEntry);

                // Rear sensor log entry
                const rearLogEntry = document.createElement('li');
                rearLogEntry.className = 'log-entry';
                rearLogEntry.innerHTML = `<span class="log-timestamp">${timestamp}</span><span class="log-value">${entry.rear_pressure.toFixed(2)} MPa</span>`;
                rearLogList.appendChild(rearLogEntry);
            });

            // Automatically scroll to the top to show the latest entries
            frontLogList.scrollTop = 0;
            rearLogList.scrollTop = 0;

        } catch (error) {
            console.error('Error fetching log data:', error);
            frontLogList.innerHTML = '<li class="log-entry">Error loading logs.</li>';
            rearLogList.innerHTML = '<li class="log-entry">Error loading logs.</li>';
        }
    }

    // Initial fetch and display
    fetchAndDisplayLogs();

    // Periodically refresh the logs
    setInterval(fetchAndDisplayLogs, 1000); // Update every 1 seconds
});
