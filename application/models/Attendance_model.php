<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Attendance_model extends CI_Model {

    public function get_list($date = null, $employee_id = null) {
        $this->db->select('ea.*, e.Name AS Employee_Name, e.Role, s.Shift_Name')
                 ->from('employee_attendance ea')
                 ->join('employees e', 'e.Employee_ID = ea.Employee_ID', 'left')
                 ->join('shifts s',    's.Shift_ID    = ea.Shift_ID',    'left');
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
