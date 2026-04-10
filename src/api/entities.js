// ============================================================
// entities.js  — drop-in replacement per @base44/sdk entities
// Ogni funzione replica l'API base44: list, get, create, update, delete, filter
// ============================================================
import { supabase } from './supabaseClient';

// Helper generico per costruire una "entity" base44-compatibile
function makeEntity(tableName) {
  return {
    // Legge tutti i record (con filtri opzionali)
    // Uso: await Restaurant.list('-created_date', 50)
    async list(orderBy = '-created_at', limit = 200) {
      const ascending = !orderBy.startsWith('-');
      const column = orderBy.replace(/^-/, '');
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(column, { ascending })
        .limit(limit);
      if (error) throw error;
      return data;
    },

    // Legge un singolo record per id
    // Uso: await Restaurant.get('uuid-qui')
    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    // Filtra record con oggetto filtro
    // Uso: await Order.filter({ status: 'pending', restaurant_id: '...' })
    async filter(filters = {}, orderBy = '-created_at', limit = 200) {
      const ascending = !orderBy.startsWith('-');
      const column = orderBy.replace(/^-/, '');
      let query = supabase.from(tableName).select('*');
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      });
      query = query.order(column, { ascending }).limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    // Crea un nuovo record
    // Uso: await Restaurant.create({ name: 'Da Mario', ... })
    async create(payload) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    // Aggiorna un record esistente
    // Uso: await Restaurant.update('uuid', { name: 'Nuovo Nome' })
    async update(id, payload) {
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    // Elimina un record
    // Uso: await Order.delete('uuid')
    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },
  };
}

// ============================================================
// ENTITÀ — una per ogni tabella Supabase
// I nomi corrispondono alle pagine: Orders, Restaurant, ecc.
// ============================================================
export const Restaurant        = makeEntity('restaurants');
export const Order             = makeEntity('orders');
export const OrderItem         = makeEntity('order_items');
export const MenuItem          = makeEntity('menu_items');
export const MenuCategory      = makeEntity('menu_categories');
export const Event             = makeEntity('events');
export const EventMenu         = makeEntity('event_menus');
export const Location          = makeEntity('locations');
export const Promotion         = makeEntity('promotions');
export const SupportRequest    = makeEntity('support_requests');
export const Subscription      = makeEntity('subscriptions');
export const Settings          = makeEntity('settings');
