import { Button } from "@/components/ui/button";
import { AuthLayout } from "./AuthLayout.tsx";
import { ScreenTitle } from "./ScreenTitle.tsx";

export function UnreadableDataScreen(props: { onReset: () => void }) {
  return (
    <main>
      <AuthLayout>
        <ScreenTitle title="No se pueden leer tus datos guardados">
          No se pueden leer tus datos guardados
        </ScreenTitle>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          Los datos que este navegador guarda para Snailrace están dañados, así
          que no vamos a adivinar tu saldo. Al restablecerlos se eliminan todas
          las cuentas y recargas guardadas en este navegador.
        </p>
        <Button className="w-full" onClick={props.onReset}>
          Restablecer datos locales
        </Button>
      </AuthLayout>
    </main>
  );
}

export function RenderErrorScreen() {
  return (
    <main>
      <AuthLayout>
        <ScreenTitle title="Algo salió mal">Algo salió mal</ScreenTitle>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          La página tuvo un error inesperado. Tu saldo y tus recargas están a
          salvo en este navegador.
        </p>
        <Button className="w-full" onClick={() => window.location.reload()}>
          Recargar la página
        </Button>
      </AuthLayout>
    </main>
  );
}
