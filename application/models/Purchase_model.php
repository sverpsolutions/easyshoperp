<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Purchase_model extends CI_Model {

    public function get_all($filters = []) {
        $this->db->select('p.*, e.Name AS Created_By_Name')
                 ->from('Purchase_Register p')
                 ->join('Employees e', 'e.Employee_ID = p.Created_By', 'left');
        if (!empty($filters['supplier']))       $this->db->like('p.Supplier_Name', $filters['supplier']);
        if (!empty($filters['payment_status'])) $this->db->where('p.Payment_Status', $filters['payment_status']);
        if (!empty($filters['from']))           $this->db->where('p.Purchase_Date >=', $filters['from']);
        if (!empty($filters['to']))             $this->db->where('p.Purchase_Date <=', $filters['to']);
        return $this->db->order_by('p.Purchase_ID DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        $p = $this->db->select('p.*, e.Name AS Created_By_Name')
                      ->from('Purchase_Register p')
                      ->join('Employees e', 'e.Employee_ID = p.Created_By', 'left')
                      ->where('p.Purchase_ID', $id)
                      ->get()->row_array();
        if ($p) {
            $p['items'] = $this->db->where('Purchase_ID', $id)->get('purchase_items')->result_array();
        }
        return $p;
    }

    public function create($data, $items = []) {
        $this->db->trans_start();
        $this->db->insert('purchase_register', $data);
        $purchase_id = $this->db->insert_id();

        foreach ($items as $item) {
            $item['Purchase_ID'] = $purchase_id;
            $this->db->insert('purchase_items', $item);

            // Update stock in Item_Master
            if (!empty($item['Item_ID'])) {
                $qty = floatval($item['Qty'] ?? 0);
                $this->db->query(
                    "UPDATE Item_Master SET Current_Stock = Current_Stock + ? WHERE Item_ID = ?",
                    [$qty, $item['Item_ID']]
                );
            }
        }

        $this->db->trans_complete();
        return $purchase_id;
    }

    public function update($id, $data, $items = []) {
        $this->db->trans_start();

        // Reverse old stock changes
        $old_items = $this->db->where('Purchase_ID', $id)->get('purchase_items')->result_array();
        foreach ($old_items as $oi) {
            if (!empty($oi['Item_ID'])) {
                $this->db->query(
                    "UPDATE Item_Master SET Current_Stock = Current_Stock - ? WHERE Item_ID = ?",
                    [floatval($oi['Qty']), $oi['Item_ID']]
                );
            }
        }

        $this->db->where('Purchase_ID', $id)->update('purchase_register', $data);

        if (!empty($items)) {
            $this->db->where('Purchase_ID', $id)->delete('purchase_items');
            foreach ($items as $item) {
                $item['Purchase_ID'] = $id;
                $this->db->insert('purchase_items', $item);
                if (!empty($item['Item_ID'])) {
                    $this->db->query(
                        "UPDATE Item_Master SET Current_Stock = Current_Stock + ? WHERE Item_ID = ?",
                        [floatval($item['Qty'] ?? 0), $item['Item_ID']]
                    );
                }
            }
        }

        $this->db->trans_complete();
    }

    public function delete($id) {
        // Reverse stock before deleting
        $items = $this->db->where('Purchase_ID', $id)->get('purchase_items')->result_array();
        foreach ($items as $item) {
            if (!empty($item['Item_ID'])) {
                $this->db->query(
                    "UPDATE Item_Master SET Current_Stock = GREATEST(0, Current_Stock - ?) WHERE Item_ID = ?",
                    [floatval($item['Qty']), $item['Item_ID']]
                );
            }
        }
        $this->db->where('Purchase_ID', $id)->delete('purchase_register');
    }

    public function next_purchase_number() {
        $year = date('Y');
        $row  = $this->db->select_max('Purchase_ID')->get('purchase_register')->row_array();
        $next = ($row['Purchase_ID'] ?? 0) + 1;
        return 'PUR-' . $year . '-' . str_pad($next, 4, '0', STR_PAD_LEFT);
    }

    public function get_summary() {
        $row = $this->db->select('
            COUNT(*) AS total_purchases,
            SUM(Net_Amount) AS total_value,
            SUM(Amount_Paid) AS total_paid,
            SUM(Balance_Due) AS total_due
        ')->get('purchase_register')->row_array();
        return $row;
    }
}
