"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { checkNewOrdersAction, getFactorySettingsAction } from '@/app/actions/commonActions';

export default function NotificationListener() {
    const { userId, isLoaded } = useAuth();

    // Config Cache
    const configRef = useRef<any>(null);
    const lastCheckedRef = useRef<string>(new Date().toISOString());

    useEffect(() => {
        if (!isLoaded || !userId) return;

        let intervalId: NodeJS.Timeout;

        const init = async () => {
            // 1. Load Initial Settings
            try {
                const settings = await getFactorySettingsAction();
                if (settings && settings.notification_config) {
                    configRef.current = settings.notification_config;
                }
            } catch (e) {
                console.error("Settings load error", e);
            }

            // 2. Start Polling
            intervalId = setInterval(checkUpdates, 30000); // Check every 30 seconds
        };

        const checkUpdates = async () => {
            try {
                // A. Check for New Orders
                const newOrders = await checkNewOrdersAction(lastCheckedRef.current);

                if (newOrders && newOrders.length > 0) {
                    // Update check time to the latest order's created_at to avoid duplicates
                    // Or just keep using "now" minus buffer? 
                    // Better: Use the latest order time from the fetched list.
                    const latestOrder = newOrders[newOrders.length - 1];
                    lastCheckedRef.current = latestOrder.created_at; // Advance cursor

                    // Alert for each new order
                    newOrders.forEach(order => handleNewOrder(order));
                } else {
                    // Update last check time if no orders found, to avoid large gaps? 
                    // No, keep using the *last sync time*. 
                    // Actually, if we query gt(lastCheck), and no orders, next time we query gt(lastCheck).
                    // But if 5 minutes pass, we query 5 minutes window.
                    // We should update lastCheckedRef to NOW if successful check?
                    // Yes, updating to NOW is safer to avoid re-fetching old stuff if window shifts.
                    // But if an order came 1ms before "NOW", we miss it?
                    // Safe approach: lastCheckedRef tracks the successfully processed time window end.
                    lastCheckedRef.current = new Date().toISOString();
                }

                // B. Refresh Settings (Less frequent? Or every loop?)
                // Doing every loop is fine for server actions.
                const settings = await getFactorySettingsAction();
                if (settings && settings.notification_config) {
                    // Check if changed? Just overwrite.
                    configRef.current = settings.notification_config;
                }

            } catch (e) {
                console.error("Polling error", e);
            }
        };

        init();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [userId, isLoaded]);


    const handleNewOrder = (order: any) => {
        const config = configRef.current;
        if (!config || !config.alert_new_order) return;

        // Custom Sound Check
        if (config.sound_enabled) {
            playNotificationSound(config.sound_file || 'notification_1', config.sound_volume || 80);
        }

        // Toast Notification
        toast.success(`Yeni Sipariş: ${order.customer_name || 'Misafir'}`, {
            duration: 5000,
            action: {
                label: 'Görüntüle',
                onClick: () => window.location.href = `/siparisler`
            }
        });
    };

    // Reuse the sound player logic (duplicate from page for simplicity/isolation)
    const playNotificationSound = (type: string, volume: number) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const vol = volume / 100;

            if (type === 'notification_1') { // Ding
                osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                gain.gain.setValueAtTime(vol, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
            } else if (type === 'notification_2') { // Modern
                osc.type = 'triangle'; osc.frequency.setValueAtTime(440, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(vol, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1);
            } else if (type === 'notification_3') { // Cash
                osc.type = 'square'; osc.frequency.setValueAtTime(2000, ctx.currentTime); osc.frequency.linearRampToValueAtTime(2500, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(vol * 0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
            } else { // Alert
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(110, ctx.currentTime); osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.5);
                gain.gain.setValueAtTime(vol, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
            }
        } catch (e) { console.error("Audio error", e); }
    };

    return null; // Invisible Component
}
