<?php
/**
 * Plugin Name: DiaryCoach
 * Plugin URI: https://example.com/diarycoach
 * Description: AI-powered English diary review and shadowing practice
 * Version: 0.1.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: diarycoach
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin activation
register_activation_hook( __FILE__, 'diarycoach_activate' );
function diarycoach_activate() {
    // Placeholder for activation logic
}

// Plugin deactivation
register_deactivation_hook( __FILE__, 'diarycoach_deactivate' );
function diarycoach_deactivate() {
    // Placeholder for deactivation logic
}
