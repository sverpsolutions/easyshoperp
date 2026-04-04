import React, { useState, useEffect } from 'react'
import MasterCRUD from './MasterCRUD'
import { mastersAPI } from '../../../api/api'

export default function CategoryMaster() {
  const [subgroups, setSubgroups] = useState([])
  const [loaded, setLoaded]       = useState(false)

  useEffect(() => {
    mastersAPI.listSubgroups().then(r => {
      setSubgroups(r.data.data || [])
      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  const columns = [
    { key: 'Category_Name', label: 'Category Name' },
    { key: 'Subgroup_Name', label: 'Subgroup', render: v => v ? <span className="erp-badge erp-badge-blue">{v}</span> : '—' },
    { key: 'Group_Name',    label: 'Group',    render: v => v ? <span className="erp-badge erp-badge-gray">{v}</span> : '—' },
  ]

  const formFields = [
    { name: 'Category_Name', label: 'Category Name', required: true, placeholder: 'e.g. Barcode Printer, POS Paper', col: 12 },
    { name: 'Subgroup_ID', label: 'Parent Subgroup', type: 'select', col: 12,
      options: subgroups.map(s => ({ value: s.Subgroup_ID, label: `${s.Group_Name || ''} → ${s.Subgroup_Name}` })) },
  ]

  return (
    <MasterCRUD
      title="Category Master"
      subtitle="Third-level classification under subgroups"
      icon="bi-tags"
      iconBg="bg-success"
      columns={columns}
      formFields={formFields}
      fetchFn={mastersAPI.listCategories}
      createFn={mastersAPI.storeCategory}
      updateFn={mastersAPI.updateCategory}
      deleteFn={mastersAPI.deleteCategory}
      pkField="Category_ID"
      emptyMsg="No categories defined yet."
    />
  )
}
