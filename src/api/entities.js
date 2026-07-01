// ============================================================
// entities.js
// ============================================================
import { supabase } from './supabaseClient';

 function _parseUnknownColumnFromSupabaseError(error) {
   const message = error?.message;
   if (!message || typeof message !== 'string') return null;

   const match = message.match(/Could not find the '([^']+)' column/i);
   return match?.[1] ?? null;
 }

 function _omitKey(obj, key) {
   if (!obj || typeof obj !== 'object') return obj;
   if (!(key in obj)) return obj;
   // eslint-disable-next-line no-unused-vars
   const { [key]: _ignored, ...rest } = obj;
   return rest;
 }

function makeEntity(tableName) {
  return {
    async list(orderBy = '-created_at', limit = 200) {
      const ascending = !orderBy.startsWith('-');
      const column = orderBy.replace(/^-/, '').replace('created_date', 'created_at').replace('ordine', 'sort_order');
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(column, { ascending })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async filter(filters = {}, orderBy = '-created_at', limit = 200) {
      const ascending = !orderBy.startsWith('-');
      const column = orderBy.replace(/^-/, '').replace('created_date', 'created_at').replace('ordine', 'sort_order');
      let query = supabase.from(tableName).select('*');
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined) {
          return;
        }
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value === null) {
          query = query.is(key, null);
        } else {
          query = query.eq(key, value);
        }
      });
      const { data, error } = await query.order(column, { ascending }).limit(limit);
      if (error) throw error;
      return data ?? [];
    },

    async create(payload) {
      const insertOnce = async (p) => {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .insert([p])
            .select()
            .single();
          return { data, error };
        } catch (error) {
          return { data: null, error };
        }
      };

      let sanitizedPayload = payload;
      let { data, error } = await insertOnce(sanitizedPayload);
      let safetyCounter = 0;

      while (error && safetyCounter < 10) {
        safetyCounter += 1;
        const unknownColumn = _parseUnknownColumnFromSupabaseError(error);
        if (!unknownColumn) break;
        if (!sanitizedPayload || !Object.prototype.hasOwnProperty.call(sanitizedPayload, unknownColumn)) break;

        sanitizedPayload = _omitKey(sanitizedPayload, unknownColumn);
        ({ data, error } = await insertOnce(sanitizedPayload));
      }

      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const updateOnce = async (p) => {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .update(p)
            .eq('id', id)
            .select()
            .single();
          return { data, error };
        } catch (error) {
          return { data: null, error };
        }
      };

      let sanitizedPayload = payload;
      let { data, error } = await updateOnce(sanitizedPayload);
      let safetyCounter = 0;

      while (error && safetyCounter < 10) {
        safetyCounter += 1;
        const unknownColumn = _parseUnknownColumnFromSupabaseError(error);
        if (!unknownColumn) break;
        if (!sanitizedPayload || !Object.prototype.hasOwnProperty.call(sanitizedPayload, unknownColumn)) break;

        sanitizedPayload = _omitKey(sanitizedPayload, unknownColumn);
        ({ data, error } = await updateOnce(sanitizedPayload));
      }

      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    // subscribe è un no-op — in futuro si può implementare con supabase realtime
    subscribe(callback) {
      console.warn(`subscribe() non implementato per ${tableName}. Usa polling o Supabase Realtime.`);
      return () => {};
    },
  };
}

// ============================================================
// ENTITÀ
// ============================================================
export const Restaurant                = makeEntity('restaurants');
export const Table                     = makeEntity('restaurant_tables');
export const Order                     = makeEntity('orders');
export const OrderItem                 = makeEntity('order_items');
export const MenuItem                  = makeEntity('menu_items');
export const Category                  = makeEntity('menu_categories');
export const MenuCategory              = makeEntity('menu_categories');
export const Event                     = makeEntity('events');
export const EventMenu                 = makeEntity('event_menus');
export const Location                  = makeEntity('locations');
export const Promotion                 = makeEntity('promotions');
export const SupportRequest            = makeEntity('support_requests');
export const TechnicalSupport          = makeEntity('support_requests');
export const Subscription              = makeEntity('subscriptions');
export const SubscriptionPlan          = makeEntity('subscription_plans');
export const SubscriptionDiscountCode  = makeEntity('subscription_discount_codes');
export const SubscriptionTransaction   = makeEntity('subscription_transactions');
export const DiscountUsage             = makeEntity('discount_usages');
export const Settings                  = makeEntity('settings');
export const PlatformSettings          = makeEntity('platform_settings');
export const Modifier                  = makeEntity('modifiers');
export const CategoryModifier          = makeEntity('category_modifiers');
export const MenuItemCategoryModifier  = makeEntity('menu_item_category_modifiers');
export const Printer                   = makeEntity('printers');
export const ChatMessage               = makeEntity('chat_messages');
