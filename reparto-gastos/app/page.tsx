import { CreateGroupForm } from "@/components/CreateGroupForm";
import { FindGroupForm } from "@/components/FindGroupForm";
import { Card } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-10 px-4 py-12">
      <header className="text-center">
        <p className="text-4xl">💸</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Reparto de gastos</h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
          Apunta quién paga qué y te decimos cómo saldar las cuentas con el
          mínimo número de transferencias. Sin registro: comparte el enlace
          del grupo y listo.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Crear un grupo">
          <CreateGroupForm />
        </Card>
        <Card title="Entrar en un grupo">
          <FindGroupForm />
        </Card>
      </div>
    </main>
  );
}
