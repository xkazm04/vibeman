interface PortInputProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PortInput({ value, onChange }: PortInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400">
        Port *
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 3000)}
        min="1000"
        max="65535"
        className="w-32 px-3 py-2 bg-gray-900/50 border border-gray-700/60 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        required
      />
    </div>
  );
}
