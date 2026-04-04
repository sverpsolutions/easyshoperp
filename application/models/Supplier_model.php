<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Supplier_model extends CI_Model {

    public function get_all($filters = []) {
        if (!empty($filters['search'])) {
            $s = $this->db->escape_like_str($filters['search']);
            $this->db->group_start()
                     ->like('Supplier_Name', $s)
                     ->or_like('Mobile', $s)
                     ->or_like('City', $s)
                     ->or_like('GST_No', $s)
                     ->group_end();
        }
        if (isset($filters['is_active'])) $this->db->where('Is_Active', $filters['is_active']);
        if (!empty($filters['category'])) $this->db->where('Category', $filters['category']);
        return $this->db->order_by('Supplier_Name')->get('supplier_master')->result_array();
    }

    public function get_by_id($id) {
        $s = $this->db->where('Supplier_ID', $id)->get('supplier_master')->row_array();
        if ($s) {
            $s['purchases'] = $this->db->select('Purchase_ID, Purchase_Number, Purchase_Date, Net_Amount, Amount_Paid, Balance_Due, Payment_Status')
                                        ->where('Supplier_ID', $id)
                                        ->order_by('Purchase_Date DESC')
                                        ->limit(30)
                                        ->get('purchase_register')->result_array();
            $s['total_purchased'] = array_sum(array_column($s['purchases'], 'Net_Amount'));
            $s['total_paid']      = array_sum(array_column($s['purchases'], 'Amount_Paid'));
            $s['total_due']       = array_sum(array_column($s['purchases'], 'Balance_Due'));
        }
        return $s;
    }

    public function get_list_for_dropdown() {
        return $this->db->select('Supplier_ID, Supplier_Name, Mobile, GST_No, State_Code')
                        ->where('Is_Active', 1)
                        ->order_by('Supplier_Name')
                        ->get('supplier_master')->result_array();
    }

    public function create($data) {
        $this->db->insert('supplier_master', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $this->db->where('Supplier_ID', $id)->update('supplier_master', $data);
    }

    public function delete($id) {
        $this->db->where('Supplier_ID', $id)->update('supplier_master', ['Is_Active' => 0]);
    }

    public function get_summary() {
        $row = $this->db->select('
            COUNT(*) AS total,
            SUM(Current_Balance) AS total_outstanding
        ')->get('supplier_master')->row_array();
        return $row;
    }
}
