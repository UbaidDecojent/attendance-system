"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    SortingState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    showPagination?: boolean
    showSearch?: boolean
    pageCount?: number
    onPageChange?: (page: number) => void
    pagination?: {
        pageIndex: number
        pageSize: number
        total?: number
    }
    isLoading?: boolean
    onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
    columns,
    data,
    showPagination = true,
    showSearch = true,
    pageCount,
    onPageChange,
    pagination: externalPagination,
    isLoading,
    onRowClick
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = React.useState("")

    const manualPagination = !!onPageChange && !!externalPagination;

    const table = useReactTable({
        data,
        columns,
        pageCount: manualPagination ? pageCount : undefined,
        manualPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: (row, columnId, filterValue) => {
            const search = filterValue.toLowerCase();
            let value = row.getValue(columnId) as string;
            if (typeof value === 'object') {
                return JSON.stringify(row.original).toLowerCase().includes(search)
            }
            return String(value).toLowerCase().includes(search) || JSON.stringify(row.original).toLowerCase().includes(search);
        },
        state: {
            sorting,
            globalFilter,
            ...(manualPagination ? {
                pagination: {
                    pageIndex: (externalPagination?.pageIndex || 1) - 1, // Convert 1-based to 0-based
                    pageSize: externalPagination?.pageSize || 10
                }
            } : {})
        },
    })

    return (
        <div className="space-y-4">
            {showSearch && (
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                        value={globalFilter ?? ""}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="h-10 w-full rounded-full border border-white/5 bg-zinc-900/50 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime transition-all"
                        placeholder="Search..."
                    />
                </div>
            )}
            <div className="bg-[#111111] border border-white/5 rounded-[2rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="border-b border-white/5 bg-zinc-900/30">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <th
                                                key={header.id}
                                                className="text-left py-6 px-8 text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </th>
                                        )
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length} className="h-24 text-center text-zinc-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        onClick={() => onRowClick && onRowClick(row.original)}
                                        className={cn(
                                            "group hover:bg-white/[0.02] transition-colors",
                                            onRowClick && "cursor-pointer"
                                        )}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="py-5 px-8">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="h-24 text-center text-zinc-500">
                                        No results.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {showPagination && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <button
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent"
                        onClick={() => {
                            if (manualPagination && onPageChange && externalPagination) {
                                onPageChange(externalPagination.pageIndex - 1);
                            } else {
                                table.previousPage();
                            }
                        }}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent"
                        onClick={() => {
                            if (manualPagination && onPageChange && externalPagination) {
                                onPageChange(externalPagination.pageIndex + 1);
                            } else {
                                table.nextPage();
                            }
                        }}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    )
}
