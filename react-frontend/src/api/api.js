import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor: redirect to login on 401 (skip for session check)
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config?._skipAuthRedirect) {
      const isPortal = window.location.pathname.startsWith('/portal')
      window.location.href = isPortal ? '/portal/login' : '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login:          (data) => api.post('/auth/login', data),
  logout:         ()     => api.post('/auth/logout'),
  me:             ()     => api.get('/auth/me', { _skipAuthRedirect: true }),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardAPI = {
  get:        ()  => api.get('/dashboard'),
  machines:   ()  => api.get('/dashboard/machines'),
  liveStatus: ()  => api.get('/machines/status'),
}

// ── Jobs ──────────────────────────────────────────────────────
export const jobsAPI = {
  list:       (params) => api.get('/jobs', { params }),
  get:        (id)     => api.get(`/jobs/${id}`),
  store:      (data)   => api.post('/jobs/store', data),
  update:     (id, data) => api.post(`/jobs/update/${id}`, data),
  delete:     (id)     => api.post(`/jobs/delete/${id}`),
  start:      (data)   => api.post('/jobs/start', data),
  stop:       (data)   => api.post('/jobs/stop', data),
  log:        (data)   => api.post('/jobs/log', data),
  nextNumber: ()       => api.get('/jobs/next-number'),
}

// ── Machines ──────────────────────────────────────────────────
export const machinesAPI = {
  list:   ()           => api.get('/machines'),
  get:    (id)         => api.get(`/machines/${id}`),
  store:  (data)       => api.post('/machines/store', data),
  update: (id, data)   => api.post(`/machines/update/${id}`, data),
  delete: (id)         => api.post(`/machines/delete/${id}`),
  status: ()           => api.get('/machines/status'),
}

// ── Employees ─────────────────────────────────────────────────
export const employeesAPI = {
  list:      (params)    => api.get('/employees', { params }),
  operators: ()          => api.get('/employees/operators'),
  get:       (id)        => api.get(`/employees/${id}`),
  store:     (data)      => api.post('/employees/store', data),
  update:    (id, data)  => api.post(`/employees/update/${id}`, data),
  delete:    (id)        => api.post(`/employees/delete/${id}`),
}

// ── Customers ─────────────────────────────────────────────────
export const customersAPI = {
  list:   (params)   => api.get('/customers', { params }),
  get:    (id)       => api.get(`/customers/${id}`),
  store:  (data)     => api.post('/customers/store', data),
  update: (id, data) => api.post(`/customers/update/${id}`, data),
  delete: (id)       => api.post(`/customers/delete/${id}`),
}

// ── Attendance ────────────────────────────────────────────────
export const attendanceAPI = {
  list:   (params)   => api.get('/attendance', { params }),
  mark:   (data)     => api.post('/attendance/mark', data),
  update: (id, data) => api.post(`/attendance/update/${id}`, data),
}

// ── Advances ──────────────────────────────────────────────────
export const advancesAPI = {
  list:    (params)  => api.get('/advances', { params }),
  store:   (data)    => api.post('/advances/store', data),
  approve: (id, data)=> api.post(`/advances/approve/${id}`, data),
  reject:  (id, data)=> api.post(`/advances/reject/${id}`, data),
  pay:     (id, data)=> api.post(`/advances/pay/${id}`, data),
}

// ── Bills ─────────────────────────────────────────────────────
export const billsAPI = {
  list:       (params)   => api.get('/bills', { params }),
  get:        (id)       => api.get(`/bills/${id}`),
  store:      (data)     => api.post('/bills/store', data),
  update:     (id, data) => api.post(`/bills/update/${id}`, data),
  delete:     (id)       => api.post(`/bills/delete/${id}`),
  nextNumber: ()         => api.get('/bills/next-number'),
}

// ── Reports ───────────────────────────────────────────────────
export const reportsAPI = {
  daily:       (params) => api.get('/reports/daily',       { params }),
  operator:    (params) => api.get('/reports/operator',    { params }),
  machine:     (params) => api.get('/reports/machine',     { params }),
  customer:    (params) => api.get('/reports/customer',    { params }),
  completion:  ()       => api.get('/reports/completion'),
  overdue:     ()       => api.get('/reports/overdue'),
  impressions: (params) => api.get('/reports/impressions', { params }),
}

// ── Settings ──────────────────────────────────────────────────
export const settingsAPI = {
  get:    () => api.get('/settings'),
  update: (data) => api.post('/settings/update', data),
}

// ── Operator ──────────────────────────────────────────────────
export const operatorAPI = {
  dashboard:     () => api.get('/operator/dashboard'),
  requestJob:    (data) => api.post('/operator/request', data),
  logImpressions:(data) => api.post('/operator/impressions/log', data),
}

// ── Suppliers ─────────────────────────────────────────────────
export const suppliersAPI = {
  list:     (params)    => api.get('/suppliers', { params }),
  dropdown: ()          => api.get('/suppliers/dropdown'),
  get:      (id)        => api.get(`/suppliers/${id}`),
  store:    (data)      => api.post('/suppliers/store', data),
  update:   (id, data)  => api.post(`/suppliers/update/${id}`, data),
  delete:   (id)        => api.post(`/suppliers/delete/${id}`),
}

// ── Purchase ──────────────────────────────────────────────────
export const purchaseAPI = {
  list:       (params)    => api.get('/purchase', { params }),
  get:        (id)        => api.get(`/purchase/${id}`),
  nextNumber: ()          => api.get('/purchase/next-number'),
  summary:    ()          => api.get('/purchase/summary'),
  store:      (data)      => api.post('/purchase/store', data),
  update:     (id, data)  => api.post(`/purchase/update/${id}`, data),
  delete:     (id)        => api.post(`/purchase/delete/${id}`),
}

// ── Conversion / Slitting ─────────────────────────────────────
export const conversionAPI = {
  list:       (params)    => api.get('/conversion', { params }),
  get:        (id)        => api.get(`/conversion/${id}`),
  nextNumber: ()          => api.get('/conversion/next-number'),
  store:      (data)      => api.post('/conversion/store', data),
  update:     (id, data)  => api.post(`/conversion/update/${id}`, data),
  delete:     (id)        => api.post(`/conversion/delete/${id}`),
}

// ── Items (Item Master) ───────────────────────────────────────
export const itemsAPI = {
  list:               (params)    => api.get('/items', { params }),
  get:                (id)        => api.get(`/items/${id}`),
  hierarchy:          ()          => api.get('/items/hierarchy'),
  store:              (data)      => api.post('/items/store', data),
  update:             (id, data)  => api.post(`/items/update/${id}`, data),
  delete:             (id)        => api.post(`/items/delete/${id}`),
  storeGroup:         (data)      => api.post('/items/groups/store', data),
  storeSubgroup:      (data)      => api.post('/items/subgroups/store', data),
  storeCategory:      (data)      => api.post('/items/categories/store', data),
  storeSubcategory:   (data)      => api.post('/items/subcategories/store', data),
  storeBrand:         (data)      => api.post('/items/brands/store', data),
}

// ── Masters ───────────────────────────────────────────────────
export const mastersAPI = {
  // Company
  getCompany:           ()          => api.get('/masters/company'),
  saveCompany:          (data)      => api.post('/masters/company/save', data),
  // GST Tax
  listGST:              ()          => api.get('/masters/gst'),
  storeGST:             (data)      => api.post('/masters/gst/store', data),
  updateGST:            (id, data)  => api.post(`/masters/gst/update/${id}`, data),
  deleteGST:            (id)        => api.post(`/masters/gst/delete/${id}`),
  // HSN
  listHSN:              (params)    => api.get('/masters/hsn', { params }),
  storeHSN:             (data)      => api.post('/masters/hsn/store', data),
  updateHSN:            (id, data)  => api.post(`/masters/hsn/update/${id}`, data),
  deleteHSN:            (id)        => api.post(`/masters/hsn/delete/${id}`),
  // UOM
  listUOM:              ()          => api.get('/masters/uom'),
  storeUOM:             (data)      => api.post('/masters/uom/store', data),
  updateUOM:            (id, data)  => api.post(`/masters/uom/update/${id}`, data),
  deleteUOM:            (id)        => api.post(`/masters/uom/delete/${id}`),
  // Manufacturers
  listManufacturers:    (params)    => api.get('/masters/manufacturers', { params }),
  storeManufacturer:    (data)      => api.post('/masters/manufacturers/store', data),
  updateManufacturer:   (id, data)  => api.post(`/masters/manufacturers/update/${id}`, data),
  deleteManufacturer:   (id)        => api.post(`/masters/manufacturers/delete/${id}`),
  // Brands
  listBrands:           ()          => api.get('/masters/brands'),
  storeBrand:           (data)      => api.post('/masters/brands/store', data),
  updateBrand:          (id, data)  => api.post(`/masters/brands/update/${id}`, data),
  deleteBrand:          (id)        => api.post(`/masters/brands/delete/${id}`),
  // Groups
  listGroups:           ()          => api.get('/masters/groups'),
  storeGroup:           (data)      => api.post('/masters/groups/store', data),
  updateGroup:          (id, data)  => api.post(`/masters/groups/update/${id}`, data),
  deleteGroup:          (id)        => api.post(`/masters/groups/delete/${id}`),
  // Subgroups
  listSubgroups:        (params)    => api.get('/masters/subgroups', { params }),
  storeSubgroup:        (data)      => api.post('/masters/subgroups/store', data),
  updateSubgroup:       (id, data)  => api.post(`/masters/subgroups/update/${id}`, data),
  deleteSubgroup:       (id)        => api.post(`/masters/subgroups/delete/${id}`),
  // Categories
  listCategories:       (params)    => api.get('/masters/categories', { params }),
  storeCategory:        (data)      => api.post('/masters/categories/store', data),
  updateCategory:       (id, data)  => api.post(`/masters/categories/update/${id}`, data),
  deleteCategory:       (id)        => api.post(`/masters/categories/delete/${id}`),
  // Subcategories
  listSubcategories:    (params)    => api.get('/masters/subcategories', { params }),
  storeSubcategory:     (data)      => api.post('/masters/subcategories/store', data),
  updateSubcategory:    (id, data)  => api.post(`/masters/subcategories/update/${id}`, data),
  deleteSubcategory:    (id)        => api.post(`/masters/subcategories/delete/${id}`),
  // All dropdowns combined
  dropdowns:            ()          => api.get('/masters/dropdowns'),
}

// ── Serials (Machine Serial Tracking) ────────────────────────
export const serialsAPI = {
  list:       (params)   => api.get('/serials', { params }),
  get:        (id)       => api.get(`/serials/${id}`),
  available:  (itemId)   => api.get(`/serials/available/${itemId}`),
  store:      (data)     => api.post('/serials/store', data),
  bulk:       (data)     => api.post('/serials/bulk', data),
  sell:       (id, data) => api.post(`/serials/sell/${id}`, data),
  update:     (id, data) => api.post(`/serials/update/${id}`, data),
  delete:     (id)       => api.post(`/serials/delete/${id}`),
  stats:      (params)   => api.get('/serials/stats', { params }),
}

// ── Services (Hardware Service Records) ──────────────────────
export const servicesAPI = {
  list:       (params)   => api.get('/services', { params }),
  get:        (id)       => api.get(`/services/${id}`),
  history:    (serialId) => api.get(`/services/history/${serialId}`),
  store:      (data)     => api.post('/services/store', data),
  update:     (id, data) => api.post(`/services/update/${id}`, data),
  openCount:  ()         => api.get('/services/open-count'),
}

// ── Customer Portal ───────────────────────────────────────────
export const portalAPI = {
  login:         (data)      => api.post('/portal/login', data),
  logout:        ()          => api.post('/portal/logout'),
  me:            ()          => api.get('/portal/me', { _skipAuthRedirect: true }),
  dashboard:     ()          => api.get('/portal/dashboard'),
  orders:        ()          => api.get('/portal/orders'),
  orderGet:      (id)        => api.get(`/portal/orders/${id}`),
  orderStore:    (data)      => api.post('/portal/orders/store', data),
  jobs:          ()          => api.get('/portal/jobs'),
  bills:         ()          => api.get('/portal/bills'),
  // Owner admin
  adminOrders:   (params)    => api.get('/portal/admin/orders', { params }),
  adminReview:   (id, data)  => api.post(`/portal/admin/orders/review/${id}`, data),
}

// ── File Upload ───────────────────────────────────────────────
export const uploadImage = (file, folder = 'company') => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/upload/image?folder=${folder}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export default api
