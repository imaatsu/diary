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
        const randomBtn = document.getElementById('diarycoach-random-btn');

        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        }

        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', closeDetail);
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', handleRandomEntry);
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
            displayEntry(entry);
        })
        .catch(error => {
            console.error('Error:', error);
            detailContent.innerHTML = '<p>Error loading entry</p>';
        });
    }

    /**
     * Display entry details
     */
    function displayEntry(entry) {
        const detailContent = document.getElementById('diarycoach-detail-content');
        const date = new Date(entry.created_at);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        let html = `
            <div class="diarycoach-detail-date">${dateStr}</div>
            <div class="diarycoach-detail-text">
                <h4>Original Text</h4>
                <p>${escapeHtml(entry.original_text)}</p>
            </div>
        `;

        // Review button or existing review
        if (entry.review_json) {
            const review = JSON.parse(entry.review_json);
            html += renderReview(review);
        } else {
            html += `
                <div class="diarycoach-review-section">
                    <button id="diarycoach-review-btn" class="diarycoach-btn diarycoach-btn-review" data-id="${entry.id}">
                        Get AI Review
                    </button>
                    <div id="diarycoach-review-message"></div>
                </div>
            `;
        }

        detailContent.innerHTML = html;

        // Add event listener for review button
        const reviewBtn = document.getElementById('diarycoach-review-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                handleReview(id);
            });
        }
    }

    /**
     * Handle AI review request
     */
    function handleReview(id) {
        const reviewBtn = document.getElementById('diarycoach-review-btn');
        const messageDiv = document.getElementById('diarycoach-review-message');

        reviewBtn.disabled = true;
        reviewBtn.textContent = 'Generating Review...';
        messageDiv.textContent = 'Please wait, AI is reviewing your entry...';
        messageDiv.className = 'diarycoach-message diarycoach-message-info';

        fetch(diarycoachSettings.apiUrl + '/entries/' + id + '/review', {
            method: 'POST',
            headers: {
                'X-WP-Nonce': diarycoachSettings.nonce
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || 'Review failed');
                });
            }
            return response.json();
        })
        .then(review => {
            messageDiv.textContent = 'Review generated successfully!';
            messageDiv.className = 'diarycoach-message diarycoach-message-success';

            // Replace button with review display
            setTimeout(() => {
                const reviewSection = document.querySelector('.diarycoach-review-section');
                reviewSection.outerHTML = renderReview(review);
            }, 1000);
        })
        .catch(error => {
            console.error('Error:', error);
            messageDiv.textContent = 'Error: ' + error.message;
            messageDiv.className = 'diarycoach-message diarycoach-message-error';
            reviewBtn.disabled = false;
            reviewBtn.textContent = 'Get AI Review';
        });
    }

    /**
     * Render review HTML
     */
    function renderReview(review) {
        let html = '<div class="diarycoach-detail-review">';
        html += '<h4>AI Review</h4>';

        // Corrected text
        if (review.corrected) {
            html += '<div class="diarycoach-review-section">';
            html += '<h5>Corrected Version</h5>';
            html += `<p class="diarycoach-review-corrected">${escapeHtml(review.corrected)}</p>`;
            html += '</div>';
        }

        // Alternative expressions
        if (review.alternatives && review.alternatives.length > 0) {
            html += '<div class="diarycoach-review-section">';
            html += '<h5>Alternative Expressions</h5>';
            html += '<ul class="diarycoach-review-alternatives">';
            review.alternatives.forEach(alt => {
                html += `<li>${escapeHtml(alt)}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // Improvement notes
        if (review.notes && review.notes.length > 0) {
            html += '<div class="diarycoach-review-section">';
            html += '<h5>Improvement Notes</h5>';
            html += '<ul class="diarycoach-review-notes">';
            review.notes.forEach(note => {
                html += `<li>${escapeHtml(note)}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // Read aloud text
        if (review.readAloud) {
            html += '<div class="diarycoach-review-section">';
            html += '<h5>Read Aloud Practice</h5>';
            html += `<p class="diarycoach-review-readaloud">${escapeHtml(review.readAloud)}</p>`;
            html += `<button class="diarycoach-btn diarycoach-btn-speak" data-text="${escapeHtml(review.readAloud)}">🔊 Speak</button>`;
            html += '</div>';
        }

        html += '</div>';

        // Add event listeners for speak buttons after rendering
        setTimeout(() => {
            const speakBtns = document.querySelectorAll('.diarycoach-btn-speak');
            speakBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const text = this.getAttribute('data-text');
                    speakText(text);
                });
            });
        }, 100);

        return html;
    }

    /**
     * Speak text using Web Speech API
     */
    function speakText(text) {
        if (!('speechSynthesis' in window)) {
            alert('Sorry, your browser does not support text-to-speech.');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for learning
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
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
     * Handle random entry button click
     */
    function handleRandomEntry() {
        const randomBtn = document.getElementById('diarycoach-random-btn');
        const resultDiv = document.getElementById('diarycoach-random-result');

        randomBtn.disabled = true;
        randomBtn.textContent = 'Loading...';
        resultDiv.innerHTML = '';

        fetch(diarycoachSettings.apiUrl + '/shadowing/random', {
            headers: {
                'X-WP-Nonce': diarycoachSettings.nonce
            }
        })
        .then(response => response.json())
        .then(entry => {
            if (!entry || !entry.id) {
                resultDiv.innerHTML = '<p class="diarycoach-message diarycoach-message-error">No entries available for practice.</p>';
                return;
            }

            displayRandomEntry(entry);
        })
        .catch(error => {
            console.error('Error:', error);
            resultDiv.innerHTML = '<p class="diarycoach-message diarycoach-message-error">Error loading entry</p>';
        })
        .finally(() => {
            randomBtn.disabled = false;
            randomBtn.textContent = '🎲 Get Random Entry for Practice';
        });
    }

    /**
     * Display random entry for shadowing
     */
    function displayRandomEntry(entry) {
        const resultDiv = document.getElementById('diarycoach-random-result');
        const date = new Date(entry.created_at);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        let html = `
            <div class="diarycoach-random-card">
                <div class="diarycoach-random-header">
                    <div class="diarycoach-entry-date">${dateStr}</div>
                    <div class="diarycoach-shadowing-count">Practiced: ${entry.shadowing_count} times</div>
                </div>
        `;

        // Show review if available
        if (entry.review_json) {
            const review = JSON.parse(entry.review_json);

            if (review.readAloud) {
                html += `
                    <div class="diarycoach-shadowing-text">
                        <h4>Practice Text</h4>
                        <p class="diarycoach-review-readaloud">${escapeHtml(review.readAloud)}</p>
                        <button class="diarycoach-btn diarycoach-btn-speak" data-text="${escapeHtml(review.readAloud)}">
                            🔊 Listen
                        </button>
                    </div>
                `;
            }

            // Show alternatives as reference
            if (review.alternatives && review.alternatives.length > 0) {
                html += `
                    <div class="diarycoach-shadowing-alternatives">
                        <h5>Reference Expressions</h5>
                        <ul class="diarycoach-review-alternatives">
                `;
                review.alternatives.forEach(alt => {
                    html += `<li>${escapeHtml(alt)}</li>`;
                });
                html += `
                        </ul>
                    </div>
                `;
            }
        } else {
            // No review, show original text
            html += `
                <div class="diarycoach-shadowing-text">
                    <h4>Original Text</h4>
                    <p>${escapeHtml(entry.original_text)}</p>
                    <button class="diarycoach-btn diarycoach-btn-speak" data-text="${escapeHtml(entry.original_text)}">
                        🔊 Listen
                    </button>
                </div>
            `;
        }

        html += `
                <div class="diarycoach-shadowing-actions">
                    <button class="diarycoach-btn diarycoach-btn-primary" id="diarycoach-mark-practiced-btn" data-id="${entry.id}">
                        ✓ Mark as Practiced
                    </button>
                </div>
            </div>
        `;

        resultDiv.innerHTML = html;

        // Add event listeners
        const speakBtns = resultDiv.querySelectorAll('.diarycoach-btn-speak');
        speakBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.getAttribute('data-text');
                speakText(text);
            });
        });

        const markBtn = document.getElementById('diarycoach-mark-practiced-btn');
        if (markBtn) {
            markBtn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                markAsPracticed(id);
            });
        }
    }

    /**
     * Mark entry as practiced
     */
    function markAsPracticed(id) {
        const markBtn = document.getElementById('diarycoach-mark-practiced-btn');
        const resultDiv = document.getElementById('diarycoach-random-result');

        markBtn.disabled = true;
        markBtn.textContent = 'Saving...';

        fetch(diarycoachSettings.apiUrl + '/entries/' + id + '/shadowed', {
            method: 'POST',
            headers: {
                'X-WP-Nonce': diarycoachSettings.nonce
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                resultDiv.innerHTML = `
                    <p class="diarycoach-message diarycoach-message-success">
                        Great job! Practice recorded. Click the button above to get another entry.
                    </p>
                `;
            } else {
                throw new Error('Failed to record practice');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultDiv.innerHTML = '<p class="diarycoach-message diarycoach-message-error">Error recording practice</p>';
        });
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
