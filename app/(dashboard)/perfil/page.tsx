import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Tu perfil</h2>
        <p className="text-sm text-muted-foreground">
          Aquí podrás consultar tus datos de cuenta cuando conectemos Supabase.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Información de usuario</CardTitle>
          <CardDescription>
            Vista preliminar del perfil. Próximamente: nombre, rol y datos de acceso.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
