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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="md:col-span-3 space-y-2">
        <label className="block text-xs font-medium text-gray-400">
          Repository URL
        </label>
        <input
          type="url"
          value={repository}
          onChange={(e) => onRepositoryChange(e.target.value)}
          placeholder="https://github.com/username/repository.git"
          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/60 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-400">
          Branch
        </label>
        <input
          type="text"
          value={branch}
          onChange={(e) => onBranchChange(e.target.value)}
          placeholder="main"
          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/60 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        />
      </div>
    </div>
  );
}
