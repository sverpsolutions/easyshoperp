<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Advance_model extends CI_Model {

    public function get_all($status = null, $employee_id = null) {
        $this->db->select('a.*, e.Name AS Employee_Name, e.Mobile,
                            ap.Name AS Approved_By_Name, pp.Name AS Paid_By_Name')
                 ->from('employee_advances a')
                 ->join('employees e',  'e.Employee_ID  = a.Employee_ID',  'left')
                 ->join('employees ap', 'ap.Employee_ID = a.Approved_By',  'left')
                 ->join('employees pp', 'pp.Employee_ID = a.Paid_By',      'left');
        if ($status)      $this->db->where('a.Status', $status);
        if ($employee_id) $this->db->where('a.Employee_ID', $employee_id);
        return $this->db->order_by('a.Request_Date DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('a.*, e.Name AS Employee_Name, e.Mobile')
                        ->from('employee_advances a')
                        ->join('employees e', 'e.Employee_ID = a.Employee_ID', 'left')
                        ->where('a.Advance_ID', $id)
                        ->get()->row_array();
    }

    public function create($data) {
        $this->db->insert('employee_advances', $data);
        return $this->db->insert_id();
    }

    public function approve($id, $approved_by, $amount_approved) {
        $this->db->where('Advance_ID', $id)->update('employee_advances', [
            'Status'          => 'Approved',
            'Approved_By'     => $approved_by,
            'Approved_Date'   => date('Y-m-d H:i:s'),
            'Amount_Approved' => $amount_approved,
        ]);
    }

    public function reject($id, $approved_by, $reason) {
        $this->db->where('Advance_ID', $id)->update('employee_advances', [
            'Status'        => 'Rejected',
            'Approved_By'   => $approved_by,
            'Approved_Date' => date('Y-m-d H:i:s'),
            'Reject_Reason' => $reason,
        ]);
    }

    public function mark_paid($id, $paid_by, $amount_paid, $payment_mode) {
        $adv = $this->get_by_id($id);
        $this->db->where('Advance_ID', $id)->update('employee_advances', [
            'Status'       => 'Paid',
            'Paid_By'      => $paid_by,
            'Paid_Date'    => date('Y-m-d H:i:s'),
            'Amount_Paid'  => $amount_paid,
            'Payment_Mode' => $payment_mode,
        ]);
        // Update employee balance
        $this->db->where('Employee_ID', $adv['Employee_ID'])
                 ->set('Total_Advance_Balance', 'Total_Advance_Balance + ' . (float)$amount_paid, false)
                 ->update('employees');
    }

    public function get_pending_count() {
        return $this->db->where('Status', 'Pending')->count_all_results('employee_advances');
    }
}
