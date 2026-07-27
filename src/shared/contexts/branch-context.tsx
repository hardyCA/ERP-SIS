'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getActiveBranches } from '@/shared/actions/branches'

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

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branchId, setBranchId] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('selectedBranchId')
    if (saved)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBranchId(saved)
  }, [])

  const { data } = useQuery({
    queryKey: ['active-branches'],
    queryFn: getActiveBranches,
    staleTime: 60000,
  })

  const branches = (data?.success ? data.data : []) as Branch[]

  const setBranch = useCallback((id: string) => {
    setBranchId(id)
    localStorage.setItem('selectedBranchId', id)
  }, [])

  const selected = branches.find(b => b.id === branchId)

  return (
    <BranchContext.Provider value={{ branchId, branchName: selected?.name ?? '', setBranch, branches }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  return useContext(BranchContext)
}
