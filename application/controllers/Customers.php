<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Customers extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Customer_model');
    }

    // GET /api/customers
    public function index() {
        $this->require_owner();
        $customers = $this->Customer_model->get_all();
        foreach ($customers as &$c) unset($c['Portal_Password']);
        return $this->json_success($customers);
    }

    // GET /api/customers/:id
    public function show($id) {
        $this->require_owner();
        $c = $this->Customer_model->get_by_id($id);
        if (!$c) return $this->json_error('Customer not found', 404);
        unset($c['Portal_Password']);
        $c['jobs']  = $this->Customer_model->get_jobs($id);
        $c['bills'] = $this->Customer_model->get_bills($id);
        return $this->json_success($c);
    }

    // POST /api/customers/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Customer_Name'])) return $this->json_error('Customer_Name is required', 400);
        if (empty($b['Mobile']))        return $this->json_error('Mobile is required', 400);

        $data = [
            'Customer_Name'  => $b['Customer_Name'],
            'Mobile'         => $b['Mobile'],
            'Alt_Mobile'     => $b['Alt_Mobile']     ?? null,
            'Address'        => $b['Address']         ?? null,
            'City'           => $b['City']            ?? null,
            'State'          => $b['State']           ?? null,
            'State_Code'     => $b['State_Code']      ?? null,
            'GST_No'         => $b['GST_No']          ?? null,
            'PAN_No'         => $b['PAN_No']          ?? null,
            'Category'       => $b['Category']        ?? 'Regular',
            'Credit_Limit'   => $b['Credit_Limit']   ?? 0,
            'Opening_Balance'=> $b['Opening_Balance'] ?? 0,
            'Notes'          => $b['Notes']           ?? null,
            'Email'          => $b['Email']           ?? null,
            'Photo_Path'     => $b['Photo_Path']      ?? null,
        ];

        // Portal credentials
        if (!empty($b['Portal_Username'])) {
            $data['Portal_Username'] = $b['Portal_Username'];
            $data['Portal_Password'] = !empty($b['Portal_Password'])
                ? password_hash($b['Portal_Password'], PASSWORD_DEFAULT)
                : null;
            $data['Portal_Active'] = 1;
        }

        $id = $this->Customer_model->create($data);
        $this->audit("Created customer {$b['Customer_Name']}", $this->user['id']);
        return $this->json_success(['Customer_ID' => $id], 'Customer created', 201);
    }

    // POST /api/customers/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Customer_Name','Mobile','Alt_Mobile','Address','City','State','State_Code',
                    'GST_No','PAN_No','Category','Credit_Limit','Opening_Balance',
                    'Notes','Is_Active','Email','Portal_Username','Portal_Active','Photo_Path'];
        $data = array_intersect_key($b, array_flip($allowed));

        if (!empty($b['Portal_Password'])) {
            $data['Portal_Password'] = password_hash($b['Portal_Password'], PASSWORD_DEFAULT);
        }
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Customer_model->update($id, $data);
        $this->audit("Updated customer $id", $this->user['id']);
        return $this->json_success([], 'Customer updated');
    }

    // POST /api/customers/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Customer_model->delete($id);
        $this->audit("Deactivated customer $id", $this->user['id']);
        return $this->json_success([], 'Customer deactivated');
    }
}
