<?php
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
