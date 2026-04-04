<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * MY_Controller — Base REST API controller
 * All API controllers extend this class.
 */
class MY_Controller extends CI_Controller {

    protected $user = null;   // logged-in session user

    public function __construct() {
        parent::__construct();
        $this->_cors_headers();
    }

    // ── CORS headers (allows React dev server on port 5173) ──────
    private function _cors_headers() {
        $allowed_origins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost',
            'https://easyshoperp.sverpsolutions.com',
        ];
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        } else {
            header('Access-Control-Allow-Origin: http://localhost:5173');
        }
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }

    // ── JSON response helpers ────────────────────────────────────
    protected function json_success($data = [], $message = 'OK', $code = 200) {
        $this->output
            ->set_content_type('application/json')
            ->set_status_header($code)
            ->set_output(json_encode([
                'success' => true,
                'message' => $message,
                'data'    => $data,
            ], JSON_UNESCAPED_UNICODE));
    }

    protected function json_error($message = 'Error', $code = 400, $errors = []) {
        $this->output
            ->set_content_type('application/json')
            ->set_status_header($code)
            ->set_output(json_encode([
                'success' => false,
                'message' => $message,
                'errors'  => $errors,
            ], JSON_UNESCAPED_UNICODE));
    }

    // ── Auth guard: require logged-in session ────────────────────
    protected function require_auth() {
        $user = $this->session->userdata('user');
        if (!$user) {
            $this->json_error('Unauthorized — please login', 401);
            exit();
        }
        $this->user = $user;
        return $user;
    }

    // ── Role guards ───────────────────────────────────────────────
    protected function require_owner() {
        $user = $this->require_auth();
        if (!in_array($user['role'], ['Owner', 'Admin'])) {
            $this->json_error('Forbidden — Owner/Admin access required', 403);
            exit();
        }
        return $user;
    }

    protected function require_operator() {
        $user = $this->require_auth();
        if ($user['role'] !== 'Operator') {
            $this->json_error('Forbidden — Operator access required', 403);
            exit();
        }
        return $user;
    }

    // ── Read JSON body ────────────────────────────────────────────
    protected function get_json_body() {
        $raw = file_get_contents('php://input');
        return json_decode($raw, true) ?: [];
    }

    // ── Audit log helper ─────────────────────────────────────────
    protected function audit($action, $employee_id = null) {
        $this->db->insert('audit_log', [
            'Employee_ID' => $employee_id ?? ($this->user ? $this->user['id'] : null),
            'Action'      => $action,
            'IP_Address'  => $this->input->ip_address(),
        ]);
    }
}
