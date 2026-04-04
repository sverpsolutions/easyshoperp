import React, { useState, useEffect, useCallback } from 'react'
import MasterCRUD from './MasterCRUD'
import { mastersAPI } from '../../../api/api'

export default function SubgroupMaster() {
  const [groups, setGroups]   = useState([])
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    mastersAPI.listGroups().then(r => {
      setGroups(r.data.data || [])
      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  const columns = [
    { key: 'Subgroup_Name', label: 'Subgroup Name' },
    { key: 'Group_Name',    label: 'Parent Group', render: v => v ? <span className="erp-badge erp-badge-blue">{v}</span> : '—' },
  ]

  const formFields = [
    { name: 'Subgroup_Name', label: 'Subgroup Name', required: true, placeholder: 'e.g. Thermal Transfer, Direct Thermal', col: 12 },
    { name: 'Group_ID', label: 'Parent Group', type: 'select', col: 12,
      options: groups.map(g => ({ value: g.Group_ID, label: g.Group_Name })) },
  ]

  return (
    <MasterCRUD
      title="Subgroup Master"
      subtitle="Second-level classification under groups"
      icon="bi-diagram-2"
      iconBg="bg-info"
      columns={columns}
      formFields={formFields}
      fetchFn={mastersAPI.listSubgroups}
      createFn={mastersAPI.storeSubgroup}
      updateFn={mastersAPI.updateSubgroup}
      deleteFn={mastersAPI.deleteSubgroup}
      pkField="Subgroup_ID"
      emptyMsg="No subgroups defined yet."
    />
  )
}
