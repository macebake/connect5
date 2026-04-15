import { supabaseClient } from './supabase-client.js';

export class GameAPI {
    static async getDailyPuzzle(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];

        try {
            const { data, error } = await supabaseClient
                .from('daily_puzzles')
                .select('*')
                .eq('date', targetDate)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // If no puzzle exists, generate one
            if (!data) {
                const { error: generateError } = await supabaseClient
                    .rpc('ensure_daily_puzzle', { target_date: targetDate });

                if (generateError) throw generateError;

                // Fetch the newly generated puzzle
                const { data: newData, error: fetchError } = await supabaseClient
                    .from('daily_puzzles')
                    .select('*')
                    .eq('date', targetDate)
                    .single();

                if (fetchError) throw fetchError;
                return newData;
            }

            return data;
        } catch (error) {
            console.error('Get daily puzzle error:', error);
            throw error;
        }
    }

    static async getDailyAttempt(userId, date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];

        try {
            const { data, error } = await supabaseClient
                .from('daily_attempts')
                .select('*')
                .eq('user_id', userId)
                .eq('puzzle_date', targetDate)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Get daily attempt error:', error);
            return null;
        }
    }

    static async submitDailyAttempt(userId, puzzleDate, score, completed, turnsUsed) {
        try {
            const existingAttempt = await this.getDailyAttempt(userId, puzzleDate);
            const { data, error } = await supabaseClient
                .from('daily_attempts')
                .upsert({
                    user_id: userId,
                    puzzle_date: puzzleDate,
                    score: score,
                    completed: completed,
                    turns_used: turnsUsed,
                    completed_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,puzzle_date'
                })
                .select()
                .single();

            if (error) throw error;

            await this.updateUserStats(userId, {
                scoreDelta: score - (existingAttempt?.score || 0),
                dailyGamesDelta: existingAttempt ? 0 : 1,
                winsDelta: completed && !existingAttempt?.completed ? 1 : 0
            });

            return data;
        } catch (error) {
            console.error('Submit daily attempt error:', error);
            throw error;
        }
    }

    static async submitPracticeGame(userId, score, completed, turnsUsed) {
        try {
            const { data, error } = await supabaseClient
                .from('practice_games')
                .insert({
                    user_id: userId,
                    score: score,
                    completed: completed,
                    turns_used: turnsUsed
                })
                .select()
                .single();

            if (error) throw error;

            await this.updateUserStats(userId, {
                scoreDelta: score,
                practiceGamesDelta: 1,
                winsDelta: completed ? 1 : 0
            });

            return data;
        } catch (error) {
            console.error('Submit practice game error:', error);
            throw error;
        }
    }

    static async updateUserStats(userId, {
        scoreDelta = 0,
        dailyGamesDelta = 0,
        practiceGamesDelta = 0,
        winsDelta = 0
    }) {
        try {
            // Get current profile
            const { data: profile, error: fetchError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            // Calculate new stats
            const updates = {
                total_score_sum: profile.total_score_sum + scoreDelta,
                total_daily_games: profile.total_daily_games + dailyGamesDelta,
                total_practice_games: profile.total_practice_games + practiceGamesDelta,
                wins: profile.wins + winsDelta
            };

            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (updateError) throw updateError;
        } catch (error) {
            console.error('Update user stats error:', error);
            throw error;
        }
    }

    static async getDailyLeaderboard(date = null, limit = 10) {
        const targetDate = date || new Date().toISOString().split('T')[0];

        try {
            const { data, error } = await supabaseClient
                .from('daily_attempts')
                .select(`
                    user_id,
                    score,
                    completed_at,
                    turns_used,
                    profiles!inner(username)
                `)
                .eq('puzzle_date', targetDate)
                .eq('completed', true)
                .order('score', { ascending: false })
                .order('completed_at', { ascending: true })
                .limit(limit);

            if (error) throw error;

            return data.map((attempt, index) => ({
                rank: index + 1,
                user_id: attempt.user_id,
                username: attempt.profiles.username,
                score: attempt.score,
                turnsUsed: attempt.turns_used,
                completedAt: attempt.completed_at
            }));
        } catch (error) {
            console.error('Get daily leaderboard error:', error);
            throw error;
        }
    }

    static async getAllTimeLeaderboard(limit = 10) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('username, leaderboard_appearances')
                .gt('leaderboard_appearances', 0)
                .order('leaderboard_appearances', { ascending: false })
                .order('username', { ascending: true })
                .limit(limit);

            if (error) throw error;

            return data.map((profile, index) => ({
                rank: index + 1,
                username: profile.username,
                leaderboardAppearances: profile.leaderboard_appearances
            }));
        } catch (error) {
            console.error('Get all-time leaderboard error:', error);
            throw error;
        }
    }

    static async getUserLeaderboardHistory(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('daily_leaderboard_snapshots')
                .select('*')
                .eq('user_id', userId)
                .order('puzzle_date', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user leaderboard history error:', error);
            throw error;
        }
    }

    static async getUserStats(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // Calculate additional stats
            const totalGames = data.total_daily_games + data.total_practice_games;
            const averageScore = totalGames > 0 ? Math.round(data.total_score_sum / totalGames) : 0;
            const winRate = totalGames > 0 ? Math.round((data.wins / totalGames) * 100) : 0;

            return {
                ...data,
                totalGames,
                averageScore,
                winRate
            };
        } catch (error) {
            console.error('Get user stats error:', error);
            throw error;
        }
    }
}
