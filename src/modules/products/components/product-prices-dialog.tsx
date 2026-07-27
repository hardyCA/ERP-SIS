'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getActiveBranches, getProductBranchPrices, setProductBranchPrice } from '../actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface ProductPricesDialogProps {
  productId: string
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductPricesDialog({ productId, productName, open, onOpenChange }: ProductPricesDialogProps) {
  const queryClient = useQueryClient()
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedBranch, setSavedBranch] = useState<string | null>(null)

  const { data: branchesData } = useQuery({
    queryKey: ['active-branches'],
    queryFn: getActiveBranches,
    staleTime: 30000,
  })

  const { data: pricesData, isLoading } = useQuery({
    queryKey: ['product-prices', productId],
    queryFn: () => getProductBranchPrices(productId),
    enabled: open,
    staleTime: 0,
  })

  const branches = (branchesData?.success ? (branchesData.data ?? []) : []) as Array<{ id: string; name: string }>

  const existingPrices = (pricesData?.success ? (pricesData.data ?? []) : []) as Array<Record<string, unknown>>

  const getBranchPrice = (branchId: string) => {
    if (prices[branchId] !== undefined) return prices[branchId]
    const existing = existingPrices.find(p => (p as Record<string, unknown>).branch_id === branchId)
    return existing ? String((existing as Record<string, unknown>).sale_price ?? '') : ''
  }

  const handleSave = async (branchId: string) => {
    setSaving(true)
    setSavedBranch(null)
    const formData = new FormData()
    formData.set('product_id', productId)
    formData.set('branch_id', branchId)
    formData.set('sale_price', prices[branchId] ?? '0')
    await setProductBranchPrice(formData)
    queryClient.invalidateQueries({ queryKey: ['product-prices', productId] })
    setSaving(false)
    setSavedBranch(branchId)
    setTimeout(() => setSavedBranch(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Precios por sucursal</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-80 overflow-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : (
            branches.map((branch) => {
              const existing = existingPrices.find(p => (p as Record<string, unknown>).branch_id === branch.id) as Record<string, unknown> | undefined
              return (
                <div key={branch.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{branch.name}</p>
                    {existing && (existing.quantity as number) > 0 && (
                      <p className="text-xs text-muted-foreground">Stock: {existing.quantity as number}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Bs</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-9 w-24"
                      placeholder="0.00"
                      value={getBranchPrice(branch.id)}
                      onChange={(e) => setPrices(prev => ({ ...prev, [branch.id]: e.target.value }))}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant={savedBranch === branch.id ? 'default' : 'outline'}
                    onClick={() => handleSave(branch.id)}
                    disabled={saving}
                  >
                    {savedBranch === branch.id ? '✓' : 'Guardar'}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}