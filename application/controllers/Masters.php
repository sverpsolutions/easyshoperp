<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Masters Controller — ERP Master Module
 * Handles: Company, GST Tax, HSN, UOM, Manufacturer,
 *          Brand, Group, Subgroup, Category, Subcategory
 */
class Masters extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Masters_model');
    }

    // ═══════════════════════════════════════════════════════════
    // COMPANY
    // ═══════════════════════════════════════════════════════════

    public function company_get() {
        $this->require_auth();
        $data = $this->Masters_model->get_company();
        return $this->json_success($data ?: new stdClass());
    }

    public function company_save() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Company_Name'])) return $this->json_error('Company Name is required', 400);

        $allowed = ['Company_Name','Address','City','State','Pincode','Mobile','Email',
                    'Website','GSTIN','PAN','Theme_Color','Bank_Name','Bank_Account',
                    'Bank_IFSC','Bank_Branch','Financial_Year'];
        $data = array_intersect_key($b, array_flip($allowed));

        // Logo upload is handled separately via /upload endpoint
        if (!empty($b['Logo_Path']))      $data['Logo_Path']      = $b['Logo_Path'];
        if (!empty($b['Signature_Path'])) $data['Signature_Path'] = $b['Signature_Path'];

        $id = $this->Masters_model->save_company($data);
        return $this->json_success(['Company_ID' => $id], 'Company saved successfully');
    }

    // ═══════════════════════════════════════════════════════════
    // GST TAX
    // ═══════════════════════════════════════════════════════════

    public function gst_list() {
        $this->require_auth();
        return $this->json_success($this->Masters_model->get_gst_list());
    }

    public function gst_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Tax_Name'])) return $this->json_error('Tax Name is required', 400);
        $data = [
            'Tax_Name'  => $b['Tax_Name'],
            'CGST_Pct'  => (float)($b['CGST_Pct']  ?? 0),
            'SGST_Pct'  => (float)($b['SGST_Pct']  ?? 0),
            'IGST_Pct'  => (float)($b['IGST_Pct']  ?? 0),
            'Is_Active' => 1,
        ];
        $id = $this->Masters_model->create_gst($data);
        return $this->json_success(['GST_Tax_ID' => $id], 'GST Tax created');
    }

    public function gst_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Tax_Name'])) return $this->json_error('Tax Name is required', 400);
        $data = [
            'Tax_Name' => $b['Tax_Name'],
            'CGST_Pct' => (float)($b['CGST_Pct'] ?? 0),
            'SGST_Pct' => (float)($b['SGST_Pct'] ?? 0),
            'IGST_Pct' => (float)($b['IGST_Pct'] ?? 0),
        ];
        $this->Masters_model->update_gst($id, $data);
        return $this->json_success(null, 'GST Tax updated');
    }

    public function gst_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_gst($id);
        return $this->json_success(null, 'GST Tax deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // HSN
    // ═══════════════════════════════════════════════════════════

    public function hsn_list() {
        $this->require_auth();
        $search = $this->input->get('search');
        return $this->json_success($this->Masters_model->get_hsn_list($search));
    }

    public function hsn_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['HSN_Code']))    return $this->json_error('HSN Code is required', 400);
        if (empty($b['Description'])) return $this->json_error('Description is required', 400);
        $data = [
            'HSN_Code'   => strtoupper(trim($b['HSN_Code'])),
            'Description'=> $b['Description'],
            'GST_Tax_ID' => !empty($b['GST_Tax_ID']) ? (int)$b['GST_Tax_ID'] : null,
            'Is_Active'  => 1,
        ];
        $id = $this->Masters_model->create_hsn($data);
        return $this->json_success(['HSN_ID' => $id], 'HSN created');
    }

    public function hsn_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['HSN_Code'])) return $this->json_error('HSN Code required', 400);
        $data = [
            'HSN_Code'   => strtoupper(trim($b['HSN_Code'])),
            'Description'=> $b['Description'] ?? '',
            'GST_Tax_ID' => !empty($b['GST_Tax_ID']) ? (int)$b['GST_Tax_ID'] : null,
        ];
        $this->Masters_model->update_hsn($id, $data);
        return $this->json_success(null, 'HSN updated');
    }

    public function hsn_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_hsn($id);
        return $this->json_success(null, 'HSN deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // UOM
    // ═══════════════════════════════════════════════════════════

    public function uom_list() {
        $this->require_auth();
        return $this->json_success($this->Masters_model->get_uom_list());
    }

    public function uom_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['UOM_Code'])) return $this->json_error('UOM Code is required', 400);
        if (empty($b['UOM_Name'])) return $this->json_error('UOM Name is required', 400);
        $data = [
            'UOM_Code' => strtoupper(trim($b['UOM_Code'])),
            'UOM_Name' => $b['UOM_Name'],
            'UOM_Type' => $b['UOM_Type'] ?? 'Count',
            'Is_Active'=> 1,
        ];
        $id = $this->Masters_model->create_uom($data);
        return $this->json_success(['UOM_ID' => $id], 'UOM created');
    }

    public function uom_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $data = [
            'UOM_Code' => strtoupper(trim($b['UOM_Code'] ?? '')),
            'UOM_Name' => $b['UOM_Name'] ?? '',
            'UOM_Type' => $b['UOM_Type'] ?? 'Count',
        ];
        $this->Masters_model->update_uom($id, $data);
        return $this->json_success(null, 'UOM updated');
    }

    public function uom_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_uom($id);
        return $this->json_success(null, 'UOM deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // MANUFACTURER
    // ═══════════════════════════════════════════════════════════

    public function manufacturer_list() {
        $this->require_auth();
        $search = $this->input->get('search');
        return $this->json_success($this->Masters_model->get_manufacturer_list($search));
    }

    public function manufacturer_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Manufacturer_Name'])) return $this->json_error('Manufacturer Name required', 400);
        $data = [
            'Manufacturer_Name' => $b['Manufacturer_Name'],
            'Short_Code'        => strtoupper($b['Short_Code'] ?? ''),
            'Country'           => $b['Country']        ?? 'India',
            'Contact_Person'    => $b['Contact_Person'] ?? null,
            'Mobile'            => $b['Mobile']         ?? null,
            'Email'             => $b['Email']          ?? null,
            'Website'           => $b['Website']        ?? null,
            'Address'           => $b['Address']        ?? null,
            'Notes'             => $b['Notes']          ?? null,
            'Is_Active'         => 1,
        ];
        $id = $this->Masters_model->create_manufacturer($data);
        return $this->json_success(['Manufacturer_ID' => $id], 'Manufacturer created');
    }

    public function manufacturer_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Manufacturer_Name'])) return $this->json_error('Manufacturer Name required', 400);
        $data = [
            'Manufacturer_Name' => $b['Manufacturer_Name'],
            'Short_Code'        => strtoupper($b['Short_Code'] ?? ''),
            'Country'           => $b['Country']        ?? 'India',
            'Contact_Person'    => $b['Contact_Person'] ?? null,
            'Mobile'            => $b['Mobile']         ?? null,
            'Email'             => $b['Email']          ?? null,
            'Website'           => $b['Website']        ?? null,
            'Address'           => $b['Address']        ?? null,
            'Notes'             => $b['Notes']          ?? null,
        ];
        $this->Masters_model->update_manufacturer($id, $data);
        return $this->json_success(null, 'Manufacturer updated');
    }

    public function manufacturer_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_manufacturer($id);
        return $this->json_success(null, 'Manufacturer deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // BRAND
    // ═══════════════════════════════════════════════════════════

    public function brand_list() {
        $this->require_auth();
        return $this->json_success($this->Masters_model->get_brand_list());
    }

    public function brand_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Brand_Name'])) return $this->json_error('Brand Name required', 400);
        $data = [
            'Brand_Name'      => $b['Brand_Name'],
            'Manufacturer_ID' => !empty($b['Manufacturer_ID']) ? (int)$b['Manufacturer_ID'] : null,
            'Is_Active'       => 1,
        ];
        $id = $this->Masters_model->create_brand($data);
        return $this->json_success(['Brand_ID' => $id], 'Brand created');
    }

    public function brand_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $data = [
            'Brand_Name'      => $b['Brand_Name'] ?? '',
            'Manufacturer_ID' => !empty($b['Manufacturer_ID']) ? (int)$b['Manufacturer_ID'] : null,
        ];
        $this->Masters_model->update_brand($id, $data);
        return $this->json_success(null, 'Brand updated');
    }

    public function brand_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_brand($id);
        return $this->json_success(null, 'Brand deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // GROUPS
    // ═══════════════════════════════════════════════════════════

    public function group_list() {
        $this->require_auth();
        return $this->json_success($this->Masters_model->get_group_list());
    }

    public function group_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Group_Name'])) return $this->json_error('Group Name required', 400);
        $id = $this->Masters_model->create_group(['Group_Name' => $b['Group_Name'], 'Is_Active' => 1]);
        return $this->json_success(['Group_ID' => $id], 'Group created');
    }

    public function group_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $this->Masters_model->update_group($id, ['Group_Name' => $b['Group_Name'] ?? '']);
        return $this->json_success(null, 'Group updated');
    }

    public function group_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_group($id);
        return $this->json_success(null, 'Group deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // SUBGROUPS
    // ═══════════════════════════════════════════════════════════

    public function subgroup_list() {
        $this->require_auth();
        $group_id = $this->input->get('group_id');
        return $this->json_success($this->Masters_model->get_subgroup_list($group_id));
    }

    public function subgroup_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Subgroup_Name'])) return $this->json_error('Subgroup Name required', 400);
        $data = [
            'Subgroup_Name' => $b['Subgroup_Name'],
            'Group_ID'      => !empty($b['Group_ID']) ? (int)$b['Group_ID'] : null,
            'Is_Active'     => 1,
        ];
        $id = $this->Masters_model->create_subgroup($data);
        return $this->json_success(['Subgroup_ID' => $id], 'Subgroup created');
    }

    public function subgroup_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $data = [
            'Subgroup_Name' => $b['Subgroup_Name'] ?? '',
            'Group_ID'      => !empty($b['Group_ID']) ? (int)$b['Group_ID'] : null,
        ];
        $this->Masters_model->update_subgroup($id, $data);
        return $this->json_success(null, 'Subgroup updated');
    }

    public function subgroup_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_subgroup($id);
        return $this->json_success(null, 'Subgroup deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // CATEGORIES
    // ═══════════════════════════════════════════════════════════

    public function category_list() {
        $this->require_auth();
        $subgroup_id = $this->input->get('subgroup_id');
        return $this->json_success($this->Masters_model->get_category_list($subgroup_id));
    }

    public function category_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Category_Name'])) return $this->json_error('Category Name required', 400);
        $data = [
            'Category_Name' => $b['Category_Name'],
            'Subgroup_ID'   => !empty($b['Subgroup_ID']) ? (int)$b['Subgroup_ID'] : null,
            'Is_Active'     => 1,
        ];
        $id = $this->Masters_model->create_category($data);
        return $this->json_success(['Category_ID' => $id], 'Category created');
    }

    public function category_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $data = [
            'Category_Name' => $b['Category_Name'] ?? '',
            'Subgroup_ID'   => !empty($b['Subgroup_ID']) ? (int)$b['Subgroup_ID'] : null,
        ];
        $this->Masters_model->update_category($id, $data);
        return $this->json_success(null, 'Category updated');
    }

    public function category_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_category($id);
        return $this->json_success(null, 'Category deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // SUBCATEGORIES
    // ═══════════════════════════════════════════════════════════

    public function subcategory_list() {
        $this->require_auth();
        $category_id = $this->input->get('category_id');
        return $this->json_success($this->Masters_model->get_subcategory_list($category_id));
    }

    public function subcategory_store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Subcategory_Name'])) return $this->json_error('Subcategory Name required', 400);
        $data = [
            'Subcategory_Name' => $b['Subcategory_Name'],
            'Category_ID'      => !empty($b['Category_ID']) ? (int)$b['Category_ID'] : null,
            'Is_Active'        => 1,
        ];
        $id = $this->Masters_model->create_subcategory($data);
        return $this->json_success(['Subcategory_ID' => $id], 'Subcategory created');
    }

    public function subcategory_update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $data = [
            'Subcategory_Name' => $b['Subcategory_Name'] ?? '',
            'Category_ID'      => !empty($b['Category_ID']) ? (int)$b['Category_ID'] : null,
        ];
        $this->Masters_model->update_subcategory($id, $data);
        return $this->json_success(null, 'Subcategory updated');
    }

    public function subcategory_delete($id) {
        $this->require_owner();
        $this->Masters_model->delete_subcategory($id);
        return $this->json_success(null, 'Subcategory deleted');
    }

    // ═══════════════════════════════════════════════════════════
    // COMBINED DROPDOWN
    // ═══════════════════════════════════════════════════════════

    public function all_dropdowns() {
        $this->require_auth();
        return $this->json_success($this->Masters_model->get_all_dropdowns());
    }
}
