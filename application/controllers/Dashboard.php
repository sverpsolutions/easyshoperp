<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Dashboard extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model(['Machine_model', 'Job_model', 'Report_model', 'Advance_model']);
    }

    // GET /api/dashboard
    public function index() {
        $this->require_owner();

        $machines        = $this->Machine_model->get_all();
        $summary         = $this->Machine_model->get_summary();
        $today_prod      = $this->Report_model->today_production();
        $pending_jobs    = $this->Job_model->get_pending_count();
        $pending_advances= $this->Advance_model->get_all('Pending');

        // Operators online (machines with operator assigned)
        $op_count = $this->db->where('Current_Operator_ID IS NOT NULL', null, false)
                              ->count_all_results('machines');

        // Pending job requests
        $job_requests = [];
        try {
            $job_requests = $this->db->select('r.Request_ID, e.Name AS Employee_Name, e.Mobile,
                m.Machine_Name, r.Description, r.Request_Date')
                ->from('job_requests r')
                ->join('employees e', 'e.Employee_ID = r.Employee_ID', 'left')
                ->join('machines m',  'm.Machine_ID  = r.Machine_ID',  'left')
                ->where('r.Status', 'Pending')
                ->order_by('r.Request_Date ASC')
                ->get()->result_array();
        } catch (\Throwable $e) { /* table may not exist */ }

        return $this->json_success([
            'machines'          => $machines,
            'summary'           => $summary,
            'today_production'  => $today_prod,
            'pending_jobs'      => $pending_jobs,
            'operators_online'  => $op_count,
            'pending_advances'  => $pending_advances,
            'job_requests'      => $job_requests,
        ]);
    }

    // GET /api/dashboard/machines  — lightweight live status for polling
    public function machines() {
        $this->require_auth();
        $machines = $this->Machine_model->get_all();
        return $this->json_success($machines);
    }
}
