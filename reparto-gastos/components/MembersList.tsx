import { Avatar } from "./ui";

export function MembersList({ members }: { members: string[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-zinc-500">Todavía no hay miembros.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {members.map((m) => (
        <li
          key={m}
          className="flex items-center gap-2 rounded-full bg-zinc-100 py-1 pr-3 pl-1 text-sm dark:bg-zinc-800"
        >
          <Avatar name={m} />
          {m}
        </li>
      ))}
    </ul>
  );
}
