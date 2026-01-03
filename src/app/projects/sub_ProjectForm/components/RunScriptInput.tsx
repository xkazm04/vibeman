interface RunScriptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RunScriptInput({ value, onChange }: RunScriptInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400">
        Command
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="npm run dev"
        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/60 rounded-lg text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
      />
    </div>
  );
}
