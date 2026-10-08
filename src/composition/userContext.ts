import { supabase } from '../infrastructure/supabase/supabaseClient';
import { SupabaseUserContextRepository } from '../infrastructure/supabase/SupabaseUserContextRepository';
import { IUserContextRepository } from '../domain/repositories/IUserContextRepository';

export const userContextRepository: IUserContextRepository = new SupabaseUserContextRepository(supabase);
