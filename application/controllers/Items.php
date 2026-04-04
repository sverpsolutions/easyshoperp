<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Items extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Item_model');
    }

    // GET /api/items
    public function index() {
        $this->require_auth();
        $filters = [
            'group_id'  => $this->input->get('group_id'),
            'item_type' => $this->input->get('item_type'),
            'paper_type'=> $this->input->get('paper_type'),
            'search'    => $this->input->get('search'),
            'is_active' => $this->input->get('is_active') !== null ? $this->input->get('is_active') : 1,
        ];
        $items = $this->Item_model->get_all($filters);
        return $this->json_success($items);
    }

    // GET /api/items/:id
    public function show($id) {
        $this->require_auth();
        $item = $this->Item_model->get_by_id($id);
        if (!$item) return $this->json_error('Item not found', 404);
        return $this->json_success($item);
    }

    // GET /api/items/hierarchy  — all groups/subgroups/categories/subcategories/brands
    public function hierarchy() {
        $this->require_auth();
        return $this->json_success($this->Item_model->get_hierarchy());
    }

    // POST /api/items/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        if (empty($b['Item_Name'])) return $this->json_error('Item Name is required', 400);

        // Check duplicate code
        if (!empty($b['Item_Code'])) {
            $existing = $this->Item_model->get_by_code($b['Item_Code']);
            if ($existing) return $this->json_error('Item Code already exists', 409);
        }

        $data = [
            'Item_Code'       => $b['Item_Code']       ?? null,
            'Item_Name'       => $b['Item_Name'],
            'Group_ID'        => $b['Group_ID']         ?? null,
            'Subgroup_ID'     => $b['Subgroup_ID']       ?? null,
            'Category_ID'     => $b['Category_ID']       ?? null,
            'Subcategory_ID'  => $b['Subcategory_ID']    ?? null,
            'Brand_ID'        => $b['Brand_ID']          ?? null,
            'Manufacturer'    => $b['Manufacturer']      ?? null,
            'Paper_Type'      => $b['Paper_Type']        ?? null,
            'Core_Type'       => $b['Core_Type']         ?? null,
            'Item_Type'       => $b['Item_Type']         ?? 'Plain',
            'Size_Width'      => $b['Size_Width']        ?? null,
            'Size_Length'     => $b['Size_Length']       ?? null,
            'Labels_Per_Roll' => $b['Labels_Per_Roll']   ?? 0,
            'HSN_Code'           => $b['HSN_Code']          ?? null,
            'HSN_ID'             => !empty($b['HSN_ID']) ? (int)$b['HSN_ID'] : null,
            'GST_Rate'           => $b['GST_Rate']          ?? 18.00,
            'GST_Tax_ID'         => !empty($b['GST_Tax_ID']) ? (int)$b['GST_Tax_ID'] : null,
            'UOM_ID'             => !empty($b['UOM_ID']) ? (int)$b['UOM_ID'] : null,
            'Manufacturer_ID'    => !empty($b['Manufacturer_ID']) ? (int)$b['Manufacturer_ID'] : null,
            'Unit'               => $b['Unit']              ?? 'Roll',
            'Purchase_Rate'      => $b['Purchase_Rate']     ?? 0,
            'Sale_Rate'          => $b['Sale_Rate']         ?? 0,
            'Min_Stock'          => $b['Min_Stock']         ?? 0,
            'Barcode_Value'      => $b['Barcode_Value']     ?? null,
            'Photo_Path'         => $b['Photo_Path']        ?? null,
            'Model_No'           => $b['Model_No']          ?? null,
            'Part_No'            => $b['Part_No']           ?? null,
            'EAN_Code'           => !empty($b['EAN_Code']) ? $b['EAN_Code'] : null,
            'Notes'              => $b['Notes']             ?? null,
            // Hardware fields
            'Is_Hardware'        => isset($b['Is_Hardware'])        ? (int)$b['Is_Hardware']        : 0,
            'Serial_Required'    => isset($b['Serial_Required'])    ? (int)$b['Serial_Required']    : 0,
            'Warranty_Months'    => isset($b['Warranty_Months'])    ? (int)$b['Warranty_Months']    : 0,
            'AMC_Years'          => isset($b['AMC_Years'])          ? (int)$b['AMC_Years']          : 0,
            'Service_Applicable' => isset($b['Service_Applicable']) ? (int)$b['Service_Applicable'] : 0,
        ];

        $id = $this->Item_model->create($data);
        $this->audit("Created item {$b['Item_Name']}", $this->user['id']);
        return $this->json_success(['Item_ID' => $id], 'Item created', 201);
    }

    // POST /api/items/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();

        $allowed = ['Item_Name','Item_Code','Group_ID','Subgroup_ID','Category_ID','Subcategory_ID',
                    'Brand_ID','Manufacturer','Manufacturer_ID','Paper_Type','Core_Type','Item_Type',
                    'Size_Width','Size_Length','Labels_Per_Roll','HSN_Code','HSN_ID','GST_Rate','GST_Tax_ID',
                    'UOM_ID','Unit','Purchase_Rate','Sale_Rate','Min_Stock','Current_Stock',
                    'Barcode_Value','Photo_Path','Model_No','Part_No','EAN_Code','Notes','Is_Active',
                    'Is_Hardware','Serial_Required','Warranty_Months','AMC_Years','Service_Applicable'];
        $data = array_intersect_key($b, array_flip($allowed));

        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Item_model->update($id, $data);
        $this->audit("Updated item $id", $this->user['id']);
        return $this->json_success([], 'Item updated');
    }

    // POST /api/items/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Item_model->delete($id);
        $this->audit("Deactivated item $id", $this->user['id']);
        return $this->json_success([], 'Item deactivated');
    }

    // ── Hierarchy management ──────────────────────────────────────────────────

    // POST /api/items/groups/store
    public function store_group() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Group_Name'])) return $this->json_error('Group name required', 400);
        $id = $this->Item_model->create_group($b['Group_Name']);
        return $this->json_success(['Group_ID' => $id], 'Group created', 201);
    }

    // POST /api/items/groups/update/:id
    public function update_group($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $this->Item_model->update_group($id, array_intersect_key($b, array_flip(['Group_Name','Is_Active'])));
        return $this->json_success([], 'Group updated');
    }

    // POST /api/items/subgroups/store
    public function store_subgroup() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Subgroup_Name']) || empty($b['Group_ID'])) return $this->json_error('Subgroup name and Group required', 400);
        $id = $this->Item_model->create_subgroup(['Group_ID' => $b['Group_ID'], 'Subgroup_Name' => $b['Subgroup_Name']]);
        return $this->json_success(['Subgroup_ID' => $id], 'Subgroup created', 201);
    }

    // POST /api/items/categories/store
    public function store_category() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Category_Name'])) return $this->json_error('Category name required', 400);
        $id = $this->Item_model->create_category(['Subgroup_ID' => $b['Subgroup_ID'] ?? null, 'Category_Name' => $b['Category_Name']]);
        return $this->json_success(['Category_ID' => $id], 'Category created', 201);
    }

    // POST /api/items/subcategories/store
    public function store_subcategory() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Subcategory_Name'])) return $this->json_error('Subcategory name required', 400);
        $id = $this->Item_model->create_subcategory(['Category_ID' => $b['Category_ID'] ?? null, 'Subcategory_Name' => $b['Subcategory_Name']]);
        return $this->json_success(['Subcategory_ID' => $id], 'Subcategory created', 201);
    }

    // POST /api/items/brands/store
    public function store_brand() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Brand_Name'])) return $this->json_error('Brand name required', 400);
        $id = $this->Item_model->create_brand($b['Brand_Name']);
        return $this->json_success(['Brand_ID' => $id], 'Brand created', 201);
    }
}
