
interface GitConfigInputsProps {
  repository: string;
  branch: string;
  onRepositoryChange: (value: string) => void;
  onBranchChange: (value: string) => void;
}

export default function GitConfigInputs({
  repository,
  branch,
  onRepositoryChange,
  onBranchChange
}: GitConfigInputsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          GitHub Repository (Optional)
        </label>
        <input
          type="url"
          value={repository}
          onChange={(e) => onRepositoryChange(e.target.value)}
          placeholder="https://github.com/username/repository.git"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Main Branch (Optional)
        </label>
        <input
          type="text"
          value={branch}
          onChange={(e) => onBranchChange(e.target.value)}
          placeholder="main"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
      </div>
    </div>
  );
}
