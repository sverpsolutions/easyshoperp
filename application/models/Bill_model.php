<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Bill_model extends CI_Model {

    public function get_all($filters = []) {
        $this->db->select('b.*, e.Name AS Created_By_Name')
                 ->from('Bill_Register b')
                 ->join('Employees e', 'e.Employee_ID = b.Created_By', 'left');
        if (!empty($filters['status']))   $this->db->where('b.Payment_Status', $filters['status']);
        if (!empty($filters['customer'])) $this->db->like('b.Customer_Name', $filters['customer']);
        if (!empty($filters['from']))     $this->db->where('b.Bill_Date >=', $filters['from']);
        if (!empty($filters['to']))       $this->db->where('b.Bill_Date <=', $filters['to']);
        return $this->db->order_by('b.Bill_ID DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        $bill = $this->db->where('Bill_ID', $id)->get('bill_register')->row_array();
        if ($bill) {
            $bill['items'] = $this->db->where('Bill_ID', $id)->get('bill_items')->result_array();
        }
        return $bill;
    }

    public function create($bill_data, $items = []) {
        $this->db->trans_start();
        $this->db->insert('bill_register', $bill_data);
        $bill_id = $this->db->insert_id();
        foreach ($items as $item) {
            $item['Bill_ID'] = $bill_id;
            $this->db->insert('bill_items', $item);
        }
        $this->db->trans_complete();
        return $bill_id;
    }

    public function update($id, $bill_data, $items = []) {
        $this->db->trans_start();
        $bill_data['Updated_Date'] = date('Y-m-d H:i:s');
        $this->db->where('Bill_ID', $id)->update('bill_register', $bill_data);
        if (!empty($items)) {
            $this->db->where('Bill_ID', $id)->delete('bill_items');
            foreach ($items as $item) {
                $item['Bill_ID'] = $id;
                $this->db->insert('bill_items', $item);
            }
        }
        $this->db->trans_complete();
        return $this->db->affected_rows();
    }

    public function delete($id) {
        $this->db->where('Bill_ID', $id)->delete('bill_register');
    }

    public function next_bill_number() {
        $year = date('Y');
        $row  = $this->db->select_max('Bill_ID')->where("Bill_Number LIKE 'B-{$year}-%'")->get('bill_register')->row_array();
        $last = $row['Bill_ID'] ?? 0;
        return 'B-' . $year . '-' . str_pad($last + 1, 4, '0', STR_PAD_LEFT);
    }

    public function record_payment($bill_id, $amount_paid) {
        $bill = $this->db->where('Bill_ID', $bill_id)->get('bill_register')->row_array();
        $new_paid    = ($bill['Amount_Paid'] ?? 0) + $amount_paid;
        $balance     = ($bill['Net_Amount'] ?? 0) - $new_paid;
        $status      = $balance <= 0 ? 'Paid' : ($new_paid > 0 ? 'Partial' : 'Unpaid');
        $this->db->where('Bill_ID', $bill_id)->update('bill_register', [
            'Amount_Paid'    => $new_paid,
            'Balance_Due'    => max(0, $balance),
            'Payment_Status' => $status,
            'Updated_Date'   => date('Y-m-d H:i:s'),
        ]);
    }
}
