"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook for managing user AI memories
 * Provides CRUD operations and settings management
 */
export function useMemory({ autoFetch = true } = {}) {
  const { data: session } = useSession();
  const [memories, setMemories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch user memories with optional filters
   */
  const fetchMemories = useCallback(
    async (filters = {}) => {
      if (!session?.user) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.category) params.set("category", filters.category);
        if (filters.type) params.set("type", filters.type);
        if (filters.limit) params.set("limit", filters.limit);
        if (filters.offset) params.set("offset", filters.offset);

        const res = await fetch(`/api/user/memory?${params}`);
        const data = await res.json();

        if (data.success) {
          setMemories(data.memories);
          return data;
        } else {
          setError(data.error);
          return null;
        }
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  /**
   * Fetch memory settings
   */
  const fetchSettings = useCallback(async () => {
    if (!session?.user) return;

    try {
      const res = await fetch("/api/user/memory/settings");
      const data = await res.json();

      if (data.success) {
        setSettings(data.settings);
        return data.settings;
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch memory settings:", err);
      return null;
    }
  }, [session]);

  /**
   * Add a new memory
   */
  const addMemory = useCallback(
    async (memory) => {
      if (!session?.user) return null;

      try {
        const res = await fetch("/api/user/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(memory),
        });
        const data = await res.json();

        if (data.success) {
          setMemories((prev) => [data.memory, ...prev]);
          return data.memory;
        }
        setError(data.error);
        return null;
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    [session]
  );

  /**
   * Update a memory
   */
  const updateMemory = useCallback(
    async (memoryId, updates) => {
      if (!session?.user) return null;

      try {
        const res = await fetch(`/api/user/memory/${memoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const data = await res.json();

        if (data.success) {
          setMemories((prev) =>
            prev.map((m) => (m.id === memoryId ? data.memory : m))
          );
          return data.memory;
        }
        setError(data.error);
        return null;
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    [session]
  );

  /**
   * Delete a memory
   */
  const deleteMemory = useCallback(
    async (memoryId) => {
      if (!session?.user) return false;

      try {
        const res = await fetch(`/api/user/memory/${memoryId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setMemories((prev) => prev.filter((m) => m.id !== memoryId));
          return true;
        }
        return false;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [session]
  );

  /**
   * Clear all memories
   */
  const clearAllMemories = useCallback(async () => {
    if (!session?.user) return false;

    try {
      const res = await fetch("/api/user/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (res.ok) {
        setMemories([]);
        return true;
      }
      return false;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [session]);

  /**
   * Update memory settings
   */
  const updateSettings = useCallback(
    async (updates) => {
      if (!session?.user) return null;

      try {
        const res = await fetch("/api/user/memory/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const data = await res.json();

        if (data.success) {
          setSettings(data.settings);
          return data.settings;
        }
        setError(data.error);
        return null;
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    [session]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && session?.user) {
      fetchMemories();
      fetchSettings();
    }
  }, [autoFetch, session, fetchMemories, fetchSettings]);

  return {
    memories,
    settings,
    isLoading,
    error,
    fetchMemories,
    fetchSettings,
    addMemory,
    updateMemory,
    deleteMemory,
    clearAllMemories,
    updateSettings,
    isEnabled: settings?.memory_enabled ?? true,
    memoryCount: memories.length,
  };
}

/**
 * Hook for managing conversations
 */
export function useConversations({ autoFetch = true } = {}) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch conversations
   */
  const fetchConversations = useCallback(
    async (filters = {}) => {
      if (!session?.user) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.assistant_type) params.set("assistant_type", filters.assistant_type);
        if (filters.limit) params.set("limit", filters.limit);

        const res = await fetch(`/api/user/conversations?${params}`);
        const data = await res.json();

        if (data.success) {
          setConversations(data.conversations);
          return data;
        } else {
          setError(data.error);
          return null;
        }
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  /**
   * Get a single conversation with messages
   */
  const getConversation = useCallback(
    async (conversationId) => {
      if (!session?.user) return null;

      try {
        const res = await fetch(`/api/user/conversations/${conversationId}`);
        const data = await res.json();

        if (data.success) {
          return data;
        }
        setError(data.error);
        return null;
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    [session]
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(
    async (conversationId) => {
      if (!session?.user) return false;

      try {
        const res = await fetch(`/api/user/conversations/${conversationId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setConversations((prev) => prev.filter((c) => c.id !== conversationId));
          return true;
        }
        return false;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [session]
  );

  /**
   * Clear all conversations
   */
  const clearAllConversations = useCallback(async () => {
    if (!session?.user) return false;

    try {
      const res = await fetch("/api/user/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (res.ok) {
        setConversations([]);
        return true;
      }
      return false;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [session]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && session?.user) {
      fetchConversations();
    }
  }, [autoFetch, session, fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    fetchConversations,
    getConversation,
    deleteConversation,
    clearAllConversations,
  };
}

export default useMemory;
