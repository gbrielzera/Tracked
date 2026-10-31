import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase/client';
import { useAuth, useAuthStatus } from '@/stores/auth';

type NotificationsModule = typeof import('expo-notifications');

// expo-notifications é um módulo nativo. Se o app instalado for de uma versão sem ele,
// o import falha e o app segue normal, só sem push (basta gerar um novo APK).
async function loadNotifications(): Promise<NotificationsModule | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

async function readToken(Notifications: NotificationsModule): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

// Pede permissão, pega o token do aparelho e registra no banco. Falhas são silenciosas:
// push é um extra, nunca deve atrapalhar o app.
export async function registerForPush(): Promise<void> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return;

    const Device = await import('expo-device');
    if (!Device.isDevice) return; // emuladores não recebem push

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Geral',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F0B429',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const token = await readToken(Notifications);
    if (!token) return;
    await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch (error) {
    console.warn('Push não registrado:', error);
  }
}

// Ao sair da conta, este aparelho deixa de receber os avisos dela.
export async function unregisterPush(): Promise<void> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    const token = await readToken(Notifications);
    if (token) await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // sem token ou sem rede: o servidor remove tokens mortos sozinho
  }
}

// Abre a tela certa a partir dos dados que o servidor mandou junto com o push.
function openFromPush(data: Record<string, unknown> | undefined) {
  if (!data) return;
  const type = data.type;
  if (type === 'follow' && typeof data.username === 'string' && data.username) {
    router.push(`/user/${data.username}`);
  } else if ((type === 'like' || type === 'comment') && typeof data.reviewId === 'string' && data.reviewId) {
    router.push(`/review/${data.reviewId}`);
  }
}

// Monte uma vez na raiz: registra o aparelho e trata o toque na notificação.
export function usePushNotifications() {
  const status = useAuthStatus();
  const userId = useAuth((s) => s.session?.user.id);
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'ready' || !userId) return;
    if (registeredFor.current !== userId) {
      registeredFor.current = userId;
      void registerForPush();
    }

    let active = true;
    let remove = () => {};

    void (async () => {
      const Notifications = await loadNotifications();
      if (!Notifications || !active) return;

      // Com o app aberto, mostra o aviso na tela em vez de engolir.
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
        openFromPush(response.notification.request.content.data),
      );
      remove = () => subscription.remove();

      // App estava fechado e foi aberto pelo toque na notificação.
      const last = Notifications.getLastNotificationResponse();
      if (last) openFromPush(last.notification.request.content.data);
    })();

    return () => {
      active = false;
      remove();
    };
  }, [status, userId]);
}
