import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ParentsDashboardPage() {
  return (
    <div className="space-y-4">
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
