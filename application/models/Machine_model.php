<?php
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
        ->from('machines m')
        ->join('employees e', 'e.Employee_ID = m.Current_Operator_ID', 'left')
        ->join('jobs j',      'j.Job_ID = m.Current_Job_ID', 'left')
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
        ->from('machines m')
        ->join('employees e', 'e.Employee_ID = m.Current_Operator_ID', 'left')
        ->join('jobs j',      'j.Job_ID = m.Current_Job_ID', 'left')
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
