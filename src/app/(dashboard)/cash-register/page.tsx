import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { CashRegisterView } from '@/modules/cash-register/components/cash-register-view'

export default function CashRegisterPage() {
  return (
    <PageContainer>
      <PageHeader title="Caja" description="Movimientos y saldo de caja por sucursal" />
      <CashRegisterView />
    </PageContainer>
  )
}
