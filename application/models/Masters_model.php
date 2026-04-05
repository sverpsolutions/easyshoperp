<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Masters_model — Handles all ERP Master tables:
 * Company, GST Tax, HSN, UOM, Manufacturer, Brand,
 * Group, Subgroup, Category, Subcategory
 */
class Masters_model extends CI_Model {

    // ═══════════════════════════════════════════════════════════
    // COMPANY MASTER
    // ═══════════════════════════════════════════════════════════

    public function get_company() {
        return $this->db->order_by('Company_ID')->limit(1)->get('Company_Master')->row_array();
    }

    public function save_company($data) {
        $existing = $this->db->get('Company_Master')->row_array();
        $data['Updated_Date'] = date('Y-m-d H:i:s');
        if ($existing) {
            $this->db->where('Company_ID', $existing['Company_ID'])->update('Company_Master', $data);
            return $existing['Company_ID'];
        } else {
            $this->db->insert('Company_Master', $data);
            return $this->db->insert_id();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // GST TAX MASTER
    // ═══════════════════════════════════════════════════════════

    public function get_gst_list() {
        return $this->db->where('Is_Active', 1)->order_by('Total_Pct')->get('GST_Tax_Master')->result_array();
    }

    public function get_gst_by_id($id) {
        return $this->db->where('GST_Tax_ID', $id)->get('GST_Tax_Master')->row_array();
    }

    public function create_gst($data) {
        $this->db->insert('GST_Tax_Master', $data);
        return $this->db->insert_id();
    }

    public function update_gst($id, $data) {
        $this->db->where('GST_Tax_ID', $id)->update('GST_Tax_Master', $data);
        return $this->db->affected_rows();
    }

    public function delete_gst($id) {
        // Soft delete
        $this->db->where('GST_Tax_ID', $id)->update('GST_Tax_Master', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // HSN MASTER
    // ═══════════════════════════════════════════════════════════

    public function get_hsn_list($search = null) {
        $this->db->select('h.*, g.Tax_Name, g.CGST_Pct, g.SGST_Pct, g.IGST_Pct, g.Total_Pct')
                 ->from('HSN_Master h')
                 ->join('GST_Tax_Master g', 'g.GST_Tax_ID = h.GST_Tax_ID', 'left')
                 ->where('h.Is_Active', 1);
        if ($search) {
            $s = $this->db->escape_like_str($search);
            $this->db->group_start()
                     ->like('h.HSN_Code', $s)
                     ->or_like('h.Description', $s)
                     ->group_end();
        }
        return $this->db->order_by('h.HSN_Code')->get()->result_array();
    }

    public function get_hsn_by_id($id) {
        return $this->db->select('h.*, g.Tax_Name, g.CGST_Pct, g.SGST_Pct, g.IGST_Pct, g.Total_Pct')
                        ->from('HSN_Master h')
                        ->join('GST_Tax_Master g', 'g.GST_Tax_ID = h.GST_Tax_ID', 'left')
                        ->where('h.HSN_ID', $id)
                        ->get()->row_array();
    }

    public function create_hsn($data) {
        $this->db->insert('HSN_Master', $data);
        return $this->db->insert_id();
    }

    public function update_hsn($id, $data) {
        $this->db->where('HSN_ID', $id)->update('HSN_Master', $data);
        return $this->db->affected_rows();
    }

    public function delete_hsn($id) {
        $this->db->where('HSN_ID', $id)->update('HSN_Master', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // UOM MASTER
    // ═══════════════════════════════════════════════════════════

    public function get_uom_list() {
        return $this->db->where('Is_Active', 1)->order_by('UOM_Name')->get('UOM_Master')->result_array();
    }

    public function get_uom_by_id($id) {
        return $this->db->where('UOM_ID', $id)->get('UOM_Master')->row_array();
    }

    public function create_uom($data) {
        $this->db->insert('UOM_Master', $data);
        return $this->db->insert_id();
    }

    public function update_uom($id, $data) {
        $this->db->where('UOM_ID', $id)->update('UOM_Master', $data);
        return $this->db->affected_rows();
    }

    public function delete_uom($id) {
        $this->db->where('UOM_ID', $id)->update('UOM_Master', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // MANUFACTURERS
    // ═══════════════════════════════════════════════════════════

    public function get_manufacturer_list($search = null) {
        $this->db->where('Is_Active', 1);
        if ($search) {
            $s = $this->db->escape_like_str($search);
            $this->db->group_start()
                     ->like('Manufacturer_Name', $s)
                     ->or_like('Short_Code', $s)
                     ->group_end();
        }
        return $this->db->order_by('Manufacturer_Name')->get('Manufacturers')->result_array();
    }

    public function get_manufacturer_by_id($id) {
        return $this->db->where('Manufacturer_ID', $id)->get('Manufacturers')->row_array();
    }

    public function create_manufacturer($data) {
        $this->db->insert('Manufacturers', $data);
        return $this->db->insert_id();
    }

    public function update_manufacturer($id, $data) {
        $this->db->where('Manufacturer_ID', $id)->update('Manufacturers', $data);
        return $this->db->affected_rows();
    }

    public function delete_manufacturer($id) {
        $this->db->where('Manufacturer_ID', $id)->update('Manufacturers', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // BRANDS
    // ═══════════════════════════════════════════════════════════

    public function get_brand_list() {
        return $this->db->select('b.*, m.Manufacturer_Name')
                        ->from('brands b')
                        ->join('Manufacturers m', 'm.Manufacturer_ID = b.Manufacturer_ID', 'left')
                        ->where('b.Is_Active', 1)
                        ->order_by('b.Brand_Name')
                        ->get()->result_array();
    }

    public function get_brand_by_id($id) {
        return $this->db->where('Brand_ID', $id)->get('brands')->row_array();
    }

    public function create_brand($data) {
        if (is_string($data)) {
            $data = ['Brand_Name' => $data];
        }
        $this->db->insert('brands', $data);
        return $this->db->insert_id();
    }

    public function update_brand($id, $data) {
        $this->db->where('Brand_ID', $id)->update('brands', $data);
        return $this->db->affected_rows();
    }

    public function delete_brand($id) {
        $this->db->where('Brand_ID', $id)->update('brands', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // GROUPS
    // ═══════════════════════════════════════════════════════════

    public function get_group_list() {
        return $this->db->where('Is_Active', 1)->order_by('Group_Name')->get('item_groups')->result_array();
    }

    public function get_group_by_id($id) {
        return $this->db->where('Group_ID', $id)->get('item_groups')->row_array();
    }

    public function create_group($data) {
        if (is_string($data)) $data = ['Group_Name' => $data];
        $this->db->insert('item_groups', $data);
        return $this->db->insert_id();
    }

    public function update_group($id, $data) {
        $this->db->where('Group_ID', $id)->update('item_groups', $data);
        return $this->db->affected_rows();
    }

    public function delete_group($id) {
        $this->db->where('Group_ID', $id)->update('item_groups', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // SUBGROUPS
    // ═══════════════════════════════════════════════════════════

    public function get_subgroup_list($group_id = null) {
        $this->db->select('s.*, g.Group_Name')
                 ->from('item_subgroups s')
                 ->join('item_groups g', 'g.Group_ID = s.Group_ID', 'left')
                 ->where('s.Is_Active', 1);
        if ($group_id) $this->db->where('s.Group_ID', $group_id);
        return $this->db->order_by('s.Subgroup_Name')->get()->result_array();
    }

    public function get_subgroup_by_id($id) {
        return $this->db->where('Subgroup_ID', $id)->get('item_subgroups')->row_array();
    }

    public function create_subgroup($data) {
        $this->db->insert('item_subgroups', $data);
        return $this->db->insert_id();
    }

    public function update_subgroup($id, $data) {
        $this->db->where('Subgroup_ID', $id)->update('item_subgroups', $data);
        return $this->db->affected_rows();
    }

    public function delete_subgroup($id) {
        $this->db->where('Subgroup_ID', $id)->update('item_subgroups', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // CATEGORIES
    // ═══════════════════════════════════════════════════════════

    public function get_category_list($subgroup_id = null) {
        $this->db->select('c.*, s.Subgroup_Name, g.Group_Name')
                 ->from('item_categories c')
                 ->join('item_subgroups s', 's.Subgroup_ID = c.Subgroup_ID', 'left')
                 ->join('item_groups g',    'g.Group_ID = s.Group_ID',       'left')
                 ->where('c.Is_Active', 1);
        if ($subgroup_id) $this->db->where('c.Subgroup_ID', $subgroup_id);
        return $this->db->order_by('c.Category_Name')->get()->result_array();
    }

    public function get_category_by_id($id) {
        return $this->db->where('Category_ID', $id)->get('item_categories')->row_array();
    }

    public function create_category($data) {
        $this->db->insert('item_categories', $data);
        return $this->db->insert_id();
    }

    public function update_category($id, $data) {
        $this->db->where('Category_ID', $id)->update('item_categories', $data);
        return $this->db->affected_rows();
    }

    public function delete_category($id) {
        $this->db->where('Category_ID', $id)->update('item_categories', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // SUBCATEGORIES
    // ═══════════════════════════════════════════════════════════

    public function get_subcategory_list($category_id = null) {
        $this->db->select('sc.*, c.Category_Name, s.Subgroup_Name')
                 ->from('item_subcategories sc')
                 ->join('item_categories c',  'c.Category_ID = sc.Category_ID',   'left')
                 ->join('item_subgroups s',   's.Subgroup_ID = c.Subgroup_ID',    'left')
                 ->where('sc.Is_Active', 1);
        if ($category_id) $this->db->where('sc.Category_ID', $category_id);
        return $this->db->order_by('sc.Subcategory_Name')->get()->result_array();
    }

    public function get_subcategory_by_id($id) {
        return $this->db->where('Subcategory_ID', $id)->get('item_subcategories')->row_array();
    }

    public function create_subcategory($data) {
        $this->db->insert('item_subcategories', $data);
        return $this->db->insert_id();
    }

    public function update_subcategory($id, $data) {
        $this->db->where('Subcategory_ID', $id)->update('item_subcategories', $data);
        return $this->db->affected_rows();
    }

    public function delete_subcategory($id) {
        $this->db->where('Subcategory_ID', $id)->update('item_subcategories', ['Is_Active' => 0]);
        return $this->db->affected_rows();
    }

    // ═══════════════════════════════════════════════════════════
    // COMBINED DROPDOWN LOOKUP
    // ═══════════════════════════════════════════════════════════

    public function get_all_dropdowns() {
        return [
            'gst_taxes'     => $this->get_gst_list(),
            'hsn_codes'     => $this->get_hsn_list(),
            'uoms'          => $this->get_uom_list(),
            'manufacturers' => $this->get_manufacturer_list(),
            'brands'        => $this->get_brand_list(),
            'groups'        => $this->get_group_list(),
            'subgroups'     => $this->get_subgroup_list(),
            'categories'    => $this->get_category_list(),
            'subcategories' => $this->get_subcategory_list(),
        ];
    }
}
