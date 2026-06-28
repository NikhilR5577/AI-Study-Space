// src/services/chatApi.js

// Change this if your FastAPI backend is running on a different port
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Sends a message to the backend and reads the JSON-Lines streamed response.
 */
export const sendChatMessageStream = async (message, provider, model, sessionId, userId, onChunk, onMetadata) => {
    try {
        // 👈 THE TRIPWIRES: Check your Chrome Console (F12) to see exactly what is being sent!
        console.log("DEBUG API: The raw userId passed to sendChatMessageStream is:", userId);

        const payload = { 
            query: message, 
            provider: provider, 
            model: model,
            session_id: sessionId || "default-session",
            user_id: userId || "guest" 
        };

        console.log("DEBUG API: The final JSON payload going to FastAPI:", payload);

        const response = await fetch(`${API_URL}/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); 
            
            for (const line of lines) {
                if (!line.trim()) continue; 
                
                try {
                    const parsed = JSON.parse(line);
                    
                    if (parsed.type === "text" || parsed.type === "error") {
                        onChunk(parsed.content);
                    } 
                    else if (parsed.type === "metadata") {
                        if (onMetadata) onMetadata(parsed);
                    }
                } catch (e) {
                    console.error("Failed to parse JSON line:", line, e);
                }
            }
        }
        
        if (buffer.trim()) {
            try {
                const parsed = JSON.parse(buffer);
                if (parsed.type === "text") onChunk(parsed.content);
                else if (parsed.type === "metadata" && onMetadata) onMetadata(parsed);
            } catch (e) {}
        }

    } catch (error) {
        console.error("Streaming error:", error);
        throw error; 
    }
};

/**
 * Asks the backend to extract entities for the Knowledge Graph.
 * (Legacy fallback - mostly handled by the stream now)
 */
export const extractKnowledgeGraph = async (text, provider, model) => {
    try {
        const response = await fetch(`${API_URL}/api/graph/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, provider, model })
        });
        
        if (!response.ok) throw new Error("Graph extraction failed");
        return await response.json();
    } catch (error) {
        console.error("Failed to extract graph data:", error);
        return { nodes: [], links: [] };
    }
};