<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Customer_model extends CI_Model {

    public function get_all($active_only = false) {
        if ($active_only) $this->db->where('Is_Active', 1);
        return $this->db->order_by('Customer_Name')->get('customer_master')->result_array();
    }

    public function get_by_id($id) {
        return $this->db->where('Customer_ID', $id)->get('customer_master')->row_array();
    }

    public function get_by_portal_username($username) {
        return $this->db->where('Portal_Username', $username)
                        ->where('Portal_Active', 1)
                        ->get('customer_master')->row_array();
    }

    public function create($data) {
        $this->db->insert('customer_master', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $this->db->where('Customer_ID', $id)->update('customer_master', $data);
        return $this->db->affected_rows();
    }

    public function delete($id) {
        $this->db->where('Customer_ID', $id)->update('customer_master', ['Is_Active' => 0]);
    }

    // Get jobs for a customer
    public function get_jobs($customer_id) {
        return $this->db->where('Customer_ID', $customer_id)
                        ->order_by('Job_ID DESC')
                        ->get('jobs')->result_array();
    }

    // Get bills for a customer
    public function get_bills($customer_id) {
        return $this->db->where('Customer_ID', $customer_id)
                        ->order_by('Bill_Date DESC')
                        ->get('bill_register')->result_array();
    }

    // Get order requests (portal)
    public function get_orders($customer_id) {
        return $this->db->where('Customer_ID', $customer_id)
                        ->order_by('Request_Date DESC')
                        ->get('order_requests')->result_array();
    }
}
