/**
 * Telemetry and observability hooks for Sutraworks Client AI SDK
 * Enables integration with OpenTelemetry, DataDog, and other observability platforms
 * @module utils/telemetry
 */

import type { ProviderName, ChatStreamDelta, Usage } from '../types';
import { SutraError } from '../types';

/**
 * Context passed to telemetry hooks
 */
export interface TelemetryContext {
    /** Unique request identifier */
    readonly requestId: string;
    /** AI provider being used */
    readonly provider: ProviderName;
    /** Model being used */
    readonly model: string;
    /** Request start timestamp */
    readonly startTime: number;
    /** Parent span ID for distributed tracing */
    parentSpanId?: string;
    /** Trace ID for distributed tracing */
    traceId?: string;
    /** Custom attributes for this request */
    readonly attributes: Map<string, unknown>;
}

/**
 * Request metrics collected after completion
 */
export interface RequestMetrics {
    /** Total request duration in ms */
    duration: number;
    /** Time to first token in ms (for streaming) */
    timeToFirstToken?: number;
    /** Token usage */
    usage?: Usage;
    /** Whether request came from cache */
    cached: boolean;
    /** Number of retry attempts */
    retryCount: number;
}

/**
 * Telemetry hook interface for observability integration
 */
export interface TelemetryHook {
    /** Called when a request starts */
    onRequestStart?(context: TelemetryContext): void;

    /** Called when a request completes successfully */
    onRequestEnd?(context: TelemetryContext, metrics: RequestMetrics): void;

    /** Called when a request fails */
    onRequestError?(context: TelemetryContext, error: SutraError, metrics: Partial<RequestMetrics>): void;

    /** Called for each streaming chunk */
    onStreamChunk?(context: TelemetryContext, chunk: ChatStreamDelta): void;

    /** Called when stream completes */
    onStreamEnd?(context: TelemetryContext, totalChunks: number, metrics: RequestMetrics): void;

    /** Called when stream errors */
    onStreamError?(context: TelemetryContext, error: SutraError): void;

    /** Called on retry attempt */
    onRetry?(context: TelemetryContext, attempt: number, delay: number, error: SutraError): void;

    /** Called when circuit breaker opens */
    onCircuitBreakerOpen?(provider: ProviderName, failures: number): void;

    /** Called when circuit breaker closes */
    onCircuitBreakerClose?(provider: ProviderName): void;
}

/**
 * Telemetry manager for registering and invoking hooks
 */
export class TelemetryManager {
    private readonly hooks: TelemetryHook[] = [];
    private enabled: boolean = true;

    /**
     * Register a telemetry hook
     * @param hook - Hook implementation
     * @returns Unsubscribe function
     */
    register(hook: TelemetryHook): () => void {
        this.hooks.push(hook);
        return () => {
            const index = this.hooks.indexOf(hook);
            if (index >= 0) {
                this.hooks.splice(index, 1);
            }
        };
    }

    /**
     * Enable or disable telemetry
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if telemetry is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Create a new telemetry context for a request
     */
    createContext(
        requestId: string,
        provider: ProviderName,
        model: string,
        parentSpanId?: string,
        traceId?: string
    ): TelemetryContext {
        return {
            requestId,
            provider,
            model,
            startTime: Date.now(),
            parentSpanId,
            traceId,
            attributes: new Map(),
        };
    }

    /**
     * Invoke onRequestStart hooks
     */
    emitRequestStart(context: TelemetryContext): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onRequestStart?.(context);
            } catch (error) {
                console.error('Telemetry hook error (onRequestStart):', error);
            }
        }
    }

    /**
     * Invoke onRequestEnd hooks
     */
    emitRequestEnd(context: TelemetryContext, metrics: RequestMetrics): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onRequestEnd?.(context, metrics);
            } catch (error) {
                console.error('Telemetry hook error (onRequestEnd):', error);
            }
        }
    }

    /**
     * Invoke onRequestError hooks
     */
    emitRequestError(
        context: TelemetryContext,
        error: SutraError,
        metrics: Partial<RequestMetrics>
    ): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onRequestError?.(context, error, metrics);
            } catch (err) {
                console.error('Telemetry hook error (onRequestError):', err);
            }
        }
    }

    /**
     * Invoke onStreamChunk hooks
     */
    emitStreamChunk(context: TelemetryContext, chunk: ChatStreamDelta): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onStreamChunk?.(context, chunk);
            } catch (error) {
                console.error('Telemetry hook error (onStreamChunk):', error);
            }
        }
    }

    /**
     * Invoke onStreamEnd hooks
     */
    emitStreamEnd(
        context: TelemetryContext,
        totalChunks: number,
        metrics: RequestMetrics
    ): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onStreamEnd?.(context, totalChunks, metrics);
            } catch (error) {
                console.error('Telemetry hook error (onStreamEnd):', error);
            }
        }
    }

    /**
     * Invoke onStreamError hooks
     */
    emitStreamError(context: TelemetryContext, error: SutraError): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onStreamError?.(context, error);
            } catch (err) {
                console.error('Telemetry hook error (onStreamError):', err);
            }
        }
    }

    /**
     * Invoke onRetry hooks
     */
    emitRetry(
        context: TelemetryContext,
        attempt: number,
        delay: number,
        error: SutraError
    ): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onRetry?.(context, attempt, delay, error);
            } catch (err) {
                console.error('Telemetry hook error (onRetry):', err);
            }
        }
    }

    /**
     * Invoke onCircuitBreakerOpen hooks
     */
    emitCircuitBreakerOpen(provider: ProviderName, failures: number): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onCircuitBreakerOpen?.(provider, failures);
            } catch (error) {
                console.error('Telemetry hook error (onCircuitBreakerOpen):', error);
            }
        }
    }

    /**
     * Invoke onCircuitBreakerClose hooks
     */
    emitCircuitBreakerClose(provider: ProviderName): void {
        if (!this.enabled) return;
        for (const hook of this.hooks) {
            try {
                hook.onCircuitBreakerClose?.(provider);
            } catch (error) {
                console.error('Telemetry hook error (onCircuitBreakerClose):', error);
            }
        }
    }

    /**
     * Get number of registered hooks
     */
    hookCount(): number {
        return this.hooks.length;
    }

    /**
     * Clear all hooks
     */
    clear(): void {
        this.hooks.length = 0;
    }
}

/**
 * Default telemetry manager instance
 */
export const defaultTelemetryManager = new TelemetryManager();

/**
 * Console-based telemetry hook for development/debugging
 */
export function createConsoleTelemetryHook(options?: {
    logLevel?: 'debug' | 'info' | 'warn';
    includeChunks?: boolean;
}): TelemetryHook {
    const logLevel = options?.logLevel ?? 'info';
    const includeChunks = options?.includeChunks ?? false;

    const log = (level: string, message: string, data?: unknown) => {
        if (logLevel === 'debug' || (logLevel === 'info' && level !== 'debug')) {
            console.log(`[Telemetry:${level}] ${message}`, data ?? '');
        }
    };

    return {
        onRequestStart(context) {
            log('info', `Request started: ${context.requestId}`, {
                provider: context.provider,
                model: context.model,
            });
        },

        onRequestEnd(context, metrics) {
            log('info', `Request completed: ${context.requestId}`, {
                duration: `${metrics.duration}ms`,
                tokens: metrics.usage?.total_tokens,
                cached: metrics.cached,
            });
        },

        onRequestError(context, error) {
            log('warn', `Request failed: ${context.requestId}`, {
                code: error.code,
                message: error.message,
                retryable: error.retryable,
            });
        },

        onStreamChunk(context, _chunk) {
            if (includeChunks) {
                log('debug', `Stream chunk: ${context.requestId}`);
            }
        },

        onRetry(context, attempt, delay, error) {
            log('info', `Retry attempt ${attempt}: ${context.requestId}`, {
                delay: `${delay}ms`,
                error: error.code,
            });
        },

        onCircuitBreakerOpen(provider, failures) {
            log('warn', `Circuit breaker opened for ${provider}`, { failures });
        },
    };
}
