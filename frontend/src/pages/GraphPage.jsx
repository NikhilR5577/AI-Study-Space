import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Share2, ZoomIn, ZoomOut, Maximize, AlertTriangle, Loader2, Network } from 'lucide-react';
import { useStudy } from '../components/StudyContext'; // 👈 NEW: Hooking into real data

// --- THE SAFETY NET ---
class GraphErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-red-400 bg-red-950/20 rounded-3xl border border-red-900/50 w-full">
          <AlertTriangle className="w-12 h-12" />
          <h2 className="text-xl font-bold text-gray-100">Physics Engine Failed</h2>
          <div className="p-4 bg-red-950/50 rounded-lg text-red-300 font-mono text-sm w-full overflow-auto text-left">
            {this.state.error?.toString()}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function GraphPage() {
  const graphRef = useRef();
  const containerRef = useRef(null);
  
  // Safe sizing states
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);

  // 👈 THE FIX: Pulling the REAL graph data from your chat sessions
  const { graphData } = useStudy();

  // Bulletproof measuring to prevent the 0x0 crash
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
        setIsReady(true);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleZoomIn = useCallback(() => graphRef.current?.zoom(graphRef.current.zoom() * 1.2, 400), []);
  const handleZoomOut = useCallback(() => graphRef.current?.zoom(graphRef.current.zoom() / 1.2, 400), []);
  const handleFit = useCallback(() => graphRef.current?.zoomToFit(400, 50), []);

  const handleNodeClick = useCallback((node) => {
    alert(`Selected: ${node.name}\n\nFuture features:\n- Open ${node.name} PDF\n- Ask AI about this node`);
  }, []);

  // Check if graph is empty to show a nice prompt instead of an empty space
  const isGraphEmpty = !graphData || !graphData.nodes || graphData.nodes.length === 0;

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-gray-100 tracking-tight">Knowledge Graph</h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isGraphEmpty ? 'bg-gray-600' : 'bg-indigo-500 animate-pulse'}`}></span>
            {isGraphEmpty ? "Awaiting study data..." : "Physics-based concept mapping."}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex gap-2 bg-[#111111] border border-gray-800 p-1.5 rounded-xl z-10">
          <button onClick={handleZoomIn} disabled={isGraphEmpty} className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={handleZoomOut} disabled={isGraphEmpty} className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <ZoomOut className="w-5 h-5" />
          </button>
          <button onClick={handleFit} disabled={isGraphEmpty} className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div 
        ref={containerRef}
        className="flex-1 bg-[#0a0a0a] rounded-3xl border border-gray-800/60 shadow-2xl overflow-hidden relative flex items-center justify-center min-h-[600px]"
      >
        <GraphErrorBoundary>
          {!isReady ? (
            <div className="flex flex-col items-center justify-center text-indigo-500 gap-4">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-mono text-gray-500">Measuring canvas...</p>
            </div>
          ) : isGraphEmpty ? (
            // 👈 NEW: Empty State UI
            <div className="flex flex-col items-center justify-center text-gray-500 gap-4">
              <Network className="w-16 h-16 opacity-20" />
              <p className="text-lg">Your Second Brain is empty.</p>
              <p className="text-sm">Start a chat to map your study concepts automatically.</p>
            </div>
          ) : (
            <div className="absolute inset-0 cursor-crosshair">
              <ForceGraph2D
                ref={graphRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData} // 👈 Pumping the real context data in here
                linkColor={() => '#374151'} 
                linkWidth={2}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                backgroundColor="#0a0a0a"
                onNodeClick={handleNodeClick}
                onNodeDragEnd={node => {
                  node.fx = node.x;
                  node.fy = node.y;
                }}
                
                // --- Custom Canvas Drawing ---
                nodeCanvasObject={(node, ctx, globalScale) => {
                  // Size the circle relative to the node's value (default to 5 if undefined)
                  const nodeVal = node.val || 5;
                  const NODE_R = Math.sqrt(nodeVal) * 2.5;
                  
                  // 1. Draw the circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, NODE_R, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node.color || '#4f46e5';
                  ctx.fill();

                  // 2. Draw the text label
                  const label = node.name || node.id;
                  const fontSize = 14 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  ctx.fillStyle = '#e5e7eb'; 
                  
                  // Position the text slightly below the circle
                  ctx.fillText(label, node.x, node.y + NODE_R + (2 / globalScale));
                }}
              />
            </div>
          )}
        </GraphErrorBoundary>
        
        {!isGraphEmpty && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs font-mono text-gray-500 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800 backdrop-blur-sm pointer-events-none z-10">
            <Share2 className="w-4 h-4 text-indigo-500" />
            FORCE ENGINE ACTIVE
          </div>
        )}

      </div>
    </div>
  );
}