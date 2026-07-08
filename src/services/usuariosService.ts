import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '../types';

export const usuariosService = {
  getAll: async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) throw error;
    return data as UserProfile[];
  },

  create: async (item: any): Promise<UserProfile> => {
    // Para criar novos usuários, normalmente usaríamos o auth do Supabase
    // mas aqui estamos simulando a persistência do perfil
    const { data, error } = await supabase
      .from('profiles')
      .insert([item])
      .select()
      .single();
    
    if (error) throw error;
    return data as UserProfile;
  },

  update: async (id: string, data: any): Promise<UserProfile> => {
    const { data: updatedData, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updatedData as UserProfile;
  }
};
