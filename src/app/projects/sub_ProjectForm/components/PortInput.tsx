
interface PortInputProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PortInput({ value, onChange }: PortInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Port *
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 3000)}
        min="1000"
        max="65535"
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        required
      />
    </div>
  );
}
