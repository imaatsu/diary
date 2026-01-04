<?php
/**
 * Database class for DiaryCoach
 *
 * @package DiaryCoach
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class DiaryCoach_Database {

    /**
     * Table name (without prefix)
     */
    const TABLE_NAME = 'diarycoach_entries';

    /**
     * Get full table name with WordPress prefix
     */
    public static function get_table_name() {
        global $wpdb;
        return $wpdb->prefix . self::TABLE_NAME;
    }

    /**
     * Create database table
     */
    public static function create_table() {
        global $wpdb;

        $table_name = self::get_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            original_text longtext NOT NULL,
            review_json longtext DEFAULT NULL,
            shadowing_count int(11) NOT NULL DEFAULT 0,
            last_shadowed_at datetime DEFAULT NULL,
            PRIMARY KEY (id),
            KEY created_at (created_at),
            KEY shadowing_count (shadowing_count)
        ) $charset_collate;";

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql );
    }

    /**
     * Create entry
     */
    public static function create_entry( $original_text ) {
        global $wpdb;

        $table_name = self::get_table_name();
        $now = current_time( 'mysql' );

        $result = $wpdb->insert(
            $table_name,
            array(
                'created_at' => $now,
                'updated_at' => $now,
                'original_text' => $original_text,
                'shadowing_count' => 0
            ),
            array( '%s', '%s', '%s', '%d' )
        );

        if ( $result === false ) {
            return false;
        }

        return $wpdb->insert_id;
    }

    /**
     * Get entry by ID
     */
    public static function get_entry( $id ) {
        global $wpdb;

        $table_name = self::get_table_name();

        $entry = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM $table_name WHERE id = %d",
                $id
            ),
            ARRAY_A
        );

        return $entry;
    }

    /**
     * Get entries list
     */
    public static function get_entries( $limit = 10, $offset = 0 ) {
        global $wpdb;

        $table_name = self::get_table_name();

        $entries = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $table_name ORDER BY created_at DESC LIMIT %d OFFSET %d",
                $limit,
                $offset
            ),
            ARRAY_A
        );

        return $entries;
    }

    /**
     * Update review JSON
     */
    public static function update_review( $id, $review_json ) {
        global $wpdb;

        $table_name = self::get_table_name();
        $now = current_time( 'mysql' );

        $result = $wpdb->update(
            $table_name,
            array(
                'review_json' => $review_json,
                'updated_at' => $now
            ),
            array( 'id' => $id ),
            array( '%s', '%s' ),
            array( '%d' )
        );

        return $result !== false;
    }

    /**
     * Increment shadowing count
     */
    public static function increment_shadowing( $id ) {
        global $wpdb;

        $table_name = self::get_table_name();
        $now = current_time( 'mysql' );

        $result = $wpdb->query(
            $wpdb->prepare(
                "UPDATE $table_name SET shadowing_count = shadowing_count + 1, last_shadowed_at = %s WHERE id = %d",
                $now,
                $id
            )
        );

        return $result !== false;
    }
}
