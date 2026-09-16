## Phase 1

### Task 6: Category pie chart — remove legend, add row swatch+icon, sort descending (items 2a, 2b, part of 2g)

**Files:**

- Modify: `frontend/src/components/category-pie-chart.tsx`

**Interfaces:**

- Consumes: `CategoryIcon` (Task 5).
- Produces: no interface change — `CategoryPieChart` keeps the same props (`data`, `colors`, `emptyLabel`); the caller (`dashboard/index.tsx`, Task 13) is unaffected by this task.

- [ ] **Step 1: Remove the Recharts `<Legend>` and add swatch+icon to each row, sorted descending**

Replace `frontend/src/components/category-pie-chart.tsx` in full:

```tsx
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CategoryIcon } from "../lib/category-icons";
import { formatCurrencyCents, getCategoryLabel } from "../lib/categories";
import { useIsDarkTheme } from "./theme-toggle";

export type PieDatum = {
 category: string;
 total: number;
 percentage: number;
};

function TooltipContent({
 active,
 payload,
}: {
 active?: boolean;
 payload?: { payload: PieDatum }[];
}) {
 if (!active || !payload?.length) return null;
 const datum = payload[0]?.payload;
 if (!datum) return null;

 return (
  <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm shadow-lg">
   <p className="font-medium">{getCategoryLabel(datum.category)}</p>
   <p className="text-(--color-fg-muted)">
    {formatCurrencyCents(datum.total)} ·{" "}
    {datum.percentage.toFixed(1)}%
   </p>
  </div>
 );
}

export function CategoryPieChart({
 data,
 colors,
 emptyLabel,
}: {
 data: PieDatum[];
 colors: Record<string, { light: string; dark: string }>;
 emptyLabel: string;
}) {
 const isDark = useIsDarkTheme();

 if (data.length === 0) {
  return (
   <p className="py-8 text-center text-sm text-(--color-fg-muted)">
    {emptyLabel}
   </p>
  );
 }

 const sorted = [...data].sort((a, b) => b.total - a.total);

 return (
  <div>
   <div className="h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
     <PieChart>
      <Pie
       data={sorted}
       dataKey="percentage"
       nameKey="category"
       innerRadius="55%"
       outerRadius="80%"
       paddingAngle={2}
       strokeWidth={2}
       stroke="var(--color-surface)"
      >
       {sorted.map((entry) => {
        const color = colors[entry.category];
        const fill = color
         ? isDark
          ? color.dark
          : color.light
         : "#898781";
        return (
         <Cell key={entry.category} fill={fill} />
        );
       })}
      </Pie>
      <Tooltip content={<TooltipContent />} />
     </PieChart>
    </ResponsiveContainer>
   </div>

   <ul className="mt-2 flex flex-col divide-y divide-(--color-border) border-t border-(--color-border)">
    {sorted.map((entry) => {
     const color = colors[entry.category];
     const swatch = color
      ? isDark
       ? color.dark
       : color.light
      : "#898781";
     return (
      <li
       key={entry.category}
       className="flex items-center gap-3 py-2 text-sm"
      >
       <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: swatch }}
        aria-hidden="true"
       />
       <CategoryIcon
        category={entry.category}
        className="size-4 shrink-0 text-(--color-fg-muted)"
       />
       <span className="flex-1">
        {getCategoryLabel(entry.category)}
       </span>
       <span className="font-medium tabular-nums">
        {formatCurrencyCents(entry.total)}
       </span>
      </li>
     );
    })}
   </ul>
  </div>
 );
}
```

- [ ] **Step 2: Verify in the browser**

Run: `bun run api:dev` and `bun run frontend:dev` (both from repo root), log in as `admin@gmail.com` / `adminBR@123`, open `/dashboard`.
Expected: both category cards show no Recharts legend below the donut; each row starts with a colored dot + category icon, then the label, then the amount right-aligned; rows are ordered highest amount first.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/category-pie-chart.tsx
git commit -m "feat: sort category rows descending, replace legend with inline swatch+icon"
```

---

### Task 7: Sort `statsByCategory` descending server-side (item 2a, backend)

**Files:**

- Modify: `api/src/modules/transactions/transaction.service.ts:132-162`
- Test: `api/src/modules/transactions/transaction.service.unit.test.ts`

**Interfaces:**

- Produces: `statsByCategory` now returns rows pre-sorted by `total` descending — consumed by both the dashboard (`/transactions/statistics`) and the bot's `balance.conversation.ts` (which already re-sorts client-side; harmless, left as-is).

- [ ] **Step 1: Write the failing test**

Add to `api/src/modules/transactions/transaction.service.unit.test.ts`, inside the `describe("transactionService")` block, after the existing `statsByCategory()` test:

```ts
it("statsByCategory() returns rows sorted by total descending", async () => {
 repositoryMock.findAllForStats.mockResolvedValue([
  { amount: encrypt("100"), category: "food", type: "expense" },
  { amount: encrypt("500"), category: "transport", type: "expense" },
  { amount: encrypt("300"), category: "housing", type: "expense" },
 ]);

 const stats = await transactionService.statsByCategory("user-1");

 expect(stats.map((row) => row.category)).toEqual([
  "transport",
  "housing",
  "food",
 ]);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd api && bun test src/modules/transactions/transaction.service.unit.test.ts`
Expected: FAIL on the new test — `expect(received).toEqual(expected)`, order not `["transport", "housing", "food"]` (Map iteration order is insertion order, i.e. `["food", "transport", "housing"]`).

- [ ] **Step 3: Implement**

`api/src/modules/transactions/transaction.service.ts:155-161`, change the `return` of `statsByCategory`:

```ts
return Array.from(totals.entries())
 .map(([key, value]) => {
  const category = key.split(":")[1] ?? "other";
  const base = value.type === "income" ? incomeTotal : expenseTotal;
  const percentage =
   base > 0 ? Number(((value.total / base) * 100).toFixed(2)) : 0;

  return { category, type: value.type, total: value.total, percentage };
 })
 .sort((a, b) => b.total - a.total);
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `cd api && bun test src/modules/transactions/transaction.service.unit.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/transactions/transaction.service.ts api/src/modules/transactions/transaction.service.unit.test.ts
git commit -m "feat: sort category statistics by total descending"
```

---

### Task 8: `CategorySelect` — custom icon-aware listbox (item 2g, foundation for Tasks 9 & 10)

**Files:**

- Create: `frontend/src/components/category-select.tsx`

**Interfaces:**

- Consumes: `CategoryIcon` (Task 5), `categoryLabels` (Task 4).
- Produces: `<CategorySelect id value options onChange placeholder? />` — a controlled component (value/onChange, not a native form field) — consumed by Tasks 9 and 10.

- [ ] **Step 1: Write the component**

Create `frontend/src/components/category-select.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "../lib/category-icons";
import type { TransactionCategory } from "../lib/categories";
import { categoryLabels } from "../lib/categories";

export function CategorySelect({
 id,
 value,
 options,
 onChange,
 placeholder,
}: {
 id: string;
 value: TransactionCategory | "";
 options: TransactionCategory[];
 onChange: (value: TransactionCategory | "") => void;
 placeholder?: string;
}) {
 const [open, setOpen] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  function handleClickOutside(event: MouseEvent): void {
   if (
    containerRef.current &&
    !containerRef.current.contains(event.target as Node)
   )
    setOpen(false);
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () =>
   document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 const selectedLabel = value
  ? categoryLabels[value]
  : (placeholder ?? "Selecione");

 return (
  <div ref={containerRef} className="relative">
   <button
    type="button"
    id={id}
    onClick={() => setOpen((current) => !current)}
    aria-haspopup="listbox"
    aria-expanded={open}
    className="flex w-full items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-left text-sm outline-none focus:border-brand-500"
   >
    {value && (
     <CategoryIcon
      category={value}
      className="size-4 shrink-0"
     />
    )}
    <span className="flex-1 truncate">{selectedLabel}</span>
    <span aria-hidden="true" className="text-(--color-fg-muted)">
     ▾
    </span>
   </button>

   {open && (
    <ul
     role="listbox"
     className="absolute z-10 mt-1 max-h-64 w-full min-w-[200px] overflow-y-auto rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg"
    >
     {placeholder && (
      <li
       role="option"
       aria-selected={value === ""}
       onClick={() => {
        onChange("");
        setOpen(false);
       }}
       className="cursor-pointer px-3 py-2 text-sm hover:bg-brand-500/10"
      >
       {placeholder}
      </li>
     )}
     {options.map((category) => (
      <li
       key={category}
       role="option"
       aria-selected={value === category}
       onClick={() => {
        onChange(category);
        setOpen(false);
       }}
       className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-brand-500/10"
      >
       <CategoryIcon
        category={category}
        className="size-4 shrink-0"
       />
       {categoryLabels[category]}
      </li>
     ))}
    </ul>
   )}
  </div>
 );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && bunx --bun tsc --noEmit`
Expected: no errors (not yet used anywhere, so no visual check possible until Task 9/10 wire it in).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/category-select.tsx
git commit -m "feat: add icon-aware CategorySelect component"
```

---

### Task 9: Add/edit transaction modal — restrict categories by income/expense, use icons (items 2c, 2g)

**Files:**

- Modify: `frontend/src/components/transaction-form.tsx`

**Interfaces:**

- Consumes: `incomeCategories`, `expenseCategories` (Task 4), `CategorySelect` (Task 8).

- [ ] **Step 1: Switch category from FormData-driven to controlled state, scoped by type**

`frontend/src/components/transaction-form.tsx:1-19`, replace the imports and schema:

```tsx
import { useState } from "react";
import { z } from "zod";
import { CategorySelect } from "./category-select";
import type { TransactionCategory } from "../lib/categories";
import { expenseCategories, incomeCategories } from "../lib/categories";
import { FormField } from "./auth-card";

export const transactionFormSchema = z.object({
 description: z
  .string()
  .trim()
  .min(4, "A descrição precisa ter pelo menos 4 caracteres")
  .max(32, "A descrição pode ter no máximo 32 caracteres"),
 amount: z.coerce.number().positive("Informe um valor maior que zero"),
 category: z.enum([...incomeCategories, ...expenseCategories] as [
  TransactionCategory,
  ...TransactionCategory[],
 ]),
 type: z.enum(["income", "expense"]),
 date: z.string().min(1, "Informe a data da transação"),
});
```

- [ ] **Step 2: Replace the `category` `<select>` with `CategorySelect`, and reset it whenever `type` changes**

`frontend/src/components/transaction-form.tsx`, in `TransactionForm`, change the `type` state initializer and add a `category` state (right after the existing `const [type, ...] = useState(...)` line):

```tsx
const [type, setType] = useState<"income" | "expense">(
 fixedType ?? initial?.type ?? "expense",
);
const categoryList = type === "income" ? incomeCategories : expenseCategories;
const [category, setCategory] = useState<TransactionCategory>(
 initial?.category ?? categoryList[0] ?? "food",
);
```

Update the `handleSubmit` function's `safeParse` call to use `category` from state instead of `formData.get("category")`:

```tsx
const result = transactionFormSchema.safeParse({
 description: formData.get("description"),
 amount: amountCents / 100,
 category,
 type,
 date: formData.get("date"),
});
```

Update the "Tipo" `<select>`'s `onChange` (the block guarded by `{!fixedType && (...)}`) to also reset the category when the list changes:

```tsx
     <select
      id="type"
      value={type}
      onChange={(event) => {
       const nextType = event.target.value as "income" | "expense";
       setType(nextType);
       const nextList = nextType === "income" ? incomeCategories : expenseCategories;
       setCategory((current) => (nextList.includes(current) ? current : (nextList[0] ?? current)));
      }}
      className={inputClassName}
     >
```

Replace the `<FormField label="Categoria" ...>` block (previously a native `<select>`) with:

```tsx
<FormField label="Categoria" id="category" error={errors.category}>
 <CategorySelect
  id="category"
  value={category}
  options={categoryList}
  onChange={(value) => value && setCategory(value)}
 />
</FormField>
```

Remove the now-unused `categoryLabels`, `categoryOptions`, `categoryTuple` imports/declaration (the top-of-file `const categoryTuple = categoryOptions as [...]` line and the `categoryLabels`/`categoryOptions` import from `../lib/categories`) since they're superseded by `incomeCategories`/`expenseCategories`.

- [ ] **Step 2: Verify in the browser**

Run: `bun run api:dev` and `bun run frontend:dev`, log in, open `/dashboard`, click "Adicionar Receita".
Expected: category dropdown shows only Salário, Investimentos, Aluguel, Renda Extra, Presentes, Prêmios, each with an icon; switching "Tipo" to Despesa immediately swaps the category list to the 11 expense categories and resets the selection to the first one. Click "Adicionar Despesa" directly: category list starts on expense categories.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/transaction-form.tsx
git commit -m "feat: restrict transaction modal categories by income/expense, add icons"
```

---

### Task 10: Dashboard filter — icon-aware category select (item 2g)

**Files:**

- Modify: `frontend/src/routes/dashboard/index.tsx:296-311`

**Interfaces:**

- Consumes: `CategorySelect` (Task 8).

- [ ] **Step 1: Replace the native category filter `<select>`**

`frontend/src/routes/dashboard/index.tsx:296-311`, replace:

```tsx
<select
 id="category-filter"
 value={category}
 onChange={(event) => {
  setCategory(event.target.value as TransactionCategory | "");
  resetPage();
 }}
 className="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm outline-none focus:border-brand-500"
>
 <option value="">Todas</option>
 {categoryOptions.map((option) => (
  <option key={option} value={option}>
   {categoryLabels[option]}
  </option>
 ))}
</select>
```

with:

```tsx
<CategorySelect
 id="category-filter"
 value={category}
 options={categoryOptions}
 placeholder="Todas"
 onChange={(value) => {
  setCategory(value);
  resetPage();
 }}
/>
```

Add the import near the top of the file (with the other component imports):

```tsx
import { CategorySelect } from "../../components/category-select";
```

The generic filter keeps listing every category (`categoryOptions`, all 17) since it filters both income and expense transactions together — it is intentionally not scoped to a single type.

- [ ] **Step 2: Verify in the browser**

Open `/dashboard`, open the "Categoria" filter dropdown.
Expected: every category shows with its icon; selecting one filters the table as before (unchanged behavior, only the widget changed).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/dashboard/index.tsx
git commit -m "feat: use icon-aware category select in transaction filters"
```

---

### Task 11: Transactions table — icon instead of "Categoria" text column (item 2g)

**Files:**

- Modify: `frontend/src/routes/dashboard/index.tsx:352,380-383`

**Interfaces:**

- Consumes: `CategoryIcon` (Task 5).

- [ ] **Step 1: Replace the category cell content**

`frontend/src/routes/dashboard/index.tsx:380-383`, replace:

```tsx
<td className="px-4 py-3">
 {categoryLabels[transaction.category] ?? transaction.category}
</td>
```

with:

```tsx
<td className="px-4 py-3">
 <span title={categoryLabels[transaction.category] ?? transaction.category}>
  <CategoryIcon
   category={transaction.category}
   className="size-5 text-(--color-fg-muted)"
  />
  <span className="sr-only">
   {categoryLabels[transaction.category] ?? transaction.category}
  </span>
 </span>
</td>
```

Add the import:

```tsx
import { CategoryIcon } from "../../lib/category-icons";
```

Leave the `<th className="px-4 py-3 font-medium">Categoria</th>` header text as-is (line 352) — it still labels the column for accessibility/scanability even though the cells are now icon-only.

- [ ] **Step 2: Verify in the browser**

Open `/dashboard`, look at the transactions table.
Expected: the "Categoria" column shows a small icon per row (not text); hovering shows the category name as a native tooltip.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/dashboard/index.tsx
git commit -m "feat: show category icon instead of text in the transactions table"
```

---

### Task 12: Filtered-search totals row (item 2d)

**Files:**

- Modify: `frontend/src/routes/dashboard/index.tsx:271-286`

- [ ] **Step 1: Compute income/expense totals over the currently searched set**

`frontend/src/routes/dashboard/index.tsx`, right after the existing `const transactions = searched.slice(...)` line (around line 161), add:

```tsx
const searchedIncomeTotal = searched
 .filter((transaction) => transaction.type === "income")
 .reduce((sum, transaction) => sum + transaction.amount, 0);
const searchedExpenseTotal = searched
 .filter((transaction) => transaction.type === "expense")
 .reduce((sum, transaction) => sum + transaction.amount, 0);
```

- [ ] **Step 2: Render the full-width totals row right below the search input**

`frontend/src/routes/dashboard/index.tsx:271-286`, after the closing `</div>` of the search `<label>`/`<input>` block (right before the `<div className="mt-3 flex flex-wrap items-end justify-between gap-3">` filters row), insert:

```tsx
{
 search.trim().length >= 3 && (
  <div className="mt-3 flex w-full items-center justify-between gap-4 rounded-lg border border-(--color-border) bg-(--color-bg-subtle) px-3 py-2 text-sm">
   <span className="text-(--color-fg-muted)">
    {searched.length} resultado{searched.length === 1 ? "" : "s"}{" "}
    para "{search.trim()}"
   </span>
   <span className="flex gap-4 tabular-nums">
    <span className="text-emerald-600">
     + {formatCurrencyCents(searchedIncomeTotal)}
    </span>
    <span className="text-red-500">
     − {formatCurrencyCents(searchedExpenseTotal)}
    </span>
   </span>
  </div>
 );
}
```

- [ ] **Step 2: Verify in the browser**

Open `/dashboard`, type at least 3 characters into "Buscar por nome" that match some transactions (e.g. "Seguro" against the seeded admin account, which has an `insurance` category with `Seguro de vida`/`Seguro residencial`/`Seguro veicular` descriptions).
Expected: a full-width row appears directly below the search box showing the result count and the summed income (green, +) and expense (red, −) totals for exactly the searched/filtered set; it disappears when the search box has fewer than 3 characters.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/dashboard/index.tsx
git commit -m "feat: show income/expense totals for the current transaction search"
```

---

### Task 13: Dashboard grid — narrow the left column to widen the transactions card (item 2f)

**Files:**

- Modify: `frontend/src/routes/dashboard/index.tsx:229`

- [ ] **Step 1: Narrow the fixed-width left column**

`frontend/src/routes/dashboard/index.tsx:229`, replace:

```tsx
    <div className={`grid gap-6 lg:grid-cols-[400px_1fr] ${freeLimitReached ? "mt-3" : ""}`}>
```

with:

```tsx
    <div className={`grid gap-6 lg:grid-cols-[320px_1fr] ${freeLimitReached ? "mt-3" : ""}`}>
```

(The dashboard has no literal 3-card `grid-cols-3` — `BalanceCard` already combines saldo/receitas/despesas into one card stacked above the two category `AccordionCard`s in a `[400px_1fr]` two-column grid. Narrowing the fixed column from 400px to 320px is the direct, honest way to give the transactions card more width, per the finding in the audit.)

- [ ] **Step 2: Verify in the browser**

Open `/dashboard` at a desktop width (≥1024px, where `lg:` applies).
Expected: the left column (balance + 2 category cards) is visibly narrower, the transactions card on the right is visibly wider; nothing overflows or wraps awkwardly in the narrower column (check the `BalanceCard`'s 3 numbers still fit — if they wrap badly, this step's exact pixel value can be adjusted up slightly, e.g. 340-360px, while still narrower than the original 400px).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/dashboard/index.tsx
git commit -m "style: narrow dashboard left column to widen the transactions card"
```

---

## Phase 2 — Landing & auth pages (items 3, 4, 5)

### Task 14: Landing container width matches the dashboard (item 3a)

**Files:**

- Modify: `frontend/src/routes/index.tsx:44-54`

- [ ] **Step 1: Constrain the landing's main content to `max-w-6xl`, matching `dashboard/index.tsx:218`'s `mx-auto max-w-6xl px-4`**

`frontend/src/routes/index.tsx:44-54`, replace:

```tsx
   <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6 sm:px-10">
    <div className="mx-auto w-full text-center lg:w-1/2">
```

with:

```tsx
   <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center overflow-hidden px-4 sm:px-10">
    <div className="mx-auto w-full text-center lg:w-1/2">
```

Also apply the same `max-w-6xl` to the header and footer so all 3 rows line up (header `frontend/src/routes/index.tsx:31`, footer line 56): wrap each row's inner content in a `mx-auto w-full max-w-6xl` div, e.g. header becomes:

```tsx
<header className="flex items-center justify-between px-6 py-5 sm:px-10">
 <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
  <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
   <img
    src="/favicon.svg"
    alt=""
    aria-hidden="true"
    className="size-5"
   />
   Money
  </span>
  <Link
   to="/entrar"
   className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-medium hover:bg-brand-500/10"
  >
   Entrar
  </Link>
 </div>
</header>
```

and footer becomes:

```tsx
<footer className="flex items-center justify-between px-6 py-5 text-sm text-(--color-fg-muted) sm:px-10">
 <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
  <p>© {new Date().getFullYear()} Money.</p>
  <nav className="flex items-center gap-4">
   <Link to="/contato" className="hover:text-(--color-fg)">
    Contato
   </Link>
   <Link
    to="/politica-de-privacidade"
    className="hover:text-(--color-fg)"
   >
    Política de Privacidade
   </Link>
   <Link to="/termos-de-uso" className="hover:text-(--color-fg)">
    Termos de Uso
   </Link>
   <ThemeToggle />
  </nav>
 </div>
</footer>
```

(This task depends on Task 3 already having applied the favicon+"Money" brand mark here — if executed out of order, keep whatever the header currently renders and just add the `max-w-6xl` wrapper.)

- [ ] **Step 2: Verify in the browser**

Open `/` at a wide viewport (≥1536px).
Expected: header, hero text, and footer no longer stretch edge-to-edge — all 3 are capped at the same 1152px (`max-w-6xl`) content width used by `/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "style: cap landing page width to match the dashboard"
```

---

### Task 15: Matrix rain background ("$" / "R$") on landing + auth pages (item 3b)

**Files:**

- Create: `frontend/src/components/matrix-rain.tsx`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/src/components/auth-card.tsx`

**Interfaces:**

- Produces: `<MatrixRain className? />` — a client-only canvas component, theme-aware via `useIsDarkTheme()` (from `theme-toggle.tsx`).

- [ ] **Step 1: Write the component**

Create `frontend/src/components/matrix-rain.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { useIsDarkTheme } from "./theme-toggle";

const GLYPHS = ["$", "R$"];
const FONT_SIZE = 16;
const FRAME_INTERVAL_MS = 60;

export function MatrixRain({ className }: { className?: string }) {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const isDark = useIsDarkTheme();

 useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
   return;

  let columns = 0;
  let drops: number[] = [];

  function resize(): void {
   if (!canvas) return;
   canvas.width = canvas.offsetWidth;
   canvas.height = canvas.offsetHeight;
   columns = Math.floor(canvas.width / FONT_SIZE);
   drops = Array.from({ length: columns }, () =>
    Math.floor((Math.random() * canvas.height) / FONT_SIZE),
   );
  }

  resize();
  window.addEventListener("resize", resize);

  const fadeColor = isDark
   ? "rgba(10, 12, 10, 0.08)"
   : "rgba(250, 250, 249, 0.14)";
  const glyphColor = isDark ? "#22c55e" : "#0f7a3d";

  function draw(): void {
   if (!ctx || !canvas) return;
   ctx.fillStyle = fadeColor;
   ctx.fillRect(0, 0, canvas.width, canvas.height);
   ctx.fillStyle = glyphColor;
   ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`;

   for (let column = 0; column < drops.length; column++) {
    const glyph =
     GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "$";
    const x = column * FONT_SIZE;
    const y = (drops[column] ?? 0) * FONT_SIZE;
    ctx.fillText(glyph, x, y);

    if (y > canvas.height && Math.random() > 0.975) {
     drops[column] = 0;
    } else {
     drops[column] = (drops[column] ?? 0) + 1;
    }
   }
  }

  const interval = window.setInterval(draw, FRAME_INTERVAL_MS);
  return () => {
   window.clearInterval(interval);
   window.removeEventListener("resize", resize);
  };
 }, [isDark]);

 return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
```

- [ ] **Step 2: Mount it behind the landing page content**

`frontend/src/routes/index.tsx`, add the import:

```tsx
import { MatrixRain } from "../components/matrix-rain";
```

Change the outer wrapping `<div>` (currently `className={`${isDark ? "dark" : ""} flex h-dvh w-dvw flex-col overflow-hidden bg-(--color-bg) text-(--color-fg)`}`) to add `relative`, and insert `<MatrixRain>` as its first child:

```tsx
  <div
   className={`${isDark ? "dark" : ""} relative flex h-dvh w-dvw flex-col overflow-hidden bg-(--color-bg) text-(--color-fg)`}
  >
   <MatrixRain className="pointer-events-none absolute inset-0 -z-10" />

   <header className="flex items-center justify-between px-6 py-5 sm:px-10">
```

(keep everything after `<header>` unchanged, just close the new wrapping correctly — the existing `</div>` at the end of the component already closes this outer div).

- [ ] **Step 3: Mount it behind the shared auth card shell**

`frontend/src/components/auth-card.tsx`, add the import:

```tsx
import { MatrixRain } from "./matrix-rain";
```

Change the outer `<div className="flex min-h-screen flex-col">` to add `relative`, and insert `<MatrixRain>` right after it opens:

```tsx
  <div className="relative flex min-h-screen flex-col">
   <MatrixRain className="pointer-events-none absolute inset-0 -z-10" />

   <div className="flex items-center px-4 py-4">
```

This covers all 4 pages that render through `AuthCard` — `/entrar`, `/criar-conta`, `/esqueci-senha`, `/resetar-senha` — with a single change. The rain shows in the page margins around the card; the card itself (`bg-(--color-surface)` opaque background) naturally occludes it, satisfying "fora dos cards."

- [ ] **Step 4: Verify in the browser**

Open `/`, `/entrar`, `/criar-conta`, `/esqueci-senha`, `/resetar-senha`.
Expected: falling `$`/`R$` glyphs visible in the background on all 5 pages, outside the card/hero content, in a green tone that's legible in both light and dark theme (toggle via the footer theme button and re-check); no layout shift, no horizontal scrollbar, no console errors. Enable OS-level "reduce motion" and reload one page — the canvas should render static/empty (no animation loop started).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/matrix-rain.tsx frontend/src/routes/index.tsx frontend/src/components/auth-card.tsx
git commit -m "feat: add matrix-style $/R$ rain background to landing and auth pages"
```

---

### Task 16: Extract reusable password-visibility input, use it on `/entrar` (item 4a)

**Files:**

- Create: `frontend/src/components/password-input.tsx`
- Modify: `frontend/src/components/password-strength-input.tsx`
- Modify: `frontend/src/routes/entrar.tsx`

**Interfaces:**

- Produces: `<PasswordInput id name value onChange placeholder? error? />` — consumed by both `PasswordStrengthInput` (composed internally) and `entrar.tsx` directly.

- [ ] **Step 1: Extract the eye-toggle input**

Create `frontend/src/components/password-input.tsx` with the eye-toggle logic lifted out of `password-strength-input.tsx:16-83`:

```tsx
import { useState } from "react";
import { inputClassName } from "./auth-card";

function EyeIcon() {
 return (
  <svg
   aria-hidden="true"
   viewBox="0 0 24 24"
   fill="none"
   className="size-5"
  >
   <path
    d="M1.5 12s3.75-7.5 10.5-7.5S22.5 12 22.5 12s-3.75 7.5-10.5 7.5S1.5 12 1.5 12Z"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
   />
   <circle
    cx="12"
    cy="12"
    r="3"
    stroke="currentColor"
    strokeWidth="1.5"
   />
  </svg>
 );
}

function EyeOffIcon() {
 return (
  <svg
   aria-hidden="true"
   viewBox="0 0 24 24"
   fill="none"
   className="size-5"
  >
   <path
    d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.5 6.6C3.9 8.2 2 12 2 12s3.75 7.5 10.5 7.5c2.13 0 3.94-.5 5.45-1.24M9.9 4.7A10.9 10.9 0 0 1 12 4.5c6.75 0 10.5 7.5 10.5 7.5a17.6 17.6 0 0 1-2.6 3.65"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
   />
  </svg>
 );
}

export function PasswordInput({
 id,
 name,
 value,
 onChange,
 placeholder,
 error,
}: {
 id: string;
 name: string;
 value: string;
 onChange: (value: string) => void;
 placeholder?: string;
 error?: string;
}) {
 const [visible, setVisible] = useState(false);

 return (
  <div className="relative">
   <input
    id={id}
    name={name}
    type={visible ? "text" : "password"}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className={`${inputClassName} w-full pr-10`}
    aria-invalid={Boolean(error)}
   />
   <button
    type="button"
    onClick={() => setVisible((current) => !current)}
    aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
    className="absolute inset-y-0 right-0 flex items-center px-3 text-(--color-fg-muted) hover:text-(--color-fg)"
   >
    {visible ? <EyeOffIcon /> : <EyeIcon />}
   </button>
  </div>
 );
}
```

- [ ] **Step 2: Make `PasswordStrengthInput` compose it instead of duplicating it**

Replace `frontend/src/components/password-strength-input.tsx` in full:

```tsx
import { PasswordInput } from "./password-input";

export const PASSWORD_RULES: {
 key: string;
 label: string;
 test: (value: string) => boolean;
}[] = [
 {
  key: "length",
  label: "Entre 8 e 32 caracteres",
  test: (value) => value.length >= 8 && value.length <= 32,
 },
 {
  key: "lowercase",
  label: "Uma letra minúscula (a-z)",
  test: (value) => /[a-z]/.test(value),
 },
 {
  key: "uppercase",
  label: "Uma letra maiúscula (A-Z)",
  test: (value) => /[A-Z]/.test(value),
 },
 {
  key: "number",
  label: "Um número (0-9)",
  test: (value) => /\d/.test(value),
 },
 {
  key: "special",
  label: "Um caractere especial (ex: !@#$%)",
  test: (value) => /[^A-Za-z0-9]/.test(value),
 },
];

export function isStrongPassword(value: string): boolean {
 return PASSWORD_RULES.every((rule) => rule.test(value));
}

export function PasswordStrengthInput({
 id,
 name,
 value,
 onChange,
 placeholder,
 error,
}: {
 id: string;
 name: string;
 value: string;
 onChange: (value: string) => void;
 placeholder?: string;
 error?: string;
}) {
 return (
  <div className="flex flex-col gap-1.5">
   <PasswordInput
    id={id}
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    error={error}
   />

   {error && <p className="text-sm text-red-500">{error}</p>}

   {value.length > 0 && (
    <ul className="mt-1 flex flex-col gap-1 text-xs">
     {PASSWORD_RULES.map((rule) => {
      const ok = rule.test(value);
      return (
       <li
        key={rule.key}
        className={`flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-red-500"}`}
       >
        <span aria-hidden="true">{ok ? "✓" : "✗"}</span>
        {rule.label}
       </li>
      );
     })}
    </ul>
   )}
  </div>
 );
}
```

(Note: the `length` rule's label/test also picks up the max-32 requirement from Task 19 here directly — see Task 19, which specifically targets this same file; if Task 19 runs after this one, keep this version; if it runs before, this step's `length` rule already matches Task 19's target state and that task becomes a no-op verification.)

- [ ] **Step 3: Use `PasswordInput` on `/entrar`**

`frontend/src/routes/entrar.tsx`, add the import:

```tsx
import { PasswordInput } from "../components/password-input";
```

Replace the password `<FormField>` block:

```tsx
<FormField label="Senha" id="password" error={errors.password}>
 <input
  id="password"
  name="password"
  type="password"
  className={inputClassName}
  aria-invalid={Boolean(errors.password)}
 />
</FormField>
```

with:

```tsx
<FormField label="Senha" id="password" error={errors.password}>
 <PasswordInput
  id="password"
  name="password"
  value={password}
  onChange={setPassword}
 />
</FormField>
```

This requires `entrar.tsx` to hold the password value in state (it currently reads it from `FormData` on submit). Add `const [password, setPassword] = useState("");` alongside the other `useState` calls at the top of `LoginPage`, and change `handleSubmit`'s `loginSchema.safeParse` call to use `password` instead of `formData.get("password")`:

```tsx
const result = loginSchema.safeParse({
 email: formData.get("email"),
 password,
});
```

Also remove the now-unused `inputClassName` import for the password field if it's no longer referenced elsewhere in the file (it's still used by the email `<input>`, so keep the import — just confirm `inputClassName` is still imported/used for the email field).

- [ ] **Step 4: Verify in the browser**

Open `/entrar`, type into the password field, click the eye icon.
Expected: same show/hide behavior as `/criar-conta`'s password field; toggling doesn't clear the typed value; form still submits correctly with a valid email/password (test against `admin@gmail.com` / `adminBR@123`).

Open `/criar-conta` too.
Expected: password field still behaves identically to before (strength checklist still shows/updates, eye toggle still works) — this confirms the refactor didn't regress it.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/password-input.tsx frontend/src/components/password-strength-input.tsx frontend/src/routes/entrar.tsx
git commit -m "feat: add password visibility toggle to the login page"
```

---

### Task 17: Center the `/entrar` card header (item 4b)

**Files:**

- Modify: `frontend/src/components/auth-card.tsx`
- Modify: `frontend/src/routes/entrar.tsx`

- [ ] **Step 1: Add an optional `centerHeader` prop to `AuthCard`**

`frontend/src/components/auth-card.tsx`, change the `AuthCard` signature and header markup:

```tsx
export function AuthCard({
 title,
 subtitle,
 centerHeader,
 children,
}: {
 title: string;
 subtitle?: string;
 centerHeader?: boolean;
 children: ReactNode;
}) {
 return (
  <div className="relative flex min-h-screen flex-col">
   <MatrixRain className="pointer-events-none absolute inset-0 -z-10" />

   <div className="flex items-center px-4 py-4">
    <Link
     to="/"
     className="flex items-center gap-2 text-sm font-bold tracking-tight"
    >
     <img
      src="/favicon.svg"
      alt=""
      aria-hidden="true"
      className="size-4"
     />
     Money
    </Link>
   </div>
   <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-8">
     <h1
      className={`text-2xl font-bold ${centerHeader ? "text-center" : ""}`}
     >
      {title}
     </h1>
     {subtitle && (
      <p
       className={`mt-1 text-sm text-(--color-fg-muted) ${centerHeader ? "text-center" : ""}`}
      >
       {subtitle}
      </p>
     )}
     <div className="mt-6">{children}</div>
    </div>
   </section>
   <footer className="flex items-center justify-center px-4 py-5">
    <ThemeToggle />
   </footer>
  </div>
 );
}
```

(This snippet assumes Tasks 3 and 15 already landed, since it includes the favicon brand mark and `MatrixRain` — if run standalone/out of order, only add the `centerHeader` prop and its two `className` changes to whatever the current file looks like.)

- [ ] **Step 2: Pass it from `/entrar` only**

`frontend/src/routes/entrar.tsx`, the main return's `<AuthCard title="Entrar" subtitle="Acesse sua conta para ver seu painel financeiro.">` becomes:

```tsx
  <AuthCard title="Entrar" subtitle="Acesse sua conta para ver seu painel financeiro." centerHeader>
```

- [ ] **Step 3: Verify in the browser**

Open `/entrar`.
Expected: "Entrar" and "Acesse sua conta para ver seu painel financeiro." are horizontally centered inside the card.

Open `/criar-conta`, `/esqueci-senha`, `/resetar-senha`.
Expected: those titles/subtitles remain left-aligned (unchanged) — `centerHeader` was not passed there.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/auth-card.tsx frontend/src/routes/entrar.tsx
git commit -m "style: center the login card's title and subtitle"
```

---

### Task 18: Email max 48 characters on `/criar-conta` (item 5a)

**Files:**

- Modify: `frontend/src/routes/criar-conta.tsx`

- [ ] **Step 1: Add the Zod constraint**

`frontend/src/routes/criar-conta.tsx:26`, replace:

```tsx
 email: z.email("E-mail inválido"),
```

with:

```tsx
 email: z.email("E-mail inválido").max(48, "O e-mail pode ter no máximo 48 caracteres"),
```

- [ ] **Step 2: Add the HTML `maxLength` too (defense in depth, matches the existing `name` field's pattern at line 122)**

`frontend/src/routes/criar-conta.tsx:128-136`, add `maxLength={48}` to the email `<input>`:

```tsx
<input
 id="email"
 name="email"
 type="email"
 placeholder="seu@email.com"
 maxLength={48}
 className={inputClassName}
 aria-invalid={Boolean(errors.email)}
/>
```

- [ ] **Step 3: Verify in the browser**

Open `/criar-conta`, try typing an email longer than 48 characters.
Expected: the input stops accepting characters at 48 (`maxLength`); if 48 characters are somehow submitted with an invalid email shape that still exceeds under edge cases, the Zod error "O e-mail pode ter no máximo 48 caracteres" would show — confirm by temporarily removing `maxLength` in devtools and submitting a 60-char email, then restoring it.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/criar-conta.tsx
git commit -m "feat: cap signup email at 48 characters"
```

---

### Task 19: Password min 8 / max 32 on `/criar-conta` (item 5b)

**Files:**

- Modify: `frontend/src/components/password-strength-input.tsx`

- [ ] **Step 1: Update the length rule**

If Task 16 already landed, this file's `length` rule already reads:

```ts
 { key: "length", label: "Entre 8 e 32 caracteres", test: (value) => value.length >= 8 && value.length <= 32 },
```

— confirm this is the case and skip to Step 2. If Task 16 has not landed yet (executing plan out of order), edit `password-strength-input.tsx:5` directly, replacing:

```ts
 { key: "length", label: "Pelo menos 8 caracteres", test: (value) => value.length >= 8 },
```

with the same line shown above.

- [ ] **Step 2: Verify in the browser**

Open `/criar-conta`, type a 33-character password.
Expected: the "Entre 8 e 32 caracteres" rule shows a red ✗ once past 32 characters, and the submit button's underlying `isStrongPassword` check fails (form won't submit) until the password is trimmed back to ≤32.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/password-strength-input.tsx
git commit -m "feat: cap signup password at 32 characters"
```

---

## Phase 3 — Minha Conta & shared navbar (items 6, 7a)

### Task 20: Unify the logged-in dropdown across all pages (item 6a)

**Files:**

- Modify: `frontend/src/components/site-header.tsx`

**Interfaces:**

- Consumes: `UserMenu` (existing component, already used by `dashboard/index.tsx`).

- [ ] **Step 1: Use `UserMenu` in the default (no-`actions`) branch too**

`frontend/src/components/site-header.tsx`, add the import:

```tsx
import { UserMenu } from "./user-menu";
```

Replace the logged-in branch of the default `actions`-less render (currently plain "Dashboard" link + "Sair" button, lines 44-59):

```tsx
       {!isPending && session ? (
        <>
         <Link
          to="/dashboard"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-(--color-fg) hover:bg-brand-500/10"
         >
          Dashboard
         </Link>
         <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-fg) hover:bg-brand-500/10"
         >
          Sair
         </button>
        </>
       ) : (
```

with:

```tsx
       {!isPending && session ? (
        <>
         <Link
          to="/dashboard"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-(--color-fg) hover:bg-brand-500/10"
         >
          Dashboard
         </Link>
         <UserMenu name={session.user.name} />
        </>
       ) : (
```

The now-unused `handleSignOut` function and `signOut`/`useNavigate` imports in this file can stay if anything else in the file still calls `handleSignOut` — check: after this change, `handleSignOut` is no longer called anywhere in `site-header.tsx` (the dashboard's own sign-out is via `UserMenu`'s internal handler). Remove the now-dead `handleSignOut` function and the `useNavigate`/`signOut` imports if nothing else in the file uses them.

- [ ] **Step 2: Verify in the browser**

Log in, visit `/minha-conta`, `/contato`, `/termos-de-uso`, `/politica-de-privacidade`.
Expected: each page's navbar now shows the same "Nome ▾" dropdown as `/dashboard` (not a bare "Sair" button); clicking it shows "Minha Conta" and "Sair" menu items, both working.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/site-header.tsx
git commit -m "feat: use the same user dropdown navbar on every logged-in page"
```

---

### Task 21: Bright orange "assinar plano" CTA (item 6b)

**Files:**

- Modify: `frontend/src/routes/minha-conta.tsx:188-195`

- [ ] **Step 1: Swap the button's classes**

`frontend/src/routes/minha-conta.tsx:188-195`, replace:

```tsx
<Link
 to="/checkout"
 className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black hover:bg-brand-400"
>
 Assinar um plano
</Link>
```

with:

```tsx
<Link
 to="/checkout"
 className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/30 hover:bg-orange-400"
>
 Assinar um plano
</Link>
```

- [ ] **Step 2: Verify in the browser**

Log in as the free-plan seed user (`aleexgvieira@gmail.com` / `galhardyn`), visit `/minha-conta`.
Expected: "Assinar um plano" renders as a bright orange button with white text (not the app's default brand green/black), links to `/checkout`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/minha-conta.tsx
git commit -m "style: make the free-plan upgrade CTA bright orange"
```

---

### Task 22: Log a `pix.expired` payment event (item 6c, backend)

**Files:**

- Modify: `api/src/modules/payments/payment.service.ts:120-129`
- Test: new `api/src/modules/payments/payment.service.unit.test.ts` if one doesn't exist — check first with `Glob "api/src/modules/payments/*.test.ts"`; if a unit test file already exists, add to it instead.

**Interfaces:**

- Produces: a `PaymentLog` row with `status: "expired"` whenever `getCheckoutStatus` observes an expired PIX charge — consumed by Task 23's frontend filter.

- [ ] **Step 1: Check for an existing test file**

Run: `find api/src/modules/payments -name "*.test.ts"` (or the `Glob` tool with pattern `api/src/modules/payments/*.test.ts`)
Expected: note whether `payment.service.unit.test.ts` exists. If it does, add the new test into its existing `describe` block, mirroring its existing mocking style (mirror `transaction.service.unit.test.ts`'s `mock.module` pattern from Task 7 if there's no existing example to follow). If it doesn't exist, create it fresh using the same `mock.module` pattern as `transaction.service.unit.test.ts` (Task 7), mocking `../../config/prisma`, `../../lib/abacatepay`, and `./payment.schema`'s `PLAN_DEFINITIONS`.

- [ ] **Step 2: Write the failing test**

Add a test asserting that when `getCheckoutStatus` transitions a charge to `"expired"`, `prisma.paymentLog.upsert` is called with `status: "expired"`:

```ts
it("getCheckoutStatus() logs a pix.expired payment event when a pending charge has expired", async () => {
 prismaMock.pixCharge.findFirst.mockResolvedValue({
  id: "charge-1",
  userId: "user-1",
  externalId: "ext-1",
  status: "pending",
  amount: 1000,
  expiresAt: new Date("2020-01-01T00:00:00.000Z"),
 });
 prismaMock.pixCharge.update.mockResolvedValue({});
 prismaMock.pixCharge.findUniqueOrThrow.mockResolvedValue({
  status: "expired",
 });
 prismaMock.user.findUniqueOrThrow.mockResolvedValue({
  planExpiresAt: null,
 });

 await paymentService.getCheckoutStatus("user-1", "charge-1");

 expect(prismaMock.paymentLog.upsert).toHaveBeenCalledWith(
  expect.objectContaining({
   where: { externalId: "ext-1" },
   create: expect.objectContaining({
    eventType: "pix.expired",
    status: "expired",
   }),
   update: expect.objectContaining({ status: "expired" }),
  }),
 );
});
```

(Adjust the exact mock shape for `prismaMock` to match whatever this test file already sets up for `pixCharge`/`user`/`paymentLog` mocks — the object above shows the fields `getCheckoutStatus` and `logPaymentEvent` actually read/write, per `payment.service.ts`.)

- [ ] **Step 3: Run it to confirm it fails**

Run: `cd api && bun test src/modules/payments/payment.service.unit.test.ts`
Expected: FAIL — `prisma.paymentLog.upsert` was never called (the "expired" branch in `getCheckoutStatus` currently only updates `pixCharge`, never logs).

- [ ] **Step 4: Implement**

`api/src/modules/payments/payment.service.ts:120-129`, replace:

```ts
  const charge = await prisma.pixCharge.findFirst({ where: { id: chargeId, userId } });
  if (!charge) throw new PixChargeNotFoundError();

  if (charge.status === "pending" && charge.expiresAt < new Date()) {
   await prisma.pixCharge.update({ where: { id: charge.id }, data: { status: "expired" } });
  } else if (charge.status === "pending") {
```

with:

```ts
  const charge = await prisma.pixCharge.findFirst({ where: { id: chargeId, userId } });
  if (!charge) throw new PixChargeNotFoundError();

  if (charge.status === "pending" && charge.expiresAt < new Date()) {
   await prisma.pixCharge.update({ where: { id: charge.id }, data: { status: "expired" } });
   await logPaymentEvent({
    userId,
    externalId: charge.externalId,
    eventType: "pix.expired",
    status: "expired",
    amount: charge.amount,
    rawPayload: { chargeId: charge.id, expiresAt: charge.expiresAt },
   });
  } else if (charge.status === "pending") {
```

- [ ] **Step 5: Run it to confirm it passes**

Run: `cd api && bun test src/modules/payments/payment.service.unit.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/payments/payment.service.ts api/src/modules/payments/payment.service.unit.test.ts
git commit -m "feat: log a payment event when a PIX charge expires"
```

---

### Task 23: Payment history — accordion, filtered to success/expired, exact date+time (item 6c, frontend)

**Files:**

- Modify: `frontend/src/routes/minha-conta.tsx`

**Interfaces:**

- Consumes: `AccordionCard` (existing component, already used by `dashboard/index.tsx`), the `pix.expired` log from Task 22.

- [ ] **Step 1: Import `AccordionCard`, update the label map, filter, and date formatting**

`frontend/src/routes/minha-conta.tsx`, add the import:

```tsx
import { AccordionCard } from "../components/accordion-card";
```

Replace the `paymentEventLabels` map (line 29-32):

```tsx
const paymentEventLabels: Record<string, string> = {
 succeeded: "Pagamento confirmado",
 expired: "PIX expirado",
};
```

Replace the history block (lines 199-219):

```tsx
{
 historyQuery.data && historyQuery.data.length > 0 && (
  <div className="mt-5 border-t border-(--color-border) pt-4">
   <h3 className="text-sm font-semibold">Histórico de pagamentos</h3>
   <ul className="mt-2 flex flex-col gap-2">
    {historyQuery.data.map((log) => (
     <li
      key={log.id}
      className="flex items-center justify-between text-sm text-(--color-fg-muted)"
     >
      <span>
       {paymentEventLabels[log.status] ?? log.status}
       {log.amount != null
        ? ` — ${(log.amount / 100).toFixed(2)} ${(log.currency ?? "").toUpperCase()}`
        : ""}
      </span>
      <span>
       {new Date(log.createdAt).toLocaleDateString(
        "pt-BR",
       )}
      </span>
     </li>
    ))}
   </ul>
  </div>
 );
}
```

with:

```tsx
{
 historyQuery.data &&
  historyQuery.data.some(
   (log) => log.status === "succeeded" || log.status === "expired",
  ) && (
   <div className="mt-5 border-t border-(--color-border) pt-4">
    <AccordionCard title="Histórico de pagamentos">
     <ul className="flex flex-col gap-2">
      {historyQuery.data
       .filter(
        (log) =>
         log.status === "succeeded" ||
         log.status === "expired",
       )
       .map((log) => (
        <li
         key={log.id}
         className="flex items-center justify-between text-sm text-(--color-fg-muted)"
        >
         <span>
          {paymentEventLabels[log.status] ??
           log.status}
          {log.amount != null
           ? ` — ${(log.amount / 100).toFixed(2)} ${(log.currency ?? "").toUpperCase()}`
           : ""}
         </span>
         <span>
          {new Date(log.createdAt).toLocaleString(
           "pt-BR",
          )}
         </span>
        </li>
       ))}
     </ul>
    </AccordionCard>
   </div>
  );
}
```

`AccordionCard` renders its own bordered card wrapper (`rounded-2xl border ... p-6`, see Task 20's dependency file), so nesting it directly inside the "Plano" card's `<div className="mt-5 border-t ...">` produces a card-within-a-card border; that's an acceptable, intentional visual (a collapsible sub-section), matching how `AccordionCard` is already used stacked inside `dashboard/index.tsx`'s left column. If it looks visually heavy once rendered, drop the outer `border-t border-(--color-border) pt-4` wrapper div and render `<AccordionCard>` directly as a sibling below the plan section instead — use judgment in Step 2's visual check.

- [ ] **Step 2: Verify in the browser**

This requires a `PaymentLog` row with `status: "expired"` or `"succeeded"` to exist for the logged-in test account. With `ABACATEPAY_PIX_TEST_MODE=true` (see `docs/pagamentos.md`), log in as the free-plan seed user, go to `/checkout`, start a PIX checkout, and use the "🧪 Pagar PIX Teste Mode" simulate path (or let a test charge sit past its `expiresAt` and poll `/payments/pix/:id/status`) to generate at least one `succeeded` and one `expired` log row. Return to `/minha-conta`.
Expected: "Histórico de pagamentos" renders inside a collapsed-by-default accordion (click to expand); only `succeeded`/`expired` rows show (a `pending` or `failed` row, if any exist in the DB for that user, must not appear); the date column shows both date and time (`toLocaleString`, not `toLocaleDateString`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/minha-conta.tsx
git commit -m "feat: show payment history as an accordion, filtered to success/expired with exact timestamps"
```

---

### Task 24: Theme toggle + `<hr>` in the user dropdown (item 7a)

**Files:**

- Modify: `frontend/src/components/user-menu.tsx`

**Interfaces:**

- Consumes: `ThemeToggle` (existing component from `theme-toggle.tsx`).

- [ ] **Step 1: Add the toggle and a separator before "Sair"**

`frontend/src/components/user-menu.tsx`, add the import:

```tsx
import { ThemeToggle } from "./theme-toggle";
```

Replace the dropdown body (lines 38-59):

```tsx
{
 open && (
  <div
   role="menu"
   className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg"
  >
   <Link
    to="/minha-conta"
    role="menuitem"
    onClick={() => setOpen(false)}
    className="block px-4 py-2 text-sm hover:bg-brand-500/10"
   >
    Minha Conta
   </Link>
   <button
    type="button"
    role="menuitem"
    onClick={handleSignOut}
    className="block w-full px-4 py-2 text-left text-sm hover:bg-brand-500/10"
   >
    Sair
   </button>
  </div>
 );
}
```

with:

```tsx
{
 open && (
  <div
   role="menu"
   className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg"
  >
   <Link
    to="/minha-conta"
    role="menuitem"
    onClick={() => setOpen(false)}
    className="block px-4 py-2 text-sm hover:bg-brand-500/10"
   >
    Minha Conta
   </Link>
   <div className="flex items-center justify-between px-4 py-2 text-sm">
    <span>Tema</span>
    <ThemeToggle />
   </div>
   <hr className="my-1 border-(--color-border)" />
   <button
    type="button"
    role="menuitem"
    onClick={handleSignOut}
    className="block w-full px-4 py-2 text-left text-sm hover:bg-brand-500/10"
   >
    Sair
   </button>
  </div>
 );
}
```

(This task's `ThemeToggle` button is `size-9` per its own component — inside a 192px-wide (`w-48`) menu row it fits fine next to the "Tema" label; no size override needed.)

- [ ] **Step 2: Verify in the browser**

Log in, open the user dropdown (top-right, any logged-in page).
Expected: "Minha Conta" first, then a "Tema" row with the light/dark toggle button (clicking it flips the theme without closing the menu or navigating away), then a horizontal rule, then "Sair" last.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/user-menu.tsx
git commit -m "feat: add theme toggle to the user dropdown menu"
```

---

## Phase 4 — Developer API page (item 7b)

### Task 25: Register better-auth's `apiKey` plugin (backend)

**Files:**

- Modify: `api/src/lib/auth.ts`
- Modify: `api/prisma/schema.sqlite.prisma`
- Modify: `api/prisma/schema.postgresql.prisma`

**Interfaces:**

- Produces: `auth.api.createApiKey`, `auth.api.listApiKeys`, `auth.api.deleteApiKey` (server-side better-auth methods) — consumed by new user routes in Task 26; makes `Authorization: Bearer <key>` valid on every route already behind `authPlugin`'s `auth: true` guard (`api/src/lib/auth.plugin.ts:7`, `auth.api.getSession({ headers })`), with **zero changes needed** to `transaction.routes.ts`.

- [ ] **Step 1: Register the plugin**

`api/src/lib/auth.ts`, add the import:

```ts
import { apiKey, twoFactor } from "better-auth/plugins";
```

(replacing the existing `import { twoFactor } from "better-auth/plugins";` line)

Add `apiKey()` to the `plugins` array (`api/src/lib/auth.ts:52-69`), unconditionally (unlike `twoFactor`, this isn't env-gated — it's the backing for a page every user can reach):

```ts
 plugins: [
  apiKey(),
  ...(env.ENABLE_2FA
   ? [
     twoFactor({
      issuer: "Elysia Finanças",
      otpOptions: {
       async sendOTP({ user, otp }) {
        await sendEmail({
         to: user.email,
         subject: "Seu código de verificação",
         html: await render(TwoFactorOtpEmail({ code: otp })),
        });
       },
      },
     }),
    ]
   : []),
 ],
```

- [ ] **Step 2: Generate the exact Prisma schema addition — do not hand-type the `ApiKey` model's fields**

Run: `cd api && bunx @better-auth/cli generate --config src/lib/auth.ts`
Expected: the CLI prints (or writes, depending on prompt) the Prisma model block better-auth's `apiKey` plugin needs (typically an `ApiKey` model with fields like `id`, `name`, `start`, `prefix`, `key`, `userId`, `enabled`, `expiresAt`, `createdAt`, `updatedAt`, and rate-limit/refill bookkeeping fields — the exact field set depends on the installed better-auth version, so use the CLI's real output, not this description).

- [ ] **Step 3: Port the generated model into both Prisma schema files**

Add the generated `model ApiKey { ... }` block (with `@@map("api_key")` or whatever mapping the CLI produced) to `api/prisma/schema.sqlite.prisma` (after the `PixCharge` model) and, identically, to `api/prisma/schema.postgresql.prisma`. Add the reverse relation to `User` in **both** files:

```prisma
  apiKeys      ApiKey[]
```

(inserted in the `User` model's relations block, e.g. after `pixCharges   PixCharge[]`).

- [ ] **Step 4: Migrate and regenerate the client**

Run: `cd api && bun run db:migrate` (prompts for a migration name, e.g. `add_api_key`)
Expected: a new migration under `api/prisma/migrations/` creating the `api_key` table; no errors.

Run: `cd api && bun run db:generate`
Expected: Prisma client regenerated with the new `ApiKey` type available.

- [ ] **Step 5: Verify the plugin is live**

Run: `cd api && bun run dev`, then in another terminal:

```bash
curl -s http://localhost:4000/api/auth/ok || true
```

(a basic smoke check that the server boots with the new plugin registered — the exact ping route depends on better-auth's mount; if unsure, just confirm `bun run dev` logs no plugin-registration error and the server reaches its "rodando em" log line).

Run: `cd api && bunx --bun tsc --noEmit`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add api/src/lib/auth.ts api/prisma/schema.sqlite.prisma api/prisma/schema.postgresql.prisma api/prisma/migrations
git commit -m "feat: enable better-auth apiKey plugin for developer API access"
```

---

### Task 26: Frontend `apiKeyClient()` registration

**Files:**

- Modify: `frontend/src/lib/auth-client.ts`

**Interfaces:**

- Produces: `authClient.apiKey.create/list/delete` — consumed by Task 28a.

- [ ] **Step 1: Register the client plugin**

`frontend/src/lib/auth-client.ts`, replace:

```ts
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Sem onTwoFactorRedirect/twoFactorPage de propósito: o 2FA é resolvido em um modal
// dentro da própria página de login (entrar.tsx), não por navegação de página inteira.
export const authClient = createAuthClient({
 baseURL: API_URL,
 plugins: [twoFactorClient()],
});
```

with:

```ts
import { apiKeyClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Sem onTwoFactorRedirect/twoFactorPage de propósito: o 2FA é resolvido em um modal
// dentro da própria página de login (entrar.tsx), não por navegação de página inteira.
export const authClient = createAuthClient({
 baseURL: API_URL,
 plugins: [twoFactorClient(), apiKeyClient()],
});
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && bunx --bun tsc --noEmit`
Expected: no errors; `authClient.apiKey` is now typed.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/auth-client.ts
git commit -m "feat: register apiKeyClient plugin"
```

---

### Task 27: "API" link in the user dropdown

**Files:**

- Modify: `frontend/src/components/user-menu.tsx`

- [ ] **Step 1: Add the link**

`frontend/src/components/user-menu.tsx`, in the dropdown body from Task 24, add an "API" link between "Minha Conta" and the "Tema" row:

```tsx
      <Link
       to="/minha-conta"
       role="menuitem"
       onClick={() => setOpen(false)}
       className="block px-4 py-2 text-sm hover:bg-brand-500/10"
      >
       Minha Conta
      </Link>
      <Link
       to="/api"
       role="menuitem"
       onClick={() => setOpen(false)}
       className="block px-4 py-2 text-sm hover:bg-brand-500/10"
      >
       API
      </Link>
      <div className="flex items-center justify-between px-4 py-2 text-sm">
```

- [ ] **Step 2: Verify in the browser (will 404 until Task 28a lands the route — acceptable mid-plan state, re-verify after Task 28a)**

Open the dropdown, confirm "API" appears between "Minha Conta" and the theme row.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/user-menu.tsx
git commit -m "feat: add API link to the user dropdown"
```

---

### Task 28a: `/api` page — token management with clipboard.js

**Files:**

- Create: `frontend/src/routes/api.tsx`

**Interfaces:**

- Consumes: `authClient.apiKey` (Task 26), `PageLayout`, `requireAuth`, `clipboard` (Task 1).

- [ ] **Step 1: Scaffold the route and token UI**

Create `frontend/src/routes/api.tsx`:

```tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ClipboardJS from "clipboard";
import { useEffect, useRef, useState } from "react";
import { PageLayout } from "../components/page-layout";
import { authClient } from "../lib/auth-client";
import { requireAuth } from "../lib/require-auth";

export const Route = createFileRoute("/api")({
 head: () => ({ meta: [{ title: "API — Money" }] }),
 beforeLoad: requireAuth,
 component: ApiPage,
});

function ApiPage() {
 const queryClient = useQueryClient();
 const [createdKey, setCreatedKey] = useState<string | null>(null);
 const [creating, setCreating] = useState(false);
 const copyButtonsRef = useRef<HTMLDivElement>(null);

 const keysQuery = useQuery({
  queryKey: ["api-keys"],
  queryFn: async () => {
   const { data, error } = await authClient.apiKey.list();
   if (error) throw error;
   return data;
  },
 });

 useEffect(() => {
  const clipboard = new ClipboardJS(
   "[data-clipboard-target], [data-clipboard-text]",
   {
    container: copyButtonsRef.current ?? undefined,
   },
  );
  return () => clipboard.destroy();
 }, []);

 async function handleCreateKey(): Promise<void> {
  setCreating(true);
  const { data, error } = await authClient.apiKey.create({
   name: "Chave gerada em " + new Date().toLocaleDateString("pt-BR"),
  });
  setCreating(false);
  if (error || !data) return;
  setCreatedKey(data.key);
  await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
 }

 async function handleDeleteKey(keyId: string): Promise<void> {
  await authClient.apiKey.delete({ keyId });
  await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
 }

 return (
  <PageLayout>
   <section
    className="mx-auto max-w-2xl px-4 py-16"
    ref={copyButtonsRef}
   >
    <h1 className="text-3xl font-bold">API para desenvolvedores</h1>
    <p className="mt-2 text-sm text-(--color-fg-muted)">
     Acesse suas transações programaticamente com um token de API
     — CRUD completo, mesma conta, mesmos dados que você vê no
     dashboard.
    </p>

    <div className="mt-8 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
     <h2 className="text-lg font-semibold">Seu token</h2>
     <p className="mt-2 text-sm text-(--color-fg-muted)">
      Gere um token e use-o no header{" "}
      <code>Authorization: Bearer &lt;token&gt;</code> em toda
      requisição.
     </p>

     {createdKey && (
      <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
       <p className="text-xs font-medium text-emerald-700">
        Copie agora — por segurança, esse token não será
        mostrado de novo.
       </p>
       <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto text-xs">
         {createdKey}
        </code>
        <button
         type="button"
         data-clipboard-text={createdKey}
         className="shrink-0 rounded-lg border border-(--color-border) px-3 py-1.5 text-xs font-medium hover:bg-brand-500/10"
        >
         Copiar
        </button>
       </div>
      </div>
     )}

     <button
      type="button"
      onClick={handleCreateKey}
      disabled={creating}
      className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
     >
      {creating ? "Gerando..." : "Gerar novo token"}
     </button>

     {keysQuery.data && keysQuery.data.length > 0 && (
      <ul className="mt-5 flex flex-col gap-2 border-t border-(--color-border) pt-4">
       {keysQuery.data.map((key) => (
        <li
         key={key.id}
         className="flex items-center justify-between text-sm"
        >
         <span>
          {key.name ?? "Sem nome"} ·{" "}
          <code className="text-(--color-fg-muted)">
           {key.start}…
          </code>
         </span>
         <button
          type="button"
          onClick={() => handleDeleteKey(key.id)}
          className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10"
         >
          Revogar
         </button>
        </li>
       ))}
      </ul>
     )}
    </div>
   </section>
  </PageLayout>
 );
}
```

Note: `authClient.apiKey.create/list/delete`'s exact response field names (`key`, `id`, `name`, `start`, `keyId` param name) come from better-auth's `apiKey` plugin and must be checked against what Task 25's `bunx @better-auth/cli generate` actually produced (and against `bunx --bun tsc --noEmit`'s errors, which will point at any mismatched field) — adjust field names in this file to match if they differ from what's written above.

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && bunx --bun tsc --noEmit`
Expected: no errors (fix any `authClient.apiKey.*` field-name mismatches surfaced here against Task 25's actual generated shape).

- [ ] **Step 3: Verify in the browser**

Log in, open `/api`.
Expected: "Gerar novo token" creates a key, shows it once in a copyable box; clicking "Copiar" copies it (paste into a text field to confirm); the key list below shows the new key's name + prefix; "Revogar" removes it from the list.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/api.tsx
git commit -m "feat: add API token management to the developer API page"
```

---

### Task 28b: `/api` page — endpoint docs with copyable fetch/cURL examples + Scalar reference

**Files:**

- Modify: `frontend/src/routes/api.tsx`

**Interfaces:**

- Consumes: `/docs` (existing, auto-generated Scalar UI mounted by `@elysiajs/swagger` at `api/src/server.ts:18-28`, public, no auth required).

- [ ] **Step 1: Read the exact API base URL used elsewhere**

Confirm `frontend/src/lib/auth-client.ts`'s `API_URL` pattern (`import.meta.env.VITE_API_URL ?? "http://localhost:4000"`) is the right value to build example URLs and the `/docs` link from — reuse the same env var, don't hardcode `localhost:4000`.

- [ ] **Step 2: Add the endpoint documentation section, below the token card from Task 28a**

`frontend/src/routes/api.tsx`, add near the top:

```tsx
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const ENDPOINTS = [
 {
  method: "GET",
  path: "/transactions",
  description: "Lista transações (paginado, com filtros).",
  query: "search?: string · category?: string · from?: string (ISO) · to?: string (ISO) · page?: number = 1 · perPage?: number = 20 (máx. 1000)",
  body: null,
  response: `{ success: true, transactions: TransactionDTO[], total: number, page: number, perPage: number }`,
 },
 {
  method: "GET",
  path: "/transactions/statistics",
  description:
   "Totais e percentuais por categoria, já separados por tipo (income/expense).",
  query: null,
  body: null,
  response: `{ success: true, stats: { category: string, type: "income" | "expense", total: number, percentage: number }[] }`,
 },
 {
  method: "GET",
  path: "/transactions/:id",
  description: "Busca uma transação específica.",
  query: null,
  body: null,
  response: `{ success: true, transaction: TransactionDTO } — 404 se não existir ou não for sua`,
 },
 {
  method: "POST",
  path: "/transactions",
  description: "Cria uma transação.",
  query: null,
  body: `{ description: string (1-280 chars), amount: number (inteiro, centavos, positivo), category: TransactionCategory, type: "income" | "expense", date?: string (ISO, opcional) }`,
  response: `201 { success: true, transaction: TransactionDTO } — 403 se o plano gratuito atingiu o limite de transações`,
 },
 {
  method: "PUT",
  path: "/transactions/:id",
  description:
   "Atualiza uma transação (todos os campos são opcionais — envie só o que quer mudar).",
  query: null,
  body: `Partial<{ description, amount, category, type, date }> (mesmos tipos do POST)`,
  response: `{ success: true, transaction: TransactionDTO } — 404 se não existir ou não for sua`,
 },
 {
  method: "DELETE",
  path: "/transactions/:id",
  description: "Remove uma transação.",
  query: null,
  body: null,
  response: `{ success: true, message: string } — 404 se não existir ou não for sua`,
 },
] as const;

const TRANSACTION_DTO_TYPE = `type TransactionDTO = {
 id: string;
 description: string;
 amount: number; // centavos
 category: string;
 type: "income" | "expense";
 date: string; // ISO 8601
 createdAt: string;
 updatedAt: string | null;
};`;

function buildFetchExample(
 method: string,
 path: string,
 hasBody: boolean,
): string {
 return `await fetch("${API_URL}${path}", {
 method: "${method}",
 headers: {
  Authorization: "Bearer SEU_TOKEN_AQUI",
  "Content-Type": "application/json",
 },${
  hasBody
   ? `
 body: JSON.stringify({ description: "Supermercado", amount: 15000, category: "food", type: "expense" }),`
   : ""
 }
}).then((response) => response.json());`;
}

function buildCurlExample(
 method: string,
 path: string,
 hasBody: boolean,
): string {
 return `curl -X ${method} "${API_URL}${path}" \\
 -H "Authorization: Bearer SEU_TOKEN_AQUI"${
  hasBody
   ? ` \\
 -H "Content-Type: application/json" \\
 -d '{"description":"Supermercado","amount":15000,"category":"food","type":"expense"}'`
   : ""
 }`;
}
```

Add the rendering section inside `ApiPage`'s returned JSX, after the token card's closing `</div>`:

```tsx
    <div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
     <h2 className="text-lg font-semibold">Tipagem</h2>
     <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-(--color-bg-subtle) p-3">
      <pre className="overflow-x-auto text-xs">{TRANSACTION_DTO_TYPE}</pre>
      <button
       type="button"
       data-clipboard-text={TRANSACTION_DTO_TYPE}
       className="shrink-0 rounded-lg border border-(--color-border) px-2.5 py-1 text-xs font-medium hover:bg-brand-500/10"
      >
       Copiar
      </button>
     </div>
    </div>

    <div className="mt-6 flex flex-col gap-4">
     {ENDPOINTS.map((endpoint) => {
      const hasBody = endpoint.body !== null;
      const fetchExample = buildFetchExample(endpoint.method, endpoint.path, hasBody);
      const curlExample = buildCurlExample(endpoint.method, endpoint.path, hasBody);
      return (
       <div
        key={`${endpoint.method}-${endpoint.path}`}
        className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6"
       >
        <div className="flex items-center gap-2">
         <span className="rounded bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-600">
          {endpoint.method}
         </span>
         <code className="text-sm font-medium">{endpoint.path}</code>
        </div>
        <p className="mt-2 text-sm text-(--color-fg-muted)">{endpoint.description}</p>
        {endpoint.query && (
         <p className="mt-2 text-xs text-(--color-fg-muted)">
          <strong>Query:</strong> {endpoint.query}
         </p>
        )}
        {endpoint.body && (
         <p className="mt-2 text-xs text-(--color-fg-muted)">
          <strong>Body:</strong> {endpoint.body}
         </p>
        )}
        <p className="mt-2 text-xs text-(--color-fg-muted)">
         <strong>Response:</strong> {endpoint.response}
        </p>

        <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-(--color-bg-subtle) p-3">
         <pre className="overflow-x-auto text-xs">{fetchExample}</pre>
         <button
          type="button"
          data-clipboard-text={fetchExample}
          className="shrink-0 rounded-lg border border-(--color-border) px-2.5 py-1 text-xs font-medium hover:bg-brand-500/10"
         >
          Copiar
         </button>
        </div>
        <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-(--color-bg-subtle) p-3">
         <pre className="overflow-x-auto text-xs">{curlExample}</pre>
         <button
          type="button"
          data-clipboard-text={curlExample}
          className="shrink-0 rounded-lg border border-(--color-border) px-2.5 py-1 text-xs font-medium hover:bg-brand-500/10"
         >
          Copiar
         </button>
        </div>
       </div>
      );
     })}
    </div>

    <div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
     <h2 className="text-lg font-semibold">Referência interativa completa</h2>
     <p className="mt-2 text-sm text-(--color-fg-muted)">
      Documentação OpenAPI gerada automaticamente a partir dos schemas da API (Scalar) — inclui
      todos os endpoints, incluindo autenticação e pagamentos.
     </p>
     <a
      href={`${API_URL}/docs`}
      target="_blank"
      rel="noreferrer"
      className="mt-4 inline-block rounded-lg border border-(--color-border) px-4 py-2 text-sm font-medium hover:bg-brand-500/10"
     >
      Abrir referência interativa →
     </a>
    </div>
```

(A plain link to `${API_URL}/docs` in a new tab was chosen over an `<iframe>` embed — an iframe would need the API's response headers to not set a restrictive `X-Frame-Options`/`frame-ancestors`, which `@elysiajs/swagger` doesn't guarantee across versions, and a broken embed is worse than a reliable link. If a live embed is later desired, revisit with an `<iframe src={`${API_URL}/docs`} className="mt-4 h-[600px] w-full rounded-lg border border-(--color-border)" />` and verify no framing error appears in the console.)

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && bunx --bun tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify in the browser**

Open `/api`.
Expected: a "Tipagem" card with the `TransactionDTO` type + copy button; one card per endpoint (6 total) with method badge, path, description, query/body/response docs, a copyable `fetch` example and a copyable `cURL` example (each "Copiar" button actually copies — test by pasting into a scratch text field); a final card linking out to `${API_URL}/docs` which opens the existing Scalar UI in a new tab.

Paste one of the copied `fetch` examples into the browser devtools console (after replacing `SEU_TOKEN_AQUI` with a real token from Task 28a) and run it against the local API.
Expected: a real `200` response with actual transaction data — confirms the bearer-token auth path (Task 25) genuinely works end-to-end against a live route.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/api.tsx
git commit -m "feat: document the transactions API with copyable fetch/cURL examples"
```

---

## Phase 5 — Telegram bot (item 1)

### Task 29: Rename the bot and drop the `/cancelar` framing from the help text (item 1a, part of 1d)

**Files:**

- Modify: `bot/src/bot.ts:15-22`

- [ ] **Step 1: Rewrite `HELP_TEXT`**

`bot/src/bot.ts:15-22`, replace:

```ts
const HELP_TEXT = [
 "💬 *Elysia Finanças — bot pessoal*",
 "",
 "Use os botões abaixo para navegar. Toda operação que acessa seus dados",
 "pede sua senha pessoal antes de continuar.",
 "",
 "Só um fluxo por vez: use /cancelar antes de iniciar outro.",
].join("\n");
```

with:

```ts
const HELP_TEXT = [
 "💬 *Money BOT*",
 "",
 "Use os botões abaixo para navegar. Toda operação que acessa seus dados",
 "pede sua senha pessoal antes de continuar.",
].join("\n");
```

(This is superseded structurally by Task 30, which moves `HELP_TEXT` into `bot/src/lib/menu.ts` — if executing in order, do this rename directly in `menu.ts` during Task 30's Step 1 instead of here; this task exists to isolate the copy change as its own reviewable, revertible unit. If Task 30 already landed first, apply this same replacement to `HELP_TEXT` in `bot/src/lib/menu.ts` instead.)

- [ ] **Step 2: Verify in the browser (Telegram)**

Message the bot `/start` (or `menu:ajuda` via the "❓ Ajuda" button once Task 32 lands `/start`'s gate — until then, `/start` still shows this text unconditionally).
Expected: bot replies "💬 Money BOT" instead of "Elysia Finanças — bot pessoal", and no longer mentions `/cancelar` as a requirement.

- [ ] **Step 3: Commit**

```bash
git add bot/src/bot.ts
git commit -m "feat: rename bot to Money BOT, drop /cancelar framing from help text"
```

---

### Task 30: `bot/src/lib/menu.ts` — centralized menu, account info, and the `withMainMenu` wrapper (items 1b, 1d foundation)

**Files:**

- Create: `bot/src/lib/menu.ts`
- Modify: `bot/src/bot.ts`

**Interfaces:**

- Consumes: `findUserIdByChatId`, `findUserById` (`bot/src/lib/current-user.ts`, existing).
- Produces: `HELP_TEXT`, `mainMenuKeyboard()`, `buildMenuMessage(chatId)`, `withMainMenu(fn)` — consumed by every `createConversation(...)` registration in `bot.ts` (this task) and by `start.conversation.ts` (Task 32).

- [ ] **Step 1: Write the module**

Create `bot/src/lib/menu.ts`:

```ts
import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { findUserById, findUserIdByChatId } from "./current-user";
import type { BotConversation } from "../types";

export const HELP_TEXT = [
 "💬 *Money BOT*",
 "",
 "Use os botões abaixo para navegar. Toda operação que acessa seus dados",
 "pede sua senha pessoal antes de continuar.",
].join("\n");

export function mainMenuKeyboard(): InlineKeyboard {
 return new InlineKeyboard()
  .text("💸 Despesa", "menu:despesa")
  .text("💰 Receita", "menu:receita")
  .row()
  .text("📃 Transações", "menu:transacoes")
  .text("📊 Resumo", "menu:resumo")
  .row()
  .text("🔎 Buscar", "menu:buscar")
  .text("🗑️ Apagar", "menu:apagar")
  .row()
  .text("📄 Relatório PDF", "menu:relatorio")
  .row()
  .text("📂 Categorias", "menu:categorias")
  .text("❓ Ajuda", "menu:ajuda")
  .row()
  .text("🔌 Trocar de conta", "menu:trocar-conta");
}

/**
 * Sempre mostra qual conta está conectada a este chat (nome, chat ID e ID
 * usado como "conta" em Minha Conta no site), quando houver uma vinculada —
 * pedido explícito para nunca deixar ambíguo qual conta está em uso.
 */
export async function buildMenuMessage(chatId: number): Promise<string> {
 const userId = await findUserIdByChatId(chatId);
 const user = userId ? await findUserById(userId) : null;

 if (!user) return HELP_TEXT;

 const accountBlock = [
  "",
  "👤 *Conta conectada*",
  `Nome: ${user.name}`,
  `Chat ID: ${chatId}`,
  `ID da conta (dashboard): \`${user.id}\``,
 ].join("\n");

 return `${HELP_TEXT}${accountBlock}`;
}

/**
 * Envolve uma conversation para que, não importa como ela termine —
 * sucesso, cancelamento, erro lançado, ou um `return` antecipado (conta não
 * vinculada, senha bloqueada) — o menu principal reapareça em seguida. Troca
 * o antigo padrão de pedir /cancelar por um loop de volta ao menu, sempre.
 */
export function withMainMenu(
 fn: (conversation: BotConversation, ctx: Context) => Promise<void>,
): (conversation: BotConversation, ctx: Context) => Promise<void> {
 return async function wrapped(
  conversation: BotConversation,
  ctx: Context,
 ): Promise<void> {
  try {
   await fn(conversation, ctx);
  } finally {
   const chatId = ctx.chat?.id;
   if (chatId !== undefined) {
    const text = await conversation.external(() =>
     buildMenuMessage(chatId),
    );
    await ctx.reply(text, {
     parse_mode: "Markdown",
     reply_markup: mainMenuKeyboard(),
    });
   }
  }
 };
}
```

- [ ] **Step 2: Wire it into `bot.ts` — replace the local definitions, wrap every conversation**

`bot/src/bot.ts`, replace the top-of-file imports and the local `HELP_TEXT`/`mainMenuKeyboard` definitions:

```ts
import { transactionCategories } from "@elysia-galhardo-finances/api/src/modules/transactions/transaction.schema";
import { conversations, createConversation } from "@grammyjs/conversations";
import { Bot, InlineKeyboard } from "grammy";
import { env } from "./config/env";
import { createAddTransactionConversation } from "./conversations/add-transaction.conversation";
import { balanceConversation } from "./conversations/balance.conversation";
import { deleteTransactionConversation } from "./conversations/delete-transaction.conversation";
import { listTransactionsConversation } from "./conversations/list-transactions.conversation";
import { reportConversation } from "./conversations/report.conversation";
import { searchConversation } from "./conversations/search.conversation";
import { startConversation } from "./conversations/start.conversation";
import { categoryLabels } from "./formatting/format";
import { findUserIdByChatId, unlinkChatFromUser } from "./lib/current-user";
import {
 buildMenuMessage,
 HELP_TEXT,
 mainMenuKeyboard,
 withMainMenu,
} from "./lib/menu";
import type { BotContext } from "./types";
```

(remove the old local `const HELP_TEXT = [...]` and `function mainMenuKeyboard(): InlineKeyboard { ... }` blocks entirely — both now live in `menu.ts`; `start.conversation.ts` is added by Task 32, but the import here can land now since `bot.use(createConversation(...))` for it is added in this same step)

Replace the `createBot` conversation registrations (`bot.use(createConversation(...))` calls):

```ts
bot.use(createConversation(withMainMenu(startConversation), "start"));
bot.use(
 createConversation(
  withMainMenu(createAddTransactionConversation("expense", "despesa")),
  "add-expense",
 ),
);
bot.use(
 createConversation(
  withMainMenu(createAddTransactionConversation("income", "receita")),
  "add-income",
 ),
);
bot.use(
 createConversation(
  withMainMenu(listTransactionsConversation),
  "list-transactions",
 ),
);
bot.use(createConversation(withMainMenu(balanceConversation), "balance"));
bot.use(createConversation(withMainMenu(searchConversation), "search"));
bot.use(
 createConversation(
  withMainMenu(deleteTransactionConversation),
  "delete-transaction",
 ),
);
bot.use(createConversation(withMainMenu(reportConversation), "report"));
```

Replace the `/cancelar` command handler to also show the menu instead of a bare message:

```ts
bot.command("cancelar", async (ctx) => {
 await ctx.conversation.exitAll();
 const chatId = ctx.chat?.id;
 const text =
  chatId === undefined ? HELP_TEXT : await buildMenuMessage(chatId);
 await ctx.reply(text, {
  parse_mode: "Markdown",
  reply_markup: mainMenuKeyboard(),
 });
});
```

Replace `bot.command("start", ...)` (this now enters the conversation instead of replying directly — see Task 32 for `startConversation` itself):

```ts
bot.command("start", async (ctx) => {
 await ctx.conversation.enter("start");
});
```

Update `bot.catch(...)` to drop the `/cancelar` suggestion and show the menu:

```ts
bot.catch(({ error, ctx }) => {
 console.error(
  `Erro não tratado para update ${ctx.update.update_id}:`,
  error,
 );
 ctx.reply(
  "⚠️ Ocorreu um erro inesperado. Toque em um botão abaixo para continuar:",
  {
   reply_markup: mainMenuKeyboard(),
  },
 ).catch(() => undefined);
});
```

The `menu:ajuda` branch inside `bot.callbackQuery(/^menu:/, ...)` already replies with `HELP_TEXT`/`mainMenuKeyboard()` (now both imported from `menu.ts` instead of locally defined) — no structural change needed there beyond the import swap, but consider swapping it to `buildMenuMessage(ctx.chat.id)` for consistency (shows account info there too):

```ts
if (action === "ajuda") {
 const chatId = ctx.chat?.id;
 const text =
  chatId === undefined ? HELP_TEXT : await buildMenuMessage(chatId);
 await ctx.reply(text, {
  parse_mode: "Markdown",
  reply_markup: mainMenuKeyboard(),
 });
 return;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd bot && bunx --bun tsc --noEmit` (or the repo-root equivalent if bot has no standalone tsc script — check `bot/package.json`; if absent, run `bunx tsc --noEmit -p bot` from repo root, or simply proceed to the runtime check in Step 4, which will surface import errors immediately)

- [ ] **Step 4: Verify in Telegram**

Start the bot locally (`cd bot && bun run dev`, with the API also running), message it `/expense`-flow style: tap "💸 Despesa" as an already-linked test account, complete the flow (amount, category, description, confirm).
Expected: after the "✅ Despesa registrada com sucesso!" message, a second message immediately follows showing the account info block (Nome/Chat ID/ID da conta) and the full main menu keyboard — no `/cancelar` mentioned anywhere. Tap "❌ Cancelar" mid-flow on a different attempt (e.g. at the confirm step) — same result: "Operação cancelada." followed by the menu reappearing.

- [ ] **Step 5: Commit**

```bash
git add bot/src/lib/menu.ts bot/src/bot.ts
git commit -m "feat: centralize bot menu, show connected-account info, loop back to menu after every flow"
```

---

### Task 31: `/start` authentication gate via a dedicated conversation (item 1c)

**Files:**

- Create: `bot/src/conversations/start.conversation.ts`

**Interfaces:**

- Consumes: `ensureUserReady` (`bot/src/lib/user-gate.ts`, existing — already produces the exact required copy "👋 Para começar, envie o _ID da sua conta_...").

- [ ] **Step 1: Write the conversation**

Create `bot/src/conversations/start.conversation.ts`:

```ts
import type { Context } from "grammy";
import { ensureUserReady } from "../lib/user-gate";
import type { BotConversation } from "../types";

/**
 * /start não mostra o menu diretamente — primeiro garante que o chat está
 * vinculado a uma conta (senão, dispara o mesmo fluxo de vinculação usado
 * por qualquer outro botão) e que a conta tem plano ativo. Quem mostra o
 * menu depois é sempre o wrapper `withMainMenu` (ver bot/src/lib/menu.ts),
 * não esta função.
 */
export async function startConversation(
 conversation: BotConversation,
 ctx: Context,
): Promise<void> {
 await ensureUserReady(conversation, ctx);
}
```

(Registration into `bot.ts` — `bot.use(createConversation(withMainMenu(startConversation), "start"))` and `bot.command("start", ...)` calling `ctx.conversation.enter("start")` — was already done in Task 30, Step 2, since `menu.ts`'s `withMainMenu` needed a real function to wrap and this file is that function.)

- [ ] **Step 2: Verify in Telegram, unlinked chat**

Use a Telegram test account that has never linked to this bot (or unlink one first via "🔌 Trocar de conta" → confirm), message `/start`.
Expected: bot replies "👋 Para começar, envie o _ID da sua conta_ — você encontra em _Minha Conta_ no site, na seção "Bot do Telegram"." (exact copy from `user-gate.ts:35-38`) — no menu shown yet. Send a valid account ID (copy the "ID da conta" shown on that account's `/minha-conta` page).
Expected: "✅ Conta vinculada! Olá, {name}." followed immediately by the main menu message with account info (via the `withMainMenu` wrapper from Task 30).

- [ ] **Step 3: Verify in Telegram, already-linked chat**

From an already-linked, active-plan test account, message `/start`.
Expected: no linking prompt — goes straight to the main menu message with account info.

- [ ] **Step 4: Commit**

```bash
git add bot/src/conversations/start.conversation.ts
git commit -m "feat: gate /start on account linking and active plan"
```

---

### Task 32: Drop remaining `/cancelar` text suggestions (item 1d cleanup)

**Files:**

- Modify: `bot/src/conversations/list-transactions.conversation.ts:36`
- Modify: `bot/src/conversations/search.conversation.ts:120,124,156`

- [ ] **Step 1: Reword `list-transactions.conversation.ts`**

`bot/src/conversations/list-transactions.conversation.ts:35-37`, replace:

```ts
const reply = await conversation.waitFor("callback_query:data", {
 otherwise: (otherCtx) =>
  otherCtx.reply(
   "Use o botão acima para ver mais, ou /cancelar para sair.",
  ),
});
```

with:

```ts
const reply = await conversation.waitFor("callback_query:data", {
 otherwise: (otherCtx) => otherCtx.reply("Use o botão acima para ver mais."),
});
```

- [ ] **Step 2: Reword `search.conversation.ts`**

`bot/src/conversations/search.conversation.ts:119-121`, replace:

```ts
const reply = await conversation.waitFor("message:text", {
 otherwise: (otherCtx) =>
  otherCtx.reply("Não entendi, envie em texto ou /cancelar para sair."),
});
```

with:

```ts
const reply = await conversation.waitFor("message:text", {
 otherwise: (otherCtx) => otherCtx.reply("Não entendi, envie em texto:"),
});
```

`bot/src/conversations/search.conversation.ts:123-125`, replace:

```ts
if (!text) {
 await reply.reply("Não entendi, tente novamente ou /cancelar para sair.");
 continue;
}
```

with:

```ts
if (!text) {
 await reply.reply("Não entendi, tente novamente:");
 continue;
}
```

`bot/src/conversations/search.conversation.ts:154-158`, replace:

```ts
  } catch (error) {
   if (error instanceof InvalidDateRangeError) {
    await reply.reply(`${error.message}. Tente novamente ou /cancelar para sair.`);
    continue;
   }
   throw error;
  }
```

with:

```ts
  } catch (error) {
   if (error instanceof InvalidDateRangeError) {
    await reply.reply(`${error.message}. Tente novamente:`);
    continue;
   }
   throw error;
  }
```

- [ ] **Step 2: Verify**

Run: `grep -rn "cancelar para sair\|use /cancelar" bot/src`
Expected: no matches.

Run: `cd bot && bunx --bun tsc --noEmit` (or repo-root equivalent per Task 30 Step 3's note)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add bot/src/conversations/list-transactions.conversation.ts bot/src/conversations/search.conversation.ts
git commit -m "chore: remove remaining /cancelar suggestions from bot prompts"
```

---

### Task 33: Verify admin account access (item 1e — no code expected)

**Files:** none expected to change.

- [ ] **Step 1: Confirm the seed already grants the admin an active plan**

Read `api/prisma/seed.ts:55-69` (`seedAdminUser`) — confirms `admin@gmail.com` is created with `planStatus: "active"`, `planExpiresAt: "2099-12-31..."`, and that `bot/src/lib/user-gate.ts` gates only on `telegramChatId` linkage + `hasActivePlan(user)`, with no special-casing that would block or restrict an admin account.

- [ ] **Step 2: End-to-end verify in Telegram**

Ensure the API's seed has run (`cd api && bun run db:seed`), note the admin's account ID from a local Prisma Studio session (`cd api && bun run db:studio`, open the `user` table, copy `admin@gmail.com`'s `id`) or from `/minha-conta` after logging in as `admin@gmail.com` / `adminBR@123` on the web. From a Telegram test account not yet linked to any user, message `/start`, send the admin's account ID when prompted.
Expected: "✅ Conta vinculada! Olá, Admin." — the bot works identically for the admin account as for any other account (all menu buttons functional, no gating difference). This confirms item 1e requires no code change — the existing multi-tenant design (Task 30/31's account-linking flow) already covers it.

- [ ] **Step 3: No commit** (verification-only task; if Step 1/2 surface an actual gap, stop and write a real fix task before continuing — do not silently skip if something doesn't match).

---

## Final Validation

- [ ] Run the full backend + frontend validation suite from `CLAUDE.md`:

    ```bash
    (cd api && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
    (cd frontend && bunx --bun tsc --noEmit && bun run build)
    ```

    Expected: all green.
