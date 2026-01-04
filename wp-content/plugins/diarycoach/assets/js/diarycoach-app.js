(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const saveBtn = document.getElementById('diarycoach-save-btn');
        const closeDetailBtn = document.getElementById('diarycoach-close-detail-btn');

        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        }

        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', closeDetail);
        }

        // Load entries on init
        loadEntries();
    }

    /**
     * Handle save button click
     */
    function handleSave() {
        const textarea = document.getElementById('diarycoach-input');
        const messageDiv = document.getElementById('diarycoach-save-message');
        const originalText = textarea.value.trim();

        if (!originalText) {
            showMessage('Please enter some text', 'error');
            return;
        }

        // Disable button during save
        const saveBtn = document.getElementById('diarycoach-save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        fetch(diarycoachSettings.apiUrl + '/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': diarycoachSettings.nonce
            },
            body: JSON.stringify({ original_text: originalText })
        })
        .then(response => response.json())
        .then(data => {
            if (data.id) {
                showMessage('Entry saved successfully!', 'success');
                textarea.value = '';
                loadEntries();
            } else {
                showMessage('Failed to save entry', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('An error occurred', 'error');
        })
        .finally(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Entry';
        });
    }

    /**
     * Load entries list
     */
    function loadEntries() {
        const listDiv = document.getElementById('diarycoach-entries-list');

        fetch(diarycoachSettings.apiUrl + '/entries?limit=10', {
            headers: {
                'X-WP-Nonce': diarycoachSettings.nonce
            }
        })
        .then(response => response.json())
        .then(entries => {
            if (entries.length === 0) {
                listDiv.innerHTML = '<p>No entries yet. Start writing your first diary!</p>';
                return;
            }

            let html = '<ul class="diarycoach-entries-ul">';
            entries.forEach(entry => {
                const date = new Date(entry.created_at);
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                const preview = entry.original_text.substring(0, 100) + (entry.original_text.length > 100 ? '...' : '');

                html += `
                    <li class="diarycoach-entry-item" data-id="${entry.id}">
                        <div class="diarycoach-entry-date">${dateStr}</div>
                        <div class="diarycoach-entry-preview">${escapeHtml(preview)}</div>
                    </li>
                `;
            });
            html += '</ul>';

            listDiv.innerHTML = html;

            // Add click handlers
            const entryItems = listDiv.querySelectorAll('.diarycoach-entry-item');
            entryItems.forEach(item => {
                item.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    loadEntry(id);
                });
            });
        })
        .catch(error => {
            console.error('Error:', error);
            listDiv.innerHTML = '<p>Error loading entries</p>';
        });
    }

    /**
     * Load single entry
     */
    function loadEntry(id) {
        const detailSection = document.getElementById('diarycoach-detail-section');
        const detailContent = document.getElementById('diarycoach-detail-content');

        detailContent.innerHTML = '<p>Loading...</p>';
        detailSection.style.display = 'block';

        fetch(diarycoachSettings.apiUrl + '/entries/' + id, {
            headers: {
                'X-WP-Nonce': diarycoachSettings.nonce
            }
        })
        .then(response => response.json())
        .then(entry => {
            const date = new Date(entry.created_at);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

            let html = `
                <div class="diarycoach-detail-date">${dateStr}</div>
                <div class="diarycoach-detail-text">
                    <h4>Original Text</h4>
                    <p>${escapeHtml(entry.original_text)}</p>
                </div>
            `;

            if (entry.review_json) {
                html += '<div class="diarycoach-detail-review">';
                html += '<h4>AI Review (Coming in Phase 2)</h4>';
                html += '</div>';
            }

            detailContent.innerHTML = html;
        })
        .catch(error => {
            console.error('Error:', error);
            detailContent.innerHTML = '<p>Error loading entry</p>';
        });
    }

    /**
     * Close detail view
     */
    function closeDetail() {
        const detailSection = document.getElementById('diarycoach-detail-section');
        detailSection.style.display = 'none';
    }

    /**
     * Show message
     */
    function showMessage(text, type) {
        const messageDiv = document.getElementById('diarycoach-save-message');
        messageDiv.textContent = text;
        messageDiv.className = 'diarycoach-message diarycoach-message-' + type;

        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'diarycoach-message';
        }, 3000);
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

})();
