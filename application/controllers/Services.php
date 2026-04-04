<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Services Controller — Hardware Service Records
 */
class Services extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Service_model');
    }

    // GET /api/services
    public function index() {
        $this->require_auth();
        $filters = [
            'status'      => $this->input->get('status'),
            'serial_id'   => $this->input->get('serial_id'),
            'customer_id' => $this->input->get('customer_id'),
            'search'      => $this->input->get('search'),
        ];
        return $this->json_success($this->Service_model->get_list($filters));
    }

    // GET /api/services/:id
    public function show($id) {
        $this->require_auth();
        $row = $this->Service_model->get_by_id($id);
        if (!$row) return $this->json_error('Service record not found', 404);
        return $this->json_success($row);
    }

    // GET /api/services/history/:serial_id
    public function history($serial_id) {
        $this->require_auth();
        return $this->json_success($this->Service_model->get_history($serial_id));
    }

    // POST /api/services/store
    public function store() {
        $this->require_auth();
        $b = $this->get_json_body();
        if (empty($b['Serial_ID']))         return $this->json_error('Serial ID required', 400);
        if (empty($b['Issue_Description'])) return $this->json_error('Issue Description required', 400);

        $data = [
            'Serial_ID'         => (int)$b['Serial_ID'],
            'Customer_ID'       => !empty($b['Customer_ID']) ? (int)$b['Customer_ID'] : null,
            'Complaint_Date'    => $b['Complaint_Date']  ?? date('Y-m-d'),
            'Issue_Description' => $b['Issue_Description'],
            'Engineer_Name'     => $b['Engineer_Name']   ?? null,
            'Status'            => 'Open',
            'Parts_Cost'        => (float)($b['Parts_Cost']    ?? 0),
            'Labour_Charges'    => (float)($b['Labour_Charges'] ?? 0),
            'Total_Charges'     => (float)($b['Total_Charges']  ?? 0),
        ];
        $id = $this->Service_model->create($data);
        return $this->json_success(['Service_ID' => $id], 'Service record created');
    }

    // POST /api/services/update/:id
    public function update($id) {
        $this->require_auth();
        $b = $this->get_json_body();
        $allowed = ['Status','Engineer_Name','Diagnosed_Issue','Parts_Used',
                    'Parts_Cost','Labour_Charges','Total_Charges','Resolution_Notes',
                    'Closed_Date','Next_Service_Due'];
        $data = array_intersect_key($b, array_flip($allowed));
        if (isset($data['Parts_Cost']))     $data['Parts_Cost']     = (float)$data['Parts_Cost'];
        if (isset($data['Labour_Charges'])) $data['Labour_Charges'] = (float)$data['Labour_Charges'];
        if (isset($data['Total_Charges']))  $data['Total_Charges']  = (float)$data['Total_Charges'];

        $this->Service_model->update($id, $data);
        return $this->json_success(null, 'Service record updated');
    }

    // GET /api/services/open-count
    public function open_count() {
        $this->require_auth();
        return $this->json_success(['count' => $this->Service_model->get_open_count()]);
    }
}
