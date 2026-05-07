import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Payment } from "@/lib/mocks/admin";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function RecentPaymentsCard({ payments }: { payments: Payment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos pagos registrados</CardTitle>
        <CardDescription>Movimientos ficticios de ejemplo.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Familia</TableHead>
              <TableHead>Jugador/a</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.parent}</TableCell>
                <TableCell>{p.child}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {eur.format(p.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={p.method === "transferencia" ? "secondary" : "outline"}>
                    {p.method === "transferencia" ? "Transferencia" : "Efectivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dateFmt.format(new Date(p.date))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
