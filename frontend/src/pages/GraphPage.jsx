import React, { useRef, useState, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useStudy } from '../components/StudyContext';
import { Maximize, ZoomIn, ZoomOut, Network, Share2, Layers, Crosshair } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GraphPage() {
  const { graphData } = useStudy();
  const fgRef = useRef();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. SAFE DATA WRAPPER: Ensures ForceGraph never chokes on undefined data
  const safeGraphData = {
    nodes: graphData?.nodes || [],
    links: graphData?.links || []
  };

  // 2. WAKE UP PHYSICS: Smoothly reheat simulation when data changes instead of destroying the canvas
  useEffect(() => {
    if (fgRef.current && safeGraphData.nodes.length > 0) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [safeGraphData.nodes.length, safeGraphData.links.length]);

  // Track container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    const timeoutId = setTimeout(updateDimensions, 150); 
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeoutId);
    };
  }, []);

  const paintNode = useCallback((node, ctx, globalScale) => {
    const label = node.name || node.id;
    const fontSize = Math.max(12 / globalScale, 2.5); 
    const nodeColor = node.color || '#6366f1'; 

    ctx.shadowColor = nodeColor;
    ctx.shadowBlur = 15 / globalScale; 
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#09090b'; 
    ctx.fill();
    
    ctx.lineWidth = 2.5 / globalScale;
    ctx.strokeStyle = nodeColor;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#f4f4f5'; 
    ctx.fillText(label, node.x, node.y + 10);
  }, []);

  const handleZoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 400);
  const handleZoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() * 0.7, 400);
  const handleFit = () => fgRef.current?.zoomToFit(400, 50);
  
  const handleShare = () => {
    toast.success("Graph snapshot saved to clipboard!", { icon: '📸' });
  };

  return (
    <div className="h-full w-full flex flex-col relative animate-in fade-in duration-700 bg-[#050505] overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 shadow-2xl pointer-events-auto transition-all hover:border-zinc-700">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2 tracking-tight">
            <Network className="w-6 h-6 text-indigo-500" /> Neural Map
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" /> {safeGraphData.nodes.length} Nodes
            </span>
            <div className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <Share2 className="w-3.5 h-3.5" /> {safeGraphData.links.length} Edges
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-6 right-6 z-10 pointer-events-none hidden md:block">
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-1.5 flex flex-col gap-1 shadow-2xl pointer-events-auto">
          <button onClick={handleZoomIn} className="p-2.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 rounded-xl transition-all active:scale-95">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={handleZoomOut} className="p-2.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 rounded-xl transition-all active:scale-95">
            <ZoomOut className="w-5 h-5" />
          </button>
          <div className="h-[1px] w-full bg-zinc-800/80 my-0.5" />
          <button onClick={handleFit} className="p-2.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 rounded-xl transition-all active:scale-95">
            <Crosshair className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative" ref={containerRef}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {dimensions.width > 0 && dimensions.height > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={safeGraphData} /* USING SAFE WRAPPER */
            nodeCanvasObject={paintNode}
            nodeRelSize={6}
            linkColor={() => '#27272a'} 
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => '#818cf8'} 
            backgroundColor="transparent" 
            d3AlphaDecay={0.02} 
            d3VelocityDecay={0.2}
          />
        )}

        {/* Empty State */}
        {safeGraphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/50 p-10 rounded-[2rem] text-center shadow-2xl max-w-sm mx-4 transform transition-all">
              <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-zinc-800/50">
                 <Network className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 tracking-tight">Awaiting Input</h3>
              <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
                Your neural map is currently empty. Start a new chat session to begin visualizing concepts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}