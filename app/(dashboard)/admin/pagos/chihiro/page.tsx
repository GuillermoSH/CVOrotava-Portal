"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  showcasePaymentConcepts,
  showcasePaymentsSeed,
  showcasePlayers,
  type ShowcasePayment,
  type ShowcasePaymentMethod,
} from "@/lib/mocks/payments-showcase";
import { buildMockPayment, filterPlayers, parseAmount } from "@/lib/payments/showcase-domain";

function PaymentForm({
  players,
  playerId,
  setPlayerId,
  concept,
  setConcept,
  amount,
  setAmount,
  method,
  setMethod,
  note,
  setNote,
  onSubmit,
}: {
  players: typeof showcasePlayers;
  playerId: string;
  setPlayerId: (value: string) => void;
  concept: string;
  setConcept: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  method: ShowcasePaymentMethod;
  setMethod: (value: ShowcasePaymentMethod) => void;
  note: string;
  setNote: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="chihiro-player">Jugador</Label>
        <select
          id="chihiro-player"
          value={playerId}
          onChange={(event) => setPlayerId(event.currentTarget.value)}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} · {player.familyName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="chihiro-concept">Concepto</Label>
        <select
          id="chihiro-concept"
          value={concept}
          onChange={(event) => setConcept(event.currentTarget.value)}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
        >
          {showcasePaymentConcepts.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="chihiro-amount">Importe</Label>
        <Input
          id="chihiro-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.currentTarget.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="chihiro-method">Método</Label>
        <select
          id="chihiro-method"
          value={method}
          onChange={(event) => setMethod(event.currentTarget.value as ShowcasePaymentMethod)}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
        >
          <option value="transferencia">Transferencia</option>
          <option value="efectivo">Efectivo</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="chihiro-note">Nota</Label>
        <Input
          id="chihiro-note"
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="Opcional"
        />
      </div>
      <Button type="button" className="h-10 w-full" onClick={onSubmit}>
        Registrar pago
      </Button>
    </div>
  );
}

export default function AdminPaymentsChihiroPage() {
  const [query, setQuery] = React.useState("");
  const [playerId, setPlayerId] = React.useState(showcasePlayers[0]?.id ?? "");
  const [concept, setConcept] = React.useState<string>(showcasePaymentConcepts[0]);
  const [amount, setAmount] = React.useState("45");
  const [method, setMethod] = React.useState<ShowcasePaymentMethod>("transferencia");
  const [note, setNote] = React.useState("");
  const [payments, setPayments] = React.useState<ShowcasePayment[]>(showcasePaymentsSeed);
  const [feedback, setFeedback] = React.useState("Control de pagos listo.");
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const filteredPayments = React.useMemo(() => {
    const visiblePlayers = filterPlayers(showcasePlayers, query).map((player) => player.id);
    const idSet = new Set(visiblePlayers);
    return payments.filter((payment) => idSet.has(payment.playerId));
  }, [payments, query]);

  function submitPayment() {
    const player = showcasePlayers.find((item) => item.id === playerId);
    if (!player) return;
    const parsed = parseAmount(amount);
    if (!parsed) {
      setFeedback("Importe inválido. Debe ser mayor que 0.");
      return;
    }
    const payment = buildMockPayment({
      player,
      concept,
      amount: parsed,
      method,
      note,
    });
    setPayments((current) => [payment, ...current]);
    setFeedback(`Pago añadido para ${player.name}.`);
    setMobileOpen(false);
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">CHIHIRO · Control analítico</h2>
        <p className="text-sm text-muted-foreground">
          En móvil usa alta rápida en panel inferior; en tablet mantiene panel lateral fijo.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtros y estado</CardTitle>
          <CardDescription>Búsqueda y seguimiento de pagos en un solo vistazo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Filtrar por jugador, familia o equipo"
            />
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogTrigger render={<Button className="h-10 md:hidden" />}>Nuevo pago</DialogTrigger>
              <DialogContent className="top-auto bottom-0 left-1/2 w-full max-w-[calc(100%-0.5rem)] -translate-x-1/2 -translate-y-0 rounded-b-none rounded-t-xl p-3 sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Alta rápida en móvil</DialogTitle>
                  <DialogDescription>Registra un pago sin salir del listado.</DialogDescription>
                </DialogHeader>
                <PaymentForm
                  players={showcasePlayers}
                  playerId={playerId}
                  setPlayerId={setPlayerId}
                  concept={concept}
                  setConcept={setConcept}
                  amount={amount}
                  setAmount={setAmount}
                  method={method}
                  setMethod={setMethod}
                  note={note}
                  setNote={setNote}
                  onSubmit={submitPayment}
                />
              </DialogContent>
            </Dialog>
          </div>
          <p className="rounded-md border bg-muted/40 p-2 text-sm" role="status" aria-live="polite">
            {feedback}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Historial filtrado</CardTitle>
            <CardDescription>{filteredPayments.length} pagos visibles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.slice(0, 14).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <p className="font-medium">{payment.playerName}</p>
                        <p className="text-xs text-muted-foreground">{payment.familyName}</p>
                      </TableCell>
                      <TableCell>{payment.concept}</TableCell>
                      <TableCell className="text-right">{payment.amount} EUR</TableCell>
                      <TableCell>
                        <Badge variant={payment.method === "transferencia" ? "secondary" : "outline"}>
                          {payment.method}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>Panel lateral de alta</CardTitle>
            <CardDescription>Visible en tablet para registro continuo.</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentForm
              players={showcasePlayers}
              playerId={playerId}
              setPlayerId={setPlayerId}
              concept={concept}
              setConcept={setConcept}
              amount={amount}
              setAmount={setAmount}
              method={method}
              setMethod={setMethod}
              note={note}
              setNote={setNote}
              onSubmit={submitPayment}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
