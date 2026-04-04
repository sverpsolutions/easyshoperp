<?php
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
