export function StateTooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-flex">
      <div className="w-3 h-3 rounded-full bg-gray-600 hover:bg-gray-500 cursor-help flex items-center justify-center">
        <span className="text-[8px] text-gray-300">?</span>
      </div>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-[250px] whitespace-normal">
        {text}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}