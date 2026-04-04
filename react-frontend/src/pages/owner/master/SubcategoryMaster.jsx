import React, { useState, useEffect } from 'react'
import MasterCRUD from './MasterCRUD'
import { mastersAPI } from '../../../api/api'

export default function SubcategoryMaster() {
  const [categories, setCategories] = useState([])
  const [loaded, setLoaded]         = useState(false)

  useEffect(() => {
    mastersAPI.listCategories().then(r => {
      setCategories(r.data.data || [])
      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  const columns = [
    { key: 'Subcategory_Name', label: 'Subcategory Name' },
    { key: 'Category_Name',    label: 'Category', render: v => v ? <span className="erp-badge erp-badge-green">{v}</span> : '—' },
    { key: 'Subgroup_Name',    label: 'Subgroup', render: v => v ? <span className="erp-badge erp-badge-blue">{v}</span> : '—' },
  ]

  const formFields = [
    { name: 'Subcategory_Name', label: 'Subcategory Name', required: true, placeholder: 'e.g. 4-inch Printer, Direct Thermal Roll', col: 12 },
    { name: 'Category_ID', label: 'Parent Category', type: 'select', col: 12,
      options: categories.map(c => ({ value: c.Category_ID, label: `${c.Subgroup_Name || ''} → ${c.Category_Name}` })) },
  ]

  return (
    <MasterCRUD
      title="Subcategory Master"
      subtitle="Deepest level of item classification"
      icon="bi-tag"
      iconBg="bg-warning"
      columns={columns}
      formFields={formFields}
      fetchFn={mastersAPI.listSubcategories}
      createFn={mastersAPI.storeSubcategory}
      updateFn={mastersAPI.updateSubcategory}
      deleteFn={mastersAPI.deleteSubcategory}
      pkField="Subcategory_ID"
      emptyMsg="No subcategories defined yet."
    />
  )
}
