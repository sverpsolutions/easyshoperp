<?php
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
