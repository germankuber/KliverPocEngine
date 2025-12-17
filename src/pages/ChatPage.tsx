import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, StopCircle, ListChecks, X, Volume2, VolumeX, Mic, MicOff, ArrowLeft } from 'lucide-react';
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
  const [showRulesSidebar, setShowRulesSidebar] = useState(true);
  const [chatStatus, setChatStatus] = useState<'active' | 'completed' | 'failed'>('active');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [showAnalyzingModal, setShowAnalyzingModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [analysisScore, setAnalysisScore] = useState<number | null>(null);
  const [isPathMode, setIsPathMode] = useState(false);
  const [pathId, setPathId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Desactivado por defecto
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

      // Initialize keypoints tracker
      if ((simData.character_keypoints && Array.isArray(simData.character_keypoints)) ||
          (simData.player_keypoints && Array.isArray(simData.player_keypoints))) {
        const initialTracker: {[key: string]: boolean} = {};
        
        simData.character_keypoints?.forEach((_: any, index: number) => {
          initialTracker[`character_keypoint_${index + 1}`] = false;
        });
        
        simData.player_keypoints?.forEach((_: any, index: number) => {
          initialTracker[`player_keypoint_${index + 1}`] = false;
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
        
        // Configure LangSmith - set as environment variables if enabled
        if (promptsData.langsmith_enabled && promptsData.langsmith_api_key) {
          try {
            // Set process.env for LangChain
            if (typeof process !== 'undefined' && process.env) {
              process.env.LANGCHAIN_TRACING_V2 = 'true';
              process.env.LANGCHAIN_API_KEY = promptsData.langsmith_api_key;
              process.env.LANGCHAIN_PROJECT = promptsData.langsmith_project || 'default';
              process.env.LANGCHAIN_ENDPOINT = 'https://api.smith.langchain.com';
            }
            
            console.log('✅ LangSmith tracing configured:', {
              project: promptsData.langsmith_project || 'default',
              hasKey: !!promptsData.langsmith_api_key,
              endpoint: 'https://api.smith.langchain.com'
            });
          } catch (langsmithError) {
            console.error('❌ Error configuring LangSmith:', langsmithError);
          }
        } else if (promptsData.langsmith_enabled && !promptsData.langsmith_api_key) {
          console.warn('⚠️ LangSmith enabled but no API key provided. Add key in Settings.');
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

  const handleCompletionAccept = async () => {
    setShowCompletionModal(false);
    setShowAnalyzingModal(true);
    
    try {
      const score = await analyzeChat();
      setShowAnalyzingModal(false);
      
      // Show result modal with score
      setAnalysisScore(score);
      setShowResultModal(true);
    } catch (error) {
      console.error('Error during analysis:', error);
      setShowAnalyzingModal(false);
      // Still show result modal even if analysis fails
      setAnalysisScore(null);
      setShowResultModal(true);
    }
  };

  const analyzeChat = async (): Promise<number | null> => {
    if (!chatId || !simulationData || !appSettings) {
      console.error('❌ Missing required data for analysis', { chatId, simulationData: !!simulationData, appSettings: !!appSettings });
      return null;
    }
    
    try {
      console.log('📊 Starting chat analysis...');
      
      // Load global evaluator prompt
      const { data: promptsData, error: promptsError } = await supabase
        .from('global_prompts')
        .select('character_analysis_prompt')
        .limit(1)
        .single();

      if (promptsError) {
        console.error('❌ Error loading evaluator prompt:', promptsError);
        throw promptsError;
      }
      
      const evaluatorPrompt = promptsData?.character_analysis_prompt?.trim();
      if (!evaluatorPrompt) {
        console.warn('⚠️ No character_analysis_prompt found, skipping analysis');
        return null;
      }

      console.log('✅ Evaluator prompt loaded, length:', evaluatorPrompt.length);

      // Get character description
      const characterText =
        simulationData.characters?.description ||
        simulationData.character ||
        simulationData.characters?.name ||
        'N/A';

      console.log('📝 Character text:', characterText.substring(0, 100) + '...');

      // Extract user messages
      const userMessages = messages
        .filter(m => m.role === 'user')
        .map(m => m.content.trim())
        .filter(Boolean);

      if (userMessages.length === 0) {
        console.warn('⚠️ No user messages to analyze');
        return null;
      }

      console.log('💬 User messages count:', userMessages.length);

      const playerText = userMessages.join('\n\n');
      const evaluatorUserMessage = `Character:\n${characterText}\n\nPlayer:\n${playerText}`;

      console.log('📤 Evaluator message length:', evaluatorUserMessage.length);

      const isReasoningModel = appSettings.model?.startsWith('gpt-5') || appSettings.model?.startsWith('o1');

      // Build configuration based on model type
      const chatConfig: any = {
        apiKey: appSettings.api_key?.trim(),
        openAIApiKey: appSettings.api_key?.trim(),
        modelName: appSettings.model || 'gpt-4o',
        dangerouslyAllowBrowser: true
      };

      // Only add temperature and response_format for non-reasoning models
      if (!isReasoningModel) {
        chatConfig.temperature = 0;
        chatConfig.modelKwargs = {
          response_format: { type: 'json_object' }
        };
      }

      console.log('🤖 Model config:', { model: chatConfig.modelName, isReasoningModel, hasResponseFormat: !!chatConfig.modelKwargs });

      const evaluatorChat = new ChatOpenAI(chatConfig);

      console.log('🚀 Calling OpenAI API...');
      
      const response = await evaluatorChat.invoke([
        new SystemMessage(evaluatorPrompt),
        new HumanMessage(evaluatorUserMessage)
      ]);

      console.log('✅ Response received from OpenAI');
      console.log('📥 Response content length:', String(response.content).length);

      console.log('✅ Response received from OpenAI');
      console.log('📥 Response content length:', String(response.content).length);

      // Parse JSON response
      const contentStr = String(response.content).trim();
      let parsed;
      
      try {
        // Try direct parse
        parsed = JSON.parse(contentStr);
        console.log('✅ JSON parsed successfully');
      } catch (e1) {
        console.log('⚠️ Direct JSON parse failed, trying markdown extraction...');
        // Try to extract JSON from markdown code blocks
        const fenceMatch = contentStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const candidate = (fenceMatch?.[1] ?? contentStr).trim();
        
        try {
          parsed = JSON.parse(candidate);
          console.log('✅ JSON parsed from markdown block');
        } catch (e2) {
          console.log('⚠️ Markdown extraction failed, trying to find JSON block...');
          // Try to find first {...} block
          const firstBrace = candidate.indexOf('{');
          const lastBrace = candidate.lastIndexOf('}');
          if (firstBrace >= 0 && lastBrace > firstBrace) {
            const slice = candidate.slice(firstBrace, lastBrace + 1);
            parsed = JSON.parse(slice);
            console.log('✅ JSON extracted from braces');
          } else {
            console.error('❌ Could not find JSON in response');
            console.error('Response content:', contentStr.substring(0, 500));
            throw new Error('Could not parse evaluator response as JSON');
          }
        }
      }

      console.log('📊 Parsed analysis result:', { overall_score: parsed?.overall_score });

      // Save analysis result
      const { error: updateError } = await supabase
        .from('chats')
        .update({
          analysis_result: parsed,
          analysis_updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

      if (updateError) {
        console.error('❌ Error saving analysis result:', updateError);
        throw updateError;
      }
      
      console.log('✅ Chat analysis completed successfully');
      
      // Return the overall score
      return parsed?.overall_score ?? null;
    } catch (error) {
      console.error('❌ Error analyzing chat:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
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

  const evaluateRules = async (response: string, simData: any, evaluationPrompt: string, keypointType: 'character' | 'player' = 'character') => {
    try {
      console.log(`🔍 Evaluating ${keypointType} keypoints for response...`);

      if (!appSettings?.api_key) {
        console.error("API Key is missing for keypoint evaluation");
        return;
      }

      // Prepare keypoints data for evaluation based on type
      let keypoints: any[] = [];
      
      if (keypointType === 'character') {
        keypoints = (simData.character_keypoints || []).map((keypoint: string, index: number) => ({
          id: `keypoint_${index + 1}`,
          keypoint: keypoint
        }));
      } else {
        keypoints = (simData.player_keypoints || []).map((keypoint: string, index: number) => ({
          id: `keypoint_${index + 1}`,
          keypoint: keypoint
        }));
      }

      // Create the evaluation payload with new format
      const evaluationPayload = {
        response: response,
        keypoints: keypoints
      };

      // Create evaluation chat instance
      const isReasoningModel = appSettings.model?.startsWith('gpt-5') || appSettings.model?.startsWith('o1');
      
      // Configure LangSmith for evaluation  
      const evaluationChat = new ChatOpenAI({
        apiKey: appSettings.api_key?.trim(),
        openAIApiKey: appSettings.api_key?.trim(),
        modelName: appSettings.model || "gpt-3.5-turbo",
        ...(isReasoningModel ? {} : { temperature: 0 }),
        // @ts-ignore
        dangerouslyAllowBrowser: true
      });

      // Call the model with evaluation prompt
      const evaluationMessages = [
        new SystemMessage(evaluationPrompt),
        new HumanMessage(JSON.stringify(evaluationPayload, null, 2))
      ];

      const evaluationResponse = await evaluationChat.invoke(evaluationMessages);
      const evaluationResult = evaluationResponse.content as string;

      console.log("📊 Evaluation Result:", evaluationResult);

      // Parse the JSON response with new format
      try {
        // Try to extract JSON from the response
        const jsonMatch = evaluationResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0]);
          const matchedKeypoints = parsedResult.matched_keypoints || [];
          
          console.log("✅ Matched Keypoints:", matchedKeypoints);
          
          let matchedRules: string[] = [];
          if (matchedKeypoints.length > 0) {
            // Convert keypoint IDs to full rule IDs with prefix
            matchedRules = matchedKeypoints.map((kpId: string) => 
              `${keypointType}_${kpId}`
            );
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
              
              setCompletionMessage('🎉 Congratulations! You have completed all the keypoints for this simulation!');
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
            console.log("⚠️ No keypoints were matched");
          }

          return {
            evaluationResult: evaluationResult,
            matchedRules: matchedRules
          };
        }
      } catch (parseError) {
        console.error("Error parsing evaluation result:", parseError);
        console.log("Raw result:", evaluationResult);
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

    let userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInput("");
    setIsLoading(true);

    // Evaluate player message if player_keypoints_evaluation_prompt is defined
    if (globalPrompts?.player_keypoints_evaluation_prompt && 
        simulationData.player_keypoints && 
        simulationData.player_keypoints.length > 0) {
      console.log("🎯 Evaluating player message...");
      const playerEvaluationResult = await evaluateRules(
        input, 
        simulationData, 
        globalPrompts.player_keypoints_evaluation_prompt,
        'player'
      );
      
      if (playerEvaluationResult) {
        // Update the user message with evaluation results
        userMessage = { ...userMessage, ...playerEvaluationResult };
        setMessages([...messages, userMessage]);
      }
    }

    const updatedMessages = [...messages, userMessage];
    saveMessages(updatedMessages);

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

      // Configure LangSmith options - Using callbacks with metadata
      if (globalPrompts?.langsmith_enabled && globalPrompts?.langsmith_api_key) {
        try {
          console.log('⚠️ LangSmith enabled but browser tracing has limitations');
          console.log('📝 Use environment variables for full tracing support');
          console.log('See LANGSMITH_BROWSER_LIMITATION.md for details');
        } catch (error) {
          console.error('❌ Error configuring LangSmith:', error);
        }
      }

      const chat = new ChatOpenAI({
        apiKey: appSettings.api_key?.trim(),
        openAIApiKey: appSettings.api_key?.trim(),
        modelName: appSettings.model || "gpt-3.5-turbo",
        ...(isReasoningModel ? {} : { temperature: 0.7 }),
        // @ts-ignore
        dangerouslyAllowBrowser: true
      });

      const characterKeypoints = simulationData.character_keypoints && Array.isArray(simulationData.character_keypoints)
        ? simulationData.character_keypoints.map((k: string, index: number) => `${index + 1}. ${k}`).join("\n")
        : "";

      // Use global prompt
      let systemMessageContent = globalPrompts?.system_prompt || "You are a helpful assistant.";

      // Get character description from relation or fallback to legacy field
      const characterDescription = simulationData.characters?.description || simulationData.character || "";

      // Replace wildcards - solo los que existen en el template
      systemMessageContent = systemMessageContent
        .replace(/{{CHARACTER}}/g, characterDescription)
        .replace(/{{OBJECTIVE}}/g, simulationData.objective || "")
        .replace(/{{CONTEXT}}/g, simulationData.context || "")
        .replace(/{{RULES}}/g, characterKeypoints);

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
      if (characterKeypoints && !systemMessageContent.includes(characterKeypoints)) {
        systemMessageContent += `\n\nCharacter Keypoints:\n${characterKeypoints}`;
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

      // Evaluate character response if character_keypoints_evaluation_prompt is defined
      if (globalPrompts?.character_keypoints_evaluation_prompt && 
          simulationData.character_keypoints && 
          simulationData.character_keypoints.length > 0) {
        console.log("🤖 Evaluating character response...");
        const evaluationResult = await evaluateRules(
          fullContent, 
          simulationData, 
          globalPrompts.character_keypoints_evaluation_prompt,
          'character'
        );
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
          {isPathMode && pathId && (
            <button
              className="back-to-path-btn"
              onClick={() => navigate(`/play/${pathId}`)}
              title="Back to path"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1><Bot className="text-primary" /> {simulationData?.name || "Simulation"}</h1>
          <p>Character: {simulationData?.character}</p>
        </div>
        <div className="chat-header-actions">
          {((simulationData?.character_keypoints && simulationData.character_keypoints.length > 0) ||
            (simulationData?.player_keypoints && simulationData.player_keypoints.length > 0)) && (
            <button 
              className="rules-toggle-btn"
              onClick={() => setShowRulesSidebar(!showRulesSidebar)}
              title="Toggle keypoints progress"
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

      {/* Keypoints Sidebar */}
      {((simulationData?.character_keypoints && simulationData.character_keypoints.length > 0) ||
        (simulationData?.player_keypoints && simulationData.player_keypoints.length > 0)) && (
        <>
          <div 
            className={`rules-sidebar-overlay ${showRulesSidebar ? 'show' : ''}`}
            onClick={() => setShowRulesSidebar(false)}
          />
          <div className={`rules-sidebar ${showRulesSidebar ? 'open' : ''}`}>
            <div className="rules-sidebar-header">
              <h3>Keypoints Progress</h3>
              <button 
                className="rules-close-btn"
                onClick={() => setShowRulesSidebar(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="rules-list-tracker">
              {simulationData.character_keypoints && simulationData.character_keypoints.length > 0 && (
                <>
                  <div className="keypoints-section-header">
                    <h4>Character Keypoints</h4>
                  </div>
                  {simulationData.character_keypoints.map((keypoint: string, index: number) => {
                    const keypointId = `character_keypoint_${index + 1}`;
                    const isMatched = rulesTracker[keypointId];
                    return (
                      <div key={keypointId} className={`rule-item-tracker ${isMatched ? 'matched' : 'pending'}`}>
                        <span className="rule-icon">{isMatched ? '✅' : '⏳'}</span>
                        <div className="rule-info">
                          <span className="rule-question">{keypoint}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              
              {simulationData.player_keypoints && simulationData.player_keypoints.length > 0 && (
                <>
                  <div className="keypoints-section-header">
                    <h4>Player Keypoints</h4>
                  </div>
                  {simulationData.player_keypoints.map((keypoint: string, index: number) => {
                    const keypointId = `player_keypoint_${index + 1}`;
                    const isMatched = rulesTracker[keypointId];
                    return (
                      <div key={keypointId} className={`rule-item-tracker ${isMatched ? 'matched' : 'pending'}`}>
                        <span className="rule-icon">{isMatched ? '✅' : '⏳'}</span>
                        <div className="rule-info">
                          <span className="rule-question">{keypoint}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            <div className="rules-summary">
              {Object.values(rulesTracker).filter(Boolean).length} / {Object.keys(rulesTracker).length} keypoints matched
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
              const hasMatchedRules = msg.matchedRules && msg.matchedRules.length > 0;
              // For player messages, only show evaluation if there are matched rules
              const shouldShowEvaluation = msg.role === 'assistant' 
                ? msg.matchedRules !== undefined 
                : hasMatchedRules;
              
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
                    {shouldShowEvaluation && (
                      <div className="rules-evaluation-compact">
                        {msg.matchedRules!.length > 0 ? (
                          <div className="rules-matched-compact">
                            <span className="rules-icon">✅</span>
                            <span className="rules-text">{msg.matchedRules!.join(', ')}</span>
                          </div>
                        ) : (
                          <div className="rules-not-matched-compact">
                            <span className="rules-icon">⚠️</span>
                            <span className="rules-text">No keypoints matched</span>
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
                onClick={handleCompletionAccept}
              >
                Aceptar
              </button>
            </div>
          </div>
        )}

        {/* Analyzing Modal */}
        {showAnalyzingModal && (
          <div className="completion-modal-overlay">
            <div className="completion-modal" onClick={(e) => e.stopPropagation()}>
              <div className="analyzing-spinner">
                <LoadingSpinner />
              </div>
              <h2>Analizando tu conversación</h2>
              <p>Por favor espera mientras evaluamos tu desempeño...</p>
            </div>
          </div>
        )}

        {/* Result Modal */}
        {showResultModal && (
          <div className="completion-modal-overlay">
            <div className="completion-modal" onClick={(e) => e.stopPropagation()}>
              <div className="score-circle">
                {analysisScore !== null ? (
                  <>
                    <div className="score-value">{analysisScore}</div>
                    <div className="score-label">/100</div>
                  </>
                ) : (
                  <div className="score-error">N/A</div>
                )}
              </div>
              <h2>Análisis Completado</h2>
              <p>
                {analysisScore !== null 
                  ? `Tu puntuación general es ${analysisScore}/100`
                  : 'El análisis se completó pero no se pudo obtener la puntuación'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                {isPathMode && pathId && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowResultModal(false);
                      navigate(`/play/${pathId}`);
                    }}
                  >
                    Volver al Path
                  </button>
                )}
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowResultModal(false);
                    if (chatId) {
                      navigate(`/analyses/${chatId}`);
                    } else {
                      navigate('/chats');
                    }
                  }}
                >
                  Ver Análisis Detallado
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
