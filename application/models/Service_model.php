<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Service_model — Hardware Service Records
 */
class Service_model extends CI_Model {

    public function get_list($filters = []) {
        $this->db->select('
            sr.*,
            msm.Serial_No, msm.Status AS Serial_Status, msm.Warranty_Expiry, msm.AMC_Expiry,
            im.Item_Name, im.Item_Code,
            cm.Customer_Name, cm.Mobile AS Customer_Mobile
        ')
        ->from('service_records sr')
        ->join('machine_serial_master msm', 'msm.Serial_ID = sr.Serial_ID',    'left')
        ->join('item_master im',            'im.Item_ID = msm.Item_ID',        'left')
        ->join('customer_master cm',        'cm.Customer_ID = sr.Customer_ID', 'left');

        if (!empty($filters['status']))    $this->db->where('sr.Status', $filters['status']);
        if (!empty($filters['serial_id'])) $this->db->where('sr.Serial_ID', $filters['serial_id']);
        if (!empty($filters['customer_id']))$this->db->where('sr.Customer_ID', $filters['customer_id']);
        if (!empty($filters['search'])) {
            $s = $this->db->escape_like_str($filters['search']);
            $this->db->group_start()
                     ->like('msm.Serial_No', $s)
                     ->or_like('im.Item_Name', $s)
                     ->or_like('cm.Customer_Name', $s)
                     ->or_like('sr.Issue_Description', $s)
                     ->group_end();
        }

        return $this->db->order_by('sr.Created_Date', 'DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('sr.*, msm.Serial_No, msm.Warranty_Expiry, msm.AMC_Expiry, im.Item_Name, im.Item_Code, cm.Customer_Name, cm.Mobile AS Customer_Mobile')
                        ->from('service_records sr')
                        ->join('machine_serial_master msm', 'msm.Serial_ID = sr.Serial_ID',    'left')
                        ->join('item_master im',            'im.Item_ID = msm.Item_ID',        'left')
                        ->join('customer_master cm',        'cm.Customer_ID = sr.Customer_ID', 'left')
                        ->where('sr.Service_ID', $id)
                        ->get()->row_array();
    }

    public function create($data) {
        // Auto-detect warranty / AMC status
        $this->load->model('Serial_model');
        $warranty = $this->Serial_model->get_warranty_status($data['Serial_ID']);
        if ($warranty) {
            $data['Is_Under_Warranty'] = $warranty['under_warranty'] ? 1 : 0;
            $data['Is_Under_AMC']      = $warranty['under_amc']      ? 1 : 0;
        }

        $data['Created_Date'] = date('Y-m-d H:i:s');
        $this->db->insert('service_records', $data);
        $id = $this->db->insert_id();

        // Mark serial as In Service
        $this->Serial_model->mark_in_service($data['Serial_ID']);

        return $id;
    }

    public function update($id, $data) {
        $data['Updated_Date'] = date('Y-m-d H:i:s');

        // If closing/resolving, set closed date
        if (!empty($data['Status']) && in_array($data['Status'], ['Resolved', 'Closed'])) {
            if (empty($data['Closed_Date'])) {
                $data['Closed_Date'] = date('Y-m-d');
            }
            // Revert serial status to Sold (if it was in service)
            $svc = $this->get_by_id($id);
            if ($svc) {
                $this->db->where('Serial_ID', $svc['Serial_ID'])
                         ->where('Status', 'Service')
                         ->update('machine_serial_master', ['Status' => 'Sold', 'Updated_Date' => date('Y-m-d H:i:s')]);
            }
        }

        $this->db->where('Service_ID', $id)->update('service_records', $data);
        return $this->db->affected_rows();
    }

    public function get_history($serial_id) {
        return $this->db->where('Serial_ID', $serial_id)
                        ->order_by('Created_Date', 'DESC')
                        ->get('service_records')->result_array();
    }

    public function get_open_count() {
        return $this->db->where_in('Status', ['Open', 'In Progress', 'Waiting Parts'])
                        ->count_all_results('service_records');
    }
}
