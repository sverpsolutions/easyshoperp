<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Serial_model — Machine Serial Number Tracking
 */
class Serial_model extends CI_Model {

    public function get_list($filters = []) {
        $this->db->select('
            msm.*,
            im.Item_Name, im.Item_Code, im.Warranty_Months, im.AMC_Years,
            cm.Customer_Name, cm.Mobile AS Customer_Mobile
        ')
        ->from('Machine_Serial_Master msm')
        ->join('item_master im',       'im.Item_ID = msm.Item_ID',         'left')
        ->join('customer_master cm',   'cm.Customer_ID = msm.Customer_ID', 'left');

        if (!empty($filters['item_id']))    $this->db->where('msm.Item_ID', $filters['item_id']);
        if (!empty($filters['status']))     $this->db->where('msm.Status', $filters['status']);
        if (!empty($filters['customer_id']))$this->db->where('msm.Customer_ID', $filters['customer_id']);
        if (!empty($filters['search'])) {
            $s = $this->db->escape_like_str($filters['search']);
            $this->db->group_start()
                     ->like('msm.Serial_No', $s)
                     ->or_like('im.Item_Name', $s)
                     ->or_like('cm.Customer_Name', $s)
                     ->group_end();
        }

        return $this->db->order_by('msm.Created_Date', 'DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('msm.*, im.Item_Name, im.Item_Code, im.Warranty_Months, im.AMC_Years, cm.Customer_Name')
                        ->from('Machine_Serial_Master msm')
                        ->join('item_master im',     'im.Item_ID = msm.Item_ID',         'left')
                        ->join('customer_master cm', 'cm.Customer_ID = msm.Customer_ID', 'left')
                        ->where('msm.Serial_ID', $id)
                        ->get()->row_array();
    }

    public function get_by_serial($serial_no) {
        return $this->db->where('Serial_No', $serial_no)->get('Machine_Serial_Master')->row_array();
    }

    public function get_available($item_id) {
        return $this->db->where('Item_ID', $item_id)
                        ->where('Status', 'In Stock')
                        ->order_by('Serial_No')
                        ->get('Machine_Serial_Master')->result_array();
    }

    public function create($data) {
        // Validate unique serial
        $existing = $this->get_by_serial($data['Serial_No']);
        if ($existing) return false;

        $this->db->insert('Machine_Serial_Master', $data);
        return $this->db->insert_id();
    }

    public function bulk_create($records) {
        $inserted = 0;
        $duplicates = [];
        foreach ($records as $rec) {
            $existing = $this->get_by_serial($rec['Serial_No']);
            if ($existing) {
                $duplicates[] = $rec['Serial_No'];
                continue;
            }
            $this->db->insert('Machine_Serial_Master', $rec);
            $inserted++;
        }
        return ['inserted' => $inserted, 'duplicates' => $duplicates];
    }

    public function update($id, $data) {
        $this->db->where('Serial_ID', $id)->update('Machine_Serial_Master', $data);
        return $this->db->affected_rows();
    }

    public function sell($id, $data) {
        // Mark as Sold and link customer
        $update = [
            'Status'          => 'Sold',
            'Customer_ID'     => $data['Customer_ID'] ?? null,
            'Sales_ID'        => $data['Sales_ID']    ?? null,
            'Sale_Date'       => $data['Sale_Date']   ?? date('Y-m-d'),
            'Updated_Date'    => date('Y-m-d H:i:s'),
        ];

        // Auto-calculate warranty expiry if months set on item
        if (!empty($data['Warranty_Months']) && $data['Warranty_Months'] > 0) {
            $update['Warranty_Expiry'] = date('Y-m-d', strtotime("+{$data['Warranty_Months']} months"));
        }

        // Auto-calculate AMC expiry if years set
        if (!empty($data['AMC_Years']) && $data['AMC_Years'] > 0) {
            $update['AMC_Expiry'] = date('Y-m-d', strtotime("+{$data['AMC_Years']} years"));
        }

        $this->db->where('Serial_ID', $id)->update('Machine_Serial_Master', $update);
        return $this->db->affected_rows();
    }

    public function mark_in_service($id) {
        $this->db->where('Serial_ID', $id)->update('Machine_Serial_Master', [
            'Status'       => 'Service',
            'Updated_Date' => date('Y-m-d H:i:s'),
        ]);
        return $this->db->affected_rows();
    }

    public function delete($id) {
        // Only allow delete if In Stock
        $serial = $this->get_by_id($id);
        if (!$serial || $serial['Status'] !== 'In Stock') return false;
        $this->db->where('Serial_ID', $id)->delete('Machine_Serial_Master');
        return true;
    }

    // Stats for dashboard
    public function get_stats($item_id = null) {
        $base = $item_id ? $this->db->where('Item_ID', $item_id) : $this->db;
        $all = $base->get('Machine_Serial_Master')->result_array();
        $stats = ['total' => 0, 'in_stock' => 0, 'sold' => 0, 'service' => 0, 'damaged' => 0];
        foreach ($all as $row) {
            $stats['total']++;
            $key = strtolower(str_replace(' ', '_', $row['Status']));
            if (isset($stats[$key])) $stats[$key]++;
        }
        return $stats;
    }

    // Check warranty status
    public function get_warranty_status($serial_id) {
        $row = $this->get_by_id($serial_id);
        if (!$row) return null;
        $today = date('Y-m-d');
        return [
            'under_warranty' => $row['Warranty_Expiry'] && $row['Warranty_Expiry'] >= $today,
            'under_amc'      => $row['AMC_Expiry'] && $row['AMC_Expiry'] >= $today,
            'warranty_expiry'=> $row['Warranty_Expiry'],
            'amc_expiry'     => $row['AMC_Expiry'],
        ];
    }
}
