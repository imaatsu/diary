<?php
/**
 * Shortcode class for DiaryCoach
 *
 * @package DiaryCoach
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class DiaryCoach_Shortcode {

    /**
     * Register shortcode
     */
    public static function register() {
        add_shortcode( 'diarycoach_app', array( __CLASS__, 'render' ) );
    }

    /**
     * Enqueue scripts and styles
     */
    public static function enqueue_assets() {
        $plugin_url = plugin_dir_url( dirname( __FILE__ ) );

        // Enqueue JavaScript
        wp_enqueue_script(
            'diarycoach-app',
            $plugin_url . 'assets/js/diarycoach-app.js',
            array(),
            '1.0.0',
            true
        );

        // Localize script with settings
        wp_localize_script(
            'diarycoach-app',
            'diarycoachSettings',
            array(
                'apiUrl' => rest_url( 'diarycoach/v1' ),
                'nonce' => wp_create_nonce( 'wp_rest' )
            )
        );

        // Enqueue CSS
        wp_enqueue_style(
            'diarycoach-app',
            $plugin_url . 'assets/css/diarycoach-app.css',
            array(),
            '1.0.0'
        );
    }

    /**
     * Render shortcode
     */
    public static function render( $atts ) {
        if ( ! is_user_logged_in() ) {
            return '<p>Please log in to use DiaryCoach.</p>';
        }

        self::enqueue_assets();

        ob_start();
        ?>
        <div class="diarycoach-app">
            <div class="diarycoach-header">
                <h2>English Diary</h2>
            </div>

            <div class="diarycoach-input-section">
                <h3>Write New Entry</h3>
                <textarea
                    id="diarycoach-input"
                    class="diarycoach-textarea"
                    placeholder="Write your English diary here..."
                    rows="6"
                ></textarea>
                <button id="diarycoach-save-btn" class="diarycoach-btn diarycoach-btn-primary">
                    Save Entry
                </button>
                <div id="diarycoach-save-message" class="diarycoach-message"></div>
            </div>

            <div class="diarycoach-list-section">
                <h3>Recent Entries</h3>
                <div id="diarycoach-entries-list" class="diarycoach-entries-list">
                    <p>Loading...</p>
                </div>
            </div>

            <div id="diarycoach-detail-section" class="diarycoach-detail-section" style="display: none;">
                <h3>Entry Detail</h3>
                <div id="diarycoach-detail-content" class="diarycoach-detail-content"></div>
                <button id="diarycoach-close-detail-btn" class="diarycoach-btn">Close</button>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}
