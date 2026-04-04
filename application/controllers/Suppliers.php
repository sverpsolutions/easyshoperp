<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Suppliers extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Supplier_model');
    }

    // GET /api/suppliers
    public function index() {
        $this->require_owner();
        $filters = array_filter([
            'search'    => $this->input->get('search'),
            'category'  => $this->input->get('category'),
            'is_active' => $this->input->get('is_active') !== null ? $this->input->get('is_active') : 1,
        ], fn($v) => $v !== null && $v !== '');
        return $this->json_success($this->Supplier_model->get_all($filters));
    }

    // GET /api/suppliers/dropdown
    public function dropdown() {
        $this->require_auth();
        return $this->json_success($this->Supplier_model->get_list_for_dropdown());
    }

    // GET /api/suppliers/:id
    public function show($id) {
        $this->require_owner();
        $s = $this->Supplier_model->get_by_id($id);
        if (!$s) return $this->json_error('Supplier not found', 404);
        unset($s['Bank_Account']); // strip sensitive from show response (keep in edit only)
        return $this->json_success($s);
    }

    // POST /api/suppliers/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Supplier_Name'])) return $this->json_error('Supplier Name is required', 400);

        $data = [
            'Supplier_Name'   => $b['Supplier_Name'],
            'Mobile'          => $b['Mobile']          ?? null,
            'Alt_Mobile'      => $b['Alt_Mobile']       ?? null,
            'Email'           => $b['Email']            ?? null,
            'Address'         => $b['Address']          ?? null,
            'City'            => $b['City']             ?? null,
            'State'           => $b['State']            ?? null,
            'State_Code'      => $b['State_Code']       ?? null,
            'GST_No'          => $b['GST_No']           ?? null,
            'PAN_No'          => $b['PAN_No']           ?? null,
            'Category'        => $b['Category']         ?? 'Regular',
            'Bank_Name'       => $b['Bank_Name']        ?? null,
            'Bank_Account'    => $b['Bank_Account']     ?? null,
            'Bank_IFSC'       => $b['Bank_IFSC']        ?? null,
            'Credit_Limit'    => $b['Credit_Limit']     ?? 0,
            'Opening_Balance' => $b['Opening_Balance']  ?? 0,
            'Notes'           => $b['Notes']            ?? null,
            'Photo_Path'      => $b['Photo_Path']       ?? null,
            'Contact_Person'  => $b['Contact_Person']   ?? null,
        ];

        $id = $this->Supplier_model->create($data);
        $this->audit("Created supplier {$b['Supplier_Name']}", $this->user['id']);
        return $this->json_success(['Supplier_ID' => $id], 'Supplier created', 201);
    }

    // POST /api/suppliers/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Supplier_Name','Mobile','Alt_Mobile','Email','Address','City','State','State_Code',
                    'GST_No','PAN_No','Category','Bank_Name','Bank_Account','Bank_IFSC',
                    'Credit_Limit','Opening_Balance','Notes','Photo_Path','Is_Active','Contact_Person'];
        $data = array_intersect_key($b, array_flip($allowed));
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Supplier_model->update($id, $data);
        $this->audit("Updated supplier $id", $this->user['id']);
        return $this->json_success([], 'Supplier updated');
    }

    // POST /api/suppliers/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Supplier_model->delete($id);
        $this->audit("Deactivated supplier $id", $this->user['id']);
        return $this->json_success([], 'Supplier deactivated');
    }
}
