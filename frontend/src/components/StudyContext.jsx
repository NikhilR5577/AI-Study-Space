import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api"; // 👈 FIXED: Importing your Axios instance

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
  const [provider, setProvider] = useState("mistral");
  const [model, setModel] = useState("mistral-small");
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [userId, setUserId] = useState(() => loadFromStorage("user_email", null));
  const [isDataLoaded, setIsDataLoaded] = useState(false); 

  useEffect(() => {
    if (userEmail) {
      const cleanEmail = getCleanUserId(userEmail);
      setUserId(cleanEmail);
      localStorage.setItem("user_email", JSON.stringify(cleanEmail));
    }
  }, [userEmail]);

  // ===========================
  // CHAT STATE
  // ===========================
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

  // ===========================
  // SECURE MONGODB SYNC LOGIC
  // ===========================
  const fetchUserData = useCallback(async (rawEmail) => {
    const cleanEmail = getCleanUserId(rawEmail);

    if (cleanEmail === "guest") {
      clearSessionData();
      return;
    }
    
    setIsDataLoaded(false); 
    
    try {
      // 1. Fetch Chat 👈 FIXED: Using api instance
      const chatRes = await api.get(`/api/chat/history/${cleanEmail}`);
      if (chatRes.data && chatRes.data.history) setChatHistory(chatRes.data.history);

      // 2. Fetch Graph 👈 FIXED: Using api instance
      const graphRes = await api.get(`/api/graph/${cleanEmail}`);
      if (graphRes.data && graphRes.data.nodes) setGraphData({ nodes: graphRes.data.nodes, links: graphRes.data.links });

      // 3. Fetch Analytics 👈 FIXED: Using api instance
      const analyticsRes = await api.get(`/api/analytics/${cleanEmail}`);
      if (analyticsRes.data) {
        const analytics = analyticsRes.data;
        if (analytics.studyData) setStudyData(analytics.studyData);
        if (analytics.studyHistory) setStudyHistory(analytics.studyHistory);
        if (analytics.currentStreak !== undefined) setCurrentStreak(analytics.currentStreak);
        if (analytics.sessionsCompleted !== undefined) setSessionsCompleted(analytics.sessionsCompleted);
      }
    } catch (err) {
      console.error("Hydration failed:", err);
    } finally {
      setIsDataLoaded(true); 
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserData(userId);
    } else {
      clearSessionData();
    }
  }, [userId, fetchUserData]);

  // ===========================
  // MODIFIED FUNCTIONS
  // ===========================
  const startNewChat = () => {
    setSessionId(crypto.randomUUID());
    setChatHistory([]);
    setCurrentTopic("");
    setActiveSources([]);
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

  const setUploadedSources = (sources) => {
    setActiveSources(sources);
  };

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
        if (!linkExists) {
          updatedLinks.push(incomingLink);
        }
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
    setStudyData([
      { day: "Sun", hours: 0 }, { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 },
      { day: "Wed", hours: 0 }, { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }
    ]);
    setStudyHistory([]);
    setCurrentStreak(0);
    setSessionsCompleted(0);

    localStorage.removeItem("user_email");
    localStorage.removeItem("chatHistory");
    localStorage.removeItem("currentTopic");
    localStorage.removeItem("activeSources");
    localStorage.removeItem("graphData");
    localStorage.removeItem("studyData");
    localStorage.removeItem("studyHistory");
    localStorage.removeItem("currentStreak");
    localStorage.removeItem("sessionsCompleted");
  };

  // ===========================
  // AUTO-SAVE 👈 FIXED: Using api instance for POSTs
  // ===========================
  useEffect(() => {
    localStorage.setItem("user_email", JSON.stringify(userId));
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    localStorage.setItem("currentTopic", JSON.stringify(currentTopic));
    localStorage.setItem("activeSources", JSON.stringify(activeSources));
    localStorage.setItem("graphData", JSON.stringify(graphData));
    localStorage.setItem("studyData", JSON.stringify(studyData));
    localStorage.setItem("studyHistory", JSON.stringify(studyHistory));
    localStorage.setItem("currentStreak", JSON.stringify(currentStreak));
    localStorage.setItem("sessionsCompleted", JSON.stringify(sessionsCompleted));

    const cleanUserId = getCleanUserId(userId);

    if (cleanUserId !== "guest" && isDataLoaded) {
      api.post(`/api/graph/${cleanUserId}`, graphData).catch(console.error);
      api.post(`/api/analytics/${cleanUserId}`, { studyData, studyHistory, currentStreak, sessionsCompleted }).catch(console.error);
    }
  }, [userId, chatHistory, currentTopic, activeSources, graphData, studyData, studyHistory, currentStreak, sessionsCompleted, isDataLoaded]);

  // ===========================
  // TIMER & NOTIFICATIONS (Untouched)
  // ===========================
  const [timerConfig, setTimerConfig] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  const changeTimerMode = (minutes) => {
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
      
      setSessionsCompleted((prev) => prev + 1);
      if (sessionsCompleted === 0) setCurrentStreak((prev) => prev + 1);
      setTimeLeft(timerConfig);

      if (Notification.permission === "granted") {
        new Notification("Deep Work Session Complete!", { body: "Great job! Your study session has been logged." });
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerConfig, currentTopic, sessionsCompleted]);

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
        chatHistory, addChatMessage, updateLastAssistantMessage, 
        currentTopic, setCurrentTopic,
        activeSources, setUploadedSources,
        graphData, updateKnowledgeGraph,
        timerConfig, timeLeft, setTimeLeft, isRunning, setIsRunning, changeTimerMode,
        studyData, studyHistory, currentStreak, sessionsCompleted,
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