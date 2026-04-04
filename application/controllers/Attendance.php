<?php
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
