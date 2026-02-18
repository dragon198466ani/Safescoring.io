"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook for managing browser push notifications
 * Connects to the existing service worker
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState("default");
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push is supported
    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!isSupported) return { success: false, error: "Push not supported" };

    setIsLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setIsLoading(false);
        return { success: false, error: "Permission denied" };
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Using a placeholder key - replace with your VAPID public key
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
            "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
        ),
      });

      setSubscription(pushSubscription);

      // Send subscription to server
      const response = await fetch("/api/user/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      setIsLoading(false);
      return { success: true, subscription: pushSubscription };
    } catch (error) {
      console.error("Push subscription error:", error);
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  }, [isSupported]);

  // Unsubscribe from push
  const unsubscribe = useCallback(async () => {
    if (!subscription) return { success: false, error: "No subscription" };

    setIsLoading(true);

    try {
      await subscription.unsubscribe();
      setSubscription(null);

      // Notify server
      await fetch("/api/user/notifications/push", {
        method: "DELETE",
      });

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Push unsubscription error:", error);
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  }, [subscription]);

  // Send a local notification (for testing)
  const sendLocalNotification = useCallback(
    async (title, options = {}) => {
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [100, 50, 100],
        ...options,
      });
    },
    [permission]
  );

  return {
    isSupported,
    permission,
    isSubscribed: !!subscription,
    isLoading,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default usePushNotifications;
