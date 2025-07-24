'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    Search,
    Filter,
    Code2,
    FileText,
    GitBranch,
    Clock,
    User,
    Folder,
    TrendingUp,
    Loader2,
    ChevronDown,
    X
} from 'lucide-react';

// TypeScript interfaces
interface CodeFile {
    repository: string;
    file_type: string;
    file_path: string;
    content: string;
    line_count: number;
    last_modified?: string;
    git_info?: {
        author: string;
        commit_hash: string;
        commit_message: string;
    };
}

interface AnalysisData {
    totalFiles: number;
    repositories: string[];
    fileTypes: [string, number][];
    totalLines: number;
    files: CodeFile[];
}

interface Filters {
    repository: string;
    fileType: string;
    search: string;
}

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24
        }
    }
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24
        }
    },
    hover: {
        scale: 1.02,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25
        }
    }
};

const LoadingSpinner = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[60vh]"
    >
        <div className="text-center">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
            >
                <Loader2 className="w-8 h-8 text-indigo-600" />
            </motion.div>
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-slate-600 font-medium"
            >
                Analyzing your codebase...
            </motion.p>
        </div>
    </motion.div>
);

export default function CodeAnalyzer() {
    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Filters>({
        repository: '',
        fileType: '',
        search: ''
    });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        fetchAnalysis();
    }, [filters]);

    const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });

        try {
            const response = await fetch(`/api/code-analysis?${params}`);
            if (!response.ok) throw new Error('Failed to fetch analysis');

            const data: AnalysisData = await response.json();
            setAnalysis(data);
        } catch (error) {
            console.error('Error fetching analysis:', error);
            setError('Failed to load code analysis. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filteredFileTypes = useMemo(() => {
        if (!analysis) return [];
        return analysis.fileTypes.filter(([type]) => type !== '');
    }, [analysis]);

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center min-h-[60vh]"
            >
                <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-900 mb-2">Analysis Failed</h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={fetchAnalysis}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    if (!analysis) return null;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 sm:p-6 lg:p-8"
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    variants={itemVariants}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                            <Code2 className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                            Code Repository Analysis
                        </h1>
                    </div>
                    <p className="text-slate-600 text-lg">
                        Explore and analyze your codebase with intelligent insights
                    </p>
                </motion.div>

                {/* Advanced Filter Panel */}
                <motion.div
                    variants={itemVariants}
                    className="mb-8"
                >
                    <motion.button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mb-4"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Filter className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-700">Filters</span>
                        <motion.div
                            animate={{ rotate: isFilterOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                        </motion.div>
                    </motion.button>

                    <AnimatePresence>
                        {isFilterOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Repository Filter */}
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <GitBranch className="w-4 h-4" />
                                                Repository
                                            </label>
                                            <motion.select
                                                value={filters.repository}
                                                onChange={(e) => setFilters({ ...filters, repository: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-700"
                                                whileFocus={{ scale: 1.02 }}
                                            >
                                                <option value="">All Repositories</option>
                                                {analysis.repositories.map((repo: string) => (
                                                    <option key={repo} value={repo}>{repo}</option>
                                                ))}
                                            </motion.select>
                                        </div>

                                        {/* File Type Filter */}
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <FileText className="w-4 h-4" />
                                                File Type
                                            </label>
                                            <motion.select
                                                value={filters.fileType}
                                                onChange={(e) => setFilters({ ...filters, fileType: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-700"
                                                whileFocus={{ scale: 1.02 }}
                                            >
                                                <option value="">All File Types</option>
                                                {filteredFileTypes.map(([type]) => (
                                                    <option key={type} value={type}>{type || 'No extension'}</option>
                                                ))}
                                            </motion.select>
                                        </div>

                                        {/* Search Filter */}
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <Search className="w-4 h-4" />
                                                Search
                                            </label>
                                            <div className="relative">
                                                <motion.input
                                                    type="text"
                                                    value={filters.search}
                                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                                    placeholder="Search in file content or path..."
                                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-700"
                                                    whileFocus={{ scale: 1.02 }}
                                                />
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Premium Analysis Summary Cards */}
                <motion.div
                    variants={itemVariants}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                >
                    {[
                        {
                            title: "Total Files",
                            value: analysis.totalFiles.toLocaleString(),
                            icon: FileText,
                            gradient: "from-blue-500 to-cyan-500",
                            bg: "from-blue-50 to-cyan-50",
                            border: "border-blue-200"
                        },
                        {
                            title: "Total Lines",
                            value: analysis.totalLines.toLocaleString(),
                            icon: TrendingUp,
                            gradient: "from-emerald-500 to-teal-500",
                            bg: "from-emerald-50 to-teal-50",
                            border: "border-emerald-200"
                        },
                        {
                            title: "Repositories",
                            value: analysis.repositories.length.toString(),
                            icon: GitBranch,
                            gradient: "from-purple-500 to-pink-500",
                            bg: "from-purple-50 to-pink-50",
                            border: "border-purple-200"
                        }
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            variants={cardVariants}
                            whileHover="hover"
                            className={`relative overflow-hidden bg-gradient-to-br ${stat.bg} border ${stat.border} rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                                    <motion.p
                                        className="text-3xl font-bold text-slate-900"
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                                    >
                                        {stat.value}
                                    </motion.p>
                                </div>
                                <div className={`p-3 bg-gradient-to-r ${stat.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Premium File Types Grid */}
                <motion.div
                    variants={itemVariants}
                    className="mb-8"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <h3 className="text-xl font-semibold text-slate-800">File Types Distribution</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {analysis.fileTypes.map(([type, count], index) => (
                            <motion.div
                                key={type}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.05, y: -2 }}
                                className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
                            >
                                <div className="w-10 h-10 bg-gradient-to-r from-slate-400 to-slate-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:from-indigo-500 group-hover:to-purple-600 transition-all duration-200">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div className="font-semibold text-slate-800 text-sm mb-1 truncate" title={type || 'No extension'}>
                                    {type || 'No ext'}
                                </div>
                                <motion.div
                                    className="text-xs text-slate-600 font-medium"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 + 0.1 }}
                                >
                                    {count.toLocaleString()} files
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Premium Files List */}
                <motion.div
                    variants={itemVariants}
                    className="mb-8"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Folder className="w-5 h-5 text-slate-600" />
                        <h3 className="text-xl font-semibold text-slate-800">Files Overview</h3>
                        <div className="ml-auto text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {analysis.files.length.toLocaleString()} files
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            <AnimatePresence>
                                {analysis.files.map((file, index) => (
                                    <motion.div
                                        key={`${file.repository}-${file.file_path}-${index}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.02, duration: 0.3 }}
                                        whileHover={{
                                            backgroundColor: "rgba(99, 102, 241, 0.05)",
                                            transition: { duration: 0.2 }
                                        }}
                                        className="border-b border-slate-100 last:border-b-0 p-4 cursor-pointer group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-200" />
                                                    <motion.div
                                                        className="font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors duration-200"
                                                        whileHover={{ x: 2 }}
                                                    >
                                                        <span className="text-slate-500 text-sm">{file.repository}/</span>
                                                        <span>{file.file_path}</span>
                                                    </motion.div>
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                                    <div className="flex items-center gap-1">
                                                        <TrendingUp className="w-3 h-3" />
                                                        <span>{file.line_count.toLocaleString()} lines</span>
                                                    </div>

                                                    {file.last_modified && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>
                                                                {new Date(file.last_modified).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {file.git_info?.author && (
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            <span className="truncate max-w-32" title={file.git_info.author}>
                                                                {file.git_info.author}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {file.git_info?.commit_message && (
                                                    <motion.div
                                                        className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1 truncate"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        title={file.git_info.commit_message}
                                                    >
                                                        {file.git_info.commit_message}
                                                    </motion.div>
                                                )}
                                            </div>

                                            <motion.div
                                                className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                whileHover={{ scale: 1.1 }}
                                            >
                                                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                                                    <FileText className="w-4 h-4 text-white" />
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {analysis.files.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-12 text-center"
                            >
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-slate-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-slate-700 mb-2">No files found</h4>
                                <p className="text-slate-500">Try adjusting your filters to see more results.</p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #6366f1, #8b5cf6);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #4f46e5, #7c3aed);
                }
            `}</style>
        </motion.div>
    );
}