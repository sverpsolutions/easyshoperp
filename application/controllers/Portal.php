<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Portal Controller — Customer Self-Service Portal
 * Routes: /api/portal/*
 */
class Portal extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model(['Customer_model', 'Job_model']);
    }

    // ── Auth ────────────────────────────────────────────────────

    // POST /api/portal/login
    public function login() {
        if ($this->input->method() !== 'post') return $this->json_error('Method not allowed', 405);
        $b        = $this->get_json_body();
        $username = trim($b['username'] ?? '');
        $password = trim($b['password'] ?? '');
        if (!$username || !$password) return $this->json_error('Username and password required', 400);

        $customer = $this->Customer_model->get_by_portal_username($username);
        if (!$customer) return $this->json_error('Invalid username or password', 401);
        if (!password_verify($password, $customer['Portal_Password'])) return $this->json_error('Invalid username or password', 401);

        $this->session->set_userdata('portal_user', [
            'id'   => $customer['Customer_ID'],
            'name' => $customer['Customer_Name'],
            'role' => 'Customer',
        ]);
        return $this->json_success([
            'Customer_ID'   => $customer['Customer_ID'],
            'Customer_Name' => $customer['Customer_Name'],
            'role'          => 'Customer',
        ], 'Login successful');
    }

    // POST /api/portal/logout
    public function logout() {
        $this->session->unset_userdata('portal_user');
        return $this->json_success([], 'Logged out');
    }

    // GET /api/portal/me
    public function me() {
        $u = $this->session->userdata('portal_user');
        if (!$u) return $this->json_error('Not authenticated', 401);
        return $this->json_success($u);
    }

    // ── Dashboard ────────────────────────────────────────────────

    // GET /api/portal/dashboard
    public function dashboard() {
        $u = $this->_require_portal();
        if (!$u) return;

        $orders = $this->Customer_model->get_orders($u['id']);
        $jobs   = $this->Customer_model->get_jobs($u['id']);
        $bills  = $this->Customer_model->get_bills($u['id']);

        // Order stats
        $pending    = count(array_filter($orders, fn($o) => $o['Status'] === 'Pending'));
        $processing = count(array_filter($orders, fn($o) => in_array($o['Status'], ['Approved','Processing'])));
        $completed  = count(array_filter($orders, fn($o) => $o['Status'] === 'Completed'));

        return $this->json_success([
            'orders'  => $orders,
            'jobs'    => $jobs,
            'bills'   => $bills,
            'stats'   => [
                'total_orders'  => count($orders),
                'pending'       => $pending,
                'processing'    => $processing,
                'completed'     => $completed,
                'active_jobs'   => count(array_filter($jobs, fn($j) => !in_array($j['Status'], ['Completed','Cancelled']))),
                'unpaid_bills'  => count(array_filter($bills, fn($b) => $b['Payment_Status'] !== 'Paid')),
            ],
        ]);
    }

    // ── Orders ───────────────────────────────────────────────────

    // GET /api/portal/orders
    public function orders() {
        $u = $this->_require_portal();
        if (!$u) return;
        return $this->json_success($this->Customer_model->get_orders($u['id']));
    }

    // POST /api/portal/orders/store
    public function order_store() {
        $u = $this->_require_portal();
        if (!$u) return;
        $b = $this->get_json_body();

        if (empty($b['Label_Name']))  return $this->json_error('Label Name is required', 400);
        if (empty($b['Label_Type']))  return $this->json_error('Label Type is required', 400);
        if (empty($b['Quantity']))    return $this->json_error('Quantity is required', 400);

        $data = [
            'Customer_ID'      => $u['id'],
            'Label_Name'       => $b['Label_Name'],
            'Label_Type'       => $b['Label_Type'],
            'Size'             => $b['Size']             ?? null,
            'Quantity'         => (int)$b['Quantity'],
            'Paper'            => $b['Paper']            ?? null,
            'Core'             => $b['Core']             ?? null,
            'Packing'          => $b['Packing']          ?? null,
            'Notes'            => $b['Notes']            ?? null,
            'Artwork_Path'     => $b['Artwork_Path']      ?? null,
            'Required_By'      => $b['Required_By']      ?? null,
            'Delivery_Address' => $b['Delivery_Address'] ?? null,
            'Status'           => 'Pending',
            'Request_Date'     => date('Y-m-d H:i:s'),
        ];

        $this->db->insert('order_requests', $data);
        $id = $this->db->insert_id();
        return $this->json_success(['Request_ID' => $id], 'Order placed successfully', 201);
    }

    // GET /api/portal/orders/:id
    public function order_show($id) {
        $u = $this->_require_portal();
        if (!$u) return;
        $order = $this->db->where('Request_ID', $id)->where('Customer_ID', $u['id'])->get('order_requests')->row_array();
        if (!$order) return $this->json_error('Order not found', 404);
        return $this->json_success($order);
    }

    // ── Jobs ─────────────────────────────────────────────────────

    // GET /api/portal/jobs
    public function jobs() {
        $u = $this->_require_portal();
        if (!$u) return;
        return $this->json_success($this->Customer_model->get_jobs($u['id']));
    }

    // ── Bills ─────────────────────────────────────────────────────

    // GET /api/portal/bills
    public function bills() {
        $u = $this->_require_portal();
        if (!$u) return;
        return $this->json_success($this->Customer_model->get_bills($u['id']));
    }

    // ── Owner: manage portal access & orders ──────────────────────

    // GET /api/portal/admin/orders  — owner sees all portal orders
    public function admin_orders() {
        $this->require_owner();
        $status = $this->input->get('status');
        if ($status) $this->db->where('o.Status', $status);
        $orders = $this->db->select('o.*, c.Customer_Name, c.Mobile')
                           ->from('order_requests o')
                           ->join('customer_master c', 'c.Customer_ID = o.Customer_ID', 'left')
                           ->order_by('o.Request_Date DESC')
                           ->get()->result_array();
        return $this->json_success($orders);
    }

    // POST /api/portal/admin/orders/review/:id  — owner approves/rejects
    public function admin_review($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $status = $b['Status'] ?? '';
        $allowed = ['Approved','Rejected','Processing','Completed'];
        if (!in_array($status, $allowed)) return $this->json_error('Invalid status', 400);

        $data = [
            'Status'      => $status,
            'Owner_Notes' => $b['Owner_Notes'] ?? null,
            'Reviewed_By' => $this->user['id'],
            'Reviewed_At' => date('Y-m-d H:i:s'),
        ];
        $this->db->where('Request_ID', $id)->update('order_requests', $data);
        return $this->json_success([], 'Order updated');
    }

    // ── Helpers ──────────────────────────────────────────────────

    private function _require_portal() {
        $u = $this->session->userdata('portal_user');
        if (!$u) { $this->json_error('Not authenticated', 401); return null; }
        return $u;
    }
}
