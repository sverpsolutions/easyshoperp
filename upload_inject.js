const _files = [
  {r: "public_html/application/models/Advance_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Advance_model extends CI_Model {

    public function get_all($status = null, $employee_id = null) {
        $this->db->select('a.*, e.Name AS Employee_Name, e.Mobile,
                            ap.Name AS Approved_By_Name, pp.Name AS Paid_By_Name')
                 ->from('Employee_Advances a')
                 ->join('Employees e',  'e.Employee_ID  = a.Employee_ID',  'left')
                 ->join('Employees ap', 'ap.Employee_ID = a.Approved_By',  'left')
                 ->join('Employees pp', 'pp.Employee_ID = a.Paid_By',      'left');
        if ($status)      $this->db->where('a.Status', $status);
        if ($employee_id) $this->db->where('a.Employee_ID', $employee_id);
        return $this->db->order_by('a.Request_Date DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('a.*, e.Name AS Employee_Name, e.Mobile')
                        ->from('Employee_Advances a')
                        ->join('Employees e', 'e.Employee_ID = a.Employee_ID', 'left')
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
`},
  {r: "public_html/application/models/Attendance_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Attendance_model extends CI_Model {

    public function get_list($date = null, $employee_id = null) {
        $this->db->select('ea.*, e.Name AS Employee_Name, e.Role, s.Shift_Name')
                 ->from('Employee_Attendance ea')
                 ->join('Employees e', 'e.Employee_ID = ea.Employee_ID', 'left')
                 ->join('Shifts s',    's.Shift_ID    = ea.Shift_ID',    'left');
        if ($date)        $this->db->where('ea.Att_Date', $date);
        if ($employee_id) $this->db->where('ea.Employee_ID', $employee_id);
        return $this->db->order_by('ea.Att_Date DESC, e.Name ASC')->get()->result_array();
    }

    public function mark($data) {
        // Upsert: insert or update existing record
        $exists = $this->db->where('Employee_ID', $data['Employee_ID'])
                            ->where('Att_Date', $data['Att_Date'])
                            ->get('employee_attendance')->row_array();
        if ($exists) {
            $this->db->where('Att_ID', $exists['Att_ID'])->update('employee_attendance', $data);
            return $exists['Att_ID'];
        } else {
            $this->db->insert('employee_attendance', $data);
            return $this->db->insert_id();
        }
    }

    public function update($id, $data) {
        $this->db->where('Att_ID', $id)->update('employee_attendance', $data);
        return $this->db->affected_rows();
    }

    public function get_monthly_summary($employee_id, $month) {
        // $month format: YYYY-MM
        return $this->db->select("
            SUM(CASE WHEN Status='Present'  THEN 1 ELSE 0 END) AS Present,
            SUM(CASE WHEN Status='Absent'   THEN 1 ELSE 0 END) AS Absent,
            SUM(CASE WHEN Status='Half Day' THEN 1 ELSE 0 END) AS Half_Day,
            SUM(CASE WHEN Status='Off'      THEN 1 ELSE 0 END) AS Off,
            SUM(CASE WHEN Status='Late'     THEN 1 ELSE 0 END) AS Late,
            SUM(IFNULL(Total_Hours, 0)) AS Total_Hours
        ")
        ->where('Employee_ID', $employee_id)
        ->where("DATE_FORMAT(Att_Date,'%Y-%m')", $month)
        ->get('employee_attendance')->row_array();
    }

    public function get_shifts() {
        return $this->db->where('Is_Active', 1)->get('shifts')->result_array();
    }
}
`},
  {r: "public_html/application/models/Bill_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Bill_model extends CI_Model {

    public function get_all($filters = []) {
        $this->db->select('b.*, e.Name AS Created_By_Name')
                 ->from('Bill_Register b')
                 ->join('Employees e', 'e.Employee_ID = b.Created_By', 'left');
        if (!empty($filters['status']))   $this->db->where('b.Payment_Status', $filters['status']);
        if (!empty($filters['customer'])) $this->db->like('b.Customer_Name', $filters['customer']);
        if (!empty($filters['from']))     $this->db->where('b.Bill_Date >=', $filters['from']);
        if (!empty($filters['to']))       $this->db->where('b.Bill_Date <=', $filters['to']);
        return $this->db->order_by('b.Bill_ID DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        $bill = $this->db->where('Bill_ID', $id)->get('bill_register')->row_array();
        if ($bill) {
            $bill['items'] = $this->db->where('Bill_ID', $id)->get('bill_items')->result_array();
        }
        return $bill;
    }

    public function create($bill_data, $items = []) {
        $this->db->trans_start();
        $this->db->insert('bill_register', $bill_data);
        $bill_id = $this->db->insert_id();
        foreach ($items as $item) {
            $item['Bill_ID'] = $bill_id;
            $this->db->insert('bill_items', $item);
        }
        $this->db->trans_complete();
        return $bill_id;
    }

    public function update($id, $bill_data, $items = []) {
        $this->db->trans_start();
        $bill_data['Updated_Date'] = date('Y-m-d H:i:s');
        $this->db->where('Bill_ID', $id)->update('bill_register', $bill_data);
        if (!empty($items)) {
            $this->db->where('Bill_ID', $id)->delete('bill_items');
            foreach ($items as $item) {
                $item['Bill_ID'] = $id;
                $this->db->insert('bill_items', $item);
            }
        }
        $this->db->trans_complete();
        return $this->db->affected_rows();
    }

    public function delete($id) {
        $this->db->where('Bill_ID', $id)->delete('bill_register');
    }

    public function next_bill_number() {
        $year = date('Y');
        $row  = $this->db->select_max('Bill_ID')->where("Bill_Number LIKE 'B-{$year}-%'")->get('bill_register')->row_array();
        $last = $row['Bill_ID'] ?? 0;
        return 'B-' . $year . '-' . str_pad($last + 1, 4, '0', STR_PAD_LEFT);
    }

    public function record_payment($bill_id, $amount_paid) {
        $bill = $this->db->where('Bill_ID', $bill_id)->get('bill_register')->row_array();
        $new_paid    = ($bill['Amount_Paid'] ?? 0) + $amount_paid;
        $balance     = ($bill['Net_Amount'] ?? 0) - $new_paid;
        $status      = $balance <= 0 ? 'Paid' : ($new_paid > 0 ? 'Partial' : 'Unpaid');
        $this->db->where('Bill_ID', $bill_id)->update('bill_register', [
            'Amount_Paid'    => $new_paid,
            'Balance_Due'    => max(0, $balance),
            'Payment_Status' => $status,
            'Updated_Date'   => date('Y-m-d H:i:s'),
        ]);
    }
}
`},
  {r: "public_html/application/models/Conversion_model.php", c: `<?php
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
        ->from('Conversion_Register c')
        ->join('Item_Master im_in',  'im_in.Item_ID  = c.Input_Item_ID',  'left')
        ->join('Item_Master im_out', 'im_out.Item_ID = c.Output_Item_ID', 'left')
        ->join('Machines m',         'm.Machine_ID   = c.Machine_ID',     'left')
        ->join('Employees e',        'e.Employee_ID  = c.Operator_ID',    'left')
        ->join('Employees cr',       'cr.Employee_ID = c.Created_By',     'left');

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
        ->from('Conversion_Register c')
        ->join('Item_Master im_in',  'im_in.Item_ID  = c.Input_Item_ID',  'left')
        ->join('Item_Master im_out', 'im_out.Item_ID = c.Output_Item_ID', 'left')
        ->join('Machines m',         'm.Machine_ID   = c.Machine_ID',     'left')
        ->join('Employees e',        'e.Employee_ID  = c.Operator_ID',    'left')
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
                "UPDATE Item_Master SET Current_Stock = GREATEST(0, Current_Stock - ?) WHERE Item_ID = ?",
                [floatval($data['Input_Qty'] ?? 0), $data['Input_Item_ID']]
            );
        }
        if (!empty($data['Output_Item_ID'])) {
            $this->db->query(
                "UPDATE Item_Master SET Current_Stock = Current_Stock + ? WHERE Item_ID = ?",
                [floatval($data['Output_Qty'] ?? 0), $data['Output_Item_ID']]
            );
        }
    }

    private function _reverse_stock($data) {
        if (!empty($data['Input_Item_ID'])) {
            $this->db->query(
                "UPDATE Item_Master SET Current_Stock = Current_Stock + ? WHERE Item_ID = ?",
                [floatval($data['Input_Qty'] ?? 0), $data['Input_Item_ID']]
            );
        }
        if (!empty($data['Output_Item_ID'])) {
            $this->db->query(
                "UPDATE Item_Master SET Current_Stock = GREATEST(0, Current_Stock - ?) WHERE Item_ID = ?",
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
`},
  {r: "public_html/application/models/Customer_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Customer_model extends CI_Model {

    public function get_all($active_only = false) {
        if ($active_only) $this->db->where('Is_Active', 1);
        return $this->db->order_by('Customer_Name')->get('customer_master')->result_array();
    }

    public function get_by_id($id) {
        return $this->db->where('Customer_ID', $id)->get('customer_master')->row_array();
    }

    public function get_by_portal_username($username) {
        return $this->db->where('Portal_Username', $username)
                        ->where('Portal_Active', 1)
                        ->get('customer_master')->row_array();
    }

    public function create($data) {
        $this->db->insert('customer_master', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $this->db->where('Customer_ID', $id)->update('customer_master', $data);
        return $this->db->affected_rows();
    }

    public function delete($id) {
        $this->db->where('Customer_ID', $id)->update('customer_master', ['Is_Active' => 0]);
    }

    // Get jobs for a customer
    public function get_jobs($customer_id) {
        return $this->db->where('Customer_ID', $customer_id)
                        ->order_by('Job_ID DESC')
                        ->get('jobs')->result_array();
    }

    // Get bills for a customer
    public function get_bills($customer_id) {
        return $this->db->where('Customer_ID', $customer_id)
                        ->order_by('Bill_Date DESC')
                        ->get('bill_register')->result_array();
    }

    // Get order requests (portal)
    public function get_orders($customer_id) {
        return $this->db->where('Customer_ID', $customer_id)
                        ->order_by('Request_Date DESC')
                        ->get('order_requests')->result_array();
    }
}
`},
  {r: "public_html/application/models/Employee_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Employee_model extends CI_Model {

    public function get_all($role = null) {
        if ($role) $this->db->where('Role', $role);
        return $this->db->order_by('Name')->get('employees')->result_array();
    }

    public function get_operators() {
        return $this->db->where('Role', 'Operator')
                        ->where('Is_Active', 1)
                        ->order_by('Name')
                        ->get('employees')->result_array();
    }

    public function get_by_id($id) {
        return $this->db->where('Employee_ID', $id)->get('employees')->row_array();
    }

    public function get_by_username($username) {
        return $this->db->where('Username', $username)->get('employees')->row_array();
    }

    public function create($data) {
        $this->db->insert('employees', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $this->db->where('Employee_ID', $id)->update('employees', $data);
        return $this->db->affected_rows();
    }

    public function delete($id) {
        $this->db->where('Employee_ID', $id)->update('employees', ['Is_Active' => 0]);
    }

    public function update_last_login($id) {
        $this->db->where('Employee_ID', $id)->update('employees', ['Last_Login' => date('Y-m-d H:i:s')]);
    }

    // Operator detail with attendance & advance stats
    public function get_detail($id) {
        $emp = $this->get_by_id($id);
        if (!$emp) return null;

        // Today's attendance
        $att = $this->db->where('Employee_ID', $id)
                        ->where('Att_Date', date('Y-m-d'))
                        ->get('employee_attendance')->row_array();

        // Total advance balance
        $adv = $this->db->select_sum('Amount_Paid', 'Total_Paid')
                        ->where('Employee_ID', $id)
                        ->where('Status', 'Paid')
                        ->get('employee_advances')->row_array();

        $emp['today_attendance'] = $att;
        $emp['total_advances_paid'] = $adv['Total_Paid'] ?? 0;
        return $emp;
    }
}
`},
  {r: "public_html/application/models/Item_model.php", c: `<?php
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
`},
  {r: "public_html/application/models/Job_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Job_model extends CI_Model {

    public function get_all($filters = []) {
        $this->db->select('j.*, m.Machine_Name, e.Name AS Operator_Name')
                 ->from('Jobs j')
                 ->join('Machines e2',   'e2.Machine_ID = j.Assigned_Machine_ID', 'left')
                 ->join('Machines m',    'm.Machine_ID  = j.Assigned_Machine_ID', 'left')
                 ->join('Employees e',   'e.Employee_ID = j.Assigned_Operator_ID', 'left');

        if (!empty($filters['status']))   $this->db->where('j.Status', $filters['status']);
        if (!empty($filters['customer'])) $this->db->like('j.Customer_Name', $filters['customer']);
        if (!empty($filters['from']))     $this->db->where('j.Order_Date >=', $filters['from']);
        if (!empty($filters['to']))       $this->db->where('j.Order_Date <=', $filters['to']);

        return $this->db->order_by('j.Job_ID DESC')->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('j.*, m.Machine_Name, e.Name AS Operator_Name')
                        ->from('Jobs j')
                        ->join('Machines m',  'm.Machine_ID  = j.Assigned_Machine_ID', 'left')
                        ->join('Employees e', 'e.Employee_ID = j.Assigned_Operator_ID', 'left')
                        ->where('j.Job_ID', $id)
                        ->get()->row_array();
    }

    public function get_pending_for_operator($operator_id) {
        return $this->db->select('j.*, m.Machine_Name')
                        ->from('Jobs j')
                        ->join('Machines m', 'm.Machine_ID = j.Assigned_Machine_ID', 'left')
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
`},
  {r: "public_html/application/models/Machine_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Machine_model extends CI_Model {

    public function get_all() {
        return $this->db->select('
            m.Machine_ID, m.Machine_Name, m.Machine_Type, m.Status, m.Location, m.Notes,
            m.Target_Impressions_Per_Hour, m.Machine_Category,
            IFNULL(e.Name,"—") AS Operator_Name, e.Employee_ID AS Operator_ID,
            IFNULL(j.Job_Number,"") AS Job_Number,
            IFNULL(j.Customer_Name,"") AS Customer_Name,
            IFNULL(j.Required_Qty,0) AS Required_Qty,
            IFNULL(j.Produced_Qty,0) AS Produced_Qty,
            j.Job_ID, j.Start_Time,
            IFNULL(TIMESTAMPDIFF(MINUTE,j.Start_Time,NOW()),0) AS Run_Minutes,
            CASE WHEN IFNULL(j.Required_Qty,0)>0
                 THEN ROUND(IFNULL(j.Produced_Qty,0)*100.0/j.Required_Qty,1)
                 ELSE 0 END AS Job_Progress
        ')
        ->from('Machines m')
        ->join('Employees e', 'e.Employee_ID = m.Current_Operator_ID', 'left')
        ->join('Jobs j',      'j.Job_ID = m.Current_Job_ID', 'left')
        ->order_by('m.Machine_ID')
        ->get()->result_array();
    }

    public function get_by_id($id) {
        return $this->db->select('
            m.*, IFNULL(e.Name,"—") AS Operator_Name,
            IFNULL(j.Job_Number,"") AS Job_Number,
            IFNULL(j.Customer_Name,"") AS Customer_Name,
            IFNULL(j.Label_Type,"") AS Label_Type,
            IFNULL(j.Size,"") AS Size, IFNULL(j.Label,"") AS Label,
            IFNULL(j.UPS,1) AS UPS, IFNULL(j.Gap_Type,"") AS Gap_Type,
            IFNULL(j.Paper,"") AS Paper, IFNULL(j.Core,"") AS Core,
            IFNULL(j.Packing,"") AS Packing,
            IFNULL(j.Required_Qty,0) AS Required_Qty,
            IFNULL(j.Produced_Qty,0) AS Produced_Qty
        ')
        ->from('Machines m')
        ->join('Employees e', 'e.Employee_ID = m.Current_Operator_ID', 'left')
        ->join('Jobs j',      'j.Job_ID = m.Current_Job_ID', 'left')
        ->where('m.Machine_ID', $id)
        ->get()->row_array();
    }

    public function get_summary() {
        $row = $this->db->select('
            COUNT(*) AS Total,
            SUM(CASE WHEN Status="Running"     THEN 1 ELSE 0 END) AS Running,
            SUM(CASE WHEN Status="Idle"        THEN 1 ELSE 0 END) AS Idle,
            SUM(CASE WHEN Status="Stopped"     THEN 1 ELSE 0 END) AS Stopped,
            SUM(CASE WHEN Status="Maintenance" THEN 1 ELSE 0 END) AS Maintenance,
            ROUND(SUM(CASE WHEN Status="Running" THEN 1.0 ELSE 0 END)/COUNT(*)*100,1) AS Utilization
        ')->get('machines')->row_array();
        return $row;
    }

    public function update($id, $data) {
        $this->db->where('Machine_ID', $id)->update('machines', $data);
        return $this->db->affected_rows();
    }
}
`},
  {r: "public_html/application/models/Purchase_model.php", c: `<?php
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
`},
  {r: "public_html/application/models/Report_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Report_model extends CI_Model {

    public function daily($from, $to) {
        return $this->db->query("
            SELECT
                DATE(jpl.Entry_Time) AS Production_Date,
                j.Job_Number, j.Customer_Name, j.Size, j.Label_Type,
                IFNULL(j.UPS,1) AS UPS, IFNULL(j.Gap_Type,'—') AS Gap_Type,
                IFNULL(j.Paper,'—') AS Paper, IFNULL(j.Core,'—') AS Core,
                IFNULL(j.Packing,'—') AS Packing,
                m.Machine_Name, e.Name AS Operator_Name,
                SUM(jpl.Qty_Produced) AS Total_Qty
            FROM Job_Production_Log jpl
            JOIN Jobs      j ON j.Job_ID      = jpl.Job_ID
            JOIN Machines  m ON m.Machine_ID  = jpl.Machine_ID
            JOIN Employees e ON e.Employee_ID = jpl.Operator_ID
            WHERE DATE(jpl.Entry_Time) BETWEEN ? AND ?
            GROUP BY DATE(jpl.Entry_Time), j.Job_Number, j.Customer_Name,
                     j.Size, j.Label_Type, j.UPS, j.Gap_Type, j.Paper, j.Core, j.Packing,
                     m.Machine_Name, e.Name
            ORDER BY Production_Date DESC
        ", [$from, $to])->result_array();
    }

    public function operator($from, $to) {
        return $this->db->query("
            SELECT
                e.Employee_ID, e.Name AS Operator_Name,
                COUNT(DISTINCT jpl.Job_ID) AS Total_Jobs,
                SUM(jpl.Qty_Produced) AS Total_Qty,
                SUM(TIMESTAMPDIFF(MINUTE, ml.Start_Time, IFNULL(ml.End_Time, NOW()))) AS Total_Minutes
            FROM Job_Production_Log jpl
            JOIN Employees e ON e.Employee_ID = jpl.Operator_ID
            LEFT JOIN Machine_Log ml ON ml.Operator_ID = jpl.Operator_ID
                AND ml.Job_ID = jpl.Job_ID AND ml.End_Time IS NOT NULL
            WHERE DATE(jpl.Entry_Time) BETWEEN ? AND ?
            GROUP BY e.Employee_ID, e.Name
            ORDER BY Total_Qty DESC
        ", [$from, $to])->result_array();
    }

    public function machine($from, $to) {
        return $this->db->query("
            SELECT
                m.Machine_ID, m.Machine_Name, m.Machine_Type,
                COUNT(DISTINCT ml.Job_ID) AS Total_Jobs,
                SUM(IFNULL(ml.Total_Run_Minutes,0)) AS Total_Minutes,
                SUM(jpl.Qty_Produced) AS Total_Qty
            FROM Machines m
            LEFT JOIN Machine_Log ml ON ml.Machine_ID = m.Machine_ID
                AND DATE(ml.Start_Time) BETWEEN ? AND ?
            LEFT JOIN Job_Production_Log jpl ON jpl.Machine_ID = m.Machine_ID
                AND DATE(jpl.Entry_Time) BETWEEN ? AND ?
            GROUP BY m.Machine_ID, m.Machine_Name, m.Machine_Type
            ORDER BY Total_Qty DESC
        ", [$from, $to, $from, $to])->result_array();
    }

    public function customer($from, $to) {
        return $this->db->query("
            SELECT
                j.Customer_Name,
                COUNT(DISTINCT j.Job_ID) AS Total_Jobs,
                SUM(j.Required_Qty) AS Total_Required,
                SUM(j.Produced_Qty) AS Total_Produced,
                SUM(CASE WHEN j.Status='Completed' THEN 1 ELSE 0 END) AS Completed
            FROM Jobs j
            WHERE j.Order_Date BETWEEN ? AND ?
            GROUP BY j.Customer_Name
            ORDER BY Total_Jobs DESC
        ", [$from, $to])->result_array();
    }

    public function completion() {
        return $this->db->select('
            j.Job_ID, j.Job_Number, j.Customer_Name, j.Order_Date, j.Delivery_Date,
            j.Required_Qty, j.Produced_Qty, j.Status, j.Priority,
            m.Machine_Name, e.Name AS Operator_Name,
            CASE WHEN j.Required_Qty > 0 THEN ROUND(j.Produced_Qty*100/j.Required_Qty,1) ELSE 0 END AS Progress_Pct
        ')
        ->from('Jobs j')
        ->join('Machines m',  'm.Machine_ID  = j.Assigned_Machine_ID',  'left')
        ->join('Employees e', 'e.Employee_ID = j.Assigned_Operator_ID', 'left')
        ->where_in('j.Status', ['Pending','Assigned','Running'])
        ->order_by('j.Priority ASC, j.Order_Date ASC')
        ->get()->result_array();
    }

    public function overdue() {
        return $this->db->select('
            j.Job_ID, j.Job_Number, j.Customer_Name, j.Order_Date, j.Delivery_Date,
            j.Required_Qty, j.Produced_Qty, j.Status, j.Priority,
            m.Machine_Name, e.Name AS Operator_Name,
            DATEDIFF(CURDATE(), j.Delivery_Date) AS Days_Overdue
        ')
        ->from('Jobs j')
        ->join('Machines m',  'm.Machine_ID  = j.Assigned_Machine_ID',  'left')
        ->join('Employees e', 'e.Employee_ID = j.Assigned_Operator_ID', 'left')
        ->where_in('j.Status', ['Pending','Assigned','Running'])
        ->where('j.Delivery_Date <', date('Y-m-d'))
        ->order_by('j.Delivery_Date ASC')
        ->get()->result_array();
    }

    public function impressions($from, $to, $machine_id = null) {
        $this->db->select('
            hi.Log_Date, hi.Log_Hour, m.Machine_Name,
            e.Name AS Operator_Name, j.Job_Number,
            hi.Impressions_Count, hi.Remarks
        ')
        ->from('Hourly_Impressions hi')
        ->join('Machines m',  'm.Machine_ID  = hi.Machine_ID',  'left')
        ->join('Employees e', 'e.Employee_ID = hi.Operator_ID', 'left')
        ->join('Jobs j',      'j.Job_ID      = hi.Job_ID',      'left')
        ->where('hi.Log_Date >=', $from)
        ->where('hi.Log_Date <=', $to);
        if ($machine_id) $this->db->where('hi.Machine_ID', $machine_id);
        return $this->db->order_by('hi.Log_Date DESC, hi.Log_Hour DESC')->get()->result_array();
    }

    public function today_production() {
        $row = $this->db->select_sum('Qty_Produced', 'Total')
                        ->where('DATE(Entry_Time)', date('Y-m-d'))
                        ->get('job_production_log')->row_array();
        return $row['Total'] ?? 0;
    }
}
`},
  {r: "public_html/application/models/Supplier_model.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Supplier_model extends CI_Model {

    public function get_all($filters = []) {
        if (!empty($filters['search'])) {
            $s = $this->db->escape_like_str($filters['search']);
            $this->db->group_start()
                     ->like('Supplier_Name', $s)
                     ->or_like('Mobile', $s)
                     ->or_like('City', $s)
                     ->or_like('GST_No', $s)
                     ->group_end();
        }
        if (isset($filters['is_active'])) $this->db->where('Is_Active', $filters['is_active']);
        if (!empty($filters['category'])) $this->db->where('Category', $filters['category']);
        return $this->db->order_by('Supplier_Name')->get('supplier_master')->result_array();
    }

    public function get_by_id($id) {
        $s = $this->db->where('Supplier_ID', $id)->get('supplier_master')->row_array();
        if ($s) {
            $s['purchases'] = $this->db->select('Purchase_ID, Purchase_Number, Purchase_Date, Net_Amount, Amount_Paid, Balance_Due, Payment_Status')
                                        ->where('Supplier_ID', $id)
                                        ->order_by('Purchase_Date DESC')
                                        ->limit(30)
                                        ->get('purchase_register')->result_array();
            $s['total_purchased'] = array_sum(array_column($s['purchases'], 'Net_Amount'));
            $s['total_paid']      = array_sum(array_column($s['purchases'], 'Amount_Paid'));
            $s['total_due']       = array_sum(array_column($s['purchases'], 'Balance_Due'));
        }
        return $s;
    }

    public function get_list_for_dropdown() {
        return $this->db->select('Supplier_ID, Supplier_Name, Mobile, GST_No, State_Code')
                        ->where('Is_Active', 1)
                        ->order_by('Supplier_Name')
                        ->get('supplier_master')->result_array();
    }

    public function create($data) {
        $this->db->insert('supplier_master', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $this->db->where('Supplier_ID', $id)->update('supplier_master', $data);
    }

    public function delete($id) {
        $this->db->where('Supplier_ID', $id)->update('supplier_master', ['Is_Active' => 0]);
    }

    public function get_summary() {
        $row = $this->db->select('
            COUNT(*) AS total,
            SUM(Current_Balance) AS total_outstanding
        ')->get('supplier_master')->row_array();
        return $row;
    }
}
`},
  {r: "public_html/application/controllers/Advances.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Advances extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Advance_model');
    }

    // GET /api/advances  ?status=Pending &employee_id=X
    public function index() {
        $this->require_owner();
        $status      = $this->input->get('status');
        $employee_id = $this->input->get('employee_id');
        return $this->json_success($this->Advance_model->get_all($status, $employee_id));
    }

    // POST /api/advances/store  (employee requests advance)
    public function store() {
        $user = $this->require_auth();
        $b = $this->get_json_body();

        if (empty($b['Amount_Requested']) || $b['Amount_Requested'] <= 0) {
            return $this->json_error('Amount_Requested must be > 0', 400);
        }

        $data = [
            'Employee_ID'      => $b['Employee_ID'] ?? $user['id'],
            'Amount_Requested' => (float)$b['Amount_Requested'],
            'Reason'           => $b['Reason'] ?? null,
        ];

        // Operators can only request for themselves
        if ($user['role'] === 'Operator') {
            $data['Employee_ID'] = $user['id'];
        }

        $id = $this->Advance_model->create($data);
        $this->audit("Advance requested: {$data['Amount_Requested']}", $user['id']);
        return $this->json_success(['Advance_ID' => $id], 'Advance request submitted', 201);
    }

    // POST /api/advances/approve/:id
    public function approve($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $amount = (float)($b['Amount_Approved'] ?? 0);
        if ($amount <= 0) return $this->json_error('Amount_Approved must be > 0', 400);
        $this->Advance_model->approve($id, $this->user['id'], $amount);
        $this->audit("Approved advance $id", $this->user['id']);
        return $this->json_success([], 'Advance approved');
    }

    // POST /api/advances/reject/:id
    public function reject($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $reason = $b['Reject_Reason'] ?? '';
        $this->Advance_model->reject($id, $this->user['id'], $reason);
        $this->audit("Rejected advance $id", $this->user['id']);
        return $this->json_success([], 'Advance rejected');
    }

    // POST /api/advances/pay/:id
    public function pay($id) {
        $user = $this->require_auth();
        if (!in_array($user['role'], ['Owner','Admin'])) {
            return $this->json_error('Only Owner/Admin can disburse payments', 403);
        }
        $b           = $this->get_json_body();
        $amount_paid = (float)($b['Amount_Paid']  ?? 0);
        $mode        = $b['Payment_Mode'] ?? 'Cash';
        if ($amount_paid <= 0) return $this->json_error('Amount_Paid must be > 0', 400);
        $this->Advance_model->mark_paid($id, $user['id'], $amount_paid, $mode);
        $this->audit("Paid advance $id: {$amount_paid}", $user['id']);
        return $this->json_success([], 'Payment recorded');
    }
}
`},
  {r: "public_html/application/controllers/Attendance.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Attendance extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Attendance_model');
    }

    // GET /api/attendance  ?date=YYYY-MM-DD &employee_id=X
    public function index() {
        $this->require_owner();
        $date        = $this->input->get('date');
        $employee_id = $this->input->get('employee_id');
        $list   = $this->Attendance_model->get_list($date, $employee_id);
        $shifts = $this->Attendance_model->get_shifts();
        return $this->json_success(['attendance' => $list, 'shifts' => $shifts]);
    }

    // POST /api/attendance/mark
    public function mark() {
        $this->require_owner();
        $b = $this->get_json_body();

        $required = ['Employee_ID', 'Att_Date', 'Status'];
        foreach ($required as $f) {
            if (empty($b[$f])) return $this->json_error("$f is required", 400);
        }

        // Calculate total hours if both in/out given
        $total_hours = null;
        if (!empty($b['In_Time']) && !empty($b['Out_Time'])) {
            $in  = strtotime($b['In_Time']);
            $out = strtotime($b['Out_Time']);
            if ($out > $in) $total_hours = round(($out - $in) / 3600, 2);
        }

        $data = [
            'Employee_ID' => $b['Employee_ID'],
            'Att_Date'    => $b['Att_Date'],
            'Shift_ID'    => $b['Shift_ID']  ?? null,
            'In_Time'     => $b['In_Time']   ?? null,
            'Out_Time'    => $b['Out_Time']  ?? null,
            'Total_Hours' => $total_hours,
            'Status'      => $b['Status'],
            'Marked_By'   => $this->user['id'],
            'Remarks'     => $b['Remarks']   ?? null,
        ];

        $id = $this->Attendance_model->mark($data);
        $this->audit("Marked attendance for emp {$b['Employee_ID']} on {$b['Att_Date']}", $this->user['id']);
        return $this->json_success(['Att_ID' => $id], 'Attendance marked');
    }

    // POST /api/attendance/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Shift_ID','In_Time','Out_Time','Total_Hours','Status','Remarks'];
        $data    = array_intersect_key($b, array_flip($allowed));

        if (!empty($b['In_Time']) && !empty($b['Out_Time'])) {
            $in  = strtotime($b['In_Time']);
            $out = strtotime($b['Out_Time']);
            if ($out > $in) $data['Total_Hours'] = round(($out - $in) / 3600, 2);
        }

        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Attendance_model->update($id, $data);
        return $this->json_success([], 'Attendance updated');
    }
}
`},
  {r: "public_html/application/controllers/Auth.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Auth extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Employee_model');
    }

    // POST /api/auth/login
    public function login() {
        if ($this->input->method() !== 'post') {
            return $this->json_error('Method not allowed', 405);
        }
        $body = $this->get_json_body();
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');

        if (!$username || !$password) {
            return $this->json_error('Username and password are required', 400);
        }

        $emp = $this->Employee_model->get_by_username($username);

        if (!$emp || !$emp['Is_Active']) {
            return $this->json_error('Invalid username or password', 401);
        }

        if (!password_verify($password, $emp['Password_Hash'])) {
            return $this->json_error('Invalid username or password', 401);
        }

        // Store session
        $session_data = [
            'id'       => $emp['Employee_ID'],
            'name'     => $emp['Name'],
            'role'     => $emp['Role'],
            'username' => $emp['Username'],
        ];
        $this->session->set_userdata('user', $session_data);

        $this->Employee_model->update_last_login($emp['Employee_ID']);
        $this->audit('Login', $emp['Employee_ID']);

        return $this->json_success($session_data, 'Login successful');
    }

    // POST /api/auth/logout
    public function logout() {
        $user = $this->session->userdata('user');
        if ($user) $this->audit('Logout', $user['id']);
        $this->session->unset_userdata('user');
        $this->session->sess_destroy();
        return $this->json_success([], 'Logged out successfully');
    }

    // GET /api/auth/me
    public function me() {
        $user = $this->require_auth();
        return $this->json_success($user);
    }

    // POST /api/auth/change-password
    public function change_password() {
        $user = $this->require_auth();
        $body = $this->get_json_body();

        $old = $body['old_password'] ?? '';
        $new = $body['new_password'] ?? '';

        if (!$old || !$new || strlen($new) < 6) {
            return $this->json_error('Old password and new password (min 6 chars) are required', 400);
        }

        $emp = $this->Employee_model->get_by_id($user['id']);
        if (!password_verify($old, $emp['Password_Hash'])) {
            return $this->json_error('Current password is incorrect', 400);
        }

        $this->Employee_model->update($user['id'], [
            'Password_Hash' => password_hash($new, PASSWORD_DEFAULT),
        ]);
        $this->audit('Password changed', $user['id']);

        return $this->json_success([], 'Password changed successfully');
    }

    // Default: redirect info
    public function index() {
        return $this->json_success(['endpoints' => [
            'POST /api/auth/login',
            'POST /api/auth/logout',
            'GET  /api/auth/me',
            'POST /api/auth/change-password',
        ]], 'Barcode MES API');
    }
}
`},
  {r: "public_html/application/controllers/Bills.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Bills extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Bill_model');
    }

    // GET /api/bills
    public function index() {
        $this->require_owner();
        $filters = [
            'status'   => $this->input->get('status'),
            'customer' => $this->input->get('customer'),
            'from'     => $this->input->get('from'),
            'to'       => $this->input->get('to'),
        ];
        return $this->json_success($this->Bill_model->get_all(array_filter($filters)));
    }

    // GET /api/bills/:id
    public function show($id) {
        $this->require_owner();
        $bill = $this->Bill_model->get_by_id($id);
        if (!$bill) return $this->json_error('Bill not found', 404);
        return $this->json_success($bill);
    }

    // POST /api/bills/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        $required = ['Customer_Name', 'Net_Amount'];
        foreach ($required as $f) {
            if (empty($b[$f]) && $b[$f] !== 0) return $this->json_error("$f is required", 400);
        }

        $bill_data = [
            'Bill_Number'    => $b['Bill_Number']   ?? $this->Bill_model->next_bill_number(),
            'Bill_Date'      => $b['Bill_Date']      ?? date('Y-m-d'),
            'Customer_ID'    => $b['Customer_ID']   ?? null,
            'Customer_Name'  => $b['Customer_Name'],
            'Mobile'         => $b['Mobile']         ?? null,
            'Gross_Amount'   => $b['Gross_Amount']   ?? 0,
            'Discount_Amt'   => $b['Discount_Amt']   ?? 0,
            'Tax_Amount'     => $b['Tax_Amount']     ?? 0,
            'Net_Amount'     => (float)$b['Net_Amount'],
            'Amount_Paid'    => (float)($b['Amount_Paid'] ?? 0),
            'Balance_Due'    => (float)$b['Net_Amount'] - (float)($b['Amount_Paid'] ?? 0),
            'Payment_Status' => $b['Payment_Status'] ?? 'Unpaid',
            'Job_ID'         => $b['Job_ID']         ?? null,
            'External_Ref'   => $b['External_Ref']   ?? null,
            'Items_JSON'     => isset($b['items'])    ? json_encode($b['items']) : null,
            'Notes'          => $b['Notes']           ?? null,
            'Created_By'     => $this->user['id'],
        ];

        $items = $b['items'] ?? [];
        $id = $this->Bill_model->create($bill_data, $items);
        $this->audit("Created bill {$bill_data['Bill_Number']}", $this->user['id']);
        return $this->json_success(['Bill_ID' => $id, 'Bill_Number' => $bill_data['Bill_Number']], 'Bill created', 201);
    }

    // POST /api/bills/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Bill_Date','Customer_Name','Customer_ID','Mobile','Gross_Amount','Discount_Amt',
                    'Tax_Amount','Net_Amount','Amount_Paid','Balance_Due','Payment_Status',
                    'External_Ref','Notes'];
        $data  = array_intersect_key($b, array_flip($allowed));
        $items = $b['items'] ?? [];
        $this->Bill_model->update($id, $data, $items);
        $this->audit("Updated bill $id", $this->user['id']);
        return $this->json_success([], 'Bill updated');
    }

    // POST /api/bills/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Bill_model->delete($id);
        $this->audit("Deleted bill $id", $this->user['id']);
        return $this->json_success([], 'Bill deleted');
    }

    // GET /api/bills/next-number
    public function next_number() {
        $this->require_owner();
        return $this->json_success(['bill_number' => $this->Bill_model->next_bill_number()]);
    }
}
`},
  {r: "public_html/application/controllers/Conversion.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Conversion extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Conversion_model');
        $this->load->model('Item_model');
    }

    // GET /api/conversion
    public function index() {
        $this->require_owner();
        $filters = array_filter([
            'status'  => $this->input->get('status'),
            'from'    => $this->input->get('from'),
            'to'      => $this->input->get('to'),
            'item_id' => $this->input->get('item_id'),
        ]);
        return $this->json_success($this->Conversion_model->get_all($filters));
    }

    // GET /api/conversion/:id
    public function show($id) {
        $this->require_owner();
        $c = $this->Conversion_model->get_by_id($id);
        if (!$c) return $this->json_error('Conversion not found', 404);
        return $this->json_success($c);
    }

    // GET /api/conversion/next-number
    public function next_number() {
        $this->require_owner();
        return $this->json_success(['conversion_number' => $this->Conversion_model->next_number()]);
    }

    // POST /api/conversion/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        if (empty($b['Input_Item_ID']))    return $this->json_error('Input Item is required', 400);
        if (empty($b['Conversion_Date'])) return $this->json_error('Conversion Date is required', 400);

        $input_qty  = floatval($b['Input_Qty']  ?? 0);
        $output_qty = floatval($b['Output_Qty'] ?? 0);
        $wastage    = $input_qty - $output_qty;
        $wastage_pct= $input_qty > 0 ? round(($wastage / $input_qty) * 100, 2) : 0;

        $data = [
            'Conversion_Number' => $b['Conversion_Number'] ?? $this->Conversion_model->next_number(),
            'Conversion_Date'   => $b['Conversion_Date'],
            'Input_Item_ID'     => $b['Input_Item_ID'],
            'Input_Item_Name'   => $b['Input_Item_Name']  ?? null,
            'Input_Qty'         => $input_qty,
            'Input_Unit'        => $b['Input_Unit']       ?? 'Roll',
            'Output_Item_ID'    => $b['Output_Item_ID']   ?? null,
            'Output_Item_Name'  => $b['Output_Item_Name'] ?? null,
            'Output_Qty'        => $output_qty,
            'Output_Unit'       => $b['Output_Unit']      ?? 'Roll',
            'Wastage_Qty'       => max(0, $wastage),
            'Wastage_Pct'       => max(0, $wastage_pct),
            'Machine_ID'        => $b['Machine_ID']       ?? null,
            'Operator_ID'       => $b['Operator_ID']      ?? null,
            'Job_ID'            => $b['Job_ID']           ?? null,
            'Notes'             => $b['Notes']            ?? null,
            'Status'            => $b['Status']           ?? 'Draft',
            'Created_By'        => $this->user['id'],
        ];

        $id = $this->Conversion_model->create($data);
        $this->audit("Created conversion {$data['Conversion_Number']}", $this->user['id']);
        return $this->json_success([
            'Conversion_ID'     => $id,
            'Conversion_Number' => $data['Conversion_Number'],
            'Wastage_Qty'       => $data['Wastage_Qty'],
            'Wastage_Pct'       => $data['Wastage_Pct'],
        ], 'Conversion created', 201);
    }

    // POST /api/conversion/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();

        $allowed = ['Conversion_Date','Input_Item_ID','Input_Item_Name','Input_Qty','Input_Unit',
                    'Output_Item_ID','Output_Item_Name','Output_Qty','Output_Unit',
                    'Machine_ID','Operator_ID','Job_ID','Notes','Status'];
        $data = array_intersect_key($b, array_flip($allowed));

        // Recalculate wastage if qty changed
        if (isset($data['Input_Qty']) || isset($data['Output_Qty'])) {
            $existing = $this->Conversion_model->get_by_id($id);
            $in  = floatval($data['Input_Qty']  ?? $existing['Input_Qty']  ?? 0);
            $out = floatval($data['Output_Qty'] ?? $existing['Output_Qty'] ?? 0);
            $data['Wastage_Qty'] = max(0, $in - $out);
            $data['Wastage_Pct'] = $in > 0 ? round(($data['Wastage_Qty'] / $in) * 100, 2) : 0;
        }

        $this->Conversion_model->update($id, $data);
        $this->audit("Updated conversion $id", $this->user['id']);
        return $this->json_success(['Wastage_Qty' => $data['Wastage_Qty'] ?? null], 'Conversion updated');
    }

    // POST /api/conversion/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Conversion_model->delete($id);
        $this->audit("Deleted conversion $id", $this->user['id']);
        return $this->json_success([], 'Conversion deleted');
    }
}
`},
  {r: "public_html/application/controllers/Customers.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Customers extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Customer_model');
    }

    // GET /api/customers
    public function index() {
        $this->require_owner();
        $customers = $this->Customer_model->get_all();
        foreach ($customers as &$c) unset($c['Portal_Password']);
        return $this->json_success($customers);
    }

    // GET /api/customers/:id
    public function show($id) {
        $this->require_owner();
        $c = $this->Customer_model->get_by_id($id);
        if (!$c) return $this->json_error('Customer not found', 404);
        unset($c['Portal_Password']);
        $c['jobs']  = $this->Customer_model->get_jobs($id);
        $c['bills'] = $this->Customer_model->get_bills($id);
        return $this->json_success($c);
    }

    // POST /api/customers/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Customer_Name'])) return $this->json_error('Customer_Name is required', 400);
        if (empty($b['Mobile']))        return $this->json_error('Mobile is required', 400);

        $data = [
            'Customer_Name'  => $b['Customer_Name'],
            'Mobile'         => $b['Mobile'],
            'Alt_Mobile'     => $b['Alt_Mobile']     ?? null,
            'Address'        => $b['Address']         ?? null,
            'City'           => $b['City']            ?? null,
            'State'          => $b['State']           ?? null,
            'State_Code'     => $b['State_Code']      ?? null,
            'GST_No'         => $b['GST_No']          ?? null,
            'PAN_No'         => $b['PAN_No']          ?? null,
            'Category'       => $b['Category']        ?? 'Regular',
            'Credit_Limit'   => $b['Credit_Limit']   ?? 0,
            'Opening_Balance'=> $b['Opening_Balance'] ?? 0,
            'Notes'          => $b['Notes']           ?? null,
            'Email'          => $b['Email']           ?? null,
            'Photo_Path'     => $b['Photo_Path']      ?? null,
        ];

        // Portal credentials
        if (!empty($b['Portal_Username'])) {
            $data['Portal_Username'] = $b['Portal_Username'];
            $data['Portal_Password'] = !empty($b['Portal_Password'])
                ? password_hash($b['Portal_Password'], PASSWORD_DEFAULT)
                : null;
            $data['Portal_Active'] = 1;
        }

        $id = $this->Customer_model->create($data);
        $this->audit("Created customer {$b['Customer_Name']}", $this->user['id']);
        return $this->json_success(['Customer_ID' => $id], 'Customer created', 201);
    }

    // POST /api/customers/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Customer_Name','Mobile','Alt_Mobile','Address','City','State','State_Code',
                    'GST_No','PAN_No','Category','Credit_Limit','Opening_Balance',
                    'Notes','Is_Active','Email','Portal_Username','Portal_Active','Photo_Path'];
        $data = array_intersect_key($b, array_flip($allowed));

        if (!empty($b['Portal_Password'])) {
            $data['Portal_Password'] = password_hash($b['Portal_Password'], PASSWORD_DEFAULT);
        }
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Customer_model->update($id, $data);
        $this->audit("Updated customer $id", $this->user['id']);
        return $this->json_success([], 'Customer updated');
    }

    // POST /api/customers/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Customer_model->delete($id);
        $this->audit("Deactivated customer $id", $this->user['id']);
        return $this->json_success([], 'Customer deactivated');
    }
}
`},
  {r: "public_html/application/controllers/Dashboard.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Dashboard extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model(['Machine_model', 'Job_model', 'Report_model', 'Advance_model']);
    }

    // GET /api/dashboard
    public function index() {
        $this->require_owner();

        $machines        = $this->Machine_model->get_all();
        $summary         = $this->Machine_model->get_summary();
        $today_prod      = $this->Report_model->today_production();
        $pending_jobs    = $this->Job_model->get_pending_count();
        $pending_advances= $this->Advance_model->get_all('Pending');

        // Operators online (machines with operator assigned)
        $op_count = $this->db->where('Current_Operator_ID IS NOT NULL', null, false)
                              ->count_all_results('machines');

        // Pending job requests
        $job_requests = [];
        try {
            $job_requests = $this->db->select('r.Request_ID, e.Name AS Employee_Name, e.Mobile,
                m.Machine_Name, r.Description, r.Request_Date')
                ->from('Job_Requests r')
                ->join('Employees e', 'e.Employee_ID = r.Employee_ID', 'left')
                ->join('Machines m',  'm.Machine_ID  = r.Machine_ID',  'left')
                ->where('r.Status', 'Pending')
                ->order_by('r.Request_Date ASC')
                ->get()->result_array();
        } catch (Exception $e) { /* table may not exist */ }

        return $this->json_success([
            'machines'          => $machines,
            'summary'           => $summary,
            'today_production'  => $today_prod,
            'pending_jobs'      => $pending_jobs,
            'operators_online'  => $op_count,
            'pending_advances'  => $pending_advances,
            'job_requests'      => $job_requests,
        ]);
    }

    // GET /api/dashboard/machines  — lightweight live status for polling
    public function machines() {
        $this->require_auth();
        $machines = $this->Machine_model->get_all();
        return $this->json_success($machines);
    }
}
`},
  {r: "public_html/application/controllers/Employees.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Employees extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Employee_model');
    }

    // GET /api/employees
    public function index() {
        $this->require_owner();
        $role = $this->input->get('role');
        $employees = $this->Employee_model->get_all($role);
        // Strip password hashes from response
        foreach ($employees as &$e) unset($e['Password_Hash']);
        return $this->json_success($employees);
    }

    // GET /api/employees/operators
    public function operators() {
        $this->require_auth();
        $ops = $this->Employee_model->get_operators();
        foreach ($ops as &$e) unset($e['Password_Hash']);
        return $this->json_success($ops);
    }

    // GET /api/employees/:id
    public function show($id) {
        $this->require_owner();
        $emp = $this->Employee_model->get_detail($id);
        if (!$emp) return $this->json_error('Employee not found', 404);
        unset($emp['Password_Hash']);
        return $this->json_success($emp);
    }

    // POST /api/employees/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        $required = ['Name', 'Role', 'Username', 'Password'];
        foreach ($required as $f) {
            if (empty($b[$f])) return $this->json_error("$f is required", 400);
        }

        if (!in_array($b['Role'], ['Owner','Admin','Operator'])) {
            return $this->json_error('Role must be Owner, Admin, or Operator', 400);
        }

        $existing = $this->Employee_model->get_by_username($b['Username']);
        if ($existing) return $this->json_error('Username already taken', 409);

        $data = [
            'Name'          => $b['Name'],
            'Role'          => $b['Role'],
            'Mobile'        => $b['Mobile'] ?? null,
            'Username'      => $b['Username'],
            'Password_Hash' => password_hash($b['Password'], PASSWORD_DEFAULT),
            'Father_Name'   => $b['Father_Name']   ?? null,
            'Address'       => $b['Address']        ?? null,
            'Aadhar_No'     => $b['Aadhar_No']      ?? null,
            'Join_Date'     => $b['Join_Date']       ?? null,
            'Monthly_Salary'=> $b['Monthly_Salary'] ?? 0,
            'Bank_Name'     => $b['Bank_Name']       ?? null,
            'Bank_Account'  => $b['Bank_Account']    ?? null,
            'Bank_IFSC'     => $b['Bank_IFSC']       ?? null,
            'Advance_Limit_Monthly' => $b['Advance_Limit_Monthly'] ?? 5000,
            'Emergency_Contact'     => $b['Emergency_Contact']     ?? null,
            'Photo_Path'            => $b['Photo_Path']            ?? null,
        ];

        $id = $this->Employee_model->create($data);
        $this->audit("Created employee {$b['Name']}", $this->user['id']);
        return $this->json_success(['Employee_ID' => $id], 'Employee created', 201);
    }

    // POST /api/employees/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Name','Role','Mobile','Father_Name','Address','Aadhar_No','Join_Date',
                    'Monthly_Salary','Bank_Name','Bank_Account','Bank_IFSC',
                    'Advance_Limit_Monthly','Emergency_Contact','Is_Active','Photo_Path'];
        $data = array_intersect_key($b, array_flip($allowed));

        if (!empty($b['Password'])) {
            $data['Password_Hash'] = password_hash($b['Password'], PASSWORD_DEFAULT);
        }
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Employee_model->update($id, $data);
        $this->audit("Updated employee $id", $this->user['id']);
        return $this->json_success([], 'Employee updated');
    }

    // POST /api/employees/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Employee_model->delete($id);
        $this->audit("Deactivated employee $id", $this->user['id']);
        return $this->json_success([], 'Employee deactivated');
    }
}
`},
  {r: "public_html/application/controllers/Items.php", c: `<?php
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
            'HSN_Code'        => $b['HSN_Code']          ?? null,
            'GST_Rate'        => $b['GST_Rate']          ?? 18.00,
            'Unit'            => $b['Unit']              ?? 'Roll',
            'Purchase_Rate'   => $b['Purchase_Rate']     ?? 0,
            'Sale_Rate'       => $b['Sale_Rate']         ?? 0,
            'Min_Stock'       => $b['Min_Stock']         ?? 0,
            'Barcode_Value'   => $b['Barcode_Value']     ?? null,
            'Photo_Path'      => $b['Photo_Path']        ?? null,
            'Notes'           => $b['Notes']             ?? null,
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
                    'Brand_ID','Manufacturer','Paper_Type','Core_Type','Item_Type',
                    'Size_Width','Size_Length','Labels_Per_Roll','HSN_Code','GST_Rate','Unit',
                    'Purchase_Rate','Sale_Rate','Min_Stock','Current_Stock',
                    'Barcode_Value','Photo_Path','Notes','Is_Active'];
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
`},
  {r: "public_html/application/controllers/Jobs.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Jobs extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Job_model');
    }

    // GET /api/jobs
    public function index() {
        $this->require_auth();
        $filters = [
            'status'   => $this->input->get('status'),
            'customer' => $this->input->get('customer'),
            'from'     => $this->input->get('from'),
            'to'       => $this->input->get('to'),
        ];
        $jobs = $this->Job_model->get_all(array_filter($filters));
        return $this->json_success($jobs);
    }

    // GET /api/jobs/:id
    public function show($id) {
        $this->require_auth();
        $job = $this->Job_model->get_by_id($id);
        if (!$job) return $this->json_error('Job not found', 404);
        // Also load production log
        $log = $this->db->select('jpl.*, e.Name AS Operator_Name, m.Machine_Name')
                        ->from('Job_Production_Log jpl')
                        ->join('Employees e', 'e.Employee_ID = jpl.Operator_ID', 'left')
                        ->join('Machines m',  'm.Machine_ID  = jpl.Machine_ID',  'left')
                        ->where('jpl.Job_ID', $id)
                        ->order_by('jpl.Entry_Time DESC')
                        ->get()->result_array();
        $job['production_log'] = $log;
        return $this->json_success($job);
    }

    // POST /api/jobs/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        $required = ['Customer_Name', 'Required_Qty', 'Label_Type'];
        foreach ($required as $f) {
            if (empty($b[$f])) return $this->json_error("$f is required", 400);
        }

        $data = [
            'Job_Number'   => $b['Job_Number'] ?? $this->Job_model->next_job_number(),
            'Order_Date'   => $b['Order_Date']  ?? date('Y-m-d'),
            'Customer_Name'=> $b['Customer_Name'],
            'Customer_ID'  => $b['Customer_ID'] ?? null,
            'Mobile_No'    => $b['Mobile_No']   ?? null,
            'Delivery_Date'=> $b['Delivery_Date'] ?? null,
            'Size'         => $b['Size']         ?? null,
            'Label'        => $b['Label']        ?? null,
            'UPS'          => $b['UPS']          ?? 1,
            'Gap_Type'     => $b['Gap_Type']     ?? 'With Gap',
            'Paper'        => $b['Paper']        ?? null,
            'Core'         => $b['Core']         ?? null,
            'Packing'      => $b['Packing']      ?? null,
            'Label_Type'   => $b['Label_Type'],
            'Required_Qty' => (int)$b['Required_Qty'],
            'Priority'     => $b['Priority']     ?? 5,
            'Notes'        => $b['Notes']        ?? null,
            'Status'       => 'Pending',
        ];

        if (!empty($b['Assigned_Machine_ID']) && !empty($b['Assigned_Operator_ID'])) {
            $data['Status']               = 'Assigned';
            $data['Assigned_Machine_ID']  = $b['Assigned_Machine_ID'];
            $data['Assigned_Operator_ID'] = $b['Assigned_Operator_ID'];
        }

        $id = $this->Job_model->create($data);
        $this->audit('Created job ' . $data['Job_Number'], $this->user['id']);
        return $this->json_success(['Job_ID' => $id, 'Job_Number' => $data['Job_Number']], 'Job created', 201);
    }

    // POST /api/jobs/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Customer_Name','Customer_ID','Mobile_No','Delivery_Date','Size','Label','UPS',
                    'Gap_Type','Paper','Core','Packing','Label_Type','Required_Qty','Priority',
                    'Notes','Status','Assigned_Machine_ID','Assigned_Operator_ID',
                    'Telegram_Notify','Customer_Chat_ID'];
        $data = array_intersect_key($b, array_flip($allowed));
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Job_model->update($id, $data);
        $this->audit("Updated job $id", $this->user['id']);
        return $this->json_success([], 'Job updated');
    }

    // POST /api/jobs/delete/:id
    public function delete($id) {
        $this->require_owner();
        $job = $this->Job_model->get_by_id($id);
        if (!$job) return $this->json_error('Job not found', 404);
        if ($job['Status'] === 'Running') return $this->json_error('Cannot delete a running job', 400);
        $this->Job_model->delete($id);
        $this->audit("Deleted job $id ({$job['Job_Number']})", $this->user['id']);
        return $this->json_success([], 'Job deleted');
    }

    // POST /api/jobs/start
    public function start() {
        $this->require_auth();
        $b = $this->get_json_body();
        $job_id      = (int)($b['job_id']      ?? 0);
        $machine_id  = (int)($b['machine_id']  ?? 0);
        $operator_id = (int)($b['operator_id'] ?? $this->user['id']);

        if (!$job_id || !$machine_id) return $this->json_error('job_id and machine_id are required', 400);

        $this->Job_model->start_job($job_id, $machine_id, $operator_id);
        $this->audit("Started job $job_id on machine $machine_id", $this->user['id']);
        return $this->json_success([], 'Job started');
    }

    // POST /api/jobs/stop
    public function stop() {
        $this->require_auth();
        $b = $this->get_json_body();
        $job_id      = (int)($b['job_id']       ?? 0);
        $machine_id  = (int)($b['machine_id']   ?? 0);
        $produced    = (int)($b['produced_qty'] ?? 0);
        $status      = $b['status'] ?? 'Completed';

        if (!$job_id || !$machine_id) return $this->json_error('job_id and machine_id are required', 400);

        $this->Job_model->stop_job($job_id, $machine_id, $produced, $status);
        $this->audit("Stopped job $job_id, qty=$produced", $this->user['id']);
        return $this->json_success([], 'Job stopped');
    }

    // POST /api/jobs/log
    public function log_production() {
        $this->require_auth();
        $b = $this->get_json_body();
        $job_id     = (int)($b['job_id']     ?? 0);
        $machine_id = (int)($b['machine_id'] ?? 0);
        $qty        = (int)($b['qty']        ?? 0);
        $remarks    = $b['remarks'] ?? '';

        if (!$job_id || !$machine_id || $qty <= 0) {
            return $this->json_error('job_id, machine_id and qty > 0 are required', 400);
        }

        $this->Job_model->log_production($job_id, $this->user['id'], $machine_id, $qty, $remarks);
        return $this->json_success([], "Logged $qty units");
    }

    // GET /api/jobs/next-number
    public function next_number() {
        $this->require_owner();
        return $this->json_success(['job_number' => $this->Job_model->next_job_number()]);
    }
}
`},
  {r: "public_html/application/controllers/Machines.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Machines extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Machine_model');
    }

    // GET /api/machines
    public function index() {
        $this->require_auth();
        return $this->json_success($this->Machine_model->get_all());
    }

    // GET /api/machines/:id
    public function show($id) {
        $this->require_auth();
        $m = $this->Machine_model->get_by_id($id);
        if (!$m) return $this->json_error('Machine not found', 404);

        // Recent machine log
        $log = $this->db->select('ml.*, e.Name AS Operator_Name, j.Job_Number')
                        ->from('Machine_Log ml')
                        ->join('Employees e', 'e.Employee_ID = ml.Operator_ID', 'left')
                        ->join('Jobs j',      'j.Job_ID      = ml.Job_ID',      'left')
                        ->where('ml.Machine_ID', $id)
                        ->order_by('ml.Start_Time DESC')
                        ->limit(20)->get()->result_array();
        $m['machine_log'] = $log;
        return $this->json_success($m);
    }

    // POST /api/machines/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Machine_Name','Machine_Type','Status','Location','Notes',
                    'Target_Impressions_Per_Hour','Machine_Category','Photo_Path'];
        $data = array_intersect_key($b, array_flip($allowed));
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Machine_model->update($id, $data);
        $this->audit("Updated machine $id", $this->user['id']);
        return $this->json_success([], 'Machine updated');
    }

    // POST /api/machines/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();
        $name = trim($b['Machine_Name'] ?? '');
        $type = trim($b['Machine_Type'] ?? 'Auto');
        if (!$name) return $this->json_error('Machine name is required', 400);

        $data = [
            'Machine_Name'                => $name,
            'Machine_Type'                => $type,
            'Location'                    => $b['Location']  ?? '',
            'Notes'                       => $b['Notes']     ?? '',
            'Machine_Category'            => $b['Machine_Category'] ?? 'Flat Belt',
            'Target_Impressions_Per_Hour' => intval($b['Target_Impressions_Per_Hour'] ?? 0),
            'Status'                      => $b['Status'] ?? 'Idle',
            'Photo_Path'                  => $b['Photo_Path'] ?? '',
        ];
        $this->db->insert('machines', $data);
        $id = $this->db->insert_id();
        $this->audit("Added machine $id ($name)", $this->user['id']);
        return $this->json_success(['Machine_ID' => $id], 'Machine added');
    }

    // POST /api/machines/delete/:id
    public function delete($id) {
        $this->require_owner();
        $m = $this->Machine_model->get_by_id($id);
        if (!$m) return $this->json_error('Machine not found', 404);
        if ($m['Status'] === 'Running') return $this->json_error('Cannot delete a running machine', 400);
        $this->db->where('Machine_ID', $id)->update('machines', ['Status' => 'Maintenance', 'Notes' => 'Decommissioned']);
        $this->audit("Decommissioned machine $id", $this->user['id']);
        return $this->json_success([], 'Machine decommissioned');
    }

    // GET /api/machines/status  — live status for dashboard polling
    public function live_status() {
        $this->require_auth();
        $summary  = $this->Machine_model->get_summary();
        $machines = $this->Machine_model->get_all();
        return $this->json_success([
            'summary'  => $summary,
            'machines' => $machines,
            'ts'       => time(),
        ]);
    }
}
`},
  {r: "public_html/application/controllers/Operator.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Operator extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model(['Job_model', 'Machine_model']);
    }

    // GET /api/operator/dashboard
    public function dashboard() {
        $user = $this->require_auth();

        // Operator sees their own jobs; Owner/Admin see all
        if ($user['role'] === 'Operator') {
            $jobs = $this->Job_model->get_pending_for_operator($user['id']);
        } else {
            $jobs = $this->Job_model->get_all(['status' => null]);
        }

        // Machine assigned to this operator
        $machine = null;
        if ($user['role'] === 'Operator') {
            $machine = $this->db->where('Current_Operator_ID', $user['id'])->get('machines')->row_array();
        }

        // Pending job requests this operator submitted
        $my_requests = [];
        try {
            $my_requests = $this->db->where('Employee_ID', $user['id'])
                                     ->order_by('Request_Date DESC')
                                     ->get('job_requests')->result_array();
        } catch (Exception $e) {}

        return $this->json_success([
            'jobs'        => $jobs,
            'machine'     => $machine,
            'my_requests' => $my_requests,
        ]);
    }

    // POST /api/operator/request
    public function request_job() {
        $user = $this->require_auth();
        $b = $this->get_json_body();

        $data = [
            'Employee_ID'  => $user['id'],
            'Machine_ID'   => $b['Machine_ID']   ?? null,
            'Request_Type' => $b['Request_Type'] ?? 'Job',
            'Description'  => $b['Description']  ?? '',
            'Status'       => 'Pending',
        ];
        $this->db->insert('job_requests', $data);
        $id = $this->db->insert_id();
        return $this->json_success(['Request_ID' => $id], 'Request submitted', 201);
    }

    // POST /api/operator/impressions/log
    public function log_impressions() {
        $user = $this->require_auth();
        $b = $this->get_json_body();

        $required = ['Machine_ID', 'Log_Date', 'Log_Hour', 'Impressions_Count'];
        foreach ($required as $f) {
            if (!isset($b[$f])) return $this->json_error("$f is required", 400);
        }

        $this->db->insert('hourly_impressions', [
            'Machine_ID'        => $b['Machine_ID'],
            'Operator_ID'       => $user['id'],
            'Job_ID'            => $b['Job_ID']  ?? null,
            'Log_Date'          => $b['Log_Date'],
            'Log_Hour'          => $b['Log_Hour'],
            'Impressions_Count' => (int)$b['Impressions_Count'],
            'Remarks'           => $b['Remarks'] ?? null,
        ]);
        return $this->json_success([], 'Impressions logged');
    }
}
`},
  {r: "public_html/application/controllers/Purchase.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Purchase extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Purchase_model');
    }

    // GET /api/purchase
    public function index() {
        $this->require_owner();
        $filters = array_filter([
            'supplier'       => $this->input->get('supplier'),
            'payment_status' => $this->input->get('payment_status'),
            'from'           => $this->input->get('from'),
            'to'             => $this->input->get('to'),
        ]);
        return $this->json_success($this->Purchase_model->get_all($filters));
    }

    // GET /api/purchase/:id
    public function show($id) {
        $this->require_owner();
        $p = $this->Purchase_model->get_by_id($id);
        if (!$p) return $this->json_error('Purchase not found', 404);
        return $this->json_success($p);
    }

    // GET /api/purchase/next-number
    public function next_number() {
        $this->require_owner();
        return $this->json_success(['purchase_number' => $this->Purchase_model->next_purchase_number()]);
    }

    // GET /api/purchase/summary
    public function summary() {
        $this->require_owner();
        return $this->json_success($this->Purchase_model->get_summary());
    }

    // POST /api/purchase/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();

        if (empty($b['Supplier_Name'])) return $this->json_error('Supplier Name is required', 400);
        if (empty($b['Purchase_Date'])) return $this->json_error('Purchase Date is required', 400);

        $data = [
            'Purchase_Number' => $b['Purchase_Number'] ?? $this->Purchase_model->next_purchase_number(),
            'Purchase_Date'   => $b['Purchase_Date'],
            'Supplier_Name'   => $b['Supplier_Name'],
            'Supplier_GST'    => $b['Supplier_GST']    ?? null,
            'Invoice_No'      => $b['Invoice_No']      ?? null,
            'Invoice_Date'    => $b['Invoice_Date']    ?? null,
            'Gross_Amount'    => $b['Gross_Amount']    ?? 0,
            'Discount_Amt'    => $b['Discount_Amt']    ?? 0,
            'Tax_Amount'      => $b['Tax_Amount']      ?? 0,
            'Net_Amount'      => $b['Net_Amount']      ?? 0,
            'Amount_Paid'     => $b['Amount_Paid']     ?? 0,
            'Balance_Due'     => floatval($b['Net_Amount'] ?? 0) - floatval($b['Amount_Paid'] ?? 0),
            'Payment_Status'  => $b['Payment_Status']  ?? 'Unpaid',
            'Payment_Mode'    => $b['Payment_Mode']    ?? null,
            'Notes'           => $b['Notes']           ?? null,
            'Created_By'      => $this->user['id'],
        ];

        $items = $b['items'] ?? [];
        $id    = $this->Purchase_model->create($data, $items);
        $this->audit("Created purchase {$data['Purchase_Number']}", $this->user['id']);
        return $this->json_success(['Purchase_ID' => $id, 'Purchase_Number' => $data['Purchase_Number']], 'Purchase created', 201);
    }

    // POST /api/purchase/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();

        $allowed = ['Purchase_Date','Supplier_Name','Supplier_GST','Invoice_No','Invoice_Date',
                    'Gross_Amount','Discount_Amt','Tax_Amount','Net_Amount','Amount_Paid',
                    'Balance_Due','Payment_Status','Payment_Mode','Notes'];
        $data  = array_intersect_key($b, array_flip($allowed));
        $items = $b['items'] ?? [];

        if (!empty($data['Net_Amount']) || isset($data['Amount_Paid'])) {
            $existing = $this->Purchase_model->get_by_id($id);
            $net  = floatval($data['Net_Amount']  ?? $existing['Net_Amount']  ?? 0);
            $paid = floatval($data['Amount_Paid'] ?? $existing['Amount_Paid'] ?? 0);
            $data['Balance_Due']    = max(0, $net - $paid);
            $data['Payment_Status'] = $paid >= $net ? 'Paid' : ($paid > 0 ? 'Partial' : 'Unpaid');
        }

        $this->Purchase_model->update($id, $data, $items);
        $this->audit("Updated purchase $id", $this->user['id']);
        return $this->json_success([], 'Purchase updated');
    }

    // POST /api/purchase/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Purchase_model->delete($id);
        $this->audit("Deleted purchase $id", $this->user['id']);
        return $this->json_success([], 'Purchase deleted');
    }
}
`},
  {r: "public_html/application/controllers/Reports.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Reports extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Report_model');
    }

    private function _date_range() {
        $from = $this->input->get('from') ?: date('Y-m-01');
        $to   = $this->input->get('to')   ?: date('Y-m-d');
        return [$from, $to];
    }

    // GET /api/reports/daily
    public function daily() {
        $this->require_owner();
        [$from, $to] = $this->_date_range();
        return $this->json_success($this->Report_model->daily($from, $to));
    }

    // GET /api/reports/operator
    public function operator() {
        $this->require_owner();
        [$from, $to] = $this->_date_range();
        return $this->json_success($this->Report_model->operator($from, $to));
    }

    // GET /api/reports/machine
    public function machine() {
        $this->require_owner();
        [$from, $to] = $this->_date_range();
        return $this->json_success($this->Report_model->machine($from, $to));
    }

    // GET /api/reports/customer
    public function customer() {
        $this->require_owner();
        [$from, $to] = $this->_date_range();
        return $this->json_success($this->Report_model->customer($from, $to));
    }

    // GET /api/reports/completion
    public function completion() {
        $this->require_owner();
        return $this->json_success($this->Report_model->completion());
    }

    // GET /api/reports/overdue
    public function overdue() {
        $this->require_owner();
        return $this->json_success($this->Report_model->overdue());
    }

    // GET /api/reports/impressions
    public function impressions() {
        $this->require_owner();
        [$from, $to] = $this->_date_range();
        $machine_id = $this->input->get('machine_id');
        return $this->json_success($this->Report_model->impressions($from, $to, $machine_id));
    }
}
`},
  {r: "public_html/application/controllers/Settings.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Settings extends MY_Controller {

    // GET /api/settings
    public function index() {
        $this->require_owner();
        $rows = $this->db->get('settings')->result_array();
        // Group by setting_group
        $grouped = [];
        foreach ($rows as $r) {
            $grouped[$r['setting_group']][$r['setting_key']] = [
                'value' => $r['setting_value'],
                'label' => $r['setting_label'],
            ];
        }
        return $this->json_success($grouped);
    }

    // POST /api/settings/update
    public function update() {
        $this->require_owner();
        $b = $this->get_json_body();   // key-value pairs: { "factory_name": "ABC", ... }
        if (empty($b)) return $this->json_error('No settings provided', 400);

        foreach ($b as $key => $value) {
            $exists = $this->db->where('setting_key', $key)->get('settings')->row_array();
            if ($exists) {
                $this->db->where('setting_key', $key)->update('settings', ['setting_value' => $value]);
            }
        }
        $this->audit('Updated settings', $this->user['id']);
        return $this->json_success([], 'Settings saved');
    }
}
`},
  {r: "public_html/application/controllers/Suppliers.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Suppliers extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Supplier_model');
    }

    // GET /api/suppliers
    public function index() {
        $this->require_owner();
        $filters = array_filter([
            'search'    => $this->input->get('search'),
            'category'  => $this->input->get('category'),
            'is_active' => $this->input->get('is_active') !== null ? $this->input->get('is_active') : 1,
        ], fn($v) => $v !== null && $v !== '');
        return $this->json_success($this->Supplier_model->get_all($filters));
    }

    // GET /api/suppliers/dropdown
    public function dropdown() {
        $this->require_auth();
        return $this->json_success($this->Supplier_model->get_list_for_dropdown());
    }

    // GET /api/suppliers/:id
    public function show($id) {
        $this->require_owner();
        $s = $this->Supplier_model->get_by_id($id);
        if (!$s) return $this->json_error('Supplier not found', 404);
        unset($s['Bank_Account']); // strip sensitive from show response (keep in edit only)
        return $this->json_success($s);
    }

    // POST /api/suppliers/store
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Supplier_Name'])) return $this->json_error('Supplier Name is required', 400);

        $data = [
            'Supplier_Name'   => $b['Supplier_Name'],
            'Mobile'          => $b['Mobile']          ?? null,
            'Alt_Mobile'      => $b['Alt_Mobile']       ?? null,
            'Email'           => $b['Email']            ?? null,
            'Address'         => $b['Address']          ?? null,
            'City'            => $b['City']             ?? null,
            'State'           => $b['State']            ?? null,
            'State_Code'      => $b['State_Code']       ?? null,
            'GST_No'          => $b['GST_No']           ?? null,
            'PAN_No'          => $b['PAN_No']           ?? null,
            'Category'        => $b['Category']         ?? 'Regular',
            'Bank_Name'       => $b['Bank_Name']        ?? null,
            'Bank_Account'    => $b['Bank_Account']     ?? null,
            'Bank_IFSC'       => $b['Bank_IFSC']        ?? null,
            'Credit_Limit'    => $b['Credit_Limit']     ?? 0,
            'Opening_Balance' => $b['Opening_Balance']  ?? 0,
            'Notes'           => $b['Notes']            ?? null,
            'Photo_Path'      => $b['Photo_Path']       ?? null,
            'Contact_Person'  => $b['Contact_Person']   ?? null,
        ];

        $id = $this->Supplier_model->create($data);
        $this->audit("Created supplier {$b['Supplier_Name']}", $this->user['id']);
        return $this->json_success(['Supplier_ID' => $id], 'Supplier created', 201);
    }

    // POST /api/suppliers/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Supplier_Name','Mobile','Alt_Mobile','Email','Address','City','State','State_Code',
                    'GST_No','PAN_No','Category','Bank_Name','Bank_Account','Bank_IFSC',
                    'Credit_Limit','Opening_Balance','Notes','Photo_Path','Is_Active','Contact_Person'];
        $data = array_intersect_key($b, array_flip($allowed));
        if (empty($data)) return $this->json_error('No fields to update', 400);
        $this->Supplier_model->update($id, $data);
        $this->audit("Updated supplier $id", $this->user['id']);
        return $this->json_success([], 'Supplier updated');
    }

    // POST /api/suppliers/delete/:id
    public function delete($id) {
        $this->require_owner();
        $this->Supplier_model->delete($id);
        $this->audit("Deactivated supplier $id", $this->user['id']);
        return $this->json_success([], 'Supplier deactivated');
    }
}
`},
  {r: "public_html/application/controllers/Upload.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Upload extends MY_Controller {

    // POST /api/upload/image?folder=company|employee|machine
    public function image() {
        $this->require_owner();

        if (empty($_FILES['file']['name'])) {
            return $this->json_error('No file uploaded', 400);
        }

        $folder = in_array($this->input->get('folder'), ['company','employee','machine'])
                  ? $this->input->get('folder') : 'company';

        $upload_path = FCPATH . 'uploads/' . $folder . '/';

        $config = [
            'upload_path'   => $upload_path,
            'allowed_types' => 'jpg|jpeg|png|gif|webp',
            'max_size'      => 2048,   // 2 MB
            'encrypt_name'  => TRUE,
        ];

        $this->load->library('upload', $config);

        if (!$this->upload->do_upload('file')) {
            return $this->json_error($this->upload->display_errors('',''), 400);
        }

        $info = $this->upload->data();
        $url  = '/quraisherp/uploads/' . $folder . '/' . $info['file_name'];

        return $this->json_success(['url' => $url, 'filename' => $info['file_name']], 'File uploaded');
    }
}
`},
  {r: "public_html/application/core/MY_Controller.php", c: `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * MY_Controller — Base REST API controller
 * All API controllers extend this class.
 */
class MY_Controller extends CI_Controller {

    protected $user = null;   // logged-in session user

    public function __construct() {
        parent::__construct();
        $this->_cors_headers();
    }

    // ── CORS headers (allows React dev server on port 5173) ──────
    private function _cors_headers() {
        $allowed_origins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost',
            'https://easyshoperp.sverpsolutions.com',
        ];
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        } else {
            header('Access-Control-Allow-Origin: http://localhost:5173');
        }
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }

    // ── JSON response helpers ────────────────────────────────────
    protected function json_success($data = [], $message = 'OK', $code = 200) {
        $this->output
            ->set_content_type('application/json')
            ->set_status_header($code)
            ->set_output(json_encode([
                'success' => true,
                'message' => $message,
                'data'    => $data,
            ], JSON_UNESCAPED_UNICODE));
    }

    protected function json_error($message = 'Error', $code = 400, $errors = []) {
        $this->output
            ->set_content_type('application/json')
            ->set_status_header($code)
            ->set_output(json_encode([
                'success' => false,
                'message' => $message,
                'errors'  => $errors,
            ], JSON_UNESCAPED_UNICODE));
    }

    // ── Auth guard: require logged-in session ────────────────────
    protected function require_auth() {
        $user = $this->session->userdata('user');
        if (!$user) {
            $this->json_error('Unauthorized — please login', 401);
            exit();
        }
        $this->user = $user;
        return $user;
    }

    // ── Role guards ───────────────────────────────────────────────
    protected function require_owner() {
        $user = $this->require_auth();
        if (!in_array($user['role'], ['Owner', 'Admin'])) {
            $this->json_error('Forbidden — Owner/Admin access required', 403);
            exit();
        }
        return $user;
    }

    protected function require_operator() {
        $user = $this->require_auth();
        if ($user['role'] !== 'Operator') {
            $this->json_error('Forbidden — Operator access required', 403);
            exit();
        }
        return $user;
    }

    // ── Read JSON body ────────────────────────────────────────────
    protected function get_json_body() {
        $raw = file_get_contents('php://input');
        return json_decode($raw, true) ?: [];
    }

    // ── Audit log helper ─────────────────────────────────────────
    protected function audit($action, $employee_id = null) {
        $this->db->insert('audit_log', [
            'Employee_ID' => $employee_id ?? ($this->user ? $this->user['id'] : null),
            'Action'      => $action,
            'IP_Address'  => $this->input->ip_address(),
        ]);
    }
}
`},
];