'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface Branch {
  id: string
  name: string
}

interface BranchContextType {
  branchId: string
  branchName: string
  setBranch: (id: string) => void
  branches: Branch[]
}

const BranchContext = createContext<BranchContextType>({
  branchId: '',
  branchName: '',
  setBranch: () => {},
  branches: [],
})

export function BranchProvider({ children, serverBranches = [] }: { children: React.ReactNode; serverBranches?: Branch[] }) {
  const [branchId, setBranchId] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('selectedBranchId')
    if (saved && serverBranches.some(b => b.id === saved)) {
      setBranchId(saved)
    } else if (serverBranches.length > 0) {
      setBranchId(serverBranches[0].id)
      localStorage.setItem('selectedBranchId', serverBranches[0].id)
    }
  }, [serverBranches])

  const setBranch = useCallback((id: string) => {
    setBranchId(id)
    localStorage.setItem('selectedBranchId', id)
  }, [])

  const selected = serverBranches.find(b => b.id === branchId)

  return (
    <BranchContext.Provider value={{ branchId, branchName: selected?.name ?? '', setBranch, branches: serverBranches }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  return useContext(BranchContext)
}
