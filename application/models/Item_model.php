<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Item_model extends CI_Model {

    // ── Item Master CRUD ──────────────────────────────────────────────────────

    public function get_all($filters = []) {
        $this->db->select('
            im.*,
            ig.Group_Name,
            isg.Subgroup_Name,
            ic.Category_Name,
            isc.Subcategory_Name,
            b.Brand_Name
        ')
        ->from('Item_Master im')
        ->join('Item_Groups ig',       'ig.Group_ID = im.Group_ID',            'left')
        ->join('Item_Subgroups isg',   'isg.Subgroup_ID = im.Subgroup_ID',     'left')
        ->join('Item_Categories ic',   'ic.Category_ID = im.Category_ID',      'left')
        ->join('Item_Subcategories isc','isc.Subcategory_ID = im.Subcategory_ID','left')
        ->join('Brands b',             'b.Brand_ID = im.Brand_ID',             'left');

        if (!empty($filters['group_id']))    $this->db->where('im.Group_ID', $filters['group_id']);
        if (!empty($filters['item_type']))   $this->db->where('im.Item_Type', $filters['item_type']);
        if (!empty($filters['paper_type']))  $this->db->where('im.Paper_Type', $filters['paper_type']);
        if (isset($filters['is_active']))    $this->db->where('im.Is_Active', $filters['is_active']);
        if (!empty($filters['search'])) {
            $s = $this->db->escape_like_str($filters['search']);
            $this->db->group_start()
                     ->like('im.Item_Name', $s)
                     ->or_like('im.Item_Code', $s)
                     ->or_like('im.Barcode_Value', $s)
                     ->group_end();
        }

        return $this->db->order_by('im.Item_Name')->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('im.*, ig.Group_Name, isg.Subgroup_Name, ic.Category_Name, isc.Subcategory_Name, b.Brand_Name')
            ->from('Item_Master im')
            ->join('Item_Groups ig',        'ig.Group_ID = im.Group_ID',             'left')
            ->join('Item_Subgroups isg',    'isg.Subgroup_ID = im.Subgroup_ID',      'left')
            ->join('Item_Categories ic',    'ic.Category_ID = im.Category_ID',       'left')
            ->join('Item_Subcategories isc','isc.Subcategory_ID = im.Subcategory_ID','left')
            ->join('Brands b',              'b.Brand_ID = im.Brand_ID',              'left')
            ->where('im.Item_ID', $id)
            ->get()->row_array();
    }

    public function create($data) {
        // Auto-generate Item_Code if not provided
        if (empty($data['Item_Code'])) {
            $last = $this->db->select_max('Item_ID')->get('item_master')->row_array();
            $next = ($last['Item_ID'] ?? 0) + 1;
            $data['Item_Code'] = 'ITM-' . str_pad($next, 3, '0', STR_PAD_LEFT);
        }
        $this->db->insert('item_master', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $this->db->where('Item_ID', $id)->update('item_master', $data);
    }

    public function delete($id) {
        $this->db->where('Item_ID', $id)->update('item_master', ['Is_Active' => 0]);
    }

    public function get_by_code($code) {
        return $this->db->where('Item_Code', $code)->get('item_master')->row_array();
    }

    // ── Hierarchy: Groups ─────────────────────────────────────────────────────

    public function get_groups() {
        return $this->db->where('Is_Active', 1)->order_by('Group_Name')->get('item_groups')->result_array();
    }

    public function create_group($name) {
        $this->db->insert('item_groups', ['Group_Name' => $name]);
        return $this->db->insert_id();
    }

    public function update_group($id, $data) {
        $this->db->where('Group_ID', $id)->update('item_groups', $data);
    }

    // ── Hierarchy: Subgroups ──────────────────────────────────────────────────

    public function get_subgroups($group_id = null) {
        if ($group_id) $this->db->where('Group_ID', $group_id);
        $this->db->where('Is_Active', 1);
        return $this->db->order_by('Subgroup_Name')->get('item_subgroups')->result_array();
    }

    public function create_subgroup($data) {
        $this->db->insert('item_subgroups', $data);
        return $this->db->insert_id();
    }

    // ── Hierarchy: Categories ─────────────────────────────────────────────────

    public function get_categories($subgroup_id = null) {
        if ($subgroup_id) $this->db->where('Subgroup_ID', $subgroup_id);
        $this->db->where('Is_Active', 1);
        return $this->db->order_by('Category_Name')->get('item_categories')->result_array();
    }

    public function create_category($data) {
        $this->db->insert('item_categories', $data);
        return $this->db->insert_id();
    }

    // ── Hierarchy: Subcategories ──────────────────────────────────────────────

    public function get_subcategories($category_id = null) {
        if ($category_id) $this->db->where('Category_ID', $category_id);
        $this->db->where('Is_Active', 1);
        return $this->db->order_by('Subcategory_Name')->get('item_subcategories')->result_array();
    }

    public function create_subcategory($data) {
        $this->db->insert('item_subcategories', $data);
        return $this->db->insert_id();
    }

    // ── Brands ────────────────────────────────────────────────────────────────

    public function get_brands() {
        return $this->db->where('Is_Active', 1)->order_by('Brand_Name')->get('brands')->result_array();
    }

    public function create_brand($name) {
        $this->db->insert('brands', ['Brand_Name' => $name]);
        return $this->db->insert_id();
    }

    // ── Lookup: full hierarchy data for dropdowns ─────────────────────────────

    public function get_hierarchy() {
        return [
            'groups'        => $this->get_groups(),
            'subgroups'     => $this->get_subgroups(),
            'categories'    => $this->get_categories(),
            'subcategories' => $this->get_subcategories(),
            'brands'        => $this->get_brands(),
        ];
    }
}
