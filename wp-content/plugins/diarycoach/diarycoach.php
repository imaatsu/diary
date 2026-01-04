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

// Load required classes
require_once plugin_dir_path( __FILE__ ) . 'includes/class-diarycoach-database.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/class-diarycoach-rest-api.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/class-diarycoach-shortcode.php';

// Plugin activation
register_activation_hook( __FILE__, 'diarycoach_activate' );
function diarycoach_activate() {
    DiaryCoach_Database::create_table();
}

// Plugin deactivation
register_deactivation_hook( __FILE__, 'diarycoach_deactivate' );
function diarycoach_deactivate() {
    // Cleanup logic (if needed in future)
}

// Register REST API routes
add_action( 'rest_api_init', array( 'DiaryCoach_REST_API', 'register_routes' ) );

// Register shortcode
add_action( 'init', array( 'DiaryCoach_Shortcode', 'register' ) );
