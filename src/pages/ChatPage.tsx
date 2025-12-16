import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, StopCircle, ListChecks, X, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './ChatPage.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  evaluationResult?: string;
  matchedRules?: string[];
};

export const ChatPage = () => {
  const { id: chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [globalPrompts, setGlobalPrompts] = useState<any>(null);
  const [rulesTracker, setRulesTracker] = useState<{[key: string]: boolean}>({});
  const [showRulesSidebar, setShowRulesSidebar] = useState(false);
  const [chatStatus, setChatStatus] = useState<'active' | 'completed' | 'failed'>('active');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [isPathMode, setIsPathMode] = useState(false);
  const [pathId, setPathId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Activado por defecto
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const textToSpeech = async (text: string) => {
    if (!appSettings?.api_key) {
      console.error('API key not available for TTS');
      return;
    }

    try {
      setIsSpeaking(true);
      
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      console.log('🎤 Starting streaming text-to-speech...');

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appSettings.api_key.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          input: text,
          voice: 'alloy',
          speed: 1.0,
          response_format: 'mp3',
          instructions: 'you are extremely angry'
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('TTS API error:', response.status, errorData);
        throw new Error(`TTS API error: ${response.status}`);
      }

      // Stream the audio as it arrives
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const chunks: BlobPart[] = [];
      let audioStarted = false;
      let mediaSource: MediaSource | null = null;
      let sourceBuffer: SourceBuffer | null = null;

      // Use MediaSource API for streaming playback
      if ('MediaSource' in window) {
        mediaSource = new MediaSource();
        const audioUrl = URL.createObjectURL(mediaSource);
        const audio = new Audio(audioUrl);
        setCurrentAudio(audio);

        mediaSource.addEventListener('sourceopen', async () => {
          try {
            sourceBuffer = mediaSource!.addSourceBuffer('audio/mpeg');
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                if (mediaSource?.readyState === 'open') {
                  mediaSource.endOfStream();
                }
                console.log('✅ Audio streaming complete');
                break;
              }

              if (value && sourceBuffer) {
                chunks.push(value);
                
                // Wait if buffer is updating
                if (!sourceBuffer.updating) {
                  sourceBuffer.appendBuffer(value);
                  
                  // Start playing after first chunk
                  if (!audioStarted && audio.readyState >= 2) {
                    audioStarted = true;
                    console.log('▶️ Starting audio playback...');
                    audio.play().catch(err => {
                      console.error('Error starting playback:', err);
                      setIsSpeaking(false);
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error in sourceBuffer:', err);
            // Fallback to full audio
            const fullBlob = new Blob(chunks, { type: 'audio/mpeg' });
            const fallbackUrl = URL.createObjectURL(fullBlob);
            audio.src = fallbackUrl;
            audio.play();
          }
        });

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          console.log('✅ Audio playback finished');
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          console.error('❌ Error playing audio');
        };

      } else {
        // Fallback: Load all chunks then play
        console.log('MediaSource not supported, using fallback...');
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        
        const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        setCurrentAudio(audio);

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      }

    } catch (error) {
      console.error('Error in text-to-speech:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'es-ES'; // Cambia a 'en-US' para inglés
      
      recognitionInstance.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        // Process ALL results, not just from resultIndex
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        
        console.log('🎤 Interim:', interim, '| Final:', final);
        
        // Update interim transcript for real-time display
        setInterimTranscript(interim);
        
        // Update input with final transcript only when confirmed
        if (final) {
          setInput(prev => prev + final);
          setInterimTranscript(''); // Clear interim when we have final
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        console.log('🎤 Speech recognition ended');
        setIsListening(false);
        setInterimTranscript('');
      };
      
      setRecognition(recognitionInstance);
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      setInterimTranscript('');
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatId) {
      // Check if we're in path mode
      const params = new URLSearchParams(window.location.search);
      const pathIdParam = params.get('pathId');
      
      if (pathIdParam) {
        console.log('🛤️ Path mode activated:', { pathId: pathIdParam });
        setIsPathMode(true);
        setPathId(pathIdParam);
      } else {
        console.log('ℹ️ Regular chat mode (not in path)');
      }
      
      loadData(chatId);
    }
  }, [chatId]);

  const loadData = async (id: string) => {
    setIsInitialLoading(true);
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          *,
          simulations (
            *,
            characters(id, name, description)
          )
        `)
        .eq('id', id)
        .single();

      if (chatError) throw chatError;

      // Set chat status
      setChatStatus(chatData.status || 'active');

      // Set messages from chat history
      if (chatData.messages && Array.isArray(chatData.messages)) {
        // Parse ISO date strings back to Date objects
        const parsedMessages = chatData.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(parsedMessages);
      } else {
        setMessages([]);
      }

      const simData = chatData.simulations;
      setSimulationData(simData);

      // Initialize rules tracker
      if (simData.rules && Array.isArray(simData.rules)) {
        const initialTracker: {[key: string]: boolean} = {};
        simData.rules.forEach((_: any, index: number) => {
          initialTracker[`rule_${index + 1}`] = false;
        });
        setRulesTracker(initialTracker);
      }

      // Load the AI setting associated with this simulation
      if (simData.setting_id) {
        const { data: settingData, error: settingError } = await supabase
          .from('ai_settings')
          .select('*')
          .eq('id', simData.setting_id)
          .single();

        if (!settingError && settingData) {
          setAppSettings(settingData);
        } else {
          console.error("Error loading AI setting:", settingError);
          alert("This simulation is missing its AI configuration. Please edit the simulation and assign a valid setting.");
        }
      } else {
        alert("This simulation doesn't have an AI setting assigned. Please edit the simulation to assign one.");
      }

      // Load global prompts
      const { data: promptsData, error: promptsError } = await supabase
        .from('global_prompts')
        .select('*')
        .limit(1)
        .single();

      if (!promptsError && promptsData) {
        setGlobalPrompts(promptsData);
        
        // Configure LangSmith - prioritize env vars, fallback to UI config
        const langsmithEnabled = import.meta.env.VITE_LANGCHAIN_TRACING_V2 === 'true' || promptsData.langsmith_enabled;
        const langsmithKey = import.meta.env.VITE_LANGCHAIN_API_KEY || promptsData.langsmith_api_key;
        const langsmithProject = import.meta.env.VITE_LANGCHAIN_PROJECT || promptsData.langsmith_project || 'default';
        
        if (langsmithEnabled && langsmithKey) {
          try {
            // Set global config for LangChain
            (window as any).LANGCHAIN_TRACING_V2 = 'true';
            (window as any).LANGCHAIN_API_KEY = langsmithKey;
            (window as any).LANGCHAIN_PROJECT = langsmithProject;
            (window as any).LANGCHAIN_ENDPOINT = import.meta.env.VITE_LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com';
            
            console.log('✅ LangSmith tracing enabled:', {
              project: langsmithProject,
              source: import.meta.env.VITE_LANGCHAIN_API_KEY ? 'environment' : 'UI config',
              endpoint: (window as any).LANGCHAIN_ENDPOINT
            });
          } catch (langsmithError) {
            console.error('Error configuring LangSmith:', langsmithError);
          }
        } else if (promptsData.langsmith_enabled && !promptsData.langsmith_api_key) {
          console.warn('⚠️ LangSmith enabled but no API key provided. Add key in Settings or use environment variables.');
        }
      } else {
        console.error("Error loading global prompts:", promptsError);
      }

    } catch (error: any) {
      console.error("Error loading chat data:", error);
      alert("Chat session not found. It may have been deleted.");
      navigate('/chats');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const saveMessages = async (newMessages: Message[]) => {
    if (!chatId) return;
    try {
      await supabase
        .from('chats')
        .update({ messages: newMessages })
        .eq('id', chatId);
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  };

  const updateChatStatus = async (status: 'active' | 'completed' | 'failed') => {
    if (!chatId) return;
    try {
      await supabase
        .from('chats')
        .update({ status })
        .eq('id', chatId);
      setChatStatus(status);
    } catch (error) {
      console.error("Error updating chat status:", error);
    }
  };

  const updatePathProgress = async (completed: boolean, failed: boolean = false) => {
    if (!pathId || !simulationData?.id) return;
    
    try {
      const userIdentifier = localStorage.getItem('path_user_identifier') || 'anonymous';
      
      console.log('🔄 Updating path progress:', {
        pathId,
        simulationId: simulationData.id,
        userIdentifier,
        completed,
        failed
      });
      
      const { data: currentProgress } = await supabase
        .from('path_progress')
        .select('*')
        .eq('path_id', pathId)
        .eq('simulation_id', simulationData.id)
        .eq('user_identifier', userIdentifier)
        .single();
      
      const { data, error } = await supabase
        .from('path_progress')
        .upsert({
          path_id: pathId,
          simulation_id: simulationData.id,
          user_identifier: userIdentifier,
          attempts_used: (currentProgress?.attempts_used || 0),
          completed: completed,
          last_attempt_failed: failed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'path_id,simulation_id,user_identifier'
        })
        .select();
      
      if (error) {
        console.error('❌ Error updating path progress:', error);
        throw error;
      }
      
      console.log('✅ Path progress updated successfully:', data);
    } catch (error) {
      console.error('Error updating path progress:', error);
    }
  };

  const evaluateRules = async (response: string, simData: any, evaluationPrompt: string) => {
    try {
      console.log("🔍 Evaluating rules for response...");

      if (!appSettings?.api_key) {
        console.error("API Key is missing for rule evaluation");
        return;
      }

      // Prepare rules data for evaluation
      const rulesForEvaluation = simData.rules.map((rule: any, index: number) => ({
        id: `rule_${index + 1}`,
        question: rule.question,
        answer: rule.answer
      }));

      // Create the evaluation payload
      const evaluationPayload = {
        response: response,
        rules: rulesForEvaluation.map((r: any) => ({
          id: r.id,
          answer: r.answer
        }))
      };

      // Create evaluation chat instance
      const isReasoningModel = appSettings.model?.startsWith('gpt-5') || appSettings.model?.startsWith('o1');
      
      // Configure LangSmith for evaluation
      const evalLangsmithConfig = globalPrompts?.langsmith_enabled && globalPrompts?.langsmith_api_key ? {
        metadata: {
          langsmith_project: globalPrompts.langsmith_project || 'default',
          type: 'evaluation'
        },
        tags: ['evaluation', 'rules', simulationData?.name || 'unnamed']
      } : {};
      
      const evaluationChat = new ChatOpenAI({
        apiKey: appSettings.api_key?.trim(),
        openAIApiKey: appSettings.api_key?.trim(),
        modelName: appSettings.model || "gpt-3.5-turbo",
        ...(isReasoningModel ? {} : { temperature: 0 }),
        // @ts-ignore
        dangerouslyAllowBrowser: true,
        ...evalLangsmithConfig
      });

      // Call the model with evaluation prompt
      const evaluationMessages = [
        new SystemMessage(evaluationPrompt),
        new HumanMessage(JSON.stringify(evaluationPayload, null, 2))
      ];

      const evaluationResponse = await evaluationChat.invoke(evaluationMessages);
      const evaluationResult = evaluationResponse.content as string;

      console.log("📊 Evaluation Result:", evaluationResult);

      // Parse the evaluation result to extract matched rule IDs
      const ruleIdMatch = evaluationResult.match(/RULE_ID:\s*(.+)/);
      if (ruleIdMatch) {
        const matchedRulesStr = ruleIdMatch[1].trim();
        console.log("✅ Matched Rules:", matchedRulesStr);

        let matchedRules: string[] = [];
        if (matchedRulesStr !== "NO_RULE_MATCHED") {
          matchedRules = matchedRulesStr.split(',').map(r => r.trim());
          console.log("✅ Rules matched:", matchedRules);
          
          // Update rules tracker and check completion
          const updatedTracker = { ...rulesTracker };
          matchedRules.forEach(ruleId => {
            updatedTracker[ruleId] = true;
          });
          setRulesTracker(updatedTracker);

          // Check if ALL rules are now matched
          const allRulesMatched = Object.values(updatedTracker).every(status => status === true);
          if (allRulesMatched) {
            console.log("🎉 All rules matched! Showing completion modal");
            console.log("📊 Updated tracker:", updatedTracker);
            console.log("🔄 Updating chat status to completed");
            
            setCompletionMessage('🎉 Congratulations! You have completed all the rules for this simulation!');
            setShowCompletionModal(true);
            await updateChatStatus('completed');
            
            // If in path mode, update path progress as completed
            if (isPathMode && pathId) {
              console.log("🛤️ Path mode detected, updating path progress");
              await updatePathProgress(true, false);
            } else {
              console.log("ℹ️ Not in path mode, skipping path progress update");
            }
          }
        } else {
          console.log("⚠️ No rules were matched");
        }

        return {
          evaluationResult: evaluationResult,
          matchedRules: matchedRules
        };
      }

      return null;
    } catch (error) {
      console.error("Error evaluating rules:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !simulationData) return;

    // Prevent sending if chat is completed or failed
    if (chatStatus !== 'active') {
      return;
    }

    if (!appSettings?.api_key) {
      alert("API Key is missing in Global Settings. Please configure it.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Check interaction limit
    const assistantMessagesCount = updatedMessages.filter(m => m.role === 'assistant').length;
    const maxInteractions = simulationData.max_interactions || 10;

    if (assistantMessagesCount >= maxInteractions) {
      setTimeout(async () => {
        const limitMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "❌ **Simulation Failed:** Maximum interaction limit reached without completing all objectives.",
          timestamp: new Date()
        };
        const finalMessages = [...updatedMessages, limitMessage];
        setMessages(finalMessages);
        saveMessages(finalMessages);
        
        // Mark as failed
        await updateChatStatus('failed');
        
        // If in path mode, update path progress as failed
        if (isPathMode && pathId) {
          await updatePathProgress(false, true);
        }
        
        setCompletionMessage('❌ Simulation Failed: You reached the maximum number of interactions without completing all objectives.');
        setShowCompletionModal(true);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      // GPT-5 models (reasoning models) do not support temperature parameter
      const isReasoningModel = appSettings.model?.startsWith('gpt-5') || appSettings.model?.startsWith('o1');

      // Configure LangSmith options
      const langsmithConfig = globalPrompts?.langsmith_enabled && globalPrompts?.langsmith_api_key ? {
        metadata: {
          langsmith_project: globalPrompts.langsmith_project || 'default',
        },
        tags: ['chat', 'simulation', simulationData?.name || 'unnamed']
      } : {};

      const chat = new ChatOpenAI({
        apiKey: appSettings.api_key?.trim(),
        openAIApiKey: appSettings.api_key?.trim(),
        modelName: appSettings.model || "gpt-3.5-turbo",
        ...(isReasoningModel ? {} : { temperature: 0.7 }),
        // @ts-ignore
        dangerouslyAllowBrowser: true,
        ...langsmithConfig
      });

      const rules = simulationData.rules && Array.isArray(simulationData.rules)
        ? simulationData.rules.map((r: any) => `- "${r.question}" → "${r.answer}"`).join("\n")
        : "";

      // Use global prompt
      let systemMessageContent = globalPrompts?.system_prompt || "You are a helpful assistant.";

      // Get character description from relation or fallback to legacy field
      const characterDescription = simulationData.characters?.description || simulationData.character || "";

      // Replace wildcards if they exist in the prompt
      systemMessageContent = systemMessageContent.replace(/{{character}}/g, characterDescription)
        .replace(/{{objective}}/g, simulationData.objective || "")
        .replace(/{{context}}/g, simulationData.context || "")
        .replace(/{{rules}}/g, rules);

      // Append if wildcards were NOT used (legacy behavior / fallback)
      if (!systemMessageContent.includes(characterDescription) && characterDescription) {
        systemMessageContent += `\n\nCharacter: ${characterDescription}`;
      }
      if (!systemMessageContent.includes(simulationData.objective) && simulationData.objective) {
        systemMessageContent += `\n\nObjective: ${simulationData.objective}`;
      }
      if (!systemMessageContent.includes(simulationData.context) && simulationData.context) {
        systemMessageContent += `\n\nContext: ${simulationData.context}`;
      }
      if (!systemMessageContent.includes(rules) && rules) {
        systemMessageContent += `\n\nRules: ${rules}`;
      }

      const history = [
        new SystemMessage(systemMessageContent),
        ...updatedMessages.map(m => m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content))
      ];

      // Create a temporary bot message for streaming
      const botMessageId = (Date.now() + 1).toString();
      const botMessage: Message = {
        id: botMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      // Add the empty bot message to UI immediately
      setMessages(prev => [...prev, botMessage]);

      const stream = await chat.stream(history);
      let fullContent = "";

      for await (const chunk of stream) {
        const content = chunk.content as string;
        if (content) {
          fullContent += content;
          setMessages(prev => prev.map(msg =>
            msg.id === botMessageId
              ? { ...msg, content: fullContent }
              : msg
          ));
        }
      }

      // Once complete, update the message with full content
      let finalBotMessage = { ...botMessage, content: fullContent };

      // Evaluate rules if evaluation_rule_prompt is defined
      if (globalPrompts?.evaluation_rule_prompt && simulationData.rules && simulationData.rules.length > 0) {
        const evaluationResult = await evaluateRules(fullContent, simulationData, globalPrompts.evaluation_rule_prompt);
        if (evaluationResult) {
          finalBotMessage = { ...finalBotMessage, ...evaluationResult };
        }
      }

      const finalMessages = [...updatedMessages, finalBotMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);

      // If voice mode is enabled, play the response
      if (voiceEnabled && fullContent) {
        await textToSpeech(fullContent);
      }

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Error: Could not get response. " + (error as Error).message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!chatId) return <div className="p-8">No chat selected</div>;

  if (isInitialLoading) {
    return (
      <div className="chat-page">
        <LoadingSpinner message="Loading chat..." />
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-title">
          <h1><Bot className="text-primary" /> {simulationData?.name || "Simulation"}</h1>
          <p>Character: {simulationData?.character}</p>
        </div>
        <div className="chat-header-actions">
          {simulationData?.rules && simulationData.rules.length > 0 && (
            <button 
              className="rules-toggle-btn"
              onClick={() => setShowRulesSidebar(!showRulesSidebar)}
              title="Toggle rules progress"
            >
              <ListChecks size={20} />
              <span className="rules-count-badge">
                {Object.values(rulesTracker).filter(Boolean).length}/{Object.keys(rulesTracker).length}
              </span>
            </button>
          )}
          <button 
            className={`voice-toggle-btn ${voiceEnabled ? 'active' : ''}`}
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              }
              setVoiceEnabled(!voiceEnabled);
            }}
            title={voiceEnabled ? 'Voice mode enabled' : 'Voice mode disabled'}
          >
            {isSpeaking ? (
              <VolumeX size={20} className="speaking-icon" />
            ) : voiceEnabled ? (
              <Volume2 size={20} />
            ) : (
              <VolumeX size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Rules Sidebar */}
      {simulationData?.rules && simulationData.rules.length > 0 && (
        <>
          <div 
            className={`rules-sidebar-overlay ${showRulesSidebar ? 'show' : ''}`}
            onClick={() => setShowRulesSidebar(false)}
          />
          <div className={`rules-sidebar ${showRulesSidebar ? 'open' : ''}`}>
            <div className="rules-sidebar-header">
              <h3>Rules Progress</h3>
              <button 
                className="rules-close-btn"
                onClick={() => setShowRulesSidebar(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="rules-list-tracker">
              {simulationData.rules.map((rule: any, index: number) => {
                const ruleId = `rule_${index + 1}`;
                const isMatched = rulesTracker[ruleId];
                return (
                  <div key={ruleId} className={`rule-item-tracker ${isMatched ? 'matched' : 'pending'}`}>
                    <span className="rule-icon">{isMatched ? '✅' : '⏳'}</span>
                    <div className="rule-info">
                      <span className="rule-id">{ruleId}</span>
                      <span className="rule-question">{rule.question}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rules-summary">
              {Object.values(rulesTracker).filter(Boolean).length} / {Object.keys(rulesTracker).length} rules matched
            </div>
          </div>
        </>
      )}

      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-container">
                <Bot size={48} />
              </div>
              <h3>Start Simulation</h3>
              <p>Chatting with <strong>{simulationData?.character}</strong></p>
            </div>
          ) : (
            messages.map((msg) => {
              const hasMatchedRules = msg.role === 'assistant' && msg.matchedRules && msg.matchedRules.length > 0;
              return (
                <div key={msg.id} className={`message-wrapper ${msg.role} ${hasMatchedRules ? 'has-matched-rules' : ''}`}>
                  <div className="message-avatar">
                    {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                  </div>
                  <div className="message-bubble">
                    <div className="message-content">
                      {msg.content}
                      {hasMatchedRules && (
                        <span className="rule-badge" title={`Matched rules: ${msg.matchedRules!.join(', ')}`}>
                          ✓ {msg.matchedRules!.length}
                        </span>
                      )}
                    </div>
                    {msg.role === 'assistant' && msg.matchedRules !== undefined && (
                      <div className="rules-evaluation-compact">
                        {msg.matchedRules.length > 0 ? (
                          <div className="rules-matched-compact">
                            <span className="rules-icon">✅</span>
                            <span className="rules-text">{msg.matchedRules.join(', ')}</span>
                          </div>
                        ) : (
                          <div className="rules-not-matched-compact">
                            <span className="rules-icon">⚠️</span>
                            <span className="rules-text">No rules matched</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="message-footer">
                      <span className="message-time">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'assistant' && msg.content && (
                        <button
                          className="message-voice-btn"
                          onClick={() => textToSpeech(msg.content)}
                          disabled={isSpeaking}
                          title="Play this message"
                        >
                          <Volume2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role !== 'assistant' && (
            <div className="message-wrapper assistant">
              <div className="message-avatar"><Bot size={20} /></div>
              <div className="message-bubble typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          {chatStatus !== 'active' && (
            <div className={`chat-status-banner ${chatStatus}`}>
              {chatStatus === 'completed' ? (
                <>
                  🎉 <strong>Simulation Completed!</strong> All objectives achieved.
                </>
              ) : (
                <>
                  ❌ <strong>Simulation Failed!</strong> Maximum interactions reached.
                </>
              )}
            </div>
          )}
          <form onSubmit={handleSendMessage} className="input-form">
            <textarea
              ref={inputRef}
              value={input + interimTranscript}
              onChange={(e) => {
                // Allow typing when not listening
                if (!isListening) {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={chatStatus !== 'active' ? 'Simulation ended - no more messages allowed' : isListening ? '🎤 Escuchando...' : 'Type your message here...'}
              rows={1}
              className={`chat-input ${isListening ? 'listening' : ''}`}
              disabled={isLoading || chatStatus !== 'active'}
              readOnly={isListening}
            />
            <button
              type="button"
              className={`mic-btn ${isListening ? 'active' : ''}`}
              onClick={toggleSpeechRecognition}
              disabled={isLoading || chatStatus !== 'active'}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              type="submit"
              className={`send-btn ${!input.trim() || isLoading || chatStatus !== 'active' ? 'disabled' : ''}`}
              disabled={!input.trim() || isLoading || chatStatus !== 'active'}
            >
              {isLoading ? <StopCircle size={20} /> : <Send size={20} />}
            </button>
          </form>
          {simulationData && (
            <div className="interactions-counter" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              Interactions: {messages.filter(m => m.role === 'assistant').length} / {simulationData.max_interactions || 10}
            </div>
          )}
        </div>

        {/* Completion Modal */}
        {showCompletionModal && (
          <div className="completion-modal-overlay" onClick={() => setShowCompletionModal(false)}>
            <div className="completion-modal" onClick={(e) => e.stopPropagation()}>
              <div className={`modal-icon ${chatStatus}`}>
                {chatStatus === 'completed' ? '🎉' : '❌'}
              </div>
              <h2>{chatStatus === 'completed' ? '¡Felicitaciones!' : 'Simulación Fallida'}</h2>
              <p>{completionMessage}</p>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowCompletionModal(false);
                  // If in path mode, redirect to path page
                  if (isPathMode && pathId) {
                    window.location.href = `/play/${pathId}`;
                  }
                }}
              >
                {isPathMode ? 'Volver al Path' : 'Entendido'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
