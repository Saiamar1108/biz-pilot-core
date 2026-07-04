import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

function stockBadgeClass(stock: number) {
  if (stock <= 2) return "text-destructive bg-destructive/10 border-destructive/20";
  if (stock <= 10) return "text-warning bg-warning/10 border-warning/20";
  return "text-emerald-700 bg-emerald-100 border-emerald-200";
}

export function ProductSearchCombobox({
  products,
  value,
  onSelect,
  placeholder = "Search product or SKU…",
}: {
  products: Product[];
  value: string;
  onSelect: (product: Product) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((product) => product.id === value || product.name === value);

  const sorted = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background font-normal"
        >
          <span className="truncate">{selected?.name ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or SKU…" />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.sku}`}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected?.id === product.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.sku} · {formatCurrency(product.price)}
                    </div>
                    <div
                      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] ${stockBadgeClass(product.stock)}`}
                    >
                      {product.stock} in stock
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
