<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Bills extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Bill_model');
    }

    // GET /api/bills
    public function index() {
        $this->require_owner();
        $filters = [
            'status'   => $this->input->get('status'),
            'customer' => $this->input->get('customer'),
            'from'     => $this->input->get('from'),
            'to'       => $this->input->get('to'),
        ];
        return $this->json_success($this->Bill_model->get_all(array_filter($filters)));
    }

    // GET /api/bills/:id
    public function show($id) {
        $this->require_owner();
        $bill = $this->Bill_model->get_by_id($id);
        if (!$bill) return $this->json_error('Bill not found', 404);
        return $this->json_success($bill);
    }

    // POST /api/bills/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        $required = ['Customer_Name', 'Net_Amount'];
        foreach ($required as $f) {
            if (empty($b[$f]) && $b[$f] !== 0) return $this->json_error("$f is required", 400);
        }

        $bill_data = [
            'Bill_Number'    => $b['Bill_Number']   ?? $this->Bill_model->next_bill_number(),
            'Bill_Date'      => $b['Bill_Date']      ?? date('Y-m-d'),
            'Customer_ID'    => $b['Customer_ID']   ?? null,
            'Customer_Name'  => $b['Customer_Name'],
            'Mobile'         => $b['Mobile']         ?? null,
            'Gross_Amount'   => $b['Gross_Amount']   ?? 0,
            'Discount_Amt'   => $b['Discount_Amt']   ?? 0,
            'Tax_Amount'     => $b['Tax_Amount']     ?? 0,
            'Net_Amount'     => (float)$b['Net_Amount'],
            'Amount_Paid'    => (float)($b['Amount_Paid'] ?? 0),
            'Balance_Due'    => (float)$b['Net_Amount'] - (float)($b['Amount_Paid'] ?? 0),
            'Payment_Status' => $b['Payment_Status'] ?? 'Unpaid',
            'Job_ID'         => $b['Job_ID']         ?? null,
            'External_Ref'   => $b['External_Ref']   ?? null,
            'Items_JSON'     => isset($b['items'])    ? json_encode($b['items']) : null,
            'Notes'          => $b['Notes']           ?? null,
            'Created_By'     => $this->user['id'],
        ];

        $items = $b['items'] ?? [];
        $id = $this->Bill_model->create($bill_data, $items);
        $this->audit("Created bill {$bill_data['Bill_Number']}", $this->user['id']);
        return $this->json_success(['Bill_ID' => $id, 'Bill_Number' => $bill_data['Bill_Number']], 'Bill created', 201);
    }

    // POST /api/bills/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Bill_Date','Customer_Name','Customer_ID','Mobile','Gross_Amount','Discount_Amt',
                    'Tax_Amount','Net_Amount','Amount_Paid','Balance_Due','Payment_Status',
                    'External_Ref','Notes'];
        $data  = array_intersect_key($b, array_flip($allowed));
        $items = $b['items'] ?? [];
        $this->Bill_model->update($id, $data, $items);
        $this->audit("Updated bill $id", $this->user['id']);
        return $this->json_success([], 'Bill updated');
    }

    // POST /api/bills/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Bill_model->delete($id);
        $this->audit("Deleted bill $id", $this->user['id']);
        return $this->json_success([], 'Bill deleted');
    }

    // GET /api/bills/next-number
    public function next_number() {
        $this->require_owner();
        return $this->json_success(['bill_number' => $this->Bill_model->next_bill_number()]);
    }
}
