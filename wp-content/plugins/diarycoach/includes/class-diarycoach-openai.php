<?php
/**
 * OpenAI API client class for DiaryCoach
 *
 * @package DiaryCoach
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class DiaryCoach_OpenAI {

    /**
     * OpenAI API endpoint
     */
    const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

    /**
     * Default model
     */
    const DEFAULT_MODEL = 'gpt-4o-mini';

    /**
     * Maximum characters per review
     */
    const MAX_CHARS = 3000;

    /**
     * Maximum reviews per day per user
     */
    const MAX_DAILY_REVIEWS = 50;

    /**
     * Get API key from environment
     */
    private static function get_api_key() {
        $api_key = getenv( 'OPENAI_API_KEY' );

        if ( empty( $api_key ) ) {
            return new WP_Error(
                'missing_api_key',
                'OpenAI API key is not configured',
                array( 'status' => 500 )
            );
        }

        return $api_key;
    }

    /**
     * Get AI model (can be customized in future)
     */
    private static function get_model() {
        return get_option( 'diarycoach_ai_model', self::DEFAULT_MODEL );
    }

    /**
     * Check daily review limit for current user
     */
    public static function check_daily_limit() {
        $user_id = get_current_user_id();

        if ( ! $user_id ) {
            return new WP_Error(
                'not_logged_in',
                'User must be logged in',
                array( 'status' => 401 )
            );
        }

        $today = date( 'Y-m-d' );
        $meta_key = 'diarycoach_reviews_' . $today;
        $count = get_user_meta( $user_id, $meta_key, true );
        $count = intval( $count );

        if ( $count >= self::MAX_DAILY_REVIEWS ) {
            return new WP_Error(
                'daily_limit_exceeded',
                sprintf( 'Daily review limit of %d reached', self::MAX_DAILY_REVIEWS ),
                array( 'status' => 429 )
            );
        }

        return true;
    }

    /**
     * Increment daily review count
     */
    private static function increment_daily_count() {
        $user_id = get_current_user_id();

        if ( ! $user_id ) {
            return;
        }

        $today = date( 'Y-m-d' );
        $meta_key = 'diarycoach_reviews_' . $today;
        $count = get_user_meta( $user_id, $meta_key, true );
        $count = intval( $count ) + 1;

        update_user_meta( $user_id, $meta_key, $count );
    }

    /**
     * Build system prompt
     */
    private static function get_system_prompt() {
        return 'You are an English writing coach specializing in diary entries. Your role is to:
1. Correct grammatical errors and improve word choice
2. Suggest alternative natural expressions
3. Provide brief, actionable improvement notes
4. Create an optimized version for read-aloud practice

Rules:
- Preserve the original meaning and intent
- Do not add facts or details not in the original text
- Keep notes concise (1-2 sentences each)
- Output ONLY valid JSON with no additional text';
    }

    /**
     * Build user prompt
     */
    private static function get_user_prompt( $original_text ) {
        return sprintf(
            'Review the following English diary entry and respond with JSON only:

%s

Required JSON format:
{
  "corrected": "Grammatically correct version with improved word choice",
  "alternatives": ["Alternative expression 1", "Alternative expression 2"],
  "notes": ["Brief improvement point 1", "Brief improvement point 2"],
  "readAloud": "Optimized version for pronunciation practice"
}',
            $original_text
        );
    }

    /**
     * Validate input text
     */
    private static function validate_input( $text ) {
        if ( empty( $text ) ) {
            return new WP_Error(
                'empty_text',
                'Text cannot be empty',
                array( 'status' => 400 )
            );
        }

        if ( strlen( $text ) > self::MAX_CHARS ) {
            return new WP_Error(
                'text_too_long',
                sprintf( 'Text exceeds maximum length of %d characters', self::MAX_CHARS ),
                array( 'status' => 400 )
            );
        }

        return true;
    }

    /**
     * Call OpenAI API to review diary entry
     *
     * @param string $original_text The diary entry to review
     * @return array|WP_Error Review result or error
     */
    public static function review_entry( $original_text ) {
        // Validate input
        $validation = self::validate_input( $original_text );
        if ( is_wp_error( $validation ) ) {
            return $validation;
        }

        // Check daily limit
        $limit_check = self::check_daily_limit();
        if ( is_wp_error( $limit_check ) ) {
            return $limit_check;
        }

        // Get API key
        $api_key = self::get_api_key();
        if ( is_wp_error( $api_key ) ) {
            return $api_key;
        }

        // Build request
        $request_body = array(
            'model' => self::get_model(),
            'messages' => array(
                array(
                    'role' => 'system',
                    'content' => self::get_system_prompt()
                ),
                array(
                    'role' => 'user',
                    'content' => self::get_user_prompt( $original_text )
                )
            ),
            'temperature' => 0.3,
            'max_tokens' => 1000,
            'response_format' => array( 'type' => 'json_object' )
        );

        // Call OpenAI API
        $response = wp_remote_post(
            self::API_ENDPOINT,
            array(
                'headers' => array(
                    'Authorization' => 'Bearer ' . $api_key,
                    'Content-Type' => 'application/json'
                ),
                'body' => json_encode( $request_body ),
                'timeout' => 30
            )
        );

        // Handle errors
        if ( is_wp_error( $response ) ) {
            return new WP_Error(
                'api_request_failed',
                'Failed to connect to OpenAI API: ' . $response->get_error_message(),
                array( 'status' => 500 )
            );
        }

        $response_code = wp_remote_retrieve_response_code( $response );
        if ( $response_code !== 200 ) {
            $body = wp_remote_retrieve_body( $response );
            return new WP_Error(
                'api_error',
                sprintf( 'OpenAI API returned error (code %d): %s', $response_code, $body ),
                array( 'status' => 500 )
            );
        }

        // Parse response
        $body = wp_remote_retrieve_body( $response );
        $data = json_decode( $body, true );

        if ( empty( $data['choices'][0]['message']['content'] ) ) {
            return new WP_Error(
                'invalid_response',
                'Invalid response from OpenAI API',
                array( 'status' => 500 )
            );
        }

        // Parse review JSON
        $review_json = $data['choices'][0]['message']['content'];
        $review = json_decode( $review_json, true );

        if ( json_last_error() !== JSON_ERROR_NONE ) {
            return new WP_Error(
                'json_parse_error',
                'Failed to parse review JSON: ' . json_last_error_msg(),
                array( 'status' => 500 )
            );
        }

        // Validate review structure
        $required_fields = array( 'corrected', 'alternatives', 'notes', 'readAloud' );
        foreach ( $required_fields as $field ) {
            if ( ! isset( $review[ $field ] ) ) {
                return new WP_Error(
                    'invalid_review_format',
                    sprintf( 'Review missing required field: %s', $field ),
                    array( 'status' => 500 )
                );
            }
        }

        // Increment daily count
        self::increment_daily_count();

        // Add timestamp
        $review['reviewedAt'] = current_time( 'c' );

        return $review;
    }

    /**
     * Get daily review count for current user
     */
    public static function get_daily_count() {
        $user_id = get_current_user_id();

        if ( ! $user_id ) {
            return 0;
        }

        $today = date( 'Y-m-d' );
        $meta_key = 'diarycoach_reviews_' . $today;
        $count = get_user_meta( $user_id, $meta_key, true );

        return intval( $count );
    }
}
