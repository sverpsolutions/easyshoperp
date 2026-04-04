<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Purchase extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Purchase_model');
    }

    // GET /api/purchase
    public function index() {
        $this->require_owner();
        $filters = array_filter([
            'supplier'       => $this->input->get('supplier'),
            'payment_status' => $this->input->get('payment_status'),
            'from'           => $this->input->get('from'),
            'to'             => $this->input->get('to'),
        ]);
        return $this->json_success($this->Purchase_model->get_all($filters));
    }

    // GET /api/purchase/:id
    public function show($id) {
        $this->require_owner();
        $p = $this->Purchase_model->get_by_id($id);
        if (!$p) return $this->json_error('Purchase not found', 404);
        return $this->json_success($p);
    }

    // GET /api/purchase/next-number
    public function next_number() {
        $this->require_owner();
        return $this->json_success(['purchase_number' => $this->Purchase_model->next_purchase_number()]);
    }

    // GET /api/purchase/summary
    public function summary() {
        $this->require_owner();
        return $this->json_success($this->Purchase_model->get_summary());
    }

    // POST /api/purchase/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        if (empty($b['Supplier_Name'])) return $this->json_error('Supplier Name is required', 400);
        if (empty($b['Purchase_Date'])) return $this->json_error('Purchase Date is required', 400);

        $data = [
            'Purchase_Number' => $b['Purchase_Number'] ?? $this->Purchase_model->next_purchase_number(),
            'Purchase_Date'   => $b['Purchase_Date'],
            'Supplier_Name'   => $b['Supplier_Name'],
            'Supplier_GST'    => $b['Supplier_GST']    ?? null,
            'Invoice_No'      => $b['Invoice_No']      ?? null,
            'Invoice_Date'    => $b['Invoice_Date']    ?? null,
            'Gross_Amount'    => $b['Gross_Amount']    ?? 0,
            'Discount_Amt'    => $b['Discount_Amt']    ?? 0,
            'Tax_Amount'      => $b['Tax_Amount']      ?? 0,
            'Net_Amount'      => $b['Net_Amount']      ?? 0,
            'Amount_Paid'     => $b['Amount_Paid']     ?? 0,
            'Balance_Due'     => floatval($b['Net_Amount'] ?? 0) - floatval($b['Amount_Paid'] ?? 0),
            'Payment_Status'  => $b['Payment_Status']  ?? 'Unpaid',
            'Payment_Mode'    => $b['Payment_Mode']    ?? null,
            'Notes'           => $b['Notes']           ?? null,
            'Created_By'      => $this->user['id'],
        ];

        $items = $b['items'] ?? [];
        $id    = $this->Purchase_model->create($data, $items);
        $this->audit("Created purchase {$data['Purchase_Number']}", $this->user['id']);
        return $this->json_success(['Purchase_ID' => $id, 'Purchase_Number' => $data['Purchase_Number']], 'Purchase created', 201);
    }

    // POST /api/purchase/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();

        $allowed = ['Purchase_Date','Supplier_Name','Supplier_GST','Invoice_No','Invoice_Date',
                    'Gross_Amount','Discount_Amt','Tax_Amount','Net_Amount','Amount_Paid',
                    'Balance_Due','Payment_Status','Payment_Mode','Notes'];
        $data  = array_intersect_key($b, array_flip($allowed));
        $items = $b['items'] ?? [];

        if (!empty($data['Net_Amount']) || isset($data['Amount_Paid'])) {
            $existing = $this->Purchase_model->get_by_id($id);
            $net  = floatval($data['Net_Amount']  ?? $existing['Net_Amount']  ?? 0);
            $paid = floatval($data['Amount_Paid'] ?? $existing['Amount_Paid'] ?? 0);
            $data['Balance_Due']    = max(0, $net - $paid);
            $data['Payment_Status'] = $paid >= $net ? 'Paid' : ($paid > 0 ? 'Partial' : 'Unpaid');
        }

        $this->Purchase_model->update($id, $data, $items);
        $this->audit("Updated purchase $id", $this->user['id']);
        return $this->json_success([], 'Purchase updated');
    }

    // POST /api/purchase/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Purchase_model->delete($id);
        $this->audit("Deleted purchase $id", $this->user['id']);
        return $this->json_success([], 'Purchase deleted');
    }
}
