import { Card, CardDescription, CardHeader, CardTitle } from "@/components/club/Card";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ParentsDashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tu familia"
        subtitle="Consulta cuotas anotadas y reservas de equipación cuando conectemos los datos."
      />
      <Card>
        <CardHeader>
          <CardTitle>Cuotas y ropa</CardTitle>
          <CardDescription>
            Aquí verás pagos anotados y reservas de equipación cuando conectemos
            datos reales o mocks.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
