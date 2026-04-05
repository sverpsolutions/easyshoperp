<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$route['default_controller'] = 'auth/index';
$route['404_override']       = '';
$route['translate_uri_dashes'] = FALSE;

// ── Auth ──────────────────────────────────────────────────────
$route['api/auth/login']        = 'auth/login';
$route['api/auth/logout']       = 'auth/logout';
$route['api/auth/me']           = 'auth/me';
$route['api/auth/change-password'] = 'auth/change_password';

// ── Dashboard ─────────────────────────────────────────────────
$route['api/dashboard']         = 'dashboard/index';
$route['api/dashboard/machines']= 'dashboard/machines';

// ── Jobs ──────────────────────────────────────────────────────
$route['api/jobs']              = 'jobs/index';
$route['api/jobs/(:num)']       = 'jobs/show/$1';
$route['api/jobs/store']        = 'jobs/store';
$route['api/jobs/update/(:num)']= 'jobs/update/$1';
$route['api/jobs/delete/(:num)']= 'jobs/delete/$1';
$route['api/jobs/start']        = 'jobs/start';
$route['api/jobs/stop']         = 'jobs/stop';
$route['api/jobs/log']          = 'jobs/log_production';
$route['api/jobs/next-number']  = 'jobs/next_number';

// ── Machines ──────────────────────────────────────────────────
$route['api/machines']              = 'machines/index';
$route['api/machines/(:num)']       = 'machines/show/$1';
$route['api/machines/store']        = 'machines/store';
$route['api/machines/update/(:num)']= 'machines/update/$1';
$route['api/machines/delete/(:num)']= 'machines/delete/$1';
$route['api/machines/status']       = 'machines/live_status';

// ── Employees ─────────────────────────────────────────────────
$route['api/employees']              = 'employees/index';
$route['api/employees/(:num)']       = 'employees/show/$1';
$route['api/employees/store']        = 'employees/store';
$route['api/employees/update/(:num)']= 'employees/update/$1';
$route['api/employees/delete/(:num)']= 'employees/delete/$1';
$route['api/employees/operators']    = 'employees/operators';

// ── Customers ─────────────────────────────────────────────────
$route['api/customers']              = 'customers/index';
$route['api/customers/(:num)']       = 'customers/show/$1';
$route['api/customers/store']        = 'customers/store';
$route['api/customers/update/(:num)']= 'customers/update/$1';
$route['api/customers/delete/(:num)']= 'customers/delete/$1';

// ── Attendance ────────────────────────────────────────────────
$route['api/attendance']        = 'attendance/index';
$route['api/attendance/mark']   = 'attendance/mark';
$route['api/attendance/update/(:num)'] = 'attendance/update/$1';

// ── Advances ──────────────────────────────────────────────────
$route['api/advances']              = 'advances/index';
$route['api/advances/store']        = 'advances/store';
$route['api/advances/approve/(:num)']= 'advances/approve/$1';
$route['api/advances/reject/(:num)'] = 'advances/reject/$1';
$route['api/advances/pay/(:num)']    = 'advances/pay/$1';

// ── Bills ─────────────────────────────────────────────────────
$route['api/bills']              = 'bills/index';
$route['api/bills/(:num)']       = 'bills/show/$1';
$route['api/bills/store']        = 'bills/store';
$route['api/bills/update/(:num)']= 'bills/update/$1';
$route['api/bills/delete/(:num)']= 'bills/delete/$1';
$route['api/bills/next-number']  = 'bills/next_number';

// ── Reports ───────────────────────────────────────────────────
$route['api/reports/daily']       = 'reports/daily';
$route['api/reports/operator']    = 'reports/operator';
$route['api/reports/machine']     = 'reports/machine';
$route['api/reports/customer']    = 'reports/customer';
$route['api/reports/completion']  = 'reports/completion';
$route['api/reports/overdue']     = 'reports/overdue';
$route['api/reports/impressions'] = 'reports/impressions';

// ── Settings ──────────────────────────────────────────────────
$route['api/settings']        = 'settings/index';
$route['api/settings/update'] = 'settings/update';

// ── Suppliers ─────────────────────────────────────────────────
$route['api/suppliers']                  = 'suppliers/index';
$route['api/suppliers/dropdown']         = 'suppliers/dropdown';
$route['api/suppliers/(:num)']           = 'suppliers/show/$1';
$route['api/suppliers/store']            = 'suppliers/store';
$route['api/suppliers/update/(:num)']    = 'suppliers/update/$1';
$route['api/suppliers/delete/(:num)']    = 'suppliers/delete/$1';

// ── Purchase ──────────────────────────────────────────────────
$route['api/purchase']                  = 'purchase/index';
$route['api/purchase/next-number']      = 'purchase/next_number';
$route['api/purchase/summary']          = 'purchase/summary';
$route['api/purchase/(:num)']           = 'purchase/show/$1';
$route['api/purchase/store']            = 'purchase/store';
$route['api/purchase/update/(:num)']    = 'purchase/update/$1';
$route['api/purchase/delete/(:num)']    = 'purchase/delete/$1';

// ── Conversion / Slitting ─────────────────────────────────────
$route['api/conversion']                = 'conversion/index';
$route['api/conversion/next-number']    = 'conversion/next_number';
$route['api/conversion/(:num)']         = 'conversion/show/$1';
$route['api/conversion/store']          = 'conversion/store';
$route['api/conversion/update/(:num)']  = 'conversion/update/$1';
$route['api/conversion/delete/(:num)']  = 'conversion/delete/$1';

// ── Items (Item Master) ───────────────────────────────────────
$route['api/items']                         = 'items/index';
$route['api/items/hierarchy']               = 'items/hierarchy';
$route['api/items/(:num)']                  = 'items/show/$1';
$route['api/items/store']                   = 'items/store';
$route['api/items/update/(:num)']           = 'items/update/$1';
$route['api/items/delete/(:num)']           = 'items/delete/$1';
$route['api/items/groups/store']            = 'items/store_group';
$route['api/items/groups/update/(:num)']    = 'items/update_group/$1';
$route['api/items/subgroups/store']         = 'items/store_subgroup';
$route['api/items/categories/store']        = 'items/store_category';
$route['api/items/subcategories/store']     = 'items/store_subcategory';
$route['api/items/brands/store']            = 'items/store_brand';

// ── Upload ────────────────────────────────────────────────────
$route['api/upload/image']    = 'upload/image';

// ── Operator ──────────────────────────────────────────────────
$route['api/operator/dashboard'] = 'operator/dashboard';
$route['api/operator/request']   = 'operator/request_job';
$route['api/operator/impressions/log'] = 'operator/log_impressions';

// ── Masters — Company ─────────────────────────────────────────
$route['api/masters/company']              = 'masters/company_get';
$route['api/masters/company/save']         = 'masters/company_save';

// ── Masters — GST Tax ─────────────────────────────────────────
$route['api/masters/gst']                  = 'masters/gst_list';
$route['api/masters/gst/store']            = 'masters/gst_store';
$route['api/masters/gst/update/(:num)']    = 'masters/gst_update/$1';
$route['api/masters/gst/delete/(:num)']    = 'masters/gst_delete/$1';

// ── Masters — HSN ─────────────────────────────────────────────
$route['api/masters/hsn']                  = 'masters/hsn_list';
$route['api/masters/hsn/store']            = 'masters/hsn_store';
$route['api/masters/hsn/update/(:num)']    = 'masters/hsn_update/$1';
$route['api/masters/hsn/delete/(:num)']    = 'masters/hsn_delete/$1';

// ── Masters — UOM ─────────────────────────────────────────────
$route['api/masters/uom']                  = 'masters/uom_list';
$route['api/masters/uom/store']            = 'masters/uom_store';
$route['api/masters/uom/update/(:num)']    = 'masters/uom_update/$1';
$route['api/masters/uom/delete/(:num)']    = 'masters/uom_delete/$1';

// ── Masters — Manufacturers ───────────────────────────────────
$route['api/masters/manufacturers']                  = 'masters/manufacturer_list';
$route['api/masters/manufacturers/store']            = 'masters/manufacturer_store';
$route['api/masters/manufacturers/update/(:num)']    = 'masters/manufacturer_update/$1';
$route['api/masters/manufacturers/delete/(:num)']    = 'masters/manufacturer_delete/$1';

// ── Masters — Brands ──────────────────────────────────────────
$route['api/masters/brands']                  = 'masters/brand_list';
$route['api/masters/brands/store']            = 'masters/brand_store';
$route['api/masters/brands/update/(:num)']    = 'masters/brand_update/$1';
$route['api/masters/brands/delete/(:num)']    = 'masters/brand_delete/$1';

// ── Masters — Groups ──────────────────────────────────────────
$route['api/masters/groups']                  = 'masters/group_list';
$route['api/masters/groups/store']            = 'masters/group_store';
$route['api/masters/groups/update/(:num)']    = 'masters/group_update/$1';
$route['api/masters/groups/delete/(:num)']    = 'masters/group_delete/$1';

// ── Masters — Subgroups ───────────────────────────────────────
$route['api/masters/subgroups']                  = 'masters/subgroup_list';
$route['api/masters/subgroups/store']            = 'masters/subgroup_store';
$route['api/masters/subgroups/update/(:num)']    = 'masters/subgroup_update/$1';
$route['api/masters/subgroups/delete/(:num)']    = 'masters/subgroup_delete/$1';

// ── Masters — Categories ──────────────────────────────────────
$route['api/masters/categories']                  = 'masters/category_list';
$route['api/masters/categories/store']            = 'masters/category_store';
$route['api/masters/categories/update/(:num)']    = 'masters/category_update/$1';
$route['api/masters/categories/delete/(:num)']    = 'masters/category_delete/$1';

// ── Masters — Subcategories ───────────────────────────────────
$route['api/masters/subcategories']                  = 'masters/subcategory_list';
$route['api/masters/subcategories/store']            = 'masters/subcategory_store';
$route['api/masters/subcategories/update/(:num)']    = 'masters/subcategory_update/$1';
$route['api/masters/subcategories/delete/(:num)']    = 'masters/subcategory_delete/$1';

// ── Masters — All Dropdowns ───────────────────────────────────
$route['api/masters/dropdowns']            = 'masters/all_dropdowns';

// ── Serials (Machine Serial Tracking) ────────────────────────
$route['api/serials']                      = 'serials/index';
$route['api/serials/stats']                = 'serials/stats';
$route['api/serials/bulk']                 = 'serials/bulk';
$route['api/serials/store']                = 'serials/store';
$route['api/serials/available/(:num)']     = 'serials/available/$1';
$route['api/serials/(:num)']               = 'serials/show/$1';
$route['api/serials/sell/(:num)']          = 'serials/sell/$1';
$route['api/serials/update/(:num)']        = 'serials/update/$1';
$route['api/serials/delete/(:num)']        = 'serials/delete/$1';

// ── Customer Portal ───────────────────────────────────────────
$route['api/portal/login']                        = 'portal/login';
$route['api/portal/logout']                       = 'portal/logout';
$route['api/portal/me']                           = 'portal/me';
$route['api/portal/dashboard']                    = 'portal/dashboard';
$route['api/portal/orders']                       = 'portal/orders';
$route['api/portal/orders/store']                 = 'portal/order_store';
$route['api/portal/orders/(:num)']                = 'portal/order_show/$1';
$route['api/portal/jobs']                         = 'portal/jobs';
$route['api/portal/bills']                        = 'portal/bills';
$route['api/portal/admin/orders']                 = 'portal/admin_orders';
$route['api/portal/admin/orders/review/(:num)']   = 'portal/admin_review/$1';

// ── Services (Hardware Service Records) ───────────────────────
$route['api/services']                     = 'services/index';
$route['api/services/open-count']          = 'services/open_count';
$route['api/services/store']               = 'services/store';
$route['api/services/history/(:num)']      = 'services/history/$1';
$route['api/services/(:num)']              = 'services/show/$1';
$route['api/services/update/(:num)']       = 'services/update/$1';
