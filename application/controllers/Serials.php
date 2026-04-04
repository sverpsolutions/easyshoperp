<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Serials Controller — Hardware Serial Number Tracking
 */
class Serials extends MY_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Serial_model');
    }

    // GET /api/serials
    public function index() {
        $this->require_auth();
        $filters = [
            'item_id'     => $this->input->get('item_id'),
            'status'      => $this->input->get('status'),
            'customer_id' => $this->input->get('customer_id'),
            'search'      => $this->input->get('search'),
        ];
        return $this->json_success($this->Serial_model->get_list($filters));
    }

    // GET /api/serials/:id
    public function show($id) {
        $this->require_auth();
        $row = $this->Serial_model->get_by_id($id);
        if (!$row) return $this->json_error('Serial not found', 404);
        $row['warranty_status'] = $this->Serial_model->get_warranty_status($id);
        return $this->json_success($row);
    }

    // GET /api/serials/available/:item_id
    public function available($item_id) {
        $this->require_auth();
        return $this->json_success($this->Serial_model->get_available($item_id));
    }

    // POST /api/serials/store — single serial add
    public function store() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Item_ID']))   return $this->json_error('Item ID required', 400);
        if (empty($b['Serial_No'])) return $this->json_error('Serial Number required', 400);

        $data = [
            'Item_ID'       => (int)$b['Item_ID'],
            'Serial_No'     => strtoupper(trim($b['Serial_No'])),
            'Model_No'      => $b['Model_No']      ?? null,
            'Purchase_ID'   => $b['Purchase_ID']   ?? null,
            'Purchase_Date' => $b['Purchase_Date'] ?? null,
            'Status'        => 'In Stock',
            'Location'      => $b['Location']      ?? null,
            'Notes'         => $b['Notes']         ?? null,
        ];
        $id = $this->Serial_model->create($data);
        if ($id === false) return $this->json_error('Serial Number already exists', 409);
        return $this->json_success(['Serial_ID' => $id], 'Serial added');
    }

    // POST /api/serials/bulk — bulk serial add (purchase flow)
    public function bulk() {
        $this->require_owner();
        $b = $this->get_json_body();
        if (empty($b['Item_ID']))   return $this->json_error('Item ID required', 400);
        if (empty($b['serials']) || !is_array($b['serials'])) {
            return $this->json_error('Serials array required', 400);
        }

        $item_id     = (int)$b['Item_ID'];
        $purchase_id = $b['Purchase_ID']   ?? null;
        $purch_date  = $b['Purchase_Date'] ?? date('Y-m-d');

        $records = [];
        foreach ($b['serials'] as $sn) {
            $sn = trim(strtoupper($sn));
            if (empty($sn)) continue;
            $records[] = [
                'Item_ID'       => $item_id,
                'Serial_No'     => $sn,
                'Purchase_ID'   => $purchase_id,
                'Purchase_Date' => $purch_date,
                'Status'        => 'In Stock',
                'Created_Date'  => date('Y-m-d H:i:s'),
            ];
        }

        if (empty($records)) return $this->json_error('No valid serial numbers provided', 400);

        $result = $this->Serial_model->bulk_create($records);
        return $this->json_success($result, "{$result['inserted']} serials added");
    }

    // POST /api/serials/sell/:id — mark serial as sold
    public function sell($id) {
        $this->require_owner();
        $b = $this->get_json_body();

        $serial = $this->Serial_model->get_by_id($id);
        if (!$serial) return $this->json_error('Serial not found', 404);
        if ($serial['Status'] !== 'In Stock') {
            return $this->json_error("Serial is already {$serial['Status']}", 409);
        }

        // Get item details for warranty calculation
        $this->load->model('Item_model');
        $item = $this->Item_model->get_by_id($serial['Item_ID']);

        $data = [
            'Customer_ID'     => $b['Customer_ID'] ?? null,
            'Sales_ID'        => $b['Sales_ID']    ?? null,
            'Sale_Date'       => $b['Sale_Date']   ?? date('Y-m-d'),
            'Warranty_Months' => $item['Warranty_Months'] ?? 0,
            'AMC_Years'       => $item['AMC_Years']       ?? 0,
        ];
        $this->Serial_model->sell($id, $data);
        return $this->json_success(null, 'Serial marked as Sold');
    }

    // POST /api/serials/update/:id
    public function update($id) {
        $this->require_owner();
        $b = $this->get_json_body();
        $allowed = ['Status','Location','Notes','Model_No','Warranty_Expiry','AMC_Expiry'];
        $data = array_intersect_key($b, array_flip($allowed));
        $data['Updated_Date'] = date('Y-m-d H:i:s');
        $this->Serial_model->update($id, $data);
        return $this->json_success(null, 'Serial updated');
    }

    // POST /api/serials/delete/:id
    public function delete($id) {
        $this->require_owner();
        $ok = $this->Serial_model->delete($id);
        if (!$ok) return $this->json_error('Cannot delete — serial is Sold or In Service', 409);
        return $this->json_success(null, 'Serial deleted');
    }

    // GET /api/serials/stats
    public function stats() {
        $this->require_auth();
        $item_id = $this->input->get('item_id');
        return $this->json_success($this->Serial_model->get_stats($item_id));
    }
}
