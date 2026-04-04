<?php
/**
 * PRODUCTION Database Config — Hostinger
 * RENAME this to database.php before uploading to server
 * Fill in your Hostinger DB credentials from hPanel
 */
defined('BASEPATH') OR exit('No direct script access allowed');

$active_group = 'default';
$query_builder = TRUE;

$db['default'] = array(
    'dsn'          => '',
    'hostname'     => 'localhost',              // Usually 'localhost' on Hostinger
    'username'     => 'YOUR_DB_USERNAME',       // e.g., u123456789_quraish
    'password'     => 'YOUR_DB_PASSWORD',
    'database'     => 'YOUR_DB_NAME',           // e.g., u123456789_barcodemesdb
    'dbdriver'     => 'mysqli',
    'dbprefix'     => '',
    'pconnect'     => FALSE,
    'db_debug'     => FALSE,                    // MUST be FALSE in production
    'cache_on'     => FALSE,
    'cachedir'     => '',
    'char_set'     => 'utf8mb4',
    'dbcollat'     => 'utf8mb4_unicode_ci',
    'swap_pre'     => '',
    'encrypt'      => FALSE,
    'compress'     => FALSE,
    'stricton'     => FALSE,
    'failover'     => array(),
    'save_queries' => FALSE,
);
