import { supabaseClient } from './supabase-client.js';

export class AuthManager {
    constructor() {
        this.user = null;
        this.profile = null;
        this.listeners = [];
        this.ready = this.initSession();

        // Listen for auth state changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            void this.handleSessionChange(event, session);
        });
    }

    async initSession() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        this.user = session?.user || null;

        if (this.user) {
            await this.loadProfile();
        } else {
            this.profile = null;
        }

        return session;
    }

    async handleSessionChange(event, session) {
        this.user = session?.user || null;

        if (this.user) {
            await this.loadProfile();
        } else {
            this.profile = null;
        }

        this.notifyListeners(event, session);
    }

    onAuthStateChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    notifyListeners(event, session) {
        this.listeners.forEach(callback => callback(event, session));
    }

    async signUp(username, email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username
                    }
                }
            });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            await this.loadProfile();
            return { success: true, data };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;

            this.user = null;
            this.profile = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            const redirectTo = new URL('reset-password.html', window.location.href).toString();
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    async loadProfile() {
        if (!this.user) return null;

        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (error) throw error;

            this.profile = data;
            return data;
        } catch (error) {
            console.error('Load profile error:', error);
            return null;
        }
    }

    async updateProfile(updates) {
        if (!this.user) throw new Error('No authenticated user');

        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .update(updates)
                .eq('id', this.user.id)
                .select()
                .single();

            if (error) throw error;

            this.profile = data;
            return { success: true, data };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }

    isAuthenticated() {
        return !!this.user;
    }

    getUser() {
        return this.user;
    }

    getProfile() {
        return this.profile;
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html?tab=login';
            return false;
        }
        return true;
    }
}
