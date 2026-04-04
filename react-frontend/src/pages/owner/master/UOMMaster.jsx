import React from 'react'
import MasterCRUD from './MasterCRUD'
import { mastersAPI } from '../../../api/api'

const UOM_TYPES = ['Count', 'Length', 'Weight', 'Volume', 'Area', 'Time']

const columns = [
  { key: 'UOM_Code', label: 'Code', render: v => <span className="fw-bold font-monospace text-primary">{v}</span> },
  { key: 'UOM_Name', label: 'Name' },
  { key: 'UOM_Type', label: 'Type', render: v => (
    <span className={`erp-badge ${v === 'Count' ? 'erp-badge-blue' : v === 'Weight' ? 'erp-badge-orange' : v === 'Length' ? 'erp-badge-green' : 'erp-badge-purple'}`}>
      {v}
    </span>
  )},
]

const formFields = [
  { name: 'UOM_Code', label: 'UOM Code', required: true, placeholder: 'PCS', col: 4 },
  { name: 'UOM_Name', label: 'Unit Name', required: true, placeholder: 'Pieces', col: 4 },
  { name: 'UOM_Type', label: 'Type', type: 'select', col: 4,
    options: UOM_TYPES.map(t => ({ value: t, label: t })) },
]

export default function UOMMaster() {
  return (
    <MasterCRUD
      title="UOM Master"
      subtitle="Units of Measure — Roll, PCS, KG, MTR, Box, Carton…"
      icon="bi-rulers"
      iconBg="bg-info"
      columns={columns}
      formFields={formFields}
      fetchFn={mastersAPI.listUOM}
      createFn={mastersAPI.storeUOM}
      updateFn={mastersAPI.updateUOM}
      deleteFn={mastersAPI.deleteUOM}
      pkField="UOM_ID"
      emptyMsg="No UOM defined yet."
    />
  )
}
