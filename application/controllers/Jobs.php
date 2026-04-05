<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Jobs extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Job_model');
    }

    // GET /api/jobs
    public function index() {
        $this->require_auth();
        $filters = [
            'status'   => $this->input->get('status'),
            'customer' => $this->input->get('customer'),
            'from'     => $this->input->get('from'),
            'to'       => $this->input->get('to'),
        ];
        $jobs = $this->Job_model->get_all(array_filter($filters));
        return $this->json_success($jobs);
    }

    // GET /api/jobs/:id
    public function show($id) {
        $this->require_auth();
        $job = $this->Job_model->get_by_id($id);
        if (!$job) return $this->json_error('Job not found', 404);
        // Also load production log
        $log = $this->db->select('jpl.*, e.Name AS Operator_Name, m.Machine_Name')
                        ->from('job_production_log jpl')
                        ->join('employees e', 'e.Employee_ID = jpl.Operator_ID', 'left')
                        ->join('machines m',  'm.Machine_ID  = jpl.Machine_ID',  'left')
                        ->where('jpl.Job_ID', $id)
                        ->order_by('jpl.Entry_Time DESC')
                        ->get()->result_array();
        $job['production_log'] = $log;
        return $this->json_success($job);
    }

    // POST /api/jobs/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        $required = ['Customer_Name', 'Required_Qty', 'Label_Type'];
        foreach ($required as $f) {
            if (empty($b[$f])) return $this->json_error("$f is required", 400);
        }

        $data = [
            'Job_Number'   => $b['Job_Number'] ?? $this->Job_model->next_job_number(),
            'Order_Date'   => $b['Order_Date']  ?? date('Y-m-d'),
            'Customer_Name'=> $b['Customer_Name'],
            'Customer_ID'  => $b['Customer_ID'] ?? null,
            'Mobile_No'    => $b['Mobile_No']   ?? null,
            'Delivery_Date'=> $b['Delivery_Date'] ?? null,
            'Size'         => $b['Size']         ?? null,
            'Label'        => $b['Label']        ?? null,
            'UPS'          => $b['UPS']          ?? 1,
            'Gap_Type'     => $b['Gap_Type']     ?? 'With Gap',
            'Paper'        => $b['Paper']        ?? null,
            'Core'         => $b['Core']         ?? null,
            'Packing'      => $b['Packing']      ?? null,
            'Label_Type'   => $b['Label_Type'],
            'Required_Qty' => (int)$b['Required_Qty'],
            'Priority'     => $b['Priority']     ?? 5,
            'Notes'        => $b['Notes']        ?? null,
            'Status'       => 'Pending',
        ];

        if (!empty($b['Assigned_Machine_ID']) && !empty($b['Assigned_Operator_ID'])) {
            $data['Status']               = 'Assigned';
            $data['Assigned_Machine_ID']  = $b['Assigned_Machine_ID'];
            $data['Assigned_Operator_ID'] = $b['Assigned_Operator_ID'];
        }

        $id = $this->Job_model->create($data);
        $this->audit('Created job ' . $data['Job_Number'], $this->user['id']);
        return $this->json_success(['Job_ID' => $id, 'Job_Number' => $data['Job_Number']], 'Job created', 201);
    }

    // POST /api/jobs/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Customer_Name','Customer_ID','Mobile_No','Delivery_Date','Size','Label','UPS',
                    'Gap_Type','Paper','Core','Packing','Label_Type','Required_Qty','Priority',
                    'Notes','Status','Assigned_Machine_ID','Assigned_Operator_ID',
                    'Telegram_Notify','Customer_Chat_ID'];
        $data = array_intersect_key($b, array_flip($allowed));
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Job_model->update($id, $data);
        $this->audit("Updated job $id", $this->user['id']);
        return $this->json_success([], 'Job updated');
    }

    // POST /api/jobs/delete/:id
    public function delete($id) {
        $this->require_owner();
        $job = $this->Job_model->get_by_id($id);
        if (!$job) return $this->json_error('Job not found', 404);
        if ($job['Status'] === 'Running') return $this->json_error('Cannot delete a running job', 400);
        $this->Job_model->delete($id);
        $this->audit("Deleted job $id ({$job['Job_Number']})", $this->user['id']);
        return $this->json_success([], 'Job deleted');
    }

    // POST /api/jobs/start
    public function start() {
        $this->require_auth();
        $b = $this->get_json_body();
        $job_id      = (int)($b['job_id']      ?? 0);
        $machine_id  = (int)($b['machine_id']  ?? 0);
        $operator_id = (int)($b['operator_id'] ?? $this->user['id']);

        if (!$job_id || !$machine_id) return $this->json_error('job_id and machine_id are required', 400);

        $this->Job_model->start_job($job_id, $machine_id, $operator_id);
        $this->audit("Started job $job_id on machine $machine_id", $this->user['id']);
        return $this->json_success([], 'Job started');
    }

    // POST /api/jobs/stop
    public function stop() {
        $this->require_auth();
        $b = $this->get_json_body();
        $job_id      = (int)($b['job_id']       ?? 0);
        $machine_id  = (int)($b['machine_id']   ?? 0);
        $produced    = (int)($b['produced_qty'] ?? 0);
        $status      = $b['status'] ?? 'Completed';

        if (!$job_id || !$machine_id) return $this->json_error('job_id and machine_id are required', 400);

        $this->Job_model->stop_job($job_id, $machine_id, $produced, $status);
        $this->audit("Stopped job $job_id, qty=$produced", $this->user['id']);
        return $this->json_success([], 'Job stopped');
    }

    // POST /api/jobs/log
    public function log_production() {
        $this->require_auth();
        $b = $this->get_json_body();
        $job_id     = (int)($b['job_id']     ?? 0);
        $machine_id = (int)($b['machine_id'] ?? 0);
        $qty        = (int)($b['qty']        ?? 0);
        $remarks    = $b['remarks'] ?? '';

        if (!$job_id || !$machine_id || $qty <= 0) {
            return $this->json_error('job_id, machine_id and qty > 0 are required', 400);
        }

        $this->Job_model->log_production($job_id, $this->user['id'], $machine_id, $qty, $remarks);
        return $this->json_success([], "Logged $qty units");
    }

    // GET /api/jobs/next-number
    public function next_number() {
        $this->require_owner();
        return $this->json_success(['job_number' => $this->Job_model->next_job_number()]);
    }
}
