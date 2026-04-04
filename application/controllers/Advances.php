<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Advances extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Advance_model');
    }

    // GET /api/advances  ?status=Pending &employee_id=X
    public function index() {
        $this->require_owner();
        $status      = $this->input->get('status');
        $employee_id = $this->input->get('employee_id');
        return $this->json_success($this->Advance_model->get_all($status, $employee_id));
    }

    // POST /api/advances/store  (employee requests advance)
    public function store() {
        $user = $this->require_auth();
        $b = $this->get_json_body();

        if (empty($b['Amount_Requested']) || $b['Amount_Requested'] <= 0) {
            return $this->json_error('Amount_Requested must be > 0', 400);
        }

        $data = [
            'Employee_ID'      => $b['Employee_ID'] ?? $user['id'],
            'Amount_Requested' => (float)$b['Amount_Requested'],
            'Reason'           => $b['Reason'] ?? null,
        ];

        // Operators can only request for themselves
        if ($user['role'] === 'Operator') {
            $data['Employee_ID'] = $user['id'];
        }

        $id = $this->Advance_model->create($data);
        $this->audit("Advance requested: {$data['Amount_Requested']}", $user['id']);
        return $this->json_success(['Advance_ID' => $id], 'Advance request submitted', 201);
    }

    // POST /api/advances/approve/:id
    public function approve($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $amount = (float)($b['Amount_Approved'] ?? 0);
        if ($amount <= 0) return $this->json_error('Amount_Approved must be > 0', 400);
        $this->Advance_model->approve($id, $this->user['id'], $amount);
        $this->audit("Approved advance $id", $this->user['id']);
        return $this->json_success([], 'Advance approved');
    }

    // POST /api/advances/reject/:id
    public function reject($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $reason = $b['Reject_Reason'] ?? '';
        $this->Advance_model->reject($id, $this->user['id'], $reason);
        $this->audit("Rejected advance $id", $this->user['id']);
        return $this->json_success([], 'Advance rejected');
    }

    // POST /api/advances/pay/:id
    public function pay($id) {
        $user = $this->require_auth();
        if (!in_array($user['role'], ['Owner','Admin'])) {
            return $this->json_error('Only Owner/Admin can disburse payments', 403);
        }
        $b           = $this->get_json_body();
        $amount_paid = (float)($b['Amount_Paid']  ?? 0);
        $mode        = $b['Payment_Mode'] ?? 'Cash';
        if ($amount_paid <= 0) return $this->json_error('Amount_Paid must be > 0', 400);
        $this->Advance_model->mark_paid($id, $user['id'], $amount_paid, $mode);
        $this->audit("Paid advance $id: {$amount_paid}", $user['id']);
        return $this->json_success([], 'Payment recorded');
    }
}
