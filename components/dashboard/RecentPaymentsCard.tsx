import { Badge } from "@/components/club/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/club/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payments/constants";
import type { RecentPayment } from "@/lib/payments/dashboard-stats";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function methodBadge(method: string | null) {
  if (!method) return <span className="text-muted-foreground">—</span>;
  const label = PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
  return <Badge variant={method === "transferencia" ? "secondary" : "outline"}>{label}</Badge>;
}

export function RecentPaymentsCard({ payments }: { payments: RecentPayment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos pagos registrados</CardTitle>
        <CardDescription>Cobros anotados más recientes de la temporada.</CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no hay cobros anotados esta temporada.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador/a</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="club-table__primary">{p.playerName}</TableCell>
                  <TableCell>{p.concept}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {eur.format(p.amount)}
                  </TableCell>
                  <TableCell>{methodBadge(p.method)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFmt.format(new Date(`${p.date}T00:00:00`))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
