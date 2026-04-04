import React, { useState, useEffect, useRef } from 'react'
import { employeesAPI } from '../../api/api'
import { uploadImage } from '../../api/api'

const ROLES = ['Owner','Admin','Operator']

const defaultForm = {
  Name:'', Role:'Operator', Mobile:'', Username:'', Password:'',
  Father_Name:'', Address:'', Aadhar_No:'', Join_Date:'', Monthly_Salary:'',
  Bank_Name:'', Bank_Account:'', Bank_IFSC:'', Advance_Limit_Monthly:5000,
  Emergency_Contact:'', Photo_Path:'',
}

const PHOTO_BASE = import.meta.env.VITE_APP_URL || ''

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(defaultForm)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [photoUploading, setPU]   = useState(false)
  const photoRef = useRef()

  const load = () => {
    const params = filterRole ? { role: filterRole } : {}
    employeesAPI.list(params).then(r => setEmployees(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filterRole])

  const openNew  = () => { setForm(defaultForm); setEditing(null); setError(''); setShowModal(true) }
  const openEdit = e  => { setForm({ ...e, Password:'' }); setEditing(e.Employee_ID); setError(''); setShowModal(true) }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await employeesAPI.update(editing, form)
      else         await employeesAPI.store(form)
      setShowModal(false); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving employee')
    } finally { setSaving(false) }
  }

  const handleDeactivate = async id => {
    if (!confirm('Deactivate this employee?')) return
    await employeesAPI.delete(id); load()
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setPU(true)
    try {
      const { data } = await uploadImage(file, 'employee')
      setF('Photo_Path', data.data.url)
    } catch { setError('Photo upload failed') }
    finally { setPU(false); e.target.value = '' }
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const roleColor = r => r==='Owner'?'danger':r==='Admin'?'warning text-dark':'primary'

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-people me-2 text-primary"></i>Employees</h4>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" style={{width:140}} value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r=><option key={r}>{r}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            <i className="bi bi-plus-lg me-1"></i>Add Employee
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{width:50}}></th>
                <th>Name</th><th>Role</th><th>Mobile</th><th>Username</th>
                <th>Join Date</th><th>Salary</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"/>
                </td></tr>
              ) : employees.map(e => (
                <tr key={e.Employee_ID}>
                  <td>
                    {e.Photo_Path
                      ? <img src={PHOTO_BASE + e.Photo_Path} alt={e.Name}
                          className="rounded-circle border" style={{width:38,height:38,objectFit:'cover'}}/>
                      : <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                          style={{width:38,height:38,background:'#6366f1',fontSize:14}}>
                          {e.Name[0]}
                        </div>
                    }
                  </td>
                  <td>
                    <div className="fw-semibold">{e.Name}</div>
                    {e.Father_Name && <small className="text-muted">S/o {e.Father_Name}</small>}
                  </td>
                  <td><span className={`badge bg-${roleColor(e.Role)}`}>{e.Role}</span></td>
                  <td>{e.Mobile||'—'}</td>
                  <td><code className="small">{e.Username}</code></td>
                  <td><small>{e.Join_Date||'—'}</small></td>
                  <td><small>{e.Monthly_Salary?'₹'+parseFloat(e.Monthly_Salary).toLocaleString():'—'}</small></td>
                  <td><span className={`badge ${e.Is_Active?'bg-success':'bg-secondary'}`}>{e.Is_Active?'Active':'Inactive'}</span></td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-primary" onClick={()=>openEdit(e)} title="Edit"><i className="bi bi-pencil"></i></button>
                      {e.Is_Active && <button className="btn btn-outline-danger" onClick={()=>handleDeactivate(e.Employee_ID)} title="Deactivate"><i className="bi bi-person-x"></i></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-badge me-2 text-primary"></i>
                  {editing ? 'Edit Employee' : 'Add Employee'}
                </h5>
                <button className="btn-close" onClick={()=>setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body pt-3">
                  {error && <div className="alert alert-danger py-2 rounded-3"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

                  <div className="row g-4">
                    {/* LEFT: Photo + basic */}
                    <div className="col-md-3">
                      {/* Photo upload */}
                      <div className="text-center p-3 bg-light rounded-3 border h-100 d-flex flex-column align-items-center justify-content-start gap-2">
                        <div className="mb-2" style={{width:100,height:100}}>
                          {form.Photo_Path
                            ? <img src={PHOTO_BASE + form.Photo_Path} alt="Photo"
                                className="rounded-circle border shadow-sm w-100 h-100" style={{objectFit:'cover'}}/>
                            : <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white w-100 h-100"
                                style={{background:'#6366f1',fontSize:32}}>
                                {(form.Name||'?')[0]}
                              </div>
                          }
                        </div>
                        <input ref={photoRef} type="file" accept="image/*" className="d-none" onChange={handlePhotoUpload}/>
                        <button type="button" className="btn btn-outline-primary btn-sm w-100"
                          onClick={()=>photoRef.current.click()} disabled={photoUploading}>
                          <i className="bi bi-camera me-1"></i>
                          {photoUploading ? 'Uploading…' : 'Upload Photo'}
                        </button>
                        <small className="text-muted">JPG/PNG · Max 2MB</small>
                        <hr className="w-100 my-2"/>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Role *</label>
                          <select className="form-select form-select-sm" required value={form.Role} onChange={e=>setF('Role',e.target.value)}>
                            {ROLES.map(r=><option key={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Status</label>
                          <select className="form-select form-select-sm" value={form.Is_Active??1} onChange={e=>setF('Is_Active',e.target.value)}>
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Tabs */}
                    <div className="col-md-9">
                      <ul className="nav nav-tabs mb-3">
                        <li className="nav-item"><a className="nav-link active" data-bs-toggle="tab" href="#emp-personal">Personal</a></li>
                        <li className="nav-item"><a className="nav-link" data-bs-toggle="tab" href="#emp-bank">Bank</a></li>
                        <li className="nav-item"><a className="nav-link" data-bs-toggle="tab" href="#emp-login">Login</a></li>
                      </ul>
                      <div className="tab-content">
                        {/* Personal Tab */}
                        <div className="tab-pane fade show active" id="emp-personal">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Full Name *</label>
                              <input className="form-control" required value={form.Name||''} onChange={e=>setF('Name',e.target.value)} placeholder="Full name"/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Mobile</label>
                              <input className="form-control" value={form.Mobile||''} onChange={e=>setF('Mobile',e.target.value)} placeholder="Mobile number"/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Father Name</label>
                              <input className="form-control" value={form.Father_Name||''} onChange={e=>setF('Father_Name',e.target.value)} placeholder="Father's name"/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Aadhar No</label>
                              <input className="form-control font-monospace" value={form.Aadhar_No||''} onChange={e=>setF('Aadhar_No',e.target.value)} placeholder="XXXX XXXX XXXX"/>
                            </div>
                            <div className="col-12">
                              <label className="form-label fw-semibold small">Address</label>
                              <textarea className="form-control" rows={2} value={form.Address||''} onChange={e=>setF('Address',e.target.value)} placeholder="Full address"/>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-semibold small">Join Date</label>
                              <input type="date" className="form-control" value={form.Join_Date||''} onChange={e=>setF('Join_Date',e.target.value)}/>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-semibold small">Monthly Salary (₹)</label>
                              <input type="number" className="form-control" value={form.Monthly_Salary||''} onChange={e=>setF('Monthly_Salary',e.target.value)} placeholder="0"/>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-semibold small">Advance Limit/Month</label>
                              <input type="number" className="form-control" value={form.Advance_Limit_Monthly||5000} onChange={e=>setF('Advance_Limit_Monthly',e.target.value)}/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Emergency Contact</label>
                              <input className="form-control" value={form.Emergency_Contact||''} onChange={e=>setF('Emergency_Contact',e.target.value)} placeholder="Emergency contact number"/>
                            </div>
                          </div>
                        </div>

                        {/* Bank Tab */}
                        <div className="tab-pane fade" id="emp-bank">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Bank Name</label>
                              <input className="form-control" value={form.Bank_Name||''} onChange={e=>setF('Bank_Name',e.target.value)} placeholder="e.g. SBI"/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Account Number</label>
                              <input className="form-control font-monospace" value={form.Bank_Account||''} onChange={e=>setF('Bank_Account',e.target.value)} placeholder="Account number"/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">IFSC Code</label>
                              <input className="form-control font-monospace" value={form.Bank_IFSC||''} onChange={e=>setF('Bank_IFSC',e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234"/>
                            </div>
                          </div>
                        </div>

                        {/* Login Tab */}
                        <div className="tab-pane fade" id="emp-login">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">Username *</label>
                              <input className="form-control font-monospace" required value={form.Username||''} onChange={e=>setF('Username',e.target.value)} placeholder="Login username"/>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold small">
                                {editing ? 'New Password (leave blank to keep)' : 'Password *'}
                              </label>
                              <input type="password" className="form-control" required={!editing} value={form.Password||''} onChange={e=>setF('Password',e.target.value)} placeholder="Password"/>
                            </div>
                          </div>
                          <div className="alert alert-info mt-3 py-2 rounded-3">
                            <i className="bi bi-info-circle me-2"></i>
                            Operators use the <strong>Employee Login</strong> page at <code>/employee-login</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light px-4" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-2"/>}
                    {editing ? 'Update Employee' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
