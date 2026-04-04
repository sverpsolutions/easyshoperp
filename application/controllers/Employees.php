<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Employees extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Employee_model');
    }

    // GET /api/employees
    public function index() {
        $this->require_owner();
        $role = $this->input->get('role');
        $employees = $this->Employee_model->get_all($role);
        // Strip password hashes from response
        foreach ($employees as &$e) unset($e['Password_Hash']);
        return $this->json_success($employees);
    }

    // GET /api/employees/operators
    public function operators() {
        $this->require_auth();
        $ops = $this->Employee_model->get_operators();
        foreach ($ops as &$e) unset($e['Password_Hash']);
        return $this->json_success($ops);
    }

    // GET /api/employees/:id
    public function show($id) {
        $this->require_owner();
        $emp = $this->Employee_model->get_detail($id);
        if (!$emp) return $this->json_error('Employee not found', 404);
        unset($emp['Password_Hash']);
        return $this->json_success($emp);
    }

    // POST /api/employees/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        $required = ['Name', 'Role', 'Username', 'Password'];
        foreach ($required as $f) {
            if (empty($b[$f])) return $this->json_error("$f is required", 400);
        }

        if (!in_array($b['Role'], ['Owner','Admin','Operator'])) {
            return $this->json_error('Role must be Owner, Admin, or Operator', 400);
        }

        $existing = $this->Employee_model->get_by_username($b['Username']);
        if ($existing) return $this->json_error('Username already taken', 409);

        $data = [
            'Name'          => $b['Name'],
            'Role'          => $b['Role'],
            'Mobile'        => $b['Mobile'] ?? null,
            'Username'      => $b['Username'],
            'Password_Hash' => password_hash($b['Password'], PASSWORD_DEFAULT),
            'Father_Name'   => $b['Father_Name']   ?? null,
            'Address'       => $b['Address']        ?? null,
            'Aadhar_No'     => $b['Aadhar_No']      ?? null,
            'Join_Date'     => $b['Join_Date']       ?? null,
            'Monthly_Salary'=> $b['Monthly_Salary'] ?? 0,
            'Bank_Name'     => $b['Bank_Name']       ?? null,
            'Bank_Account'  => $b['Bank_Account']    ?? null,
            'Bank_IFSC'     => $b['Bank_IFSC']       ?? null,
            'Advance_Limit_Monthly' => $b['Advance_Limit_Monthly'] ?? 5000,
            'Emergency_Contact'     => $b['Emergency_Contact']     ?? null,
            'Photo_Path'            => $b['Photo_Path']            ?? null,
        ];

        $id = $this->Employee_model->create($data);
        $this->audit("Created employee {$b['Name']}", $this->user['id']);
        return $this->json_success(['Employee_ID' => $id], 'Employee created', 201);
    }

    // POST /api/employees/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Name','Role','Mobile','Father_Name','Address','Aadhar_No','Join_Date',
                    'Monthly_Salary','Bank_Name','Bank_Account','Bank_IFSC',
                    'Advance_Limit_Monthly','Emergency_Contact','Is_Active','Photo_Path'];
        $data = array_intersect_key($b, array_flip($allowed));

        if (!empty($b['Password'])) {
            $data['Password_Hash'] = password_hash($b['Password'], PASSWORD_DEFAULT);
        }
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Employee_model->update($id, $data);
        $this->audit("Updated employee $id", $this->user['id']);
        return $this->json_success([], 'Employee updated');
    }

    // POST /api/employees/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Employee_model->delete($id);
        $this->audit("Deactivated employee $id", $this->user['id']);
        return $this->json_success([], 'Employee deactivated');
    }
}
