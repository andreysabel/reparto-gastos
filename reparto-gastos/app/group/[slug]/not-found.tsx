import Link from "next/link";

export default function GroupNotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Grupo no encontrado</h1>
      <p className="text-zinc-500">
        Revisa el enlace: puede que el código del grupo esté mal escrito.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
