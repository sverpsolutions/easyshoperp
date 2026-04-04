import React from 'react'
import MasterCRUD from './MasterCRUD'
import { mastersAPI } from '../../../api/api'

const columns = [
  { key: 'Manufacturer_Name', label: 'Manufacturer' },
  { key: 'Short_Code', label: 'Code', render: v => v ? <span className="fw-bold font-monospace text-primary">{v}</span> : '—' },
  { key: 'Country',    label: 'Country', render: v => (
    <span className="erp-badge erp-badge-gray">{v || 'India'}</span>
  )},
  { key: 'Mobile',        label: 'Mobile', render: v => v || '—' },
  { key: 'Contact_Person', label: 'Contact', render: v => v || '—' },
]

const formFields = [
  { name: 'Manufacturer_Name', label: 'Manufacturer Name', required: true, placeholder: 'Zebra Technologies', col: 8 },
  { name: 'Short_Code',        label: 'Short Code',        placeholder: 'ZEBRA',  col: 4 },
  { name: 'Country',           label: 'Country',           placeholder: 'India',  col: 4 },
  { name: 'Contact_Person',    label: 'Contact Person',    placeholder: 'Name',   col: 4 },
  { name: 'Mobile',            label: 'Mobile',            placeholder: '+91…',   col: 4 },
  { name: 'Email',             label: 'Email',             type: 'email', placeholder: 'info@mfr.com', col: 6 },
  { name: 'Website',           label: 'Website',           placeholder: 'https://…', col: 6 },
  { name: 'Address',           label: 'Address',           type: 'textarea', placeholder: 'Full address', col: 12 },
  { name: 'Notes',             label: 'Notes',             type: 'textarea', placeholder: 'Any notes', col: 12 },
]

export default function ManufacturerMaster() {
  return (
    <MasterCRUD
      title="Manufacturer Master"
      subtitle="Hardware manufacturers — Zebra, Honeywell, TSC, HP, Dell…"
      icon="bi-factory"
      iconBg="bg-secondary"
      columns={columns}
      formFields={formFields}
      fetchFn={mastersAPI.listManufacturers}
      createFn={mastersAPI.storeManufacturer}
      updateFn={mastersAPI.updateManufacturer}
      deleteFn={mastersAPI.deleteManufacturer}
      pkField="Manufacturer_ID"
      emptyMsg="No manufacturers added yet."
    />
  )
}
