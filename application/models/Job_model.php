<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Job_model extends CI_Model {

    public function get_all($filters = []) {
        $this->db->select('j.*, m.Machine_Name, e.Name AS Operator_Name')
                 ->from('jobs j')
                 ->join('machines e2',   'e2.Machine_ID = j.Assigned_Machine_ID', 'left')
                 ->join('machines m',    'm.Machine_ID  = j.Assigned_Machine_ID', 'left')
                 ->join('employees e',   'e.Employee_ID = j.Assigned_Operator_ID', 'left');

        if (!empty($filters['status']))   $this->db->where('j.Status', $filters['status']);
        if (!empty($filters['customer'])) $this->db->like('j.Customer_Name', $filters['customer']);
        if (!empty($filters['from']))     $this->db->where('j.Order_Date >=', $filters['from']);
        if (!empty($filters['to']))       $this->db->where('j.Order_Date <=', $filters['to']);

        return $this->db->order_by('j.Job_ID DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('j.*, m.Machine_Name, e.Name AS Operator_Name')
                        ->from('jobs j')
                        ->join('machines m',  'm.Machine_ID  = j.Assigned_Machine_ID', 'left')
                        ->join('employees e', 'e.Employee_ID = j.Assigned_Operator_ID', 'left')
                        ->where('j.Job_ID', $id)
                        ->get()->row_array();
    }

    public function get_pending_for_operator($operator_id) {
        return $this->db->select('j.*, m.Machine_Name')
                        ->from('jobs j')
                        ->join('machines m', 'm.Machine_ID = j.Assigned_Machine_ID', 'left')
                        ->where('j.Assigned_Operator_ID', $operator_id)
                        ->where_in('j.Status', ['Assigned', 'Running', 'Pending'])
                        ->order_by('j.Priority ASC, j.Order_Date ASC')
                        ->get()->result_array();
    }

    public function create($data) {
        $this->db->insert('jobs', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $this->db->where('Job_ID', $id)->update('jobs', $data);
        return $this->db->affected_rows();
    }

    public function delete($id) {
        $this->db->where('Job_ID', $id)->delete('jobs');
    }

    public function next_job_number() {
        $year = date('Y');
        $row  = $this->db->select_max('Job_ID')->where("Job_Number LIKE 'J-{$year}-%'")->get('jobs')->row_array();
        $last = $row['Job_ID'] ?? 0;
        return 'J-' . $year . '-' . str_pad($last + 1, 4, '0', STR_PAD_LEFT);
    }

    public function start_job($job_id, $machine_id, $operator_id) {
        $this->db->query('CALL sp_StartJob(?, ?, ?)', [$job_id, $machine_id, $operator_id]);
    }

    public function stop_job($job_id, $machine_id, $produced_qty, $status = 'Completed') {
        $this->db->query('CALL sp_StopJob(?, ?, ?, ?)', [$job_id, $machine_id, $produced_qty, $status]);
    }

    public function log_production($job_id, $operator_id, $machine_id, $qty, $remarks = '') {
        $this->db->insert('job_production_log', [
            'Job_ID'      => $job_id,
            'Operator_ID' => $operator_id,
            'Machine_ID'  => $machine_id,
            'Qty_Produced'=> $qty,
            'Remarks'     => $remarks,
        ]);
        $this->db->where('Job_ID', $job_id)
                 ->set('Produced_Qty', 'Produced_Qty + ' . (int)$qty, false)
                 ->update('jobs');

        // Auto-complete if target reached
        $job = $this->get_by_id($job_id);
        if ($job && $job['Produced_Qty'] >= $job['Required_Qty'] && $job['Status'] === 'Running') {
            $this->db->where('Job_ID', $job_id)->update('jobs', ['Status' => 'Completed', 'End_Time' => date('Y-m-d H:i:s')]);
        }
    }

    public function get_pending_count() {
        return $this->db->where_in('Status', ['Pending','Assigned'])->count_all_results('jobs');
    }
}
