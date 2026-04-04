import React, { useState, useEffect, useRef } from 'react'
import { machinesAPI } from '../../api/api'
import { uploadImage } from '../../api/api'

const STATUS_BADGE = {
  Running:     'bg-success',
  Idle:        'bg-secondary',
  Stopped:     'bg-warning text-dark',
  Maintenance: 'bg-danger',
}

const defaultForm = {
  Machine_Name: '', Machine_Type: 'Auto', Location: '',
  Machine_Category: 'Flat Belt', Target_Impressions_Per_Hour: 0,
  Notes: '', Status: 'Idle', Photo_Path: '',
}

const PHOTO_BASE = import.meta.env.VITE_APP_URL || ''

export default function MachinesPage() {
  const [machines, setMachines]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(defaultForm)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [filterType, setFilterType] = useState('')
  const [photoUploading, setPU]   = useState(false)
  const photoRef = useRef()

  const load = () => {
    machinesAPI.list().then(r => setMachines(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew  = () => { setForm(defaultForm); setEditing(null); setError(''); setShowModal(true) }
  const openEdit = m  => { setForm({ ...m }); setEditing(m.Machine_ID); setError(''); setShowModal(true) }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await machinesAPI.update(editing, form)
      else         await machinesAPI.store(form)
      setShowModal(false); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving machine')
    } finally { setSaving(false) }
  }

  const handleDecommission = async id => {
    if (!confirm('Decommission this machine?')) return
    try { await machinesAPI.delete(id); load() }
    catch (err) { alert(err.response?.data?.message || 'Error') }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setPU(true)
    try {
      const { data } = await uploadImage(file, 'machine')
      setF('Photo_Path', data.data.url)
    } catch { setError('Photo upload failed') }
    finally { setPU(false); e.target.value = '' }
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const filtered = filterType ? machines.filter(m => m.Machine_Type === filterType) : machines

  const summary = {
    total:       machines.length,
    running:     machines.filter(m => m.Status === 'Running').length,
    idle:        machines.filter(m => m.Status === 'Idle').length,
    maintenance: machines.filter(m => m.Status === 'Maintenance').length,
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold"><i className="bi bi-cpu me-2 text-primary"></i>Machines</h4>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" style={{width:130}}
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Auto">Auto</option>
            <option value="Manual">Manual</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            <i className="bi bi-plus-lg me-1"></i>Add Machine
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total',       value:summary.total,       icon:'bi-cpu',          color:'primary' },
          { label:'Running',     value:summary.running,     icon:'bi-play-circle',  color:'success' },
          { label:'Idle',        value:summary.idle,        icon:'bi-pause-circle', color:'secondary' },
          { label:'Maintenance', value:summary.maintenance, icon:'bi-tools',        color:'danger' },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className={`rounded-circle bg-${c.color} bg-opacity-10 p-3`}>
                  <i className={`bi ${c.icon} fs-4 text-${c.color}`}></i>
                </div>
                <div>
                  <div className="fs-3 fw-bold">{c.value}</div>
                  <div className="text-muted small">{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{width:60}}></th>
                <th>#</th><th>Machine Name</th><th>Type</th><th>Category</th>
                <th>Location</th><th>Target/Hr</th><th>Status</th><th>Current Job</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"/>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-5 text-muted">
                  <i className="bi bi-cpu me-2"></i>No machines found
                </td></tr>
              ) : filtered.map(m => (
                <tr key={m.Machine_ID}>
                  <td>
                    {m.Photo_Path
                      ? <img src={PHOTO_BASE + m.Photo_Path} alt={m.Machine_Name}
                          className="rounded-2 border" style={{width:42,height:42,objectFit:'cover'}}/>
                      : <div className="rounded-2 d-flex align-items-center justify-content-center bg-light border"
                          style={{width:42,height:42}}>
                          <i className="bi bi-cpu text-muted fs-5"></i>
                        </div>
                    }
                  </td>
                  <td className="text-muted small">{m.Machine_ID}</td>
                  <td>
                    <div className="fw-semibold">{m.Machine_Name}</div>
                    {m.Notes && <small className="text-muted">{m.Notes}</small>}
                  </td>
                  <td>
                    <span className={`badge ${m.Machine_Type==='Auto'?'bg-primary':'bg-info text-dark'}`}>
                      {m.Machine_Type}
                    </span>
                  </td>
                  <td>{m.Machine_Category||'—'}</td>
                  <td>{m.Location||'—'}</td>
                  <td>{m.Target_Impressions_Per_Hour>0 ? parseInt(m.Target_Impressions_Per_Hour).toLocaleString() : '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[m.Status]||'bg-secondary'}`}>{m.Status}</span></td>
                  <td>
                    {m.Current_Job_ID
                      ? <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle">Job #{m.Current_Job_ID}</span>
                      : <span className="text-muted small">—</span>
                    }
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-primary" title="Edit" onClick={()=>openEdit(m)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      {m.Status!=='Running' && m.Status!=='Maintenance' && (
                        <button className="btn btn-outline-danger" title="Decommission" onClick={()=>handleDecommission(m.Machine_ID)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
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
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content rounded-3 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-cpu me-2 text-primary"></i>
                  {editing ? 'Edit Machine' : 'Add Machine'}
                </h5>
                <button className="btn-close" onClick={()=>setShowModal(false)}/>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body pt-3">
                  {error && <div className="alert alert-danger py-2 rounded-3"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

                  <div className="row g-4">
                    {/* LEFT: Thumbnail */}
                    <div className="col-md-3">
                      <div className="text-center p-3 bg-light rounded-3 border h-100 d-flex flex-column align-items-center justify-content-start gap-2">
                        {form.Photo_Path
                          ? <img src={PHOTO_BASE + form.Photo_Path} alt="Machine"
                              className="rounded-3 border shadow-sm" style={{width:100,height:100,objectFit:'cover'}}/>
                          : <div className="rounded-3 d-flex align-items-center justify-content-center bg-white border"
                              style={{width:100,height:100}}>
                              <i className="bi bi-cpu fs-1 text-muted"></i>
                            </div>
                        }
                        <input ref={photoRef} type="file" accept="image/*" className="d-none" onChange={handlePhotoUpload}/>
                        <button type="button" className="btn btn-outline-primary btn-sm w-100"
                          onClick={()=>photoRef.current.click()} disabled={photoUploading}>
                          <i className="bi bi-camera me-1"></i>
                          {photoUploading ? 'Uploading…' : 'Upload Photo'}
                        </button>
                        <small className="text-muted">JPG/PNG · Max 2MB</small>
                        <hr className="w-100 my-2"/>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Status</label>
                          <select className="form-select form-select-sm" value={form.Status||'Idle'} onChange={e=>setF('Status',e.target.value)}>
                            <option value="Idle">Idle</option>
                            <option value="Running">Running</option>
                            <option value="Stopped">Stopped</option>
                            <option value="Maintenance">Maintenance</option>
                          </select>
                        </div>
                        <div className="w-100">
                          <label className="form-label small fw-semibold">Type</label>
                          <select className="form-select form-select-sm" value={form.Machine_Type||'Auto'} onChange={e=>setF('Machine_Type',e.target.value)}>
                            <option value="Auto">Auto</option>
                            <option value="Manual">Manual</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Details */}
                    <div className="col-md-9">
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-semibold small">Machine Name *</label>
                          <input className="form-control" required value={form.Machine_Name||''}
                            placeholder="e.g. Machine-01" onChange={e=>setF('Machine_Name',e.target.value)}/>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Location</label>
                          <input className="form-control" value={form.Location||''}
                            placeholder="e.g. Section A" onChange={e=>setF('Location',e.target.value)}/>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Category</label>
                          <input className="form-control" value={form.Machine_Category||''}
                            placeholder="e.g. Flat Belt, Rotary" onChange={e=>setF('Machine_Category',e.target.value)}/>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Target Impressions / Hour</label>
                          <input type="number" className="form-control" min="0"
                            value={form.Target_Impressions_Per_Hour||0}
                            onChange={e=>setF('Target_Impressions_Per_Hour',e.target.value)}/>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Notes</label>
                          <input className="form-control" value={form.Notes||''}
                            placeholder="Optional notes" onChange={e=>setF('Notes',e.target.value)}/>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light px-4" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-2"/>}
                    {editing ? 'Update Machine' : 'Add Machine'}
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
