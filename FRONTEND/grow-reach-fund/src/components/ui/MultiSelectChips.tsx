interface MultiSelectChipsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
}

const MultiSelectChips = ({ options, selected, onChange, label }: MultiSelectChipsProps) => {
  const toggle = (opt: string) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  };

  return (
    <div>
      {label && <p className="text-sm font-medium text-foreground mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all border min-h-[44px] ${
              selected.includes(opt)
                ? "bg-primary text-primary-foreground border-primary shadow-soft"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {selected.includes(opt) && "✓ "}{opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MultiSelectChips;
