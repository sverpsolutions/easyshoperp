import React from 'react'
import MasterCRUD from './MasterCRUD'
import { mastersAPI } from '../../../api/api'

const columns = [
  { key: 'Group_Name', label: 'Group Name' },
]

const formFields = [
  { name: 'Group_Name', label: 'Group Name', required: true, placeholder: 'e.g. Barcode Labels, Hardware, Consumables', col: 12 },
]

export default function GroupMaster() {
  return (
    <MasterCRUD
      title="Group Master"
      subtitle="Top-level item grouping — Barcode Labels, Hardware, Thermal Rolls…"
      icon="bi-collection"
      iconBg="bg-primary"
      columns={columns}
      formFields={formFields}
      fetchFn={mastersAPI.listGroups}
      createFn={mastersAPI.storeGroup}
      updateFn={mastersAPI.updateGroup}
      deleteFn={mastersAPI.deleteGroup}
      pkField="Group_ID"
      emptyMsg="No groups defined yet."
    />
  )
}
