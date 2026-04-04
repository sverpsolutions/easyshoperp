<?php
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
