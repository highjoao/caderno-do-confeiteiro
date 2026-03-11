import * as React from "react";
import { Input } from "@/components/ui/input";
import { maskCurrency } from "@/lib/currency-mask";

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: string;
  onChange: (formatted: string) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCurrency(e.target.value);
      onChange(masked);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
