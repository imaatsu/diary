<?php
/**
 * REST API class for DiaryCoach
 *
 * @package DiaryCoach
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class DiaryCoach_REST_API {

    /**
     * API namespace
     */
    const NAMESPACE = 'diarycoach/v1';

    /**
     * Register REST API routes
     */
    public static function register_routes() {
        // Create entry
        register_rest_route( self::NAMESPACE, '/entries', array(
            'methods' => 'POST',
            'callback' => array( __CLASS__, 'create_entry' ),
            'permission_callback' => array( __CLASS__, 'check_permission' )
        ) );

        // Get entries list
        register_rest_route( self::NAMESPACE, '/entries', array(
            'methods' => 'GET',
            'callback' => array( __CLASS__, 'get_entries' ),
            'permission_callback' => array( __CLASS__, 'check_permission' )
        ) );

        // Get single entry
        register_rest_route( self::NAMESPACE, '/entries/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( __CLASS__, 'get_entry' ),
            'permission_callback' => array( __CLASS__, 'check_permission' )
        ) );
    }

    /**
     * Permission callback
     */
    public static function check_permission() {
        return is_user_logged_in();
    }

    /**
     * Create entry endpoint
     */
    public static function create_entry( $request ) {
        $params = $request->get_json_params();

        if ( empty( $params['original_text'] ) ) {
            return new WP_Error(
                'missing_original_text',
                'Original text is required',
                array( 'status' => 400 )
            );
        }

        $original_text = sanitize_textarea_field( $params['original_text'] );

        $entry_id = DiaryCoach_Database::create_entry( $original_text );

        if ( $entry_id === false ) {
            return new WP_Error(
                'create_failed',
                'Failed to create entry',
                array( 'status' => 500 )
            );
        }

        $entry = DiaryCoach_Database::get_entry( $entry_id );

        return rest_ensure_response( $entry );
    }

    /**
     * Get entries list endpoint
     */
    public static function get_entries( $request ) {
        $limit = $request->get_param( 'limit' );
        $offset = $request->get_param( 'offset' );

        $limit = ! empty( $limit ) ? intval( $limit ) : 10;
        $offset = ! empty( $offset ) ? intval( $offset ) : 0;

        $entries = DiaryCoach_Database::get_entries( $limit, $offset );

        return rest_ensure_response( $entries );
    }

    /**
     * Get single entry endpoint
     */
    public static function get_entry( $request ) {
        $id = intval( $request->get_param( 'id' ) );

        $entry = DiaryCoach_Database::get_entry( $id );

        if ( empty( $entry ) ) {
            return new WP_Error(
                'entry_not_found',
                'Entry not found',
                array( 'status' => 404 )
            );
        }

        return rest_ensure_response( $entry );
    }
}
