<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Auth extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Employee_model');
    }

    // POST /api/auth/login
    public function login() {
        if ($this->input->method() !== 'post') {
            return $this->json_error('Method not allowed', 405);
        }
        $body = $this->get_json_body();
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');

        if (!$username || !$password) {
            return $this->json_error('Username and password are required', 400);
        }

        $emp = $this->Employee_model->get_by_username($username);

        if (!$emp || !$emp['Is_Active']) {
            return $this->json_error('Invalid username or password', 401);
        }

        if (!password_verify($password, $emp['Password_Hash'])) {
            return $this->json_error('Invalid username or password', 401);
        }

        // Store session
        $session_data = [
            'id'       => $emp['Employee_ID'],
            'name'     => $emp['Name'],
            'role'     => $emp['Role'],
            'username' => $emp['Username'],
        ];
        $this->session->set_userdata('user', $session_data);

        $this->Employee_model->update_last_login($emp['Employee_ID']);
        $this->audit('Login', $emp['Employee_ID']);

        return $this->json_success($session_data, 'Login successful');
    }

    // POST /api/auth/logout
    public function logout() {
        $user = $this->session->userdata('user');
        if ($user) $this->audit('Logout', $user['id']);
        $this->session->unset_userdata('user');
        $this->session->sess_destroy();
        return $this->json_success([], 'Logged out successfully');
    }

    // GET /api/auth/me
    public function me() {
        $user = $this->require_auth();
        return $this->json_success($user);
    }

    // POST /api/auth/change-password
    public function change_password() {
        $user = $this->require_auth();
        $body = $this->get_json_body();

        $old = $body['old_password'] ?? '';
        $new = $body['new_password'] ?? '';

        if (!$old || !$new || strlen($new) < 6) {
            return $this->json_error('Old password and new password (min 6 chars) are required', 400);
        }

        $emp = $this->Employee_model->get_by_id($user['id']);
        if (!password_verify($old, $emp['Password_Hash'])) {
            return $this->json_error('Current password is incorrect', 400);
        }

        $this->Employee_model->update($user['id'], [
            'Password_Hash' => password_hash($new, PASSWORD_DEFAULT),
        ]);
        $this->audit('Password changed', $user['id']);

        return $this->json_success([], 'Password changed successfully');
    }

    // Default: redirect info
    public function index() {
        return $this->json_success(['endpoints' => [
            'POST /api/auth/login',
            'POST /api/auth/logout',
            'GET  /api/auth/me',
            'POST /api/auth/change-password',
        ]], 'Barcode MES API');
    }
}
