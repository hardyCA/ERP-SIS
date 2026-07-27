import { PageHeader } from '@/shared/components/page-header'
import { CashRegisterView } from '@/modules/cash-register/components/cash-register-view'

export default function CashRegisterPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Caja" description="Movimientos y saldo de caja por sucursal" />
      <CashRegisterView />
    </div>
  )
}
