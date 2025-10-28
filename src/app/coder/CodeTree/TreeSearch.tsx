import { Search, X } from "lucide-react"

type Props = {
    searchTerm: string,
    setSearchTerm: (searchTerm: string) => void,
    filterType: string,
    setFilterType: (filterType: string) => void
    clearSearch: () => void
}

const TreeSearch = ({
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    clearSearch
}: Props) => {
    return <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                placeholder="Search files and folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
            {searchTerm && (
                <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>

        <div className="flex items-center space-x-1 bg-gray-800/50 border border-gray-700/50 rounded-lg p-1">
            {(['all', 'files', 'folders'] as const).map((type) => (
                <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 text-sm rounded-md transition-all capitalize ${filterType === type
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                >
                    {type}
                </button>
            ))}
        </div>
    </div>
}

export default TreeSearch