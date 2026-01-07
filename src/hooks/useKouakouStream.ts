import { useCallback, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import { createLoggerWithPrefix } from '../utils/logger';

interface KouakouStreamOptions {
  message: string;
  projectId: string;
  history?: unknown[];
}

interface FunctionCallEvent {
  name: string;
  args: Record<string, unknown>;
}

interface FunctionResultEvent extends FunctionCallEvent {
  result: unknown;
}

const logger = createLoggerWithPrefix('useKouakouStream');

const parseSseChunk = (
  chunk: string,
): { event: string; data: unknown } | null => {
  if (!chunk.trim()) {
    return null;
  }

  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() || 'message';
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  const rawData = dataLines.join('\n');
  if (!rawData) {
    return null;
  }

  try {
    return { event: eventName, data: JSON.parse(rawData) };
  } catch {
    return { event: eventName, data: rawData };
  }
};

export function useKouakouStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [functionCalls, setFunctionCalls] = useState<FunctionCallEvent[]>([]);
  const [functionResults, setFunctionResults] = useState<FunctionResultEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const resetStream = useCallback(() => {
    setResponseText('');
    setFunctionCalls([]);
    setFunctionResults([]);
    setError(null);
  }, []);

  const handleSseEvent = useCallback(
    (eventName: string, payload: unknown) => {
      switch (eventName) {
        case 'message': {
          const text =
            typeof payload === 'string'
              ? payload
              : typeof payload === 'object' && payload !== null
              ? String((payload as Record<string, unknown>).text ?? '')
              : '';
          if (text) {
            setResponseText((prev) => prev + text);
          }
          break;
        }
        case 'function_call': {
          if (payload && typeof payload === 'object') {
            const { name, args } = payload as { name?: string; args?: Record<string, unknown> };
            if (name) {
              setFunctionCalls((prev) => [
                ...prev,
                { name, args: args || {} },
              ]);
            }
          }
          break;
        }
        case 'function_result': {
          if (payload && typeof payload === 'object') {
            const { name, args, result } = payload as {
              name?: string;
              args?: Record<string, unknown>;
              result?: Record<string, unknown>;
            };
            if (name) {
              setFunctionResults((prev) => [
                ...prev,
                { name, args: args || {}, result },
              ]);
            }
          }
          break;
        }
        case 'error': {
          const messageErreur =
            typeof payload === 'string'
              ? payload
              : (payload as Record<string, unknown>)?.message;
          setError(messageErreur ? String(messageErreur) : 'Erreur inconnue');
          break;
        }
        case 'done': {
          setIsStreaming(false);
          break;
        }
        default:
          logger.debug(`Event SSE inconnu (${eventName})`, payload as Record<string, unknown>);
      }
    },
    [],
  );

  const startStream = useCallback(
    async ({ message, projectId, history }: KouakouStreamOptions) => {
      if (!message?.trim() || !projectId?.trim()) {
        setError('Message et projet sont requis');
        return;
      }

      stopStream();
      resetStream();
       setError(null);
      setIsStreaming(true);

      try {
        const token = await AsyncStorage.getItem(API_CONFIG.storageKeys.accessToken);
        if (!token) {
          throw new Error('Token non disponible');
        }

        const params = new URLSearchParams();
        params.append('message', message);
        params.append('projectId', projectId);
        if (history && history.length > 0) {
          params.append('history', JSON.stringify(history));
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await fetch(
          `${API_CONFIG.baseURL}/kouakou/chat/stream?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Accept: 'text/event-stream',
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );

        if (!response.ok || !response.body) {
          throw new Error(`Erreur service (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            if (buffer.length > 0) {
              const parsed = parseSseChunk(buffer);
              if (parsed) {
                handleSseEvent(parsed.event, parsed.data);
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          let separatorIndex: number;
          while ((separatorIndex = buffer.indexOf('\n\n')) >= 0) {
            const rawEvent = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);
            const parsed = parseSseChunk(rawEvent);
            if (parsed) {
              handleSseEvent(parsed.event, parsed.data);
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          logger.debug('Flux Kouakou interrompu (abort)');
        } else {
          const messageErreur = err instanceof Error ? err.message : 'Erreur streaming';
          logger.error('Erreur flux Kouakou', err as Error);
          setError(messageErreur);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [handleSseEvent, resetStream, stopStream],
  );

  return {
    isStreaming,
    error,
    responseText,
    functionCalls,
    functionResults,
    startStream,
    stopStream,
    resetStream,
  };
}


