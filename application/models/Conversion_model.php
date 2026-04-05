<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Conversion_model extends CI_Model {

    public function get_all($filters = []) {
        $this->db->select('
            c.*,
            im_in.Item_Name  AS Input_Item_Name_DB,
            im_out.Item_Name AS Output_Item_Name_DB,
            m.Machine_Name,
            e.Name AS Operator_Name,
            cr.Name AS Created_By_Name
        ')
        ->from('conversion_register c')
        ->join('item_master im_in',  'im_in.Item_ID  = c.Input_Item_ID',  'left')
        ->join('item_master im_out', 'im_out.Item_ID = c.Output_Item_ID', 'left')
        ->join('machines m',         'm.Machine_ID   = c.Machine_ID',     'left')
        ->join('employees e',        'e.Employee_ID  = c.Operator_ID',    'left')
        ->join('employees cr',       'cr.Employee_ID = c.Created_By',     'left');

        if (!empty($filters['status']))    $this->db->where('c.Status', $filters['status']);
        if (!empty($filters['from']))      $this->db->where('c.Conversion_Date >=', $filters['from']);
        if (!empty($filters['to']))        $this->db->where('c.Conversion_Date <=', $filters['to']);
        if (!empty($filters['item_id']))   $this->db->where('c.Input_Item_ID', $filters['item_id']);

        return $this->db->order_by('c.Conversion_ID DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('
            c.*,
            im_in.Item_Name  AS Input_Item_Name_DB,
            im_in.Unit       AS Input_Unit_DB,
            im_in.Current_Stock AS Input_Current_Stock,
            im_out.Item_Name AS Output_Item_Name_DB,
            im_out.Unit      AS Output_Unit_DB,
            m.Machine_Name,
            e.Name AS Operator_Name
        ')
        ->from('conversion_register c')
        ->join('item_master im_in',  'im_in.Item_ID  = c.Input_Item_ID',  'left')
        ->join('item_master im_out', 'im_out.Item_ID = c.Output_Item_ID', 'left')
        ->join('machines m',         'm.Machine_ID   = c.Machine_ID',     'left')
        ->join('employees e',        'e.Employee_ID  = c.Operator_ID',    'left')
        ->where('c.Conversion_ID', $id)
        ->get()->row_array();
    }

    public function create($data) {
        $this->db->insert('conversion_register', $data);
        $id = $this->db->insert_id();

        if ($data['Status'] === 'Completed') {
            $this->_apply_stock($data);
        }

        return $id;
    }

    public function update($id, $data) {
        $old = $this->db->where('Conversion_ID', $id)->get('conversion_register')->row_array();

        // If was Completed, reverse old stock
        if ($old && $old['Status'] === 'Completed') {
            $this->_reverse_stock($old);
        }

        $this->db->where('Conversion_ID', $id)->update('conversion_register', $data);

        // Apply new stock if completing
        if (isset($data['Status']) && $data['Status'] === 'Completed') {
            $new = array_merge($old, $data);
            $this->_apply_stock($new);
        }
    }

    private function _apply_stock($data) {
        if (!empty($data['Input_Item_ID'])) {
            $this->db->query(
                "UPDATE item_master SET Current_Stock = GREATEST(0, Current_Stock - ?) WHERE Item_ID = ?",
                [floatval($data['Input_Qty'] ?? 0), $data['Input_Item_ID']]
            );
        }
        if (!empty($data['Output_Item_ID'])) {
            $this->db->query(
                "UPDATE item_master SET Current_Stock = Current_Stock + ? WHERE Item_ID = ?",
                [floatval($data['Output_Qty'] ?? 0), $data['Output_Item_ID']]
            );
        }
    }

    private function _reverse_stock($data) {
        if (!empty($data['Input_Item_ID'])) {
            $this->db->query(
                "UPDATE item_master SET Current_Stock = Current_Stock + ? WHERE Item_ID = ?",
                [floatval($data['Input_Qty'] ?? 0), $data['Input_Item_ID']]
            );
        }
        if (!empty($data['Output_Item_ID'])) {
            $this->db->query(
                "UPDATE item_master SET Current_Stock = GREATEST(0, Current_Stock - ?) WHERE Item_ID = ?",
                [floatval($data['Output_Qty'] ?? 0), $data['Output_Item_ID']]
            );
        }
    }

    public function delete($id) {
        $c = $this->get_by_id($id);
        if ($c && $c['Status'] === 'Completed') {
            $this->_reverse_stock($c);
        }
        $this->db->where('Conversion_ID', $id)->delete('conversion_register');
    }

    public function next_number() {
        $year = date('Y');
        $row  = $this->db->select_max('Conversion_ID')->get('conversion_register')->row_array();
        $next = ($row['Conversion_ID'] ?? 0) + 1;
        return 'CNV-' . $year . '-' . str_pad($next, 4, '0', STR_PAD_LEFT);
    }
}
