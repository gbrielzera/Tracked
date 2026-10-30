import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { supabase } from '@/services/supabase/client';

// Caminho fixo por usuário (avatars/{uid}/avatar.jpg): trocar a foto não deixa arquivo órfão.
export async function uploadAvatar(userId: string, localUri: string) {
  const image = await manipulateAsync(localUri, [{ resize: { width: 512 } }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  const bytes = await (await fetch(image.uri)).arrayBuffer();
  const path = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // ?v= quebra o cache de imagem quando a foto muda.
  return `${data.publicUrl}?v=${Date.now()}`;
}
