<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Employee_model extends CI_Model {

    public function get_all($role = null) {
        if ($role) $this->db->where('Role', $role);
        return $this->db->order_by('Name')->get('employees')->result_array();
    }

    public function get_operators() {
        return $this->db->where('Role', 'Operator')
                        ->where('Is_Active', 1)
                        ->order_by('Name')
                        ->get('employees')->result_array();
    }

    public function get_by_id($id) {
        return $this->db->where('Employee_ID', $id)->get('employees')->row_array();
    }

    public function get_by_username($username) {
        return $this->db->where('Username', $username)->get('employees')->row_array();
    }

    public function create($data) {
        $this->db->insert('employees', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $this->db->where('Employee_ID', $id)->update('employees', $data);
        return $this->db->affected_rows();
    }

    public function delete($id) {
        $this->db->where('Employee_ID', $id)->update('employees', ['Is_Active' => 0]);
    }

    public function update_last_login($id) {
        $this->db->where('Employee_ID', $id)->update('employees', ['Last_Login' => date('Y-m-d H:i:s')]);
    }

    // Operator detail with attendance & advance stats
    public function get_detail($id) {
        $emp = $this->get_by_id($id);
        if (!$emp) return null;

        // Today's attendance
        $att = $this->db->where('Employee_ID', $id)
                        ->where('Att_Date', date('Y-m-d'))
                        ->get('employee_attendance')->row_array();

        // Total advance balance
        $adv = $this->db->select_sum('Amount_Paid', 'Total_Paid')
                        ->where('Employee_ID', $id)
                        ->where('Status', 'Paid')
                        ->get('employee_advances')->row_array();

        $emp['today_attendance'] = $att;
        $emp['total_advances_paid'] = $adv['Total_Paid'] ?? 0;
        return $emp;
    }
}
