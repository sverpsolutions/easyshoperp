import React from 'react'
import MasterCRUD from './MasterCRUD'
import { mastersAPI } from '../../../api/api'

const columns = [
  { key: 'Tax_Name',  label: 'Tax Name' },
  { key: 'CGST_Pct',  label: 'CGST %',  render: v => `${v}%` },
  { key: 'SGST_Pct',  label: 'SGST %',  render: v => `${v}%` },
  { key: 'IGST_Pct',  label: 'IGST %',  render: v => `${v}%` },
  {
    key: 'Total_Pct', label: 'Total %',
    render: v => (
      <span className="erp-badge erp-badge-blue fw-bold" style={{fontSize:'.8rem'}}>
        {v}%
      </span>
    )
  },
]

const formFields = [
  { name: 'Tax_Name', label: 'Tax Name',    required: true,  placeholder: 'GST 18%', col: 12 },
  { name: 'CGST_Pct', label: 'CGST %',     required: true,  type: 'number', placeholder: '9', col: 4 },
  { name: 'SGST_Pct', label: 'SGST %',     required: true,  type: 'number', placeholder: '9', col: 4 },
  { name: 'IGST_Pct', label: 'IGST %',     required: false, type: 'number', placeholder: '18', col: 4 },
]

export default function GSTMaster() {
  return (
    <MasterCRUD
      title="GST Tax Master"
      subtitle="Define GST tax slabs — CGST, SGST, IGST percentages"
      icon="bi-percent"
      iconBg="bg-warning"
      columns={columns}
      formFields={formFields}
      fetchFn={mastersAPI.listGST}
      createFn={mastersAPI.storeGST}
      updateFn={mastersAPI.updateGST}
      deleteFn={mastersAPI.deleteGST}
      pkField="GST_Tax_ID"
      emptyMsg="No GST slabs defined yet."
    />
  )
}
