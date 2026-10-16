import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { AddMemberForm } from "@/components/AddMemberForm";
import { ExpensesList } from "@/components/ExpensesList";
import { LiveUpdates } from "@/components/LiveUpdates";
import { MembersList } from "@/components/MembersList";
import { BalancesList, SettlementPanel } from "@/components/SettlementPanel";
import { ShareLink } from "@/components/ShareLink";
import { Card } from "@/components/ui";
import { listExpenses } from "@/lib/db/expenses";
import { findGroupBySlug } from "@/lib/db/groups";
import { formatCents } from "@/lib/money";
import { settle } from "@/lib/settlement";

/**
 * Con Cache Components, los datos de MongoDB y los params son dinámicos:
 * se leen dentro de <Suspense> para que el resto de la página forme parte
 * del shell estático que se sirve al instante.
 */
export default function GroupPage({ params }: PageProps<"/group/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Inicio
      </Link>
      <Suspense fallback={<GroupSkeleton />}>
        <GroupView params={params} />
      </Suspense>
    </main>
  );
}

async function GroupView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await findGroupBySlug(slug);
  if (!group) notFound();

  const expenses = await listExpenses(group.id);
  const { balances, transfers } = settle(group.members, expenses);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {group.members.length} miembros · {expenses.length} gastos · total{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {formatCents(total)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareLink slug={group.slug} />
          <LiveUpdates slug={group.slug} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <Card title="Nuevo gasto">
            <AddExpenseForm slug={group.slug} members={group.members} />
          </Card>
          <Card title="Gastos">
            <ExpensesList expenses={expenses} memberCount={group.members.length} />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Cómo saldar las cuentas">
            <SettlementPanel transfers={transfers} />
          </Card>
          <Card title="Balances">
            <BalancesList balances={balances} />
          </Card>
          <Card title="Miembros">
            <div className="flex flex-col gap-4">
              <MembersList members={group.members} />
              <AddMemberForm slug={group.slug} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function GroupSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy>
      <div className="h-9 w-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="h-80 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-80 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
