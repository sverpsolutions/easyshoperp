<?php
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
