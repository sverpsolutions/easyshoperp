<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Machines extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Machine_model');
    }

    // GET /api/machines
    public function index() {
        $this->require_auth();
        return $this->json_success($this->Machine_model->get_all());
    }

    // GET /api/machines/:id
    public function show($id) {
        $this->require_auth();
        $m = $this->Machine_model->get_by_id($id);
        if (!$m) return $this->json_error('Machine not found', 404);

        // Recent machine log
        $log = $this->db->select('ml.*, e.Name AS Operator_Name, j.Job_Number')
                        ->from('machine_log ml')
                        ->join('employees e', 'e.Employee_ID = ml.Operator_ID', 'left')
                        ->join('jobs j',      'j.Job_ID      = ml.Job_ID',      'left')
                        ->where('ml.Machine_ID', $id)
                        ->order_by('ml.Start_Time DESC')
                        ->limit(20)->get()->result_array();
        $m['machine_log'] = $log;
        return $this->json_success($m);
    }

    // POST /api/machines/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Machine_Name','Machine_Type','Status','Location','Notes',
                    'Target_Impressions_Per_Hour','Machine_Category','Photo_Path'];
        $data = array_intersect_key($b, array_flip($allowed));
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Machine_model->update($id, $data);
        $this->audit("Updated machine $id", $this->user['id']);
        return $this->json_success([], 'Machine updated');
    }

    // POST /api/machines/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();
        $name = trim($b['Machine_Name'] ?? '');
        $type = trim($b['Machine_Type'] ?? 'Auto');
        if (!$name) return $this->json_error('Machine name is required', 400);

        $data = [
            'Machine_Name'                => $name,
            'Machine_Type'                => $type,
            'Location'                    => $b['Location']  ?? '',
            'Notes'                       => $b['Notes']     ?? '',
            'Machine_Category'            => $b['Machine_Category'] ?? 'Flat Belt',
            'Target_Impressions_Per_Hour' => intval($b['Target_Impressions_Per_Hour'] ?? 0),
            'Status'                      => $b['Status'] ?? 'Idle',
            'Photo_Path'                  => $b['Photo_Path'] ?? '',
        ];
        $this->db->insert('machines', $data);
        $id = $this->db->insert_id();
        $this->audit("Added machine $id ($name)", $this->user['id']);
        return $this->json_success(['Machine_ID' => $id], 'Machine added');
    }

    // POST /api/machines/delete/:id
    public function delete($id) {
        $this->require_owner();
        $m = $this->Machine_model->get_by_id($id);
        if (!$m) return $this->json_error('Machine not found', 404);
        if ($m['Status'] === 'Running') return $this->json_error('Cannot delete a running machine', 400);
        $this->db->where('Machine_ID', $id)->update('machines', ['Status' => 'Maintenance', 'Notes' => 'Decommissioned']);
        $this->audit("Decommissioned machine $id", $this->user['id']);
        return $this->json_success([], 'Machine decommissioned');
    }

    // GET /api/machines/status  — live status for dashboard polling
    public function live_status() {
        $this->require_auth();
        $summary  = $this->Machine_model->get_summary();
        $machines = $this->Machine_model->get_all();
        return $this->json_success([
            'summary'  => $summary,
            'machines' => $machines,
            'ts'       => time(),
        ]);
    }
}
