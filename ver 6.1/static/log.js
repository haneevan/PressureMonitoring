document.addEventListener('DOMContentLoaded', () => {
    const frontLogList = document.getElementById('front-log-list');
    const rearLogList = document.getElementById('rear-log-list');
    const errorLogList = document.getElementById('error-log-list');

    async function updateLogDisplay() {
        try {
            // Fetch regular logs
            const response = await fetch('/api/log');
            if (!response.ok) throw new Error('Failed to fetch logs');
            const data = await response.json();

            // Clear existing content
            frontLogList.innerHTML = '';
            rearLogList.innerHTML = '';

            // Add regular log entries
            data.forEach(entry => {
                const timestamp = new Date(entry.timestamp).toLocaleTimeString('ja-JP');

                const frontEntry = document.createElement('li');
                frontEntry.className = 'log-entry';
                frontEntry.innerHTML = `
                    <span class="log-timestamp">${timestamp}</span>
                    <span class="log-value">${entry.front_pressure.toFixed(3)} MPa</span>
                `;

                const rearEntry = document.createElement('li');
                rearEntry.className = 'log-entry';
                rearEntry.innerHTML = `
                    <span class="log-timestamp">${timestamp}</span>
                    <span class="log-value">${entry.rear_pressure.toFixed(3)} MPa</span>
                `;

                frontLogList.appendChild(frontEntry);
                rearLogList.appendChild(rearEntry);
            });

            // Try to fetch error logs
            try {
                const errorResponse = await fetch('/api/error-log');
                if (!errorResponse.ok) throw new Error('Failed to fetch error logs');
                const errorData = await errorResponse.json();

                errorLogList.innerHTML = '';
                
                if (Array.isArray(errorData) && errorData.length > 0) {
                    errorData.forEach(entry => {
                        const timestamp = new Date(entry.timestamp).toLocaleTimeString('ja-JP');
                        const errorEntry = document.createElement('li');
                        errorEntry.className = 'log-entry error-entry';
                        errorEntry.innerHTML = `
                            <span class="log-timestamp">${timestamp}</span>
                            <div class="error-details">
                                <span class="error-value">F: ${entry.front_pressure.toFixed(3)} MPa</span>
                                <span class="error-value">R: ${entry.rear_pressure.toFixed(3)} MPa</span>
                            </div>
                        `;
                        errorLogList.appendChild(errorEntry);
                    });
                } else {
                    errorLogList.innerHTML = '<li class="log-entry">No error logs available.</li>';
                }
            } catch (errorErr) {
                console.error('Error fetching error logs:', errorErr);
                errorLogList.innerHTML = '<li class="log-entry">Error loading error logs.</li>';
            }

            // Scroll to latest entries
            frontLogList.scrollTop = frontLogList.scrollHeight;
            rearLogList.scrollTop = rearLogList.scrollHeight;
            errorLogList.scrollTop = errorLogList.scrollHeight;

        } catch (error) {
            console.error('Error fetching log data:', error);
            frontLogList.innerHTML = '<li class="log-entry">Error loading logs.</li>';
            rearLogList.innerHTML = '<li class="log-entry">Error loading logs.</li>';
        }
    }

    // Initial fetch and display
    updateLogDisplay();

    // Update every second
    setInterval(updateLogDisplay, 5000);
});
