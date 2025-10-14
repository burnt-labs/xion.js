export function StateTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <div className="flex h-3 w-3 cursor-help items-center justify-center rounded-full bg-gray-600 hover:bg-gray-500">
        <span className="text-[8px] text-gray-300">?</span>
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 max-w-[250px] -translate-x-1/2 transform whitespace-normal rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        {text}
        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}
