import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";

const StudyContext = createContext();

export function StudyProvider({ children, userEmail }) {
  // ===========================
  // PERSISTENCE HELPER
  // ===========================
  const loadFromStorage = (key, initial) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch { return initial; }
  };

  const getCleanUserId = (id) => {
    if (!id) return "guest";
    if (typeof id === 'string') return id.replace(/^"|"$/g, '');
    if (id.email) return id.email;
    return String(id);
  }; 

  // ===========================
  // SETTINGS & IDENTITY
  // ===========================
  const [provider, setProvider] = useState("groq");
  const [model, setModel] = useState("llama-3.3");
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [userId, setUserId] = useState(() => loadFromStorage("user_email", null));
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  const [isSessionLoading, setIsSessionLoading] = useState(false); // Prevents autosave during session switch

  useEffect(() => {
    if (userEmail) {
      const cleanEmail = getCleanUserId(userEmail);
      setUserId(cleanEmail);
      localStorage.setItem("user_email", JSON.stringify(cleanEmail));
    }
  }, [userEmail]);

  // ===========================
  // SESSION & CHAT STATE
  // ===========================
  const [sessionMetadata, setSessionMetadata] = useState([]); 
  const [chatHistory, setChatHistory] = useState(() => loadFromStorage("chatHistory", []));
  const [currentTopic, setCurrentTopic] = useState(() => loadFromStorage("currentTopic", ""));
  const [activeSources, setActiveSources] = useState(() => loadFromStorage("activeSources", []));

  // ===========================
  // KNOWLEDGE GRAPH
  // ===========================
  const [graphData, setGraphData] = useState(() => loadFromStorage("graphData", { nodes: [], links: [] }));

  // ===========================
  // ANALYTICS & STATS
  // ===========================
  const [currentStreak, setCurrentStreak] = useState(() => loadFromStorage("currentStreak", 0));
  const [sessionsCompleted, setSessionsCompleted] = useState(() => loadFromStorage("sessionsCompleted", 0));
  const [studyData, setStudyData] = useState(() => loadFromStorage("studyData", [
    { day: "Sun", hours: 0 }, { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 },
    { day: "Wed", hours: 0 }, { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }
  ]));
  const [studyHistory, setStudyHistory] = useState(() => loadFromStorage("studyHistory", []));
  const [studyGoals, setStudyGoals] = useState(() => loadFromStorage("studyGoals", []));

  // ===========================
  // TWO-TIER MONGODB HYDRATION
  // ===========================
  const fetchUserData = useCallback(async (rawEmail) => {
    const cleanEmail = getCleanUserId(rawEmail);

    if (cleanEmail === "guest") {
      clearSessionData();
      return;
    }
    
    setIsDataLoaded(false); 
    
    try {
      // 1. Fetch Tier 1 Metadata (For Sidebar History)
      const metaRes = await api.get(`/api/sessions/metadata/${cleanEmail}`);
      if (metaRes.data && metaRes.data.data) {
        setSessionMetadata(metaRes.data.data);
        
        // 2. Fetch Tier 2 Deep Data (Auto-load the most recent session)
        if (metaRes.data.data.length > 0) {
          const recentId = metaRes.data.data[0].sessionId;
          await loadSession(recentId); // Uses the updated loadSession function below
        }
      }

      // 3. Fetch Analytics
      const analyticsRes = await api.get(`/api/analytics/${cleanEmail}`);
      if (analyticsRes.data) {
        const analytics = analyticsRes.data;
        if (analytics.studyData) setStudyData(analytics.studyData);
        if (analytics.studyHistory) setStudyHistory(analytics.studyHistory);
        if (analytics.goals) setStudyGoals(analytics.goals);
        if (analytics.currentStreak !== undefined) setCurrentStreak(analytics.currentStreak);
        if (analytics.sessionsCompleted !== undefined) setSessionsCompleted(analytics.sessionsCompleted);
      }
    } catch (err) {
      console.error("Hydration failed:", err);
    } finally {
      setIsDataLoaded(true); 
    }
  }, []);

  // PATCH: Sidebar Sync Engine
  const refreshMetadataOnly = useCallback(async (rawEmail) => {
    const cleanEmail = getCleanUserId(rawEmail);
    try {
      const metaRes = await api.get(`/api/sessions/metadata/${cleanEmail}`);
      if (metaRes.data && metaRes.data.data) {
        setSessionMetadata(metaRes.data.data);
      }
    } catch (err) { console.error("Sidebar refresh failed:", err); }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserData(userId);
    } else {
      clearSessionData();
    }
  }, [userId, fetchUserData]);

  // ===========================
  // MODIFIED SESSION LOADING
  // ===========================
  const loadSession = async (targetSessionId) => {
    setIsSessionLoading(true); // LOCK SAVES
    try {
      const cleanEmail = getCleanUserId(userId);
      const sessionRes = await api.get(`/api/sessions/${targetSessionId}`, {
        params: { user_email: cleanEmail }
      });
      if (sessionRes.data && sessionRes.data.data) {
        const data = sessionRes.data.data;
        setSessionId(data.sessionId);
        setCurrentTopic(data.topic || "");
        setChatHistory(data.chatTranscript || []);
        
        // Accept 'edges' from backend and map to 'links' for frontend
        const rawGraph = data.knowledgeGraph || {};
        setGraphData({
            nodes: rawGraph.nodes || [],
            links: rawGraph.links || rawGraph.edges || []
        });
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setIsSessionLoading(false); // UNLOCK SAVES
    }
  };

  // ===========================
  // CHAT & GRAPH FUNCTIONS
  // ===========================
  const startNewChat = () => {
    setSessionId(crypto.randomUUID());
    setChatHistory([]);
    setCurrentTopic("");
    setActiveSources([]);
    setGraphData({ nodes: [], links: [] });
  };

  const addChatMessage = (messageObj) => {
    setChatHistory((prev) => {
      const newHistory = [...prev, { id: crypto.randomUUID(), ...messageObj }];
      if (!currentTopic && messageObj.role === "user") {
        setCurrentTopic(messageObj.content.substring(0, 60));
      }
      return newHistory;
    });
  };

  const updateLastAssistantMessage = (content) => {
    setChatHistory((prev) => {
      const newHistory = [...prev];
      for (let i = newHistory.length - 1; i >= 0; i--) {
        if (newHistory[i].role === "assistant") {
          newHistory[i].content = content;
          break;
        }
      }
      return newHistory;
    });
  };

  const setUploadedSources = (sources) => setActiveSources(sources);

  const updateKnowledgeGraph = (newNodes, newLinks) => {
    if (!newNodes || newNodes.length === 0) return;
    setGraphData((prevGraph) => {
      const updatedNodes = [...prevGraph.nodes];
      const updatedLinks = [...prevGraph.links];

      newNodes.forEach((incomingNode) => {
        const existingNodeIndex = updatedNodes.findIndex(n => n.id === incomingNode.id);
        if (existingNodeIndex >= 0) {
          updatedNodes[existingNodeIndex].val += 2;
        } else {
          updatedNodes.push({
            id: incomingNode.id,
            name: incomingNode.name || incomingNode.id,
            val: incomingNode.val || 5,
            color: incomingNode.color || '#4f46e5'
          });
        }
      });

      newLinks.forEach((incomingLink) => {
        const linkExists = updatedLinks.some(
          l => (l.source === incomingLink.source && l.target === incomingLink.target) || 
               (l.source === incomingLink.target && l.target === incomingLink.source)
        );
        if (!linkExists) updatedLinks.push(incomingLink);
      });

      return { nodes: updatedNodes, links: updatedLinks };
    });
  };

  const addStudySession = (sessionData) => {
    setStudyHistory((prev) => {
      if (prev.length > 0 && prev[0].topic === sessionData.topic && (Date.now() - prev[0].timestamp < 60000)) {
        return prev; 
      }
      return [
        {
          id: crypto.randomUUID(),
          topic: sessionData.topic,
          docs: sessionData.sources?.join(", ") || "General Knowledge",
          model: sessionData.model,
          provider: sessionData.provider,
          date: new Date().toLocaleString(),
          timestamp: Date.now()
        },
        ...prev
      ];
    });
  };

  const clearSessionData = () => {
    setIsDataLoaded(false); 
    setUserId(null);
    setChatHistory([]);
    setCurrentTopic("");
    setActiveSources([]);
    setGraphData({ nodes: [], links: [] });
    setSessionMetadata([]);
    setStudyData([
      { day: "Sun", hours: 0 }, { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 },
      { day: "Wed", hours: 0 }, { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }
    ]);
    setStudyHistory([]);
    setStudyGoals([]);
    setCurrentStreak(0);
    setSessionsCompleted(0);

    const keysToRemove = ["user_email", "chatHistory", "currentTopic", "activeSources", "graphData", "studyData", "studyHistory", "studyGoals", "currentStreak", "sessionsCompleted"];
    keysToRemove.forEach(key => localStorage.removeItem(key));
  };

  // ===========================
  // BUG FIX: DEBOUNCED AUTO-SAVE
  // ===========================
  
  useEffect(() => {
    localStorage.setItem("user_email", JSON.stringify(userId));
    localStorage.setItem("currentTopic", JSON.stringify(currentTopic));
    localStorage.setItem("activeSources", JSON.stringify(activeSources));
    localStorage.setItem("graphData", JSON.stringify(graphData));
    localStorage.setItem("studyData", JSON.stringify(studyData));
    localStorage.setItem("studyHistory", JSON.stringify(studyHistory));
    localStorage.setItem("studyGoals", JSON.stringify(studyGoals));
    localStorage.setItem("currentStreak", JSON.stringify(currentStreak));
    localStorage.setItem("sessionsCompleted", JSON.stringify(sessionsCompleted));
  }, [userId, chatHistory, currentTopic, activeSources, graphData, studyData, studyHistory, studyGoals, currentStreak, sessionsCompleted]);

  useEffect(() => {
    const cleanUserId = getCleanUserId(userId);
    // THE GUARD: Stop autosave if we are loading a session
    if (cleanUserId === "guest" || !isDataLoaded || isSessionLoading) return;

    const timeoutId = setTimeout(() => {
      const payload = {
        sessionId: sessionId,
        userEmail: cleanUserId,
        topic: currentTopic || "New Study Session",
        durationMinutes: 0, 
        documents: activeSources.map(src => ({ fileName: typeof src === 'string' ? src : (src.name || "Document") })),
        chatTranscript: chatHistory,
        
        // 🛡️ THE FIX: Strip the physics engine objects back to raw string IDs!
        knowledgeGraph: {
            nodes: graphData.nodes,
            edges: graphData.links.map(link => ({
                source: typeof link.source === 'object' ? link.source.id : link.source,
                target: typeof link.target === 'object' ? link.target.id : link.target,
                name: link.name || "Related to"
            }))
        }
      };
      
      // Save data, then trigger sidebar metadata refresh
      api.post(`/api/sessions/save`, payload)
        .then(() => refreshMetadataOnly(cleanUserId)) 
        .catch(console.error);
      
      api.post(`/api/analytics/${cleanUserId}`, { studyData, studyHistory, currentStreak, sessionsCompleted, goals: studyGoals }).catch(console.error);
    }, 2500); 

    return () => clearTimeout(timeoutId);
  }, [chatHistory, graphData, currentTopic, activeSources, studyData, studyHistory, studyGoals, currentStreak, sessionsCompleted, isDataLoaded, isSessionLoading, sessionId, userId, refreshMetadataOnly]);


  // ===========================
  // TIMER & NOTIFICATIONS 
  // ===========================
  const [timerConfig, setTimerConfig] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerResetRef = useRef(null);

  const changeTimerMode = (minutes) => {
    clearTimeout(timerResetRef.current);
    const seconds = minutes * 60;
    setTimerConfig(seconds);
    setTimeLeft(seconds);
    setIsRunning(false);
  };

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      
      const hoursStudied = timerConfig / 3600;
      const minutesStudied = timerConfig / 60;
      const currentDayIndex = new Date().getDay();

      setStudyData((prev) => {
        const newData = [...prev];
        newData[currentDayIndex].hours = Number((newData[currentDayIndex].hours + hoursStudied).toFixed(1));
        return newData;
      });

      setStudyHistory((prev) => [
        { id: Date.now(), topic: currentTopic || "Focus Session", duration: minutesStudied, date: new Date().toLocaleString() },
        ...prev
      ]);
      
      setSessionsCompleted((prev) => {
        if (prev === 0) setCurrentStreak((s) => s + 1);
        return prev + 1;
      });

      if (Notification.permission === "granted") {
        new Notification("Deep Work Session Complete!", { body: "Great job! Your study session has been logged." });
      }

      timerResetRef.current = setTimeout(() => {
        setTimeLeft((current) => current === 0 ? timerConfig : current);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerConfig, currentTopic]);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission !== "granted") Notification.requestPermission();
    }
  }, []);

  return (
    <StudyContext.Provider
      value={{
        provider, setProvider, model, setModel, sessionId,
        userId, setUserId, 
        sessionMetadata, setSessionMetadata, loadSession, 
        chatHistory, addChatMessage, updateLastAssistantMessage, 
        currentTopic, setCurrentTopic,
        activeSources, setUploadedSources,
        graphData, updateKnowledgeGraph,
        timerConfig, timeLeft, setTimeLeft, isRunning, setIsRunning, changeTimerMode,
        studyData, studyHistory, studyGoals, setStudyGoals, currentStreak, sessionsCompleted,
        addStudySession,
        clearSessionData,
        startNewChat
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export const useStudy = () => useContext(StudyContext);