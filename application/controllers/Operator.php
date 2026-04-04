<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Operator extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model(['Job_model', 'Machine_model']);
    }

    // GET /api/operator/dashboard
    public function dashboard() {
        $user = $this->require_auth();

        // Operator sees their own jobs; Owner/Admin see all
        if ($user['role'] === 'Operator') {
            $jobs = $this->Job_model->get_pending_for_operator($user['id']);
        } else {
            $jobs = $this->Job_model->get_all(['status' => null]);
        }

        // Machine assigned to this operator
        $machine = null;
        if ($user['role'] === 'Operator') {
            $machine = $this->db->where('Current_Operator_ID', $user['id'])->get('machines')->row_array();
        }

        // Pending job requests this operator submitted
        $my_requests = [];
        try {
            $my_requests = $this->db->where('Employee_ID', $user['id'])
                                     ->order_by('Request_Date DESC')
                                     ->get('job_requests')->result_array();
        } catch (Exception $e) {}

        return $this->json_success([
            'jobs'        => $jobs,
            'machine'     => $machine,
            'my_requests' => $my_requests,
        ]);
    }

    // POST /api/operator/request
    public function request_job() {
        $user = $this->require_auth();
        $b = $this->get_json_body();

        $data = [
            'Employee_ID'  => $user['id'],
            'Machine_ID'   => $b['Machine_ID']   ?? null,
            'Request_Type' => $b['Request_Type'] ?? 'Job',
            'Description'  => $b['Description']  ?? '',
            'Status'       => 'Pending',
        ];
        $this->db->insert('job_requests', $data);
        $id = $this->db->insert_id();
        return $this->json_success(['Request_ID' => $id], 'Request submitted', 201);
    }

    // POST /api/operator/impressions/log
    public function log_impressions() {
        $user = $this->require_auth();
        $b = $this->get_json_body();

        $required = ['Machine_ID', 'Log_Date', 'Log_Hour', 'Impressions_Count'];
        foreach ($required as $f) {
            if (!isset($b[$f])) return $this->json_error("$f is required", 400);
        }

        $this->db->insert('hourly_impressions', [
            'Machine_ID'        => $b['Machine_ID'],
            'Operator_ID'       => $user['id'],
            'Job_ID'            => $b['Job_ID']  ?? null,
            'Log_Date'          => $b['Log_Date'],
            'Log_Hour'          => $b['Log_Hour'],
            'Impressions_Count' => (int)$b['Impressions_Count'],
            'Remarks'           => $b['Remarks'] ?? null,
        ]);
        return $this->json_success([], 'Impressions logged');
    }
}
